// One small interface over two providers and two tiers.
//   cheap  → bulk extraction from filings (high volume, simple)       Haiku 5.5 / Gemini Flash-Lite
//   strong → reasoning over transcripts + numbers (low volume, hard)  Opus 5.5  / Gemini Flash
// Every call is cached by a hash of (model, prompt), so re-running the pipeline or re-opening
// a research page costs nothing. The private network is NEVER sent to a model: only public
// filings, transcripts and annual reports are.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export type LlmTier = "cheap" | "strong";
type Provider = "anthropic" | "gemini";

const MODELS: Record<Provider, Record<LlmTier, string>> = {
  anthropic: { cheap: "claude-haiku-5-5", strong: "claude-opus-5-5" },
  gemini: { cheap: "gemini-3.5-flash-lite", strong: "gemini-3.6-flash" },
};
// USD per 1M tokens (input, output) — used only for the cost ledger.
const PRICE: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-opus-5-5": [4, 20],
  "gemini-3.5-flash-lite": [0.3, 2.5],
  "gemini-3.6-flash": [1.5, 7.5],
};

export function llmProvider(): Provider | null {
  const forced = process.env.LLM_PROVIDER as Provider | undefined;
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (forced === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export function modelFor(tier: LlmTier): string | null {
  const p = llmProvider();
  if (!p) return null;
  const override = tier === "cheap" ? process.env.LLM_CHEAP_MODEL : process.env.LLM_STRONG_MODEL;
  return override || MODELS[p][tier];
}

export class LlmUnavailable extends Error {
  constructor(message = "No LLM key configured (set ANTHROPIC_API_KEY or GEMINI_API_KEY)") {
    super(message);
  }
}

const CACHE_DIR =
  process.env.LLM_CACHE_DIR ?? (process.env.VERCEL ? "/tmp/finn-llm-cache" : path.join(process.cwd(), "data", "cache", "llm"));

function cacheGet<T>(key: string): T | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, `${key}.json`), "utf8"));
  } catch {
    return undefined;
  }
}
function cachePut(key: string, v: unknown) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(v));
  } catch {
    /* read-only FS: caching is best-effort */
  }
}

export type LlmUsage = { model: string; inputTokens: number; outputTokens: number; costUsd: number; cached: boolean };
const ledger: LlmUsage[] = [];
export const usageLedger = () => ledger;

let anthropic: Anthropic | null = null;

export async function llmJSON<S extends z.ZodType>(opts: {
  tier: LlmTier;
  system: string;
  prompt: string;
  schema: S;
  maxTokens?: number;
}): Promise<{ data: z.infer<S>; usage: LlmUsage }> {
  const provider = llmProvider();
  const model = modelFor(opts.tier);
  if (!provider || !model) throw new LlmUnavailable();

  const key = crypto
    .createHash("sha256")
    .update(JSON.stringify([model, opts.system, opts.prompt, z.toJSONSchema(opts.schema)]))
    .digest("hex")
    .slice(0, 32);
  const hit = cacheGet<{ data: z.infer<S>; usage: LlmUsage }>(key);
  if (hit) {
    // Spend ledger: a cache hit costs nothing now. Caller: keeps what producing the answer cost.
    ledger.push({ ...hit.usage, cached: true, costUsd: 0 });
    return { data: opts.schema.parse(hit.data), usage: { ...hit.usage, cached: true } };
  }

  const out =
    provider === "anthropic" ? await callAnthropic(model, opts) : await callGemini(model, opts);
  const [pin, pout] = PRICE[model] ?? [0, 0];
  const usage: LlmUsage = {
    model,
    inputTokens: out.inputTokens,
    outputTokens: out.outputTokens,
    costUsd: (out.inputTokens * pin + out.outputTokens * pout) / 1e6,
    cached: false,
  };
  ledger.push(usage);
  cachePut(key, { data: out.data, usage });
  return { data: out.data, usage };
}

async function callAnthropic<S extends z.ZodType>(
  model: string,
  opts: { tier: LlmTier; system: string; prompt: string; schema: S; maxTokens?: number },
) {
  anthropic ??= new Anthropic();
  const res = await anthropic.messages.parse({
    model,
    max_tokens: opts.maxTokens ?? (opts.tier === "cheap" ? 4000 : 16000),
    // The system prompt is identical across calls of a kind, so it is cached as the prefix.
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: opts.prompt }],
    output_config: {
      // Bulk extraction needs little thought; synthesis gets more.
      effort: opts.tier === "cheap" ? "low" : "high",
      format: zodOutputFormat(opts.schema),
    },
  });
  if (res.stop_reason === "refusal") throw new Error("Model declined this request");
  if (res.stop_reason === "max_tokens") throw new Error("Output truncated (max_tokens)");
  if (!res.parsed_output) throw new Error("Model returned no parseable output");
  return {
    data: res.parsed_output as z.infer<S>,
    inputTokens:
      res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0),
    outputTokens: res.usage.output_tokens,
  };
}

async function callGemini<S extends z.ZodType>(
  model: string,
  opts: { tier: LlmTier; system: string; prompt: string; schema: S; maxTokens?: number },
) {
  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema));
  let lastErr: unknown;
  let parseFailures = 0;
  for (let attempt = 0; attempt < 6 && parseFailures < 2; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [
          {
            role: "user",
            parts: [{ text: `${opts.prompt}\n\nReply with JSON only, matching this JSON Schema:\n${jsonSchema}` }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: opts.maxTokens ?? 8192 },
      }),
    });
    if (res.status === 429 || res.status >= 500) {
      const body = await res.text();
      // A spent daily quota will not recover by waiting; per-minute limits will.
      if (res.status === 429 && /PerDay/i.test(body)) throw new LlmUnavailable(`Gemini daily quota reached for ${model}`);
      lastErr = new Error(`Gemini ${res.status}`);
      const hinted = Number(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(body)?.[1]);
      const waitMs = Number.isFinite(hinted) && hinted > 0 ? hinted * 1000 + 1000 : 5000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 65_000)));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    const text: string = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    try {
      let parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
      // Gemini occasionally wraps a single object in an array.
      if (Array.isArray(parsed) && parsed.length === 1 && !(opts.schema instanceof z.ZodArray)) parsed = parsed[0];
      const data = opts.schema.parse(parsed);
      return {
        data: data as z.infer<S>,
        inputTokens: j?.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: (j?.usageMetadata?.candidatesTokenCount ?? 0) + (j?.usageMetadata?.thoughtsTokenCount ?? 0),
      };
    } catch (e) {
      lastErr = e; // malformed JSON: retry once
      parseFailures++;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
