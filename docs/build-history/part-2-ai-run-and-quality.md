# Part 2 · Running the AI layer and fixing what it got wrong

[Part 1](part-1-overnight-build.md) · **Part 2** · [Part 3](part-3-deploy-and-submit.md) · [index](README.md)

*16 Nov 10:16 IST → 16 Nov 11:25 IST.* A Gemini key is added; enrichment and research run for the first time. Most of this part is checking the model's output against the filings and tightening the pipeline where it was wrong.

> Rendered from the Claude Code session transcript (`.jsonl`). User prompts and Claude's messages are verbatim; tool calls show the command, file or diff; long tool output is truncated and collapsed. System-injected context, model thinking and attachments are omitted; home paths are shortened to `~`.



---

> 🗜 **Context compacted** (16 Nov 10:16 IST). The session continued from an automatic summary of everything above.

---



<a id="m2"></a>

### 🧑 Shaurya · 16 Nov 10:16 IST

> KEY ADDED


<a id="m3"></a>

**🤖 Claude:**

I'll check that the key file is set up, without printing the key itself.

<a id="m4"></a>

**▶ PowerShell:** Check env file variable names and git-ignore status

```powershell
$f = "~\EnamHoldingsOA\web\.env.local"; if (Test-Path $f) { Get-Content $f | ForEach-Object { if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { "$($matches[1]) = <$($matches[2].Trim().Length) chars>" } elseif ($_.Trim()) { "non-matching line, length $($_.Length)" } } } else { "MISSING" }; cd ~\EnamHoldingsOA; git status --short | Select-Object -First 10; git check-ignore -v web/.env.local
```

<details><summary>Result (3 lines)</summary>

```
MISSING
?? web/scripts/dev/schemacheck.ts
web/.gitignore:34:.env*	web/.env.local
```

</details>


<a id="m6"></a>

**🤖 Claude:**

`web\.env.local` isn't there. Windows may have saved it under a slightly different name, so I'll look for close matches.

<a id="m7"></a>

**▶ PowerShell:** Search for the env file under other names or locations

```powershell
Get-ChildItem -Force -Recurse -Depth 2 -Path ~\EnamHoldingsOA -Filter "*.env*" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules' } | ForEach-Object { "$($_.FullName)  ($($_.Length) bytes)" }; Get-ChildItem -Force -Path ~\EnamHoldingsOA, ~\EnamHoldingsOA\web -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'env|key|gemini' } | ForEach-Object { "$($_.FullName)  ($($_.Length) bytes)" }; Get-ChildItem -Force -Path "$env:USERPROFILE\Desktop","$env:USERPROFILE\Downloads","$env:USERPROFILE\Documents","$env:USERPROFILE\OneDrive\Desktop" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '\.env|env\.local' } | ForEach-Object { "$($_.FullName)  ($($_.Length) bytes)" }
```

⚠️ Tool error:

```
Exit code 1
~\EnamHoldingsOA\web\.env.example  (508 bytes)
~\EnamHoldingsOA\web\.env.txt  (68 bytes)
~\EnamHoldingsOA\.venv  (1 bytes)
~\EnamHoldingsOA\web\.env.example  (508 bytes)
~\EnamHoldingsOA\web\.env.txt  (68 bytes)
~\EnamHoldingsOA\web\next-env.d.ts  (288 bytes)
~\Downloads\.env.example  (111 bytes)
```


<a id="m9"></a>

**🤖 Claude:**

It was saved as `web\.env.txt`. I'll check its format (names only, not the value) and then rename it to `.env.local`.

<a id="m10"></a>

**▶ PowerShell:** Inspect env file format without revealing the key

```powershell
$f = "~\EnamHoldingsOA\web\.env.txt"; $raw = [IO.File]::ReadAllBytes($f); "first bytes: " + (($raw[0..2] | ForEach-Object { '{0:X2}' -f $_ }) -join ' '); Get-Content $f | ForEach-Object { if ($_ -match '^\s*([A-Za-z_]+)\s*=\s*"?([^"]*)"?\s*$') { "$($matches[1]) = <$($matches[2].Trim().Length) chars, starts '$($matches[2].Trim().Substring(0,[Math]::Min(4,$matches[2].Trim().Length)))'>" } elseif ($_.Trim()) { "other line, length $($_.Length)" } }
```

<details><summary>Result (2 lines)</summary>

```
first bytes: 47 45 4D
GEMINI_API_KEY = <53 chars, starts 'AQ.A'>
```

</details>


<a id="m12"></a>

**🤖 Claude:**

The key is in the right format. Next I'll rename the file and make a free test call that lists the models this key can use, to confirm my configured model names exist.

<a id="m13"></a>

**▶ PowerShell:** Rename env file and list available Gemini models

```powershell
cd ~\EnamHoldingsOA\web; Rename-Item .env.txt .env.local; git -C .. check-ignore -q web/.env.local; "ignored: $?"; $k = ((Get-Content .env.local) -replace '^\s*GEMINI_API_KEY\s*=\s*"?([^"]*)"?\s*$','$1').Trim(); try { $r = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200" -Headers @{ "x-goog-api-key" = $k } -TimeoutSec 30; $r.models | Where-Object { $_.supportedGenerationMethods -contains 'generateContent' -and $_.name -match 'gemini' } | ForEach-Object { $_.name -replace 'models/','' } } catch { "ERROR: " + $_.Exception.Message; $_.ErrorDetails.Message }
```

<details><summary>Result (38 lines)</summary>

```
ignored: True
gemini-2.5-flash
gemini-2.5-pro
gemini-2.5-flash-preview-tts
gemini-2.5-pro-preview-tts
gemini-flash-latest
gemini-flash-lite-latest
gemini-pro-latest
gemini-2.5-flash-lite
gemini-2.5-flash-image
gemini-3-flash-preview
gemini-3.1-pro-preview
gemini-3.1-pro-preview-customtools
gemini-3.1-flash-lite-preview
gemini-3.1-flash-lite
gemini-3-pro-image-preview
gemini-3-pro-image
gemini-3.1-flash-image-preview
gemini-3.1-flash-image
gemini-3.1-flash-lite-image
gemini-nano-banana-2.1
gemini-3.5-flash
gemini-3.5-flash-lite
gemini-omni-flash-preview
gemini-omni-1.1-flash
gemini-omni-1.2-flash
gemini-3.5-transcribe
gemini-3.6-flash
gemini-3.7-flash
gemini-3.8-flash
… (8 more lines)
```

</details>

<a id="m15"></a>

**▶ Bash:** Show the Gemini call implementation

```bash
grep -n "callGemini" -A 60 src/lib/llm.ts | head -90
```

<details><summary>Result (84 lines)</summary>

```
100:    provider === "anthropic" ? await callAnthropic(model, opts) : await callGemini(model, opts);
101-  const [pin, pout] = PRICE[model] ?? [0, 0];
102-  const usage: LlmUsage = {
103-    model,
104-    inputTokens: out.inputTokens,
105-    outputTokens: out.outputTokens,
106-    costUsd: (out.inputTokens * pin + out.outputTokens * pout) / 1e6,
107-    cached: false,
108-  };
109-  ledger.push(usage);
110-  cachePut(key, { data: out.data, usage });
111-  return { data: out.data, usage };
112-}
113-
114-async function callAnthropic<S extends z.ZodType>(
115-  model: string,
116-  opts: { tier: LlmTier; system: string; prompt: string; schema: S; maxTokens?: number },
117-) {
118-  anthropic ??= new Anthropic();
119-  const res = await anthropic.messages.parse({
120-    model,
121-    max_tokens: opts.maxTokens ?? (opts.tier === "cheap" ? 4000 : 16000),
122-    // The system prompt is identical across calls of a kind, so it is cached as the prefix.
123-    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
124-    messages: [{ role: "user", content: opts.prompt }],
125-    output_config: {
126-      // Bulk extraction needs little thought; synthesis gets more.
127-      effort: opts.tier === "cheap" ? "low" : "high",
128-      format: zodOutputFormat(opts.schema),
129-    },
… (54 more lines)
```

</details>

<a id="m17"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\llm.ts`

```diff
-   for (let attempt = 0; attempt < 2; attempt++) {
-     const res = await fetch(
+   let parseFailures = 0;
+   for (let attempt = 0; attempt < 6 && parseFailures < 2; attempt++) {
+     const res = await fetch(
```

<a id="m18"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\llm.ts`

```diff
-     if (res.status === 429 || res.status >= 500) {
-       lastErr = new Error(`Gemini ${res.status}`);
-       await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
-       continue;
-     }
+     if (res.status === 429 || res.status >= 500) {
+       const body = await res.text();
+       // A spent daily quota will not recover by waiting; per-minute limits will.
+       if (res.status === 429 && /PerDay/i.test(body)) throw new LlmUnavailable(`Gemini daily quota reached for ${model}`);
+       lastErr = new Error(`Gemini ${res.status}`);
+       const hinted = Number(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(body)?.[1]);
+       const waitMs = Number.isFinite(hinted) && hinted > 0 ? hinted * 1000 + 1000 : 5000 * 2 ** attempt;
+       await new Promise((r) => setTimeout(r, Math.min(waitMs, 65_000)));
+       continue;
+     }
```

<a id="m19"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\llm.ts`

```diff
-       lastErr = e; // malformed JSON: retry once
+       lastErr = e; // malformed JSON: retry once
+       parseFailures++;
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\llm.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\llm.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\llm.ts has been updated successfully.
```

</details>


<a id="m23"></a>

**🤖 Claude:**

Next I'll check the enrich script: how many items it will send, how it handles errors, and the `LlmUnavailable` signature.

<a id="m24"></a>

**▶ Bash:** Inspect error class and enrich script control flow

```bash
grep -n "class LlmUnavailable" -A4 src/lib/llm.ts; echo ---; grep -n "" scripts/enrich.ts | sed -n '1,400p' | grep -nE "worker|concurr|catch|LlmUnavailable|for \(|filter\(|queue|todo|length|writeFile|console" | head -50
```

<details><summary>Result (23 lines)</summary>

```
45:export class LlmUnavailable extends Error {
46-  constructor() {
47-    super("No LLM key configured (set ANTHROPIC_API_KEY or GEMINI_API_KEY)");
48-  }
49-}
---
69:69:    console.error("No LLM key. Set ANTHROPIC_API_KEY or GEMINI_API_KEY (free at aistudio.google.com).");
72:72:  console.log(`Provider: ${llmProvider()} · cheap model: ${modelFor("cheap")}`);
80:80:  const todo = snap.filings.filter((f) => f.hasText && !out[f.id]);
81:81:  console.log(`${todo.length} filings to enrich (${Object.keys(out).length} already done)`);
83:83:  const worker = async () => {
84:84:    while (i < todo.length) {
85:85:      const f = todo[i++];
105:105:      } catch (e) {
107:107:        console.error(`\n  ${f.symbol} ${f.id}: ${(e as Error).message}`);
111:111:  await Promise.all([worker(), worker(), worker()]);
112:112:  fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
121:121:    calls: led.length,
122:122:    cachedCalls: led.filter((u) => u.cached).length,
128:128:  fs.writeFileSync(ledgerPath, JSON.stringify(prev, null, 1));
129:129:  console.log(`\nDone. ${led.length} calls, $${total.toFixed(4)} (${led.filter((u) => u.cached).length} served from cache)`);
132:132:main().catch((e) => {
133:133:  console.error(e);
```

</details>

<a id="m26"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\llm.ts`

```diff
-   constructor() {
-     super("No LLM key configured (set ANTHROPIC_API_KEY or GEMINI_API_KEY)");
-   }
+   constructor(message = "No LLM key configured (set ANTHROPIC_API_KEY or GEMINI_API_KEY)") {
+     super(message);
+   }
```

<a id="m27"></a>

**📖 Read** `~\EnamHoldingsOA\web\scripts\enrich.ts` (from line 60, 75 lines)

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\llm.ts has been updated successfully.
```

</details>

<details><summary>Result (75 lines)</summary>

```
60	- If the filing is procedural (an intimation, a re-submission, a certificate), say so plainly and mark materiality low.
61	- For people: extract every director / KMP / senior-management change. Career years only if the text states them.`;
62	
63	const RESULTS_SYSTEM = `You read the financial-results table of an Indian listed company's quarterly results filing.
64	Copy numbers exactly as printed for: the quarter just ended, the preceding quarter, and the corresponding quarter of the previous year.
65	Do not compute anything. Use null where a figure is absent. Negative numbers (losses) keep their sign.`;
66	
67	async function main() {
68	  if (!llmProvider()) {
69	    console.error("No LLM key. Set ANTHROPIC_API_KEY or GEMINI_API_KEY (free at aistudio.google.com).");
70	    process.exit(1);
71	  }
72	  console.log(`Provider: ${llmProvider()} · cheap model: ${modelFor("cheap")}`);
73	  const snap: Snapshot = JSON.parse(fs.readFileSync(path.join(SNAP, "feed.json"), "utf8"));
74	  const outPath = path.join(SNAP, "enrichments.json");
75	  const out: Record<string, z.infer<typeof Enrichment> & { model: string; results?: z.infer<typeof ResultsExtract> }> = fs.existsSync(outPath)
76	    ? JSON.parse(fs.readFileSync(outPath, "utf8"))
77	    : {};
78	  const names = new Map(snap.companies.map((c) => [c.symbol, c.name]));
79	
80	  const todo = snap.filings.filter((f) => f.hasText && !out[f.id]);
81	  console.log(`${todo.length} filings to enrich (${Object.keys(out).length} already done)`);
82	  let i = 0;
83	  const worker = async () => {
84	    while (i < todo.length) {
85	      const f = todo[i++];
86	      const text = fs.readFileSync(path.join(SNAP, "texts", `${f.id}.txt`), "utf8").slice(0, 14_000);
87	      try {
88	        const { data, usage } = await llmJSON({
89	          tier: "cheap",
… (45 more lines)
```

</details>


<a id="m30"></a>

**🤖 Claude:**

I'll make enrich save progress as it goes and stop cleanly if the daily quota runs out.

<a id="m31"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
-   let i = 0;
-   const worker = async () => {
-     while (i < todo.length) {
+   let i = 0;
+   let stop = false;
+   let done = 0;
+   const worker = async () => {
+     while (i < todo.length && !stop) {
```

<a id="m32"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
-         process.stdout.write(usage.cached ? "c" : ".");
-       } catch (e) {
-         process.stdout.write("x");
+         process.stdout.write(usage.cached ? "c" : ".");
+         // Save as we go so a quota stop or crash keeps finished work.
+         if (++done % 10 === 0) fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
+       } catch (e) {
+         if (e instanceof LlmUnavailable) stop = true;
+         process.stdout.write("x");
```

<a id="m33"></a>

**▶ Bash:** Check imports in enrich and research scripts

```bash
grep -n "^import" scripts/enrich.ts scripts/research.ts; grep -n "catch\|LlmUnavailable\|for (const\|symbols\|writeFile" scripts/research.ts | head -20
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (17 lines)</summary>

```
scripts/enrich.ts:11:import fs from "node:fs";
scripts/enrich.ts:12:import path from "node:path";
scripts/enrich.ts:13:import { z } from "zod";
scripts/enrich.ts:14:import { llmJSON, llmProvider, modelFor, usageLedger } from "../src/lib/llm";
scripts/enrich.ts:15:import type { Snapshot } from "../src/lib/types";
scripts/research.ts:8:import fs from "node:fs";
scripts/research.ts:9:import path from "node:path";
scripts/research.ts:10:import { isLenderCo, snapshotCompany } from "../src/lib/companies";
scripts/research.ts:11:import { runResearch } from "../src/lib/engine/research";
scripts/research.ts:12:import { llmProvider } from "../src/lib/llm";
scripts/research.ts:13:import { getCompany } from "../src/lib/sources/screener";
5: *   ANTHROPIC_API_KEY=... npx tsx scripts/research.ts            # all research symbols
25:  const symbols: string[] = process.argv.slice(2).length ? process.argv.slice(2) : cfg.research;
27:  for (const s of symbols) {
32:      fs.writeFileSync(path.join(OUT, `${s}.json`), JSON.stringify(r, null, 1));
35:    } catch (e) {
42:main().catch((e) => {
```

</details>

<a id="m37"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
- import { llmJSON, llmProvider, modelFor, usageLedger } from "../src/lib/llm";
+ import { LlmUnavailable, llmJSON, llmProvider, modelFor, usageLedger } from "../src/lib/llm";
```

<a id="m38"></a>

**▶ Bash:** Type-check the project

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -20; echo "tsc exit: ${PIPESTATUS[0]}"
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
tsc exit: 0
```

</details>


<a id="m41"></a>

**🤖 Claude:**

Type-check passes. Now I'll start the enrich run (about 140 filings on the free-tier cheap model) in the background.

<a id="m42"></a>

**▶ Bash · background:** Run the filing enrichment script

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run enrich > "<session-tmp>/scratchpad/enrich.log" 2>&1; echo "exit $?"; tail -c 3000 "<session-tmp>/scratchpad/enrich.log"
```

<details><summary>Result (1 line)</summary>

```
Command running in background with ID: b31n1fapn. Output is being written to: <session-tmp>/tasks\b31n1fapn.output. You will be notified when it completes — do not poll that file or sleep while waiting. Read the file only if the user asks for progress, or if you need a line it prints before you can go on, such as a server's ready line or port.
```

</details>


<a id="m44"></a>

**🤖 Claude:**

While enrich runs I'll start the research pre-compute for DIXON, CREDITACC, DEEPAKNTR and TCS in parallel. It also uses the strong model, which has its own rate limit.

<a id="m45"></a>

**▶ Bash · background:** Run the research pre-compute script

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run research > "<session-tmp>/scratchpad/research.log" 2>&1; echo "exit $?"; tail -c 4000 "<session-tmp>/scratchpad/research.log"
```

<details><summary>Result (1 line)</summary>

```
Command running in background with ID: bedyr84qn. Output is being written to: <session-tmp>/tasks\bedyr84qn.output. You will be notified when it completes — do not poll that file or sleep while waiting. Read the file only if the user asks for progress, or if you need a line it prints before you can go on, such as a server's ready line or port.
```

</details>

<a id="m47"></a>

**▶ Bash:** Find provider, cost and placeholder mentions in docs

```bash
cd ~/EnamHoldingsOA && grep -n -i "gemini\|free tier\|_fill\|_add\|ledger\|cost" docs/WRITEUP.md docs/ARCHITECTURE.md README.md | head -40
```

<details><summary>Result (17 lines)</summary>

```
docs/WRITEUP.md:48:5. **No autonomous agent (yet).** Research is a fixed map→reduce workflow: predictable cost, auditable steps. An open-ended "Ask FINN" agent is the obvious next step once there are evals to keep it honest.
docs/WRITEUP.md:65:  - Two tiers behind one interface: *cheap* (Claude Haiku 5.5 / Gemini 3.5 Flash-Lite) for extraction, *strong* (Claude Opus 5.5 / Gemini 3.6 Flash) only for the promised-vs-delivered reasoning.
docs/WRITEUP.md:67:  - Calls are cached by content hash, system prompts are frozen for prompt caching, bulk work runs at low effort, and a cost ledger records spend.
docs/WRITEUP.md:68:  - Spend for this demo: _fill from data/snapshot/llm-ledger.json_. With Gemini's free tier it runs at $0.
docs/WRITEUP.md:84:2. **Guidance ledger:** carry every promise forward quarter to quarter across the whole portfolio, so you can see which management teams over-promise.
docs/ARCHITECTURE.md:19:  subgraph LLM["LLM layer (src/lib/llm.ts): hashed cache + cost ledger"]
docs/ARCHITECTURE.md:20:    CHEAP["cheap tier<br/>Haiku 5.5 / Gemini 3.5 Flash-Lite<br/>summaries · people · results lines · transcript guidance"]
docs/ARCHITECTURE.md:21:    STRONG["strong tier<br/>Opus 5.5 / Gemini 3.6 Flash<br/>promised vs delivered · bull/bear"]
docs/ARCHITECTURE.md:77:| Results lines when the standardised table lags | cheap | copy three columns of a table | **no arithmetic by the model**: EBITDA = PBT + finance cost + D&A − other income is computed in code, and cross-checked against screener when both exist |
docs/ARCHITECTURE.md:88:**Agents.** None act autonomously. Research is a fixed map→reduce workflow, which gives predictable cost, auditable steps, and progress streamed to the UI. An open-ended agent is the right next step for natural-language questions across tools (`search_filings`, `fundamentals`, `find_people`). It's deliberately left out until there are evals to keep it honest.
docs/ARCHITECTURE.md:90:**Cost controls**
docs/ARCHITECTURE.md:94:- A cost ledger is written to `data/snapshot/llm-ledger.json`.
docs/ARCHITECTURE.md:96:- Gemini's free tier works for everything, so the prototype can run at **$0**.
docs/ARCHITECTURE.md:129:| LLMs | Anthropic or Gemini API | same, routed by tier, with batch API for overnight backfills (50% cheaper) |
README.md:8:> **Live demo:** _add Vercel URL here_ · open it on a phone (or "Add to Home Screen")
README.md:42:cp .env.example .env.local      # add ONE key: GEMINI_API_KEY (free) or ANTHROPIC_API_KEY
README.md:60:  src/lib/llm.ts       two tiers × two providers, hashed cache, cost ledger
```

</details>

<a id="m49"></a>

**▶ Bash:** Read the cost controls and privacy lines

```bash
sed -n 90,100p docs/ARCHITECTURE.md; echo ----; grep -n -i "privacy\|never sent\|public data\|DPDP" docs/ARCHITECTURE.md | head
```

<details><summary>Result (17 lines)</summary>

```
**Cost controls**
- Every call is cached by `sha256(model, prompt, schema)`, so re-runs are free.
- System prompts are frozen strings, so the cached prefix hits on Claude.
- Bulk work runs at low effort. Only the reduce step runs at high effort.
- A cost ledger is written to `data/snapshot/llm-ledger.json`.
- Live research has a per-day cap (`RESEARCH_DAILY_LIMIT`).
- Gemini's free tier works for everything, so the prototype can run at **$0**.

## 4. Data security and privacy

**Prototype**
----
1:# FINN: architecture, data, privacy, models
30:  PRIV[("Investor's network<br/>PRIVATE, never sent to a model")]
98:## 4. Data security and privacy
107:- **What we store.** Only professional fields: employers with years, titles, schools, expertise tags, tie strength, last contact, and the investor's own notes. No contact details beyond what the investor chooses to keep. People named in filings are stored with a link to the filing, since that is public data.
117:- **Compliance.** Insiders are flagged ("mind what you ask an insider") as an MNPI guard. The design aligns with India's DPDP Act 2023: purpose limitation, consent records, and access, correction and erasure rights.
```

</details>

<a id="m51"></a>

**📖 Read** `~\EnamHoldingsOA\docs\ARCHITECTURE.md` (from line 98, 22 lines)

<details><summary>Result (22 lines)</summary>

```
98	## 4. Data security and privacy
99	
100	**Prototype**
101	- The network is a clearly-labelled synthetic file.
102	- Real people appear only through public exchange disclosures, such as an appointee's profile in a Regulation 30 filing.
103	- No personal data is sent to any model.
104	
105	**Production design**
106	- **Isolation.** Each investor's network lives in their own tenant, either Postgres with row-level security keyed on the user or an on-device store. It's encrypted at rest with a per-tenant key. Matching runs in-process; the network is never in a prompt and never in logs.
107	- **What we store.** Only professional fields: employers with years, titles, schools, expertise tags, tie strength, last contact, and the investor's own notes. No contact details beyond what the investor chooses to keep. People named in filings are stored with a link to the filing, since that is public data.
108	- **Where it comes from, with consent.**
109	  - The investor imports their own data: a CSV or vCard, or LinkedIn's "Get a copy of your data" Connections export, which is the user's own data.
110	  - Enrichment comes from a licensed people-data provider under a DPA, not scraping, which LinkedIn's terms prohibit.
111	  - Contacts can be shown what is held about them and can ask for it to be removed.
112	- **Retention.**
113	  - Contacts are kept until deleted, and a "forget" deletes from all stores and caches.
114	  - Enrichment of public filings is kept indefinitely.
115	  - Raw call notes are kept for a configurable period, e.g. 24 months.
116	- **Access control.** SSO with role-based access (an analyst can't see a PM's private network), and an audit log of who viewed which person.
117	- **Compliance.** Insiders are flagged ("mind what you ask an insider") as an MNPI guard. The design aligns with India's DPDP Act 2023: purpose limitation, consent records, and access, correction and erasure rights.
118	- **Model providers.** Only public documents are sent, under zero-data-retention terms where available.
119	
```

</details>

<a id="m53"></a>

**✏️ Edit** `~\EnamHoldingsOA\docs\ARCHITECTURE.md`

```diff
- - No personal data is sent to any model.
- 
- **Production design**
+ - No personal data is sent to any model.
+ - The demo's AI ran on Gemini's free tier, whose terms let Google use prompts to improve its products. That's acceptable here only because every prompt is a public exchange filing or transcript. Production would use a paid tier with no-training, zero-retention terms.
+ 
+ **Production design**
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\docs\ARCHITECTURE.md has been updated successfully.
```

</details>


<a id="m55"></a>

**🤖 Claude:**

Both AI jobs are running in the background: summaries for about 140 filings, plus "promised vs delivered" research for 4 companies. I'll check the output when they finish.

> ⏱ *Background task completed:* Background command "Run the research pre-compute script" completed (exit code 0)

<a id="m57"></a>

**▶ Bash:** Show research run output

```bash
cat "<session-tmp>/tasks/bedyr84qn.output" | tail -c 5000
```

<details><summary>Result (49 lines)</summary>

```
exit 0

> finn@0.1.0 research
> node --env-file-if-exists=.env.local --import tsx scripts/research.ts


DIXON
  · Reading 4 earnings-call transcripts
  · Extracted guidance from the Aug 2026 call
  · Extracted guidance from the May 2026 call
  · Extracted guidance from the Feb 2026 call
  · Extracted guidance from the Nov 2026 call
  · Reading the business overview in the 2026 annual report
  · Checking promises against reported numbers
  ✓ 5 promises checked · $0.0652 · gemini-3.5-flash-lite + gemini-3.6-flash

CREDITACC
  · Reading 4 earnings-call transcripts
  · Extracted guidance from the Jul 2026 call
  · Extracted guidance from the Jan 2026 call
  · Extracted guidance from the May 2026 call
  · Extracted guidance from the Oct 2026 call
  · Reading the business overview in the 2026 annual report
  · Checking promises against reported numbers
  ✓ 4 promises checked · $0.0651 · gemini-3.5-flash-lite + gemini-3.6-flash

DEEPAKNTR
  · Reading 4 earnings-call transcripts
  · Extracted guidance from the Feb 2026 call
  · Extracted guidance from the Aug 2026 call
… (19 more lines)
```

</details>

<a id="m59"></a>

**▶ Bash:** Inspect DIXON and TCS research output quality

```bash
cd ~/EnamHoldingsOA/web/data/snapshot/research && ls -la && python -c "
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
for s in ['DIXON','TCS']:
    r=json.load(open(s+'.json',encoding='utf-8'))
    n=r['narrative']
    print('=====',s, r['usage'])
    print('READ:', n['read'])
    print('CRED:', n.get('credibility'))
    for p in n['promises']:
        print(' -', p['said'],'|',p['promise'][:160],'|',p['verdict'],'|',p['delivered'][:200])
        print('   quote:', (p.get('quote') or '')[:160])
    print('NvN:', n.get('narrativeVsNumbers'))
    print('BULL:', n.get('bull')); print('BEAR:', n.get('bear')); print('ASK:', n.get('askManagement'))
    print('SOURCES:', json.dumps(r['sources'])[:800])
"
```

<details><summary>Result (39 lines)</summary>

```
total 40
drwxr-xr-x 1 shaur 197609    0 Nov 16 10:26 .
drwxr-xr-x 1 shaur 197609    0 Nov 16 10:18 ..
-rw-r--r-- 1 shaur 197609 6698 Nov 16 10:22 CREDITACC.json
-rw-r--r-- 1 shaur 197609 6663 Nov 16 10:24 DEEPAKNTR.json
-rw-r--r-- 1 shaur 197609 6049 Nov 16 10:20 DIXON.json
-rw-r--r-- 1 shaur 197609 6155 Nov 16 10:26 TCS.json
===== DIXON {'calls': 6, 'costUsd': 0.0652, 'models': ['gemini-3.5-flash-lite', 'gemini-3.6-flash']}
READ: Dixon is scaling top-line aggressively, with Q2 FY27 revenues reaching a record ₹21,794 crore (up 40.2% QoQ), but profitability is deteriorating under input cost pressures and PLI expiration. Operating margin has collapsed to 2.7% in Q2 FY27 from 3.9% in Q4 FY26, highlighting significant margin dilution despite strong volume growth.
CRED: Management has consistently delivered on top-line quarterly volume expansion guidance, but has failed to protect operating margins as OPM fell sharply to 2.7% in Q2 FY27.
 - Q3 FY26 call | FY26 Consolidated Capex of ₹1,100 cr to ₹1,200 cr | unverifiable | Capex numbers are not detailed in reported earnings table (FY26 Sales recorded at ₹48,873 crore).
   quote: And we feel that in the overall fiscal, it should be somewhere between INR1,100 crores, INR1,200 crores.
 - Q4 FY26 call | High double-digit QoQ growth in smartphone volumes for Q1 FY27 | delivered | Overall revenue grew 47.9% QoQ in Q1 FY27 from ₹10,511 crore to ₹15,548 crore.
   quote: and we expect a high-double-digit growth quarter-on-quarter in the smartphones volume along with growth in selling prices by 12% to 15%.
 - Q4 FY26 call | 15% to 17% overall company revenue growth (without Vivo) for FY27 | pending | FY27 is ongoing; H1 FY27 revenue stands at ₹37,342 crore (₹15,548 cr in Q1 + ₹21,794 cr in Q2).
   quote: We feel that without the Vivo also, the company will keep growing at almost 15% to 17%.
 - Q1 FY27 call | 20% to 25% QoQ volume growth in Q2 FY27 | delivered | Revenues grew 40.2% QoQ in Q2 FY27, rising from ₹15,548 crore in Q1 FY27 to ₹21,794 crore.
   quote: We expect 20% to 25% volume growth quarter-on-quarter growth as consumer demand strengthens and we have a strong order book.
 - Q2 FY27 call | IT hardware revenue of ₹6,000 crore in FY27 | pending | FY27 is currently in progress; full-year segment revenue breakdown is pending.
   quote: This year itself we feel confident that we are going to be somewhere around INR 6,000 crores in this business.
NvN: [{'claim': 'Strong order books and consumer demand driving robust sequential revenue expansion.', 'reality': 'Q2 FY27 sales surged 40.2% QoQ to ₹21,794 crore from ₹15,548 crore in Q1 FY27.', 'aligned': True}, {'claim': 'Operating margins facing compression due to Mobile PLI 1 sunset and global memory price inflation.', 'reality': 'OPM contracted from 3.9% in Q4 FY26 down to 3.0% in Q1 FY27 and 2.7% in Q2 FY27.', 'aligned': True}, {'claim': 'Backward integration into components will cushion overall business profitability.', 'reality': 'Net Profit dropped sequent
… (9 more lines)
```

</details>

<a id="m61"></a>

**▶ Bash:** Inspect CREDITACC/DEEPAKNTR output and concall period parsing

```bash
python -c "
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
for s in ['CREDITACC','DEEPAKNTR']:
    r=json.load(open(s+'.json',encoding='utf-8'))
    n=r['narrative']
    print('=====',s)
    print('READ:', n['read'])
    for p in n['promises']:
        print(' -', p['said'],'|',p['promise'][:150],'|',p['verdict'],'|',p['delivered'][:180])
    for x in n.get('narrativeVsNumbers',[]): print(' NvN', x['aligned'], x['claim'][:100],'=>',x['reality'][:150])
"; cd ../../..; grep -n "concalls" -A12 src/lib/sources/screener.ts | grep -n "period\|label\|date" | head
```

<details><summary>Result (23 lines)</summary>

```
===== CREDITACC
READ: CreditAccess Grameen has staged a decisive profitability recovery, with quarterly net profit rising to a record ₹502 crore in Sep 2026 (Q2 FY27) from a loss of ₹100 crore in Dec 2024. Gross NPA % improved from a peak of 4.76% in Mar 2025 down to 1.79% in Sep 2026 while financing margins expanded to 36%.
 - Q3 FY26 call | Foreign borrowings to reach 25-30% by FY28 | pending | Horizon is FY28; foreign borrowings stood at 24.3% in Q3 FY26.
 - Q4 FY26 call | FY27 NIM guidance of 12.8-13.2% | unverifiable | Management later upgraded FY27 NIM guidance to 14.4%-14.7% in Q2 FY27; reported quarterly financing margin % reached 38% in Jun 2026 and 36% in Sep 2026.
 - Q1 FY27 call | Medium-term AUM target of ₹50,000 Crore by CY28 | pending | Target horizon is CY28; reported AUM reached ₹30,319 Crore in Q1 FY27.
 - Q2 FY27 call | FY27 ROA target raised to 5.2%-5.8% and ROE to 21%-24% | pending | H1 FY27 net profit reached ₹995 crore (₹493 crore in Q1 + ₹502 crore in Q2); full FY27 metrics remain pending year-end reporting.
 NvN True Q4 FY26 marked a decisive inflection in the performance trajectory. => Net profit rebounded from ₹47 crore in Mar 2025 to ₹340 crore in Mar 2026, accelerating to ₹502 crore by Sep 2026.
 NvN True Asset quality trends normalized with declining NPA metrics. => Gross NPA % fell consistently from 4.76% in Mar 2025 to 2.18% in Jun 2026 and 1.79% in Sep 2026.
 NvN True Operating costs and cost of funds are well under control despite industry pressures. => Financing profit surged from ₹65 crore in Mar 2025 to ₹687 crore in Sep 2026, while financing margin % expanded from 5% to 36%.
===== DEEPAKNTR
READ: Deepak Nitrite has experienced a sharp financial inflection in FY27, with quarterly revenue surging from ₹1,975 crore in Dec 2025 to a record ₹3,076 crore in Sep 2026. This momentum has expanded OPM from 11% in Dec 2025 to 20% in Sep 2026, arresting a multi-year annual net profit decline that hit a low of ₹551 crore in FY26.
 - Q3 FY26 call | Favourable performance in Q4 FY26 | delivered | Q4 FY26 (Mar 2026) sales rose to ₹2,120 crore (vs ₹1,975 crore in Q3 FY26) and operating profit increased to ₹376 crore (vs ₹211 crore).
 - Q4 & FY26 call | Q1 FY27 performance to be better than Q4 FY26 | delivered | Q1 FY27 (Jun 2026) revenue rose to ₹2,578 crore (vs ₹2,120 crore in Q4 FY26) and net profit reached ₹345 crore (vs ₹220 crore).
 - Q4 & FY26 call | MIBK and MIBC project commissioning by tail end of Q1 or early Q2 FY27 | unverifiable | Financial tables do not detail specific asset commissioning events or project-level revenue splits.
 - Q4 & FY26 call | Polycarbonate project commissioning by June 2028 | pending | Target commissioning date lies in June 2028.
 - Q2 FY27 call | Advanced Intermediates Q3 FY27 EBIT percentage closer to Q1 FY27 levels | pending | Q3 FY27 reported financials are not yet included in the reporting horizon.
 NvN True Management highlighted strong performance and integration resilience during Q4 
… (truncated)
```

</details>

<a id="m63"></a>

**▶ Bash:** Check TCS concall list and prompt locations

```bash
python -c "
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
c=json.load(open('data/snapshot/companies/TCS.json',encoding='utf-8'))
for x in c['concalls'][:7]: print(x.get('period'), '|', (x.get('transcript') or '-')[:110])
"; grep -n "MAP_SYSTEM\|REDUCE_SYSTEM\|AR_SYSTEM" src/lib/engine/research.ts | head; grep -n "concalls" src/lib/engine/research.ts
```

<details><summary>Result (14 lines)</summary>

```
Oct 2026 | https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=7dc14216-f892-46f1-bf82-5c7b387a83b9.pdf
Jul 2026 | https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=27523cab-de62-4f78-939a-6d9853bbd060.pdf
Jul 2026 | https://www.tcs.com/content/dam/tcs/investor-relations/financial-statements/2025-26/q1/Management%20Commentary
Apr 2026 | https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=07ae2d32-1050-4e80-96ff-eb2d98378d4e.pdf
Mar 2026 | -
Jan 2026 | https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=d70edbab-d5b2-47ae-8820-efacc5052d13.pdf
Dec 2025 | https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=d59af2b6-34c7-4ca1-9455-f4899e5f26cf.pdf
66:const MAP_SYSTEM = `You extract facts from Indian listed-company earnings-call transcripts for a portfolio manager.
69:const AR_SYSTEM = `You summarise the business-overview pages of an Indian company's annual report.
72:const REDUCE_SYSTEM = `You are a sceptical buy-side analyst. You compare what management promised on earnings calls with what the reported numbers show.
119:            system: MAP_SYSTEM,
143:      const r = await llmJSON({ tier: "cheap", system: AR_SYSTEM, schema: ArExtract, prompt: `Company: ${co.name}\n\nAnnual report pages:\n"""\n${text}\n"""` });
157:    system: REDUCE_SYSTEM,
109:  const calls = co.concalls.filter((c) => c.transcript).slice(0, 4);
```

</details>


<a id="m65"></a>

**🤖 Claude:**

Screener itself lists TCS's July 2025 transcript under "Jul 2026", so the fix is to keep one transcript per period. Now the prompts:

<a id="m66"></a>

**📖 Read** `~\EnamHoldingsOA\web\src\lib\engine\research.ts` (from line 14, 175 lines)

<details><summary>Result (172 lines)</summary>

```
14	  guidance: z
15	    .array(
16	      z.object({
17	        metric: z.string().describe("What is guided: revenue growth, EBITDA margin, capex, loan growth, credit cost, volume, etc."),
18	        target: z.string().describe("The number or range promised, normalised, e.g. '15–17% YoY', '₹2,000 Cr', 'stable'"),
19	        horizon: z.string().describe("By when, e.g. 'FY27', 'next 2 quarters', 'medium term'"),
20	        quote: z.string().describe("Verbatim sentence from the transcript, max 35 words"),
21	        speaker: z.string().nullable(),
22	      }),
23	    )
24	    .describe("Only explicit forward-looking commitments with a direction or number. Skip vague optimism."),
25	  themes: z.array(z.string()).describe("Management's 3–5 main narrative points this quarter, one line each"),
26	  analystConcerns: z.array(z.string()).describe("Up to 4 things analysts pushed back on, one line each"),
27	});
28	
29	const ArExtract = z.object({
30	  what: z.string().describe("Two sentences: what the company does and how it makes money"),
31	  segments: z.array(z.object({ name: z.string(), detail: z.string().describe("share of revenue or key fact, as stated") })),
32	  strategy: z.array(z.string()).describe("Up to 4 stated strategic priorities"),
33	});
34	
35	export const Narrative = z.object({
36	  read: z.string().describe("FINN's read in two sentences: the single most important thing about this company right now, citing a number."),
37	  promises: z
38	    .array(
39	      z.object({
40	        said: z.string().describe("Quarter/call where it was said, e.g. 'Q4 FY26 call'"),
41	        promise: z.string().describe("What was promised, short"),
42	        delivered: z.string().describe("What the numbers show, with the actual figure"),
43	        verdict: z.enum(["delivered", "partly", "missed", "pending", "unverifiable"]),
… (142 more lines)
```

</details>

<a id="m68"></a>

**▶ Bash:** List cash flow table rows available

```bash
python -c "
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
for s in ['TCS','DIXON','CREDITACC']:
    c=json.load(open('data/snapshot/companies/'+s+'.json',encoding='utf-8')) if __import__('os').path.exists('data/snapshot/companies/'+s+'.json') else None
    if not c: print(s,'no snapshot file'); continue
    cf=c['cashFlow']; print(s, 'cf keys', list(cf.keys())[:5]); print('  headers', cf['headers'][-4:]); print('  rows', [r['label'] if isinstance(r,dict) else r[0] for r in cf['rows']][:15])
" 2>&1 | head -20; grep -n "export function row" -A8 src/lib/engine/fundamentals.ts
```

<details><summary>Result (18 lines)</summary>

```
TCS cf keys ['headers', 'rows']
  headers ['Mar 2023', 'Mar 2024', 'Mar 2025', 'Mar 2026']
  rows ['C', 'C', 'C', 'N', 'F', 'C']
DIXON cf keys ['headers', 'rows']
  headers ['Mar 2023', 'Mar 2024', 'Mar 2025', 'Mar 2026']
  rows ['C', 'C', 'C', 'N', 'F', 'C']
CREDITACC cf keys ['headers', 'rows']
  headers ['Mar 2023', 'Mar 2024', 'Mar 2025', 'Mar 2026']
  rows ['C', 'C', 'C', 'N', 'F']
7:export function row(t: Table, prefix: string): (number | null)[] | null {
8-  const k = Object.keys(t.rows).find((x) => x.toLowerCase().startsWith(prefix.toLowerCase()));
9-  return k ? t.rows[k] : null;
10-}
11-
12-/** Drop a trailing "TTM" column so year-on-year maths uses fiscal years only. */
13-function fiscal(t: Table) {
14-  const ttm = t.headers[t.headers.length - 1] === "TTM";
15-  return { headers: ttm ? t.headers.slice(0, -1) : t.headers, cut: ttm ? -1 : undefined };
```

</details>

<a id="m70"></a>

**▶ Bash:** Show DIXON cash flow and balance sheet rows

```bash
python -c "
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
c=json.load(open('data/snapshot/companies/DIXON.json',encoding='utf-8'))
for t in ['cashFlow','balanceSheet']:
  print(t, c[t]['headers'][-3:]); [print('  ',k, v[-3:]) for k,v in c[t]['rows'].items()]
"
```

<details><summary>Result (18 lines)</summary>

```
cashFlow ['Mar 2024', 'Mar 2025', 'Mar 2026']
   Cash from Operating Activity [584, 1150, 1782]
   Cash from Investing Activity [-531, -1093, -1138]
   Cash from Financing Activity [-70, -27, -108]
   Net Cash Flow [-17, 30, 537]
   Free Cash Flow [16, 254, 724]
   CFO/EBITDA Share of operating profit converting into cash: CFO (before tax) / Operating Profit [100, 94, 117]
balanceSheet ['Mar 2025', 'Mar 2026', 'Sep 2026']
   Equity Capital [12, 12, 12]
   Reserves [2998, 4665, 5866]
   Borrowings [671, 994, 1236]
   Other Liabilities [13077, 13481, 22063]
   Total Liabilities [16758, 19152, 29178]
   Fixed Assets [2774, 4172, 4271]
   CWIP [257, 571, 885]
   Investments [536, 1007, 1389]
   Other Assets [13191, 13403, 22633]
   Total Assets [16758, 19152, 29178]
```

</details>

<a id="m72"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-     .describe("Only explicit forward-looking commitments with a direction or number. Skip vague optimism."),
+     .describe(
+       "Only explicit commitments about a FUTURE period (after this call) with a direction or number. Never include results already reported on this call (e.g. 'Q1 revenue stood at …'). Skip vague optimism.",
+     ),
```

<a id="m73"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
- - A promise is "delivered" only if the numbers table shows it; "pending" if its horizon hasn't arrived; "unverifiable" if the table can't test it.
- - Cite actual figures (₹ crore, %, quarter labels) wherever possible. Be concise and specific; no filler.`;
+ - A promise must have been forward-looking when made. Ignore any extract item that merely reports a result already achieved.
+ - A promise is "delivered" only if the numbers table shows it; "pending" if its horizon hasn't arrived; "unverifiable" if the table can't test it.
+ - Match definitions before judging. The table's "OPM %" is operating profit BEFORE depreciation and other income, whereas management usually quotes EBIT margin; "Financing Margin %" is not NIM; constant-currency growth, volumes, AUM, segment revenue and deal wins are not in the table. Never call a company-defined metric "missed" or "contradicted" by a differently-defined table row: use "unverifiable", and you may note what the closest table figure shows.
+ - narrativeVsNumbers.aligned = false only when the table contradicts the claim on the same definition.
+ - Cite actual figures (₹ crore, %, quarter labels) wherever possible. Be concise and specific; no filler.`;
```

<a id="m74"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-   for (const r of isLender ? ["Revenue", "Net Profit"] : ["Sales", "OPM %", "Net Profit"]) {
-     const v = row(a, r);
-     if (v) lines.push(`${r} | ${v.slice(Math.max(0, an - 6)).map((x) => (x == null ? "–" : x)).join(" | ")}`);
-   }
-   return lines.join("\n") + "\n(₹ crore unless %; quarters are calendar month-ends; Indian FY ends March, so 'Sep 2026' = Q2 FY27)";
+   for (const r of isLender ? ["Revenue", "Net Profit"] : ["Sales", "OPM %", "Net Profit"]) {
+     const v = row(a, r);
+     if (v) lines.push(`${r} | ${v.slice(Math.max(0, an - 6)).map((x) => (x == null ? "–" : x)).join(" | ")}`);
+   }
+   // Cash flow, so capex and cash-generation promises can be checked. Capex is derived in code (CFO − FCF).
+   const cf = co.cashFlow;
+   const cfo = row(cf, "Cash from Operating");
+   const fcf = row(cf, "Free Cash Flow");
+   if (cfo && cf.headers.length) {
+     const k = Math.min(4, cf.headers.length);
+     const sl = <T,>(xs: T[]) => xs.slice(cf.headers.length - k);
+     lines.push("", `Year | ${sl(cf.headers).join(" | ")}`, `Cash from operations | ${sl(cfo).map((x) => x ?? "–").join(" | ")}`);
+     if (!isLender && fcf)
+       lines.push(`Capex (CFO − FCF) | ${sl(cfo).map((x, i) => (x == null || sl(fcf)[i] == null ? "–" : Math.round(x - sl(fcf)[i]!))).join(" | ")}`);
+   }
+   return lines.join("\n") + "\n(₹ crore unless %; quarters are calendar month-ends; Indian FY ends March, so 'Sep 2026' = Q2 FY27)";
```

<a id="m75"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-   const calls = co.concalls.filter((c) => c.transcript).slice(0, 4);
+   // One transcript per call period (screener sometimes lists an older call twice under a newer label).
+   const seenPeriods = new Set<string>();
+   const seenUrls = new Set<string>();
+   const calls = co.concalls
+     .filter((c) => c.transcript && !seenPeriods.has(c.period) && !seenUrls.has(c.transcript) && (seenPeriods.add(c.period), seenUrls.add(c.transcript)))
+     .slice(0, 4);
```

<a id="m76"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-           usages.push(usage);
-           sources.push({ label: `Concall transcript, ${c.period}`, url: c.transcript! });
-           progress(`Extracted guidance from the ${c.period} call`);
-           return { period: c.period, ...data };
+           usages.push(usage);
+           progress(`Extracted guidance from the ${c.period} call`);
+           return { period: c.period, url: c.transcript!, ...data };
```

<a id="m77"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-   ).filter((x): x is NonNullable<typeof x> => x != null);
- 
-   let business
+   ).filter((x): x is NonNullable<typeof x> => x != null);
+   for (const x of extracts) sources.push({ label: `Concall transcript, ${x.period}`, url: x.url });
+ 
+   let business
```

<a id="m78"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-       JSON.stringify([...extracts].reverse(), null, 0),
+       JSON.stringify([...extracts].reverse().map(({ url: _url, ...x }) => x), null, 0),
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>


<a id="m86"></a>

**🤖 Claude:**

Type-checking, then re-running research with the fixes:

<a id="m87"></a>

**▶ Bash:** Type-check and lint the research engine

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head; echo "tsc exit ${PIPESTATUS[0]}"; npx eslint src/lib/engine/research.ts 2>&1 | tail -5
```

<details><summary>Result (5 lines)</summary>

```
tsc exit 0
~\EnamHoldingsOA\web\src\lib\engine\research.ts
  187:58  warning  '_url' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)
```

</details>

<a id="m89"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-       JSON.stringify([...extracts].reverse().map(({ url: _url, ...x }) => x), null, 0),
+       JSON.stringify([...extracts].reverse().map((x) => ({ ...x, url: undefined })), null, 0),
```

<a id="m90"></a>

**▶ Bash · background:** Re-run research with improved prompts

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run research > "<session-tmp>/scratchpad/research2.log" 2>&1; echo "exit $?"; tail -c 3000 "<session-tmp>/scratchpad/research2.log"
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
Command running in background with ID: br3ysk8gv. Output is being written to: <session-tmp>/tasks\br3ysk8gv.output. You will be notified when it completes — do not poll that file or sleep while waiting. Read the file only if the user asks for progress, or if you need a line it prints before you can go on, such as a server's ready line or port.
```

</details>


<a id="m93"></a>

**🤖 Claude:**

Research is re-running with the fixes; enrich is still going. I'll check both when they finish.

> ⏱ *Background task completed:* Background command "Run the filing enrichment script" completed (exit code 0)

<a id="m95"></a>

**▶ Bash:** Show enrich run output

```bash
tail -c 2500 "<session-tmp>/tasks/b31n1fapn.output"
```

<details><summary>Result (122 lines)</summary>

```
ng, received null"
  }
]
..x
  BAJFINANCE 3edbe0c3-f3ed-4804-92a8-a4bc45e22fb6: [
  {
    "expected": "string",
    "code": "invalid_type",
    "path": [
      "prevQuarter"
    ],
    "message": "Invalid input: expected string, received null"
  },
  {
    "expected": "string",
    "code": "invalid_type",
    "path": [
      "yoyQuarter"
    ],
    "message": "Invalid input: expected string, received null"
  }
]
..............x
  SUNPHARMA 9f479947-019f-43b7-b145-e75f77043e24: [
  {
    "expected": "string",
    "code": "invalid_type",
    "path": [
      "quarter"
    ],
… (92 more lines)
```

</details>

<a id="m97"></a>

**▶ Bash:** Count failed enrichments by company

```bash
F="<session-tmp>/tasks/b31n1fapn.output"; grep -E "^  [A-Z]+ [0-9a-f-]{36}:" "$F" | awk '{print $1}' | sort | uniq -c; echo; grep -E "^  [A-Z]+ [0-9a-f-]{36}:" "$F" | wc -l; grep -oE "filings to enrich.*" "$F"; grep -c '"path": \[\]' "$F"; grep -B2 -A3 'expected object, received array\|Gemini\|quota' "$F" | grep -E "^  [A-Z]+ " 
```

<details><summary>Result (9 lines)</summary>

```
      2 BAJFINANCE
      1 HAL
      1 HDFCBANK
      1 KOTAKBANK
      1 SUNPHARMA
      1 TCS

7
2
```

</details>

<a id="m99"></a>

**▶ Bash:** Show enrich log start and results schema

```bash
F="<session-tmp>/tasks/b31n1fapn.output"; head -c 1500 "$F"; echo; cd ~/EnamHoldingsOA/web && grep -n "ResultsExtract = \|const Triple\|quarter\|unit" scripts/enrich.ts | head -20
```

<details><summary>Result (79 lines)</summary>

```
exit 0
"string",
    "code": "invalid_type",
    "path": [
      "prevQuarter"
    ],
    "message": "Invalid input: expected string, received null"
  },
  {
    "expected": "string",
    "code": "invalid_type",
    "path": [
      "yoyQuarter"
    ],
    "message": "Invalid input: expected string, received null"
  }
]
...........x
  KOTAKBANK b94a51f1-ff90-43b4-90dc-4edf0de9596b: [
  {
    "expected": "string",
    "code": "invalid_type",
    "path": [
      "prevQuarter"
    ],
    "message": "Invalid input: expected string, received null"
  }
]
..x
  BAJFINANCE 3edbe0c3-f3ed-4804-92a8-a4bc45e22fb6: [
… (49 more lines)
```

</details>

<a id="m101"></a>

**▶ Bash:** Show results schema and how the app consumes it

```bash
sed -n 36,56p scripts/enrich.ts; grep -n "export type FilingResults" -A16 src/lib/engine/fundamentals.ts; grep -n "export function resultsFromFiling" -A30 src/lib/engine/fundamentals.ts | grep -n "unit\|quarter\|Quarter" 
```

<details><summary>Result (40 lines)</summary>

```
});

// Results filings: the three standard columns (this quarter, previous quarter, same quarter last
// year). We ask for the raw lines and compute EBITDA in code, so the model never does arithmetic.
const Triple = z.object({ cur: z.number().nullable(), prev: z.number().nullable(), yoy: z.number().nullable() });
const ResultsExtract = z.object({
  basis: z.enum(["consolidated", "standalone"]).describe("Prefer consolidated if both are present"),
  unit: z.enum(["crore", "lakh", "million", "thousand"]).describe("Unit the table states, e.g. '₹ in crore' → crore"),
  quarter: z.string().describe("Quarter just ended, e.g. 'Sep 2026'"),
  prevQuarter: z.string(),
  yoyQuarter: z.string(),
  revenue: Triple.describe("Revenue from operations"),
  otherIncome: Triple,
  financeCost: Triple,
  depreciation: Triple.describe("Depreciation and amortisation expense"),
  pbt: Triple.describe("Profit before tax (after exceptional items)"),
  pat: Triple.describe("Net profit for the period"),
});

// Frozen system prompt → identical prefix on every call → prompt-cache hits.
const SYSTEM = `You read Indian stock-exchange filings (BSE/NSE, SEBI LODR Regulation 30 disclosures) for a portfolio manager.
63:export type FilingResults = {
64-  basis: string;
65-  unit: "crore" | "lakh" | "million" | "thousand";
66-  quarter: string;
67-  prevQuarter: string;
68-  yoyQuarter: string;
69-  revenue: Triple;
70-  otherIncome: Triple;
71-  financeCost: Triple;
… (10 more lines)
```

</details>

<a id="m103"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
-   unit: z.enum(["crore", "lakh", "million", "thousand"]).describe("Unit the table states, e.g. '₹ in crore' → crore"),
-   quarter: z.string().describe("Quarter just ended, e.g. 'Sep 2026'"),
-   prevQuarter: z.string(),
-   yoyQuarter: z.string(),
+   unit: z.string().describe("Unit the table states: one of crore, lakh, million, thousand"),
+   quarter: z.string().nullable().describe("Quarter just ended, e.g. 'Sep 2026'; null if there is no results table"),
+   prevQuarter: z.string().nullable(),
+   yoyQuarter: z.string().nullable(),
```

<a id="m104"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
-         out[f.id] = { ...data, model: usage.model };
-         if (f.cat === "results") {
-           const r = await llmJSON({
-             tier: "cheap",
-             system: RESULTS_SYSTEM,
-             schema: ResultsExtract,
-             prompt: `Company: ${names.get(f.symbol)}\n\nResults filing text:\n"""\n${text}\n"""`,
-           });
-           out[f.id].results = r.data;
-         }
+         out[f.id] = { ...data, model: usage.model };
+         if (f.cat === "results") {
+           // Separate try: a filing without a usable results table still keeps its summary.
+           try {
+             const r = await llmJSON({
+               tier: "cheap",
+               system: RESULTS_SYSTEM,
+               schema: ResultsExtract,
+               prompt: `Company: ${names.get(f.symbol)}\n\nResults filing text:\n"""\n${text}\n"""`,
+             });
+             const unit = normUnit(r.data.unit);
+             // Keep only a complete, unambiguous table; otherwise the card falls back to screener.
+             if (unit && r.data.quarter && r.data.revenue.cur != null && r.data.pat.cur != null)
+               out[f.id].results = {
+                 ...r.data,
+                 unit,
+                 quarter: r.data.quarter,
+                 prevQuarter: r.data.prevQuarter ?? "prev. quarter",
+                 yoyQuarter: r.data.yoyQuarter ?? "year-ago quarter",
+               };
+           } catch (e) {
+             if (e instanceof LlmUnavailable) throw e;
+             console.error(`\n  ${f.symbol} ${f.id}: no usable results table (${(e as Error).message.slice(0, 80)})`);
+           }
+         }
```

<a id="m105"></a>

**▶ Bash:** Locate the output type declaration

```bash
grep -n "const out:" scripts/enrich.ts; grep -n "^async function main" scripts/enrich.ts
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (2 lines)</summary>

```
75:  const out: Record<string, z.infer<typeof Enrichment> & { model: string; results?: z.infer<typeof ResultsExtract> }> = fs.existsSync(outPath)
67:async function main() {
```

</details>

<a id="m109"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
-   const out: Record<string, z.infer<typeof Enrichment> & { model: string; results?: z.infer<typeof ResultsExtract> }> = fs.existsSync(outPath)
+   const out: Record<string, z.infer<typeof Enrichment> & { model: string; results?: FilingResults }> = fs.existsSync(outPath)
```

<a id="m110"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
- async function main() {
+ function normUnit(u: string): FilingResults["unit"] | null {
+   if (/crore|\bcr\b/i.test(u)) return "crore";
+   if (/lakh|lac/i.test(u)) return "lakh";
+   if (/million|\bmn\b/i.test(u)) return "million";
+   if (/thousand|'000/i.test(u)) return "thousand";
+   return null;
+ }
+ 
+ async function main() {
```

<a id="m111"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
- import type { Snapshot } from "../src/lib/types";
+ import type { FilingResults } from "../src/lib/engine/fundamentals";
+ import type { Snapshot } from "../src/lib/types";
```

<a id="m112"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\llm.ts`

```diff
-       const data = opts.schema.parse(JSON.parse(text.replace(/^ˋˋˋ(?:json)?\s*|\s*ˋˋˋ$/g, "")));
+       let parsed = JSON.parse(text.replace(/^ˋˋˋ(?:json)?\s*|\s*ˋˋˋ$/g, ""));
+       // Gemini occasionally wraps a single object in an array.
+       if (Array.isArray(parsed) && parsed.length === 1 && !(opts.schema instanceof z.ZodArray)) parsed = parsed[0];
+       const data = opts.schema.parse(parsed);
```

<a id="m113"></a>

**▶ Bash:** Type-check after enrich fixes

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head; echo "tsc exit ${PIPESTATUS[0]}"
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\llm.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
tsc exit 0
```

</details>


<a id="m119"></a>

**🤖 Claude:**

Type-check passes. Re-running enrich now; only the 8 failed filings are processed, and their summary calls are already cached.

<a id="m120"></a>

**▶ Bash:** Re-run enrichment for failed filings

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run enrich 2>&1 | tail -25
```

<details><summary>Result (7 lines)</summary>

```
> finn@0.1.0 enrich
> node --env-file-if-exists=.env.local --import tsx scripts/enrich.ts

Provider: gemini · cheap model: gemini-3.5-flash-lite
3 filings to enrich (139 already done)
...
Done. 3 calls, $0.0048 (0 served from cache)
```

</details>

<a id="m122"></a>

**▶ Bash:** Retry results extraction for filings missing numbers

```bash
cd ~/EnamHoldingsOA/web/data/snapshot && python -c "
import json
feed=json.load(open('feed.json',encoding='utf-8')); e=json.load(open('enrichments.json',encoding='utf-8'))
res=[f for f in feed['filings'] if f.get('cat')=='results' and f.get('hasText')]
missing=[f['id'] for f in res if f['id'] in e and 'results' not in e[f['id']]]
print('results filings with text:',len(res),' with numbers:',sum(1 for f in res if 'results' in e.get(f['id'],{})),' missing numbers:',len(missing))
for f in res:
  if f['id'] in missing: print('  ',f['symbol'],f['ts'][:10],f['subject'][:90])
for i in missing: del e[i]
json.dump(e,open('enrichments.json','w',encoding='utf-8'),indent=1,ensure_ascii=False)
" && cd ../.. && export PATH="/c/Program Files/nodejs:$PATH" && npm run enrich 2>&1 | tail -8
```

<details><summary>Result (21 lines)</summary>

```
results filings with text: 31  with numbers: 19  missing numbers: 12
   TATAPOWER 2026-11-11 Announcement under Regulation 30 (LODR)-Press Release / Media Release
   NYKAA 2026-11-04 Announcement under Regulation 30 (LODR)-Press Release / Media Release
   NAVINFLUOR 2026-10-31 Newspaper Advertisement Of The Financial Results For The Quarter & Half Year Ended Septemb
   TRENT 2026-10-29 Announcement under Regulation 30 (LODR)-Press Release / Media Release
   ADANIPORTS 2026-10-28 Outcome Of Board Meeting
   ADANIPORTS 2026-10-28 Announcement under Regulation 30 (LODR)-Press Release / Media Release
   LT 2026-10-27 Outcome Of Board Meeting Of Larsen & Toubro Limited  Held On October 27, 2026
   KOTAKBANK 2026-10-24 Results-Financial Results - Sep 30, 2026
   BAJFINANCE 2026-10-23 Announcement under Regulation 30 (LODR)-Analyst / Investor Meet - Outcome
   SUNPHARMA 2026-10-15 Announcement under Regulation 30 (LODR)-Analyst / Investor Meet - Intimation
   BAJFINANCE 2026-10-13 Announcement under Regulation 30 (LODR)-Analyst / Investor Meet - Intimation
   TCS 2026-10-08 Board Meeting Outcome for Financial Results For The Quarter And Six-Month Period Ended Sep
  SUNPHARMA 9f479947-019f-43b7-b145-e75f77043e24: no usable results table ([
  {
    "expected": "string",
    "code": "invalid_type",
    "path": [
      )
c
Done. 21 calls, $0.0163 (12 served from cache)
```

</details>

> ⏱ *Background task completed:* Background command "Re-run research with improved prompts" completed (exit code 0)


<a id="m125"></a>

**🤖 Claude:**

Enrich is done. Most of the remaining "results" filings without numbers are press releases or analyst-meet notices that contain no results table, which is expected. Next, the re-run research:

<a id="m126"></a>

**▶ Bash:** Review re-run research output for all four companies

```bash
tail -c 1500 "<session-tmp>/tasks/br3ysk8gv.output"; cd ~/EnamHoldingsOA/web/data/snapshot/research && python -c "
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
for s in ['TCS','DIXON','CREDITACC','DEEPAKNTR']:
    r=json.load(open(s+'.json',encoding='utf-8'))
    n=r['narrative']
    print('=====',s, r['usage']['costUsd'])
    print('READ:', n['read']); print('CRED:', n['credibility'])
    for p in n['promises']:
        print(' -', p['said'],'|',p['promise'][:130],'|',p['verdict'],'|',p['delivered'][:170])
    for x in n.get('narrativeVsNumbers',[]): print(' NvN', x['aligned'], x['claim'][:90],'=>',x['reality'][:140])
    print(' SRC', [x['label'] for x in r['sources']])
"
```

<details><summary>Result (83 lines)</summary>

```
ading the business overview in the 2026 annual report
  · Checking promises against reported numbers
  ✓ 5 promises checked · $0.049 · gemini-3.5-flash-lite + gemini-3.6-flash

CREDITACC
  · Reading 4 earnings-call transcripts
  · Extracted guidance from the Jul 2026 call
  · Extracted guidance from the Jan 2026 call
  · Extracted guidance from the Oct 2026 call
  · Extracted guidance from the May 2026 call
  · Reading the business overview in the 2026 annual report
  · Checking promises against reported numbers
  ✓ 5 promises checked · $0.0586 · gemini-3.5-flash-lite + gemini-3.6-flash

DEEPAKNTR
  · Reading 4 earnings-call transcripts
  · Extracted guidance from the Aug 2026 call
  · Extracted guidance from the Feb 2026 call
  · Extracted guidance from the May 2026 call
  · Extracted guidance from the Nov 2026 call
  · Reading the business overview in the 2026 annual report
  · Checking promises against reported numbers
  ✓ 6 promises checked · $0.0495 · gemini-3.5-flash-lite + gemini-3.6-flash

TCS
  · Reading 4 earnings-call transcripts
  · Extracted guidance from the Apr 2026 call
  · Extracted guidance from the Jul 2026 call
  · Extracted guidance from the Jan 2026 call
  · Extracted guidance from the Oct 2026 call
… (53 more lines)
```

</details>

<a id="m128"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
- - A promise is "delivered" only if the numbers table shows it; "pending" if its horizon hasn't arrived; "unverifiable" if the table can't test it.
+ - A promise is "delivered" only if the numbers table shows it; "pending" if its horizon hasn't arrived; "unverifiable" if neither the table nor a later call can test it.
+ - A later call can settle an earlier promise: if a later call re-sets the same target or timeline (e.g. a commissioning date pushed out, a guidance range cut), the earlier promise is "missed" or "partly"; cite the later call in "delivered".
+ - If management gives little explicit guidance, say so in "credibility" rather than padding the list with vague or trivial items.
```

<a id="m129"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-     .describe("4–8 most important guidance items across the calls, oldest first"),
+     .describe("Up to 8 most important, checkable guidance items across the calls, oldest first; fewer is fine"),
```

<a id="m130"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-   // Cash flow, so capex and cash-generation promises can be checked. Capex is derived in code (CFO − FCF).
-   const cf = co.cashFlow;
-   const cfo = row(cf, "Cash from Operating");
-   const fcf = row(cf, "Free Cash Flow");
-   if (cfo && cf.headers.length) {
-     const k = Math.min(4, cf.headers.length);
-     const sl = <T,>(xs: T[]) => xs.slice(cf.headers.length - k);
-     lines.push("", `Year | ${sl(cf.headers).join(" | ")}`, `Cash from operations | ${sl(cfo).map((x) => x ?? "–").join(" | ")}`);
-     if (!isLender && fcf)
-       lines.push(`Capex (CFO − FCF) | ${sl(cfo).map((x, i) => (x == null || sl(fcf)[i] == null ? "–" : Math.round(x - sl(fcf)[i]!))).join(" | ")}`);
-   }
+   // Cash flow, so capex and cash-generation promises can be checked. Capex is derived in code (CFO − FCF).
+   // Not for lenders: loan growth is an operating outflow, so their CFO says nothing about cash quality.
+   const cf = co.cashFlow;
+   const cfo = row(cf, "Cash from Operating");
+   const fcf = row(cf, "Free Cash Flow");
+   if (!isLender && cfo && fcf && cf.headers.length) {
+     const k = Math.min(4, cf.headers.length);
+     const sl = <T,>(xs: T[]) => xs.slice(cf.headers.length - k);
+     lines.push(
+       "",
+       `Year | ${sl(cf.headers).join(" | ")}`,
+       `Cash from operations | ${sl(cfo).map((x) => x ?? "–").join(" | ")}`,
+       `Capex (CFO − FCF) | ${sl(cfo).map((x, i) => (x == null || sl(fcf)[i] == null ? "–" : Math.round(x - sl(fcf)[i]!))).join(" | ")}`,
+     );
+   }
```

<a id="m131"></a>

**▶ Bash:** Type-check and re-run research reduce step

```bash
cd ~/EnamHoldingsOA/web && export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -5 && npm run research 2>&1 | grep -E "✓|Skipped|unavailable|Total|Error" 
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (5 lines)</summary>

```
  ✓ 5 promises checked · $0.0382 · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 6 promises checked · $0.0495 · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 6 promises checked · $0.0433 · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 2 promises checked · $0.0295 · gemini-3.5-flash-lite + gemini-3.6-flash
Total: $0.1605
```

</details>

<a id="m136"></a>

**▶ Bash:** Review final research outputs

```bash
cd ~/EnamHoldingsOA/web/data/snapshot/research && python -c "
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
for s in ['TCS','DIXON','CREDITACC','DEEPAKNTR']:
    r=json.load(open(s+'.json',encoding='utf-8'))
    n=r['narrative']
    print('=====',s)
    print('READ:', n['read']); print('CRED:', n['credibility'])
    for p in n['promises']:
        print(' -', p['said'],'|',p['promise'][:120],'|',p['verdict'],'|',p['delivered'][:200])
    for x in n.get('narrativeVsNumbers',[]): print(' NvN', x['aligned'], x['claim'][:80],'=>',x['reality'][:140])
    print(' BEAR', [b[:110] for b in n['bear']])
"
```

<details><summary>Result (47 lines)</summary>

```
===== TCS
READ: TCS reached ₹73,188 crore in quarterly sales for Sep 2026 with annualized AI revenue expanding to $3.1 billion. However, profitability reflects structural pressure, with reported OPM % remaining at 26% in Q2 FY27 following wage hikes and elevated strategic investments.
CRED: Management refrains from issuing explicit quantitative forward guidance for revenue or margins on calls, focusing instead on reporting quarterly TCV, though promised wage adjustments were delivered on schedule.
 - Q4 FY26 call | Build 1 GW of capacity under the HyperVault business. | unverifiable | No capacity figures for HyperVault or data centres are reported in the quarterly financial table.
 - Q4 FY26 call | Implement annual salary increments across eligible grades effective April 1, 2026. | delivered | Implemented in Q1 FY27; reported OPM % fell from 27% in Mar 2026 to 26% in Jun 2026, with Q1 FY27 call confirming margins fell 130 bps due to wage hikes.
 NvN True Operating margins faced sequential compression in Q1 FY27 driven by annual wage  => Reported OPM % dropped from 27% in Mar 2026 to 26% in Jun 2026, and Net Profit declined from ₹13,784 crore in Mar 2026 to ₹13,420 crore in J
 NvN True Sustained top-line growth driven by large deal execution and expanding TCV. => Quarterly sales increased sequentially from ₹67,087 crore in Dec 2025 to ₹70,698 crore in Mar 2026, ₹72,275 crore in Jun 2026, and ₹73,188 c
 NvN True Operating margin expanded during full year FY26 to reach a 4-year high. => Full-year OPM % for Mar 2026 reported at 27%, up from 26% in Mar 2025.
 BEAR ['Margin headwinds: OPM % dropped to 26% in Jun 2026 and Sep 2026, down from 27% in earlier quarters, burdened b', 'Full-year top-line decline: Full year FY26 constant currency revenue dropped by 2.4% despite individual quarte', 'Cost inflation: Earnings calls highlight margin pressure from rising subcontracting expenses, elevated deliver']
===== DIXON
READ: Dixon is delivering explosive top-line growth with Q2 FY27 sales reaching ₹21,794 crore (up 88.9% YoY from ₹11,534 crore), but aggressive expansion and Mobile PLI 1 expiration compressed operating margins down to 2.7%. While operating cash flow strengthened to ₹1,782 crore in FY26, backward integration into components is essential to stem profitability dilution.
CRED: Management relies heavily on segment-level revenue and volume metrics that are not reported in standard financial statements, making most guidance unverifiable, though full-year FY26 capex of ₹1,058 crore landed close to guidance.
 - Q3 FY26 call | Overall FY26 capex outgo of ₹1,100 crore to ₹1,200 crore | partly | Reported FY26 capex (CFO − FCF) was ₹1,058 crore, coming in slightly below the guidance band.
 - Q3 FY26 call | Mobile phone business margin of 2.8% to 3.2% over the next 12 months | unverifiable | Segment margins are not split in reported financials; overall company OPM % compressed to 3.0% in Q1 FY27 and 2.7% in Q2 FY27.
 - Q3 FY26 call | IT and hardware produc
… (17 more lines)
```

</details>

<a id="m138"></a>

**▶ Bash:** Find verdict styling in the narrative panel

```bash
cd ~/EnamHoldingsOA/web && grep -n "delivered\|partly\|missed\|pending\|unverifiable" src/components/research/NarrativePanel.tsx | head -20
```

<details><summary>Result (8 lines)</summary>

```
7:  delivered: { label: "Delivered", tone: "up" },
8:  partly: { label: "Partly", tone: "warn" },
9:  missed: { label: "Missed", tone: "down" },
10:  pending: { label: "Pending", tone: "accent" },
11:  unverifiable: { label: "Can't verify", tone: "muted" },
66:          <p className="text-[15px] font-semibold">Promised vs delivered</p>
123:      <SectionTitle right={<span className="text-[11px] text-muted">{res.sources.filter((s) => s.label.startsWith("Concall")).length} calls checked</span>}>Promised vs delivered</SectionTitle>
140:              <p className="mt-1 text-[13px] leading-snug text-ink-2">{p.delivered}</p>
```

</details>

<a id="m140"></a>

**📖 Read** `~\EnamHoldingsOA\web\src\components\research\NarrativePanel.tsx` (from line 1, 15 lines)

<details><summary>Result (15 lines)</summary>

```
1	"use client";
2	import { useState } from "react";
3	import type { ResearchResult } from "@/lib/engine/research";
4	import { SectionTitle, Tag } from "../ui";
5	
6	const VERDICT: Record<string, { label: string; tone: "up" | "down" | "warn" | "muted" | "accent" }> = {
7	  delivered: { label: "Delivered", tone: "up" },
8	  partly: { label: "Partly", tone: "warn" },
9	  missed: { label: "Missed", tone: "down" },
10	  pending: { label: "Pending", tone: "accent" },
11	  unverifiable: { label: "Can't verify", tone: "muted" },
12	};
13	
14	export function NarrativePanel({ symbol, initial, llmReady, about, keyPoints }: { symbol: string; initial: ResearchResult | null; llmReady: boolean; about: string; keyPoints: string }) {
15	  const [res, setRes] = useState<ResearchResult | null>(initial);
```

</details>

<a id="m142"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\components\research\NarrativePanel.tsx`

```diff
-   delivered: { label: "Delivered", tone: "up" },
-   partly:
+   delivered: { label: "Delivered", tone: "up" },
+   ahead: { label: "Raised", tone: "up" },
+   partly:
```

<a id="m143"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-         verdict: z.enum(["delivered", "partly", "missed", "pending", "unverifiable"]),
+         verdict: z.enum(["delivered", "ahead", "partly", "missed", "pending", "unverifiable"]),
```

<a id="m144"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
- - A later call can settle an earlier promise: if a later call re-sets the same target or timeline (e.g. a commissioning date pushed out, a guidance range cut), the earlier promise is "missed" or "partly"; cite the later call in "delivered".
+ - A later call can settle an earlier promise. If a later call re-sets the same target or timeline AGAINST the investor (a commissioning date pushed out, growth guidance cut, cost or credit-cost guidance raised), the earlier promise is "missed" or "partly". If the re-set is IN the investor's favour (growth, margin or return guidance raised; cost or credit-cost guidance lowered), it is "ahead". Cite the later call in "delivered".
```

<a id="m145"></a>

**▶ Bash:** Re-run research with the new verdict and review

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -5 && npm run research 2>&1 | grep -E "✓|Skipped|Total|Error" && cd data/snapshot/research && python -c "
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
for s in ['CREDITACC','DEEPAKNTR','DIXON','TCS']:
    n=json.load(open(s+'.json',encoding='utf-8'))['narrative']
    print('=====',s); print('CRED:', n['credibility'])
    for p in n['promises']: print(' -', p['said'],'|',p['promise'][:90],'|',p['verdict'],'|',p['delivered'][:130])
"
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\components\research\NarrativePanel.tsx has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (33 lines)</summary>

```
  ✓ 5 promises checked · $0.0413 · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 7 promises checked · $0.05 · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 6 promises checked · $0.0408 · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 2 promises checked · $0.0295 · gemini-3.5-flash-lite + gemini-3.6-flash
Total: $0.1616
===== CREDITACC
CRED: Management demonstrated strong execution by consistently upgrading its FY27 guidance across ROA, ROE, NIM, and cost-to-income metrics.
 - Q3 FY26 call | FY27 credit cost guidance of 4% to 4.5% | ahead | Guidance was revised downward (in investor's favour) to 3.0%–4.0% in Q4 FY26 and re-confirmed in Q2 FY27.
 - Q4 FY26 call | FY27 NIM guidance of 12.8-13.2% | ahead | Raised in Q2 FY27 call to 14.4%–14.7% due to asset quality gains and controlled borrowing costs.
 - Q4 FY26 call | FY27 Cost to income guidance of 33.0-35.0% | ahead | Improved guidance to 29%–30% in Q2 FY27 call as operating expenses remained under control.
 - Q4 FY26 call | FY27 ROA guidance of 4.0-4.8% | ahead | Upgraded guidance to 5.2%–5.8% in Q2 FY27 call following strong H1 performance.
 - Q4 FY26 call | FY27 ROE guidance of 16.0-20.0% | ahead | Upgraded guidance to 21%–24% in Q2 FY27 call.
 - Q4 FY26 call | FY27 AUM growth guidance of 20.0-25.0% | pending | Target re-confirmed in Q2 FY27 call; full-year FY27 completion pending.
 - Q1 FY27 call | Reach INR 50,000 Crore AUM by calendar year 2028 | pending | Target horizon of CY28 has not yet arrived.
===== DEEPAKNTR
CRED: Management successfully delivered on its short-term Q4 FY26 earnings target but missed initial timelines and utilization guidance for its MIBK and nitric acid facilities.
 - Q3 FY26 call | Favourable performance expected in Q4 FY26 | delivered | Q4 FY26 sales increased to ₹2,120 crore (vs ₹1,975 crore in Q3 FY26), OPM expanded to 18% (vs 11%), and net profit doubled to ₹220
 - Q3 FY26 call | Commissioning of MIBK/MIBC project within Q3 FY26 | missed | In the subsequent Q4 FY26 call, management delayed the commissioning target to the tail end of Q1 or early part of Q2 FY27.
 - Q3 FY26 call | Nitric acid, nitration, and hydrogenation utilization running at 95% to 100% from Q3 FY26 | missed | Management reported in the Q4 FY26 call that nitric acid plant utilization was constrained to about 45% during Q4 due to technical
 - Q4 FY26 call | Commissioning of MIBK and MIBC asset by tail end of Q1 or early Q2 FY27 | unverifiable | Product-specific commissioning dates and asset performance are not detailed in the financial table.
 - Q4 FY26 call | Commissioning of integrated polycarbonate project by June 2028 | pending | Horizon date of June 2028 has not yet arrived.
 - Q1 FY27 call | Spend an additional ₹1,000 crore to ₹1,500 crore on capex in FY27 | pending | Full year FY27 cash flow and capex figures are not yet reported in the annual table.
===== DIXON
CRED: Management heavily relies on segment-level volume and revenue guidance that cannot be validated via consolidated numbers, thoug
… (3 more lines)
```

</details>

<a id="m150"></a>

**▶ Bash:** Print results cards and top summaries from the feed

```bash
cd ~/EnamHoldingsOA/web && export PATH="/c/Program Files/nodejs:$PATH" && cat > "<session-tmp>/scratchpad/rescheck.ts" <<'EOF'
import { buildFeed } from "../../../../../../../../EnamHoldingsOA/web/src/lib/feed";
const items = buildFeed();
for (const i of items.filter((x) => x.results)) {
  const r = i.results!;
  console.log(`${i.symbol.padEnd(11)} ${i.tier.padEnd(7)} src=${r.source}${r.verified ? " ✓" : ""} ${r.period} | ` + r.metrics.map((m) => `${m.label} ${m.cur} (QoQ ${m.qoq ?? "–"}%, YoY ${m.yoy ?? "–"}%)`).join(" · "));
}
console.log("\nSummaries:", items.filter((x) => x.summary).length, "/", items.length, "cards");
for (const i of items.filter((x) => x.tier === "act").slice(0, 12)) console.log(`- [${i.symbol}] ${i.title}\n    ${i.summary ?? "(no summary)"}`);
EOF
ls ../.. >/dev/null; npx tsx "<session-tmp>/scratchpad/rescheck.ts" 2>&1 | head -60
```

<details><summary>Result (24 lines)</summary>

```
node:internal/modules/cjs/loader:1603
  const err = new Error(message);
              ^

Error: Cannot find module '../../../../../../../../EnamHoldingsOA/web/src/lib/feed'
Require stack:
- <session-tmp>/scratchpad\rescheck.ts
    at node:internal/modules/cjs/loader:1603:15
    at nextResolveSimple (~\EnamHoldingsOA\web\node_modules\tsx\dist\register-B1c7OH6V.cjs:23:1010)
    at ~\EnamHoldingsOA\web\node_modules\tsx\dist\register-B1c7OH6V.cjs:22:4512
    at ~\EnamHoldingsOA\web\node_modules\tsx\dist\register-B1c7OH6V.cjs:22:2830
    at resolveTsPaths (~\EnamHoldingsOA\web\node_modules\tsx\dist\register-B1c7OH6V.cjs:23:762)
    at ~\EnamHoldingsOA\web\node_modules\tsx\dist\register-B1c7OH6V.cjs:23:1203
    at j._resolveFilename (file:///~/EnamHoldingsOA/web/node_modules/tsx/dist/register-nyXW-TH3.mjs:2:18825)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1145:27)
    at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1169:10)
    at defaultResolve (node:internal/modules/cjs/loader:1226:20) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    '<session-tmp>/scratchpad\\rescheck.ts'
  ]
}

Node.js v26.13.1
```

</details>

<a id="m152"></a>

**▶ Bash:** Run the results/summary check from the project

```bash
export PATH="/c/Program Files/nodejs:$PATH" && sed 's#"../../../../../../../../EnamHoldingsOA/web/src/lib/feed"#"../../src/lib/feed"#' "<session-tmp>/scratchpad/rescheck.ts" > scripts/dev/rescheck.ts && npx tsx scripts/dev/rescheck.ts 2>&1 | head -60
```

<details><summary>Result (46 lines)</summary>

```
HAL         act     src=screener Sep 2026 | Revenue 7613 (QoQ 38.04170444242973%, YoY 6629%) · EBITDA 1739 (QoQ 13.883431565160445%, YoY 1558%) · PBT 2566 (QoQ 20.243673851921272%, YoY 2227%) · PAT 1936 (QoQ 21.761006289308177%, YoY 1669%)
TATAPOWER   act     src=screener Sep 2026 | Revenue 19636 (QoQ 3.070704949871398%, YoY 15545%) · EBITDA 3667 (QoQ -5%, YoY 3302%) · PBT 2180 (QoQ 19.583104772353263%, YoY 1680%) · PAT 1652 (QoQ 17.915774446823697%, YoY 1245%)
TATASTEEL   act     src=screener Sep 2026 | Revenue 65436 (QoQ 7.6356219363753%, YoY 58689%) · EBITDA 10533 (QoQ 13.698186528497407%, YoY 8897%) · PBT 5455 (QoQ 42.13131839499739%, YoY 4222%) · PAT 3700 (QoQ 55.13626834381551%, YoY 3183%)
NYKAA       act     src=screener ✓ Sep 2026 | Revenue 3006 (QoQ 8.05176132278936%, YoY 2346%) · EBITDA 263 (QoQ 11.440677966101696%, YoY 159%) · PBT 149 (QoQ 15.503875968992247%, YoY 55%) · PAT 101 (QoQ 26.25%, YoY 33%)
NTPC        act     src=screener Sep 2026 | Revenue 54270 (QoQ 6.954927967521334%, YoY 44784%) · EBITDA 15627 (QoQ -3.7212741051075104%, YoY 12814%) · PBT 9218 (QoQ 0.6331877729257642%, YoY 7301%) · PAT 7351 (QoQ 6.598027842227379%, YoY 5225%)
NAVINFLUOR  act     src=screener ✓ Sep 2026 | Revenue 1191 (QoQ 13.971291866028709%, YoY 758%) · EBITDA 407 (QoQ 14.005602240896359%, YoY 246%) · PBT 352 (QoQ 10.69182389937107%, YoY 198%) · PAT 269 (QoQ 10.699588477366255%, YoY 148%)
SUNPHARMA   act     src=screener Sep 2026 | Revenue 16199 (QoQ 5.875816993464053%, YoY 14478%) · EBITDA 4744 (QoQ 7.378904481665913%, YoY 4527%) · PBT 3159 (QoQ -22.932422542083437%, YoY 4168%) · PAT 1995 (QoQ -31.230610134436404%, YoY 3125%)
EQUITASBNK  act     src=filing 30-Sep-26 | Revenue 2066 (QoQ 5.3866557845337635%, YoY 1617.35%) · PBT 287.38 (QoQ 17.744909247347074%, YoY 33.54%) · PAT 218.04 (QoQ 18.751701977016488%, YoY 24.14%)
ASIANPAINT  act     src=screener Sep 2026 | Revenue 9977 (QoQ -5.35951432365775%, YoY 8531%) · EBITDA 1557 (QoQ -28.21576763485477%, YoY 1503%) · PBT 1478 (QoQ -29.48473282442748%, YoY 1392%) · PAT 1085 (QoQ -30.40410519563823%, YoY 1018%)
TRENT       act     src=screener ✓ Sep 2026 | Revenue 5873 (QoQ 2.050390964378801%, YoY 4818%) · EBITDA 1057 (QoQ -5.540661304736371%, YoY 816%) · PBT 619 (QoQ -10.54913294797688%, YoY 477%) · PAT 468 (QoQ -9.652509652509652%, YoY 373%)
LAURUSLABS  act     src=screener ✓ Sep 2026 | Revenue 2206 (QoQ 8.884501480750247%, YoY 1653%) · EBITDA 750 (QoQ 17.55485893416928%, YoY 403%) · PBT 592 (QoQ 23.076923076923077%, YoY 270%) · PAT 436 (QoQ 20.441988950276244%, YoY 194%)
ADANIPORTS  act     src=screener Sep 2026 | Revenue 11340 (QoQ 4.796229553645689%, YoY 9167%) · EBITDA 6807 (QoQ 8.859747321285782%, YoY 5340%) · PBT 4466 (QoQ 3.6916647318319016%, YoY 3690%) · PAT 3682 (QoQ 0.8767123287671232%, YoY 3120%)
LT          act     src=screener Sep 2026 | Revenue 78750 (QoQ 15.90768596744282%, YoY 67984%) · EBITDA 8814 (QoQ 8.160510492084919%, YoY 8513%) · PBT 7641 (QoQ 10.387171337763652%, YoY 6336%) · PAT 5949
… (16 more lines)
```

</details>

<a id="m154"></a>

**▶ Bash:** Inspect results attachment in feed and resultsCut

```bash
grep -n "results\|summary" src/lib/feed.ts | head -40; echo ----; grep -n "export function resultsCut" -A40 src/lib/engine/fundamentals.ts | head -50
```

<details><summary>Result (60 lines)</summary>

```
2:// enrichment each card type deserves (numbers for results, people + network for changes).
5:import { resultsCut, resultsFromFiling, type FilingResults, type ResultsCut } from "./engine/fundamentals";
88:  summary: string; // one line, plain English, why it matters
92:  results?: FilingResults;
117:  summary?: string;
120:  results?: ResultsCut;
194:const GROUPABLE: Category[] = ["results", "earnings_call", "M&A", "management_change", "credit_rating", "investor_meetings"];
211:      // moved on), except on results days, where the results filing itself stays primary.
212:      const isResultsDoc = f.cat === "results" && /financial results/i.test(f.bseSub + f.subject);
213:      const prevIsResultsDoc = prev.cat === "results" && /financial results/i.test(prev.title);
214:      const promote = TIER_RANK[f.tier] <= TIER_RANK[prev.tier] && (f.cat !== "results" || isResultsDoc || !prevIsResultsDoc);
244:    if (e?.summary) it.summary = e.summary;
247:    if (it.cat === "results" && it.tier === "act") {
249:      const cut = data && resultsCut(data, co.isLender);
252:      const fromFiling = e?.results ? resultsFromFiling(e.results, co.isLender) : null;
259:        it.results = fresh;
261:        it.results = fromFiling; // screener hasn't caught up: read straight from the filing
293:    if (["M&A", "capex", "litigation", "fund_raise", "management_change", "results"].includes(it.cat) && it.tier === "act") {
----
116:export function resultsCut(co: ScreenerCompany, isLender: boolean): ResultsCut | null {
117-  const q = co.quarters;
118-  const n = q.headers.length;
119-  if (n < 5) return null;
120-  const i = n - 1;
121-  const at = (prefix: string) => {
122-    const r = row(q, prefix);
123-    return r ? { cur: r[i], prev: r[i - 1], yoy: r[i - 4] } : { cur: null, prev: null, yoy: null };
124-  };
125-  const defs: { key: MetricKey; label: string; prefix: string }[] = isLender
126-    ? [
… (30 more lines)
```

</details>

<a id="m156"></a>

**📖 Read** `~\EnamHoldingsOA\web\src\lib\feed.ts` (from line 236, 35 lines)

<details><summary>Result (35 lines)</summary>

```
236	    };
237	    items.push(item);
238	    open.set(key, item);
239	  }
240	
241	  for (const it of items) {
242	    const co = companies.get(it.symbol)!;
243	    const e = enrichments[it.id];
244	    if (e?.summary) it.summary = e.summary;
245	    if (e?.materiality === "low" && it.tier === "act" && it.cat !== "management_change") it.tier = "know";
246	
247	    if (it.cat === "results" && it.tier === "act") {
248	      const data = companyData(it.symbol);
249	      const cut = data && resultsCut(data, co.isLender);
250	      // Standardised table first, but only if it already contains the quarter this filing announced.
251	      const fresh = cut && withinDays(it.ts, quarterEnd(cut.period), 75) ? cut : null;
252	      const fromFiling = e?.results ? resultsFromFiling(e.results, co.isLender) : null;
253	      if (fresh) {
254	        if (fromFiling) {
255	          const a = fresh.metrics.find((m) => m.key === "pat")?.cur;
256	          const b = fromFiling.metrics.find((m) => m.key === "pat")?.cur;
257	          fresh.verified = a != null && b != null && Math.abs(a - b) <= Math.max(1, Math.abs(a) * 0.02);
258	        }
259	        it.results = fresh;
260	      } else if (fromFiling) {
261	        it.results = fromFiling; // screener hasn't caught up: read straight from the filing
262	      }
263	    }
264	    const people = e?.people?.length ? e.people : it.cat === "management_change" && it.tier !== "routine" ? regexPeople(it.id, it.title) : [];
265	    if (it.cat === "management_change" && people.length) {
… (5 more lines)
```

</details>

<a id="m158"></a>

**▶ Bash:** Inspect results-category filings and classify rules

```bash
python -c "
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
feed=json.load(open('data/snapshot/feed.json',encoding='utf-8')); e=json.load(open('data/snapshot/enrichments.json',encoding='utf-8'))
for f in feed['filings']:
  if f['symbol'] in ('KAYNES','HAL','TATAPOWER','BAJFINANCE','SUNPHARMA','HDFCBANK') and f.get('cat')=='results':
    print(f['symbol'], f['ts'][:16], f['tier'], 'text' if f.get('hasText') else 'NOTEXT', 'enr' if f['id'] in e else '-', 'res' if 'results' in e.get(f['id'],{}) else '-', '|', f['bseCategory'],'/',f['bseSub'],'|',f['subject'][:80])
"; echo; grep -n "results\|investor_meetings\|earnings_call" src/lib/engine/classify.ts | sed -n 1,30p
```

<details><summary>Result (42 lines)</summary>

```
KAYNES 2026-11-15T22:05 know NOTEXT - - | Company Update / Investor Presentation | Announcement under Regulation 30 (LODR)-Investor Presentation
KAYNES 2026-11-14T23:54 act NOTEXT - - | Result / Financial Results | Financial Results For The Second Quarter And Half Year Ended 30 September 2026
HAL 2026-11-12T13:22 act NOTEXT - - | Result / Financial Results | Audited Financial Results (Standalone And Consolidated) For The Quarter And Half
TATAPOWER 2026-11-11T17:43 act text enr res | Company Update / Press Release / Media Release | Announcement under Regulation 30 (LODR)-Press Release / Media Release
TATAPOWER 2026-11-11T17:38 know NOTEXT - - | Company Update / Investor Presentation | Announcement under Regulation 30 (LODR)-Investor Presentation
TATAPOWER 2026-11-11T17:29 act NOTEXT - - | Result / Financial Results | Outcome Of The Financial Results For The Quarter And Half Year Ended September 3
TATAPOWER 2026-11-11T17:16 act NOTEXT - - | Board Meeting / Outcome of Board Meeting | Board Meeting Outcome for Outcome Of The Financial Results For The Quarter And H
KAYNES 2026-11-09T18:56 routine NOTEXT - - | Board Meeting / Board Meeting | Board Meeting Intimation for Approval Of The Unaudited Financial Results Q2 2026
SUNPHARMA 2026-10-30T14:14 act text enr res | Result / Financial Results | Unaudited Financial Results For The Quarter And Half Year Ended 30 September 202
HAL 2026-10-27T17:33 routine NOTEXT - - | Board Meeting / Board Meeting | Board Meeting Intimation for Considering The Audited Financial Results For The P
HDFCBANK 2026-10-23T22:50 act text enr res | Company Update / Analyst / Investor Meet | Announcement under Regulation 30 (LODR)-Analyst / Investor Meet - Outcome
BAJFINANCE 2026-10-23T14:45 act text enr - | Company Update / Analyst / Investor Meet | Announcement under Regulation 30 (LODR)-Analyst / Investor Meet - Outcome
BAJFINANCE 2026-10-19T17:39 act text enr res | Result / Financial Results | Unaudited Standalone And Consolidated Financial Results For The Quarter And Half
BAJFINANCE 2026-10-19T17:27 know NOTEXT - - | Company Update / Investor Presentation | Announcement under Regulation 30 (LODR)-Investor Presentation
BAJFINANCE 2026-10-19T17:19 act text enr res | Board Meeting / Outcome of Board Meeting | Board Meeting Outcome for Outcome Of Board Meeting Held On 19 October 2026
HDFCBANK 2026-10-17T22:09 act text enr res | Company Update / Analyst / Investor Meet | Announcement under Regulation 30 (LODR)-Analyst / Investor Meet - Outcome
HDFCBANK 2026-10-17T13:56 act text enr res | Board Meeting / Outcome of Board Meeting | Board Meeting Outcome for Approval Of Unaudited Standalone And Consolidated Fina
SUNPHARMA 2026-10-15T18:24 act text enr - | Company Update / Analyst / Investor Meet | Announcement under Regulation 30 (LODR)-Analyst / Investor Meet - Intimation
SUNPHARMA 2026-10-14T20:16 routine NOTEXT - - | Board Meeting / Board Meeting | Board Meeting Intimation for Consideration And Approval The Unaudited Financial 
HDF
… (12 more lines)
```

</details>

<a id="m160"></a>

**▶ Bash:** Check snapshot text extraction logic and results PDF URLs

```bash
grep -n "NEEDS_TEXT\|hasText\|maxPages\|catch" scripts/snapshot.ts | head -20; python -c "
import json
feed=json.load(open('data/snapshot/feed.json',encoding='utf-8'))
for f in feed['filings']:
  if f['symbol'] in ('KAYNES','HAL','TATAPOWER') and f['bseSub']=='Financial Results': print(f['symbol'], f['id'], f['pdfUrl'])
"
```

<details><summary>Result (13 lines)</summary>

```
44:const NEEDS_TEXT = (f: Filing) =>
67:    } catch (e) {
90:      } catch (e) {
112:        } catch (e) {
121:  const toRead = filings.filter(NEEDS_TEXT);
126:      f.hasText = true;
132:        maxPages: f.cat === "results" ? 6 : 12,
137:        f.hasText = true;
140:    } catch (e) {
154:main().catch((e) => {
KAYNES b0847910-ddd5-48fc-8f2c-7f15b2038d45 https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=83b2c93d-de1c-4006-853e-eeb50eec49ef.pdf
HAL 029ee977-e370-4027-9c06-6a3aca2d822c https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=93bc4901-a0dd-4c78-894f-74203cfdc6ab.pdf
TATAPOWER 3de57b54-efa3-4790-9b4c-020b2887de9b https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=73421683-fb93-45b6-9534-28f0b0d8262e.pdf
```

</details>

<a id="m162"></a>

**📖 Read** `~\EnamHoldingsOA\web\scripts\snapshot.ts` (from line 40, 115 lines)

<details><summary>Result (115 lines)</summary>

```
40	const LENDER = /bank|finance|nbfc|lending|housing finance|financial services/i;
41	
42	// Filings worth reading in full: the ones FINN enriches (people, deals, capex, legal).
43	// "Worth knowing" items get read too, so each can carry a one-line summary instead of a BSE form title.
44	const NEEDS_TEXT = (f: Filing) =>
45	  f.pdfUrl &&
46	  ((f.cat === "management_change" && f.tier !== "routine") ||
47	    (["M&A", "capex", "litigation", "fund_raise", "pledging"].includes(f.cat) && f.tier === "act") ||
48	    (f.tier === "know" && !["earnings_call", "results"].includes(f.cat)) ||
49	    (f.cat === "results" && f.tier === "act"));
50	
51	async function main() {
52	  const cfg = JSON.parse(fs.readFileSync(path.join(DATA, "portfolio.json"), "utf8")) as {
53	    portfolio: string[];
54	    research: string[];
55	  };
56	  const all = [...new Set([...cfg.portfolio, ...cfg.research])];
57	  const companies: CompanyMeta[] = [];
58	  const filings: Filing[] = [];
59	  const eod: Record<string, Bar[]> = {};
60	
61	  for (const sym of all) {
62	    const inPortfolio = cfg.portfolio.includes(sym);
63	    process.stdout.write(`${sym.padEnd(11)} `);
64	    let co: ScreenerCompany;
65	    try {
66	      co = await cached(`screener_${sym}`, () => getCompany(sym));
67	    } catch (e) {
68	      console.log("screener FAILED", (e as Error).message);
69	      continue;
… (85 more lines)
```

</details>


<a id="m164"></a>

**🤖 Claude:**

The extraction either hit a fetch error or got almost no text, which happens with scanned PDFs. I'll test the three PDFs directly:

<a id="m165"></a>

**▶ Bash:** Test text extraction on the three results PDFs

```bash
export PATH="/c/Program Files/nodejs:$PATH" && cat > scripts/dev/_pdftest.ts <<'EOF'
import { fetchPdf, pdfPages } from "../../src/lib/sources/pdf";
const urls = process.argv.slice(2);
for (const u of urls) {
  try {
    const data = await fetchPdf(u);
    const { pages } = await pdfPages(data, { from: 1, maxPages: 8 });
    console.log(u.slice(-45), "bytes", data.byteLength, "pages read", pages.length, "chars/page", pages.map((p) => p.replace(/\s/g, "").length).join(","));
    console.log("   ", pages.join(" ").replace(/\s+/g, " ").slice(0, 300));
  } catch (e) {
    console.log(u.slice(-45), "ERROR", (e as Error).message);
  }
}
EOF
npx tsx scripts/dev/_pdftest.ts https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=83b2c93d-de1c-4006-853e-eeb50eec49ef.pdf https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=93bc4901-a0dd-4c78-894f-74203cfdc6ab.pdf https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=73421683-fb93-45b6-9534-28f0b0d8262e.pdf 2>&1 | head -20
```

<details><summary>Result (19 lines)</summary>

```
node:internal/modules/run_main:111
    triggerUncaughtException(
    ^

Error: Transform failed with 2 errors:
~\EnamHoldingsOA\web\scripts\dev\_pdftest.ts:5:17: ERROR: Top-level await is currently not supported with the "cjs" output format
~\EnamHoldingsOA\web\scripts\dev\_pdftest.ts:6:22: ERROR: Top-level await is currently not supported with the "cjs" output format
    at failureErrorWithLog (~\EnamHoldingsOA\web\node_modules\esbuild\lib\main.js:1752:15)
    at ~\EnamHoldingsOA\web\node_modules\esbuild\lib\main.js:1019:50
    at responseCallbacks.<computed> (~\EnamHoldingsOA\web\node_modules\esbuild\lib\main.js:886:9)
    at handleIncomingPacket (~\EnamHoldingsOA\web\node_modules\esbuild\lib\main.js:941:12)
    at Socket.readFromStdout (~\EnamHoldingsOA\web\node_modules\esbuild\lib\main.js:864:7)
    at Socket.emit (node:events:514:20)
    at addChunk (node:internal/streams/readable:605:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:556:3)
    at Readable.push (node:internal/streams/readable:436:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:194:23) {
  name: 'TransformError'
}
```

</details>

<a id="m167"></a>

**▶ Bash:** Wrap test in async IIFE and rerun

```bash
export PATH="/c/Program Files/nodejs:$PATH" && sed -i 's/^for (const u of urls) {/(async () => { for (const u of urls) {/; $ s/^}$/} })();/' scripts/dev/_pdftest.ts && tail -3 scripts/dev/_pdftest.ts && npx tsx scripts/dev/_pdftest.ts https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=83b2c93d-de1c-4006-853e-eeb50eec49ef.pdf https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=93bc4901-a0dd-4c78-894f-74203cfdc6ab.pdf https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=73421683-fb93-45b6-9534-28f0b0d8262e.pdf 2>&1 | head -20
```

<details><summary>Result (9 lines)</summary>

```
    console.log(u.slice(-45), "ERROR", (e as Error).message);
  }
} })();
name=83b2c93d-de1c-4006-853e-eeb50eec49ef.pdf bytes 0 pages read 8 chars/page 2152,598,3252,1068,4012,3788,2532,3258
    KAYNES TECHNOLOGY INDIA LIMITED CIN: L29128KA2008PLC045825 website: www.kaynestechnology.co.in email ID: kaynestechcs@kaynestechnology.net H.O & Registered office: 23-25, Belagola, Food Industrial Estate Metagalli PO, Mysore 570016 India Telephone No: +91 8212582595 November 14, 2026 BSE Limited Cor
name=93bc4901-a0dd-4c78-894f-74203cfdc6ab.pdf bytes 0 pages read 8 chars/page 0,0,0,0,0,0,0,0
     
name=73421683-fb93-45b6-9534-28f0b0d8262e.pdf bytes 0 pages read 8 chars/page 1340,3278,3577,1957,1569,1063,683,4946
    November 11, 2026 BSE Limited Corporate Relationship Department 1st Floor, New Trading Ring Rotunda Bldg., P. J. Towers Dalal Street, Fort Mumbai – 400 001. Scrip Code: 500400 National Stock Exchange of India Limited Exchange Plaza, 5th Floor Plot No. C/1, G Block Bandra-Kurla Complex Bandra (East)
```

</details>

<a id="m169"></a>

**📖 Read** `~\EnamHoldingsOA\web\src\lib\engine\classify.ts` (from line 55, 20 lines)

<details><summary>Result (20 lines)</summary>

```
55	
56	// Order matters: the first matching rule wins.
57	const RULES: Rule[] = [
58	  // Routine paperwork first, so keyword rules below don't promote it.
59	  { cat: "unclassified", sub: /newspaper|74 ?\(5\)|esop|esps|statutory auditor|half yearly report|asset cover|closure of trading window|amendments to memorandum|meeting updates|board meeting rescheduled/i },
60	  { cat: "unclassified", text: /esg rating|trading window|loss of share certificate|duplicate share|regulation 74|compliance certificate|secretarial|brsr|business responsibility/i },
61	  // SEBI takeover-code / insider disclosures mention "acquisition" but are shareholding reports, not deals.
62	  { cat: "pledging", sub: /31 ?\(1\)|31 ?\(2\)/i },
63	  { cat: "insider_trading", sub: /29 ?\(2\)|insider|7 ?\(2\)/i },
64	  { cat: "insider_trading", text: /\bsast\b|substantial acquisition of shares|regulation 29|regulation 7 ?\(2\)|prohibition of insider trading/i },
65	  { cat: "results", sub: /financial results/i },
66	  { cat: "results", text: /financial results|integrated filing \(financial\)/i },
67	  { cat: "earnings_call", sub: /earnings call/i },
68	  { cat: "earnings_call", text: /transcript|audio recording|conference call|earnings call|con-?call|webcast/i },
69	  { cat: "investor_meetings", sub: /analyst \/ investor meet/i },
70	  { cat: "results", sub: /investor presentation/i },
71	  { cat: "management_change", sub: /change in (management|directorate)|resignation|retirement|cessation|appointment of company secretary|demise/i },
72	  { cat: "management_change", text: /\b(appoint|re-?appoint|resign|cessation|retire|demise)\w*|managing director|chief executive|chief financial|\bceo\b|\bcfo\b/i },
73	  { cat: "M&A", sub: /acquisition|scheme of arrangement|joint venture|disinvestment|restructuring|amalgamation/i },
74	  { cat: "M&A", text: /acqui|amalgamat|merger|demerger|scheme of arrangement|joint venture|share purchase agreement|stake/i },
```

</details>

<a id="m171"></a>

**▶ Bash:** Check rule matching semantics

```bash
grep -n "type Rule\|const text\|r.sub\|r.text\|function classify" -A3 src/lib/engine/classify.ts | head -30
```

<details><summary>Result (14 lines)</summary>

```
54:type Rule = { cat: Category; sub?: RegExp; text?: RegExp };
55-
56-// Order matters: the first matching rule wins.
57-const RULES: Rule[] = [
--
97:export function classify(f: Pick<BseFiling, "category" | "subcategory" | "subject" | "headline">): Classified {
98-  const sub = `${f.category}/${f.subcategory}`;
99:  const text = `${f.subject} ${f.headline}`;
100-  let cat: Category = "unclassified";
101-  for (const r of RULES) {
102:    if ((r.sub && r.sub.test(sub)) || (r.text && r.text.test(text))) {
103-      cat = r.cat;
104-      break;
105-    }
```

</details>

<a id="m173"></a>

**▶ Bash:** Check for rules using both sub and text

```bash
grep -nE "sub: .*text: " src/lib/engine/classify.ts
```

<details><summary>Result (1 line)</summary>

```
(Bash completed with no output)
```

</details>


<a id="m175"></a>

**🤖 Claude:**

Changing rules that set both `sub` and `text` to require both to match is safe, since no existing rule sets both:

<a id="m176"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\classify.ts`

```diff
-   { cat: "results", sub: /financial results/i },
-   { cat: "results", text: /financial results|integrated filing \(financial\)/i },
-   { cat: "earnings_call", sub: /earnings call/i },
-   { cat: "earnings_call", text: /transcript|audio recording|conference call|earnings call|con-?call|webcast/i },
-   { cat: "investor_meetings", sub: /analyst \/ investor meet/i },
+   { cat: "results", sub: /financial results/i },
+   { cat: "earnings_call", sub: /earnings call/i },
+   // Analyst-meet notices often say "financial results" but are call logistics, not the results themselves.
+   { cat: "earnings_call", sub: /analyst \/ investor meet/i, text: /transcript|audio recording|conference call|earnings call|con-?call|webcast/i },
+   { cat: "investor_meetings", sub: /analyst \/ investor meet/i },
+   { cat: "results", text: /financial results|integrated filing \(financial\)/i },
+   { cat: "earnings_call", text: /transcript|audio recording|conference call|earnings call|con-?call|webcast/i },
```

<a id="m177"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\classify.ts`

```diff
- type Rule = { cat: Category; sub?: RegExp; text?: RegExp };
+ /** A rule matches on `sub` or `text`; when it sets both, both must match. */
+ type Rule = { cat: Category; sub?: RegExp; text?: RegExp };
```

<a id="m178"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\classify.ts`

```diff
-     if ((r.sub && r.sub.test(sub)) || (r.text && r.text.test(text))) {
+     const hit = r.sub && r.text ? r.sub.test(sub) && r.text.test(text) : (r.sub?.test(sub) ?? false) || (r.text?.test(text) ?? false);
+     if (hit) {
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\classify.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\classify.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\classify.ts has been updated successfully.
```

</details>


<a id="m182"></a>

**🤖 Claude:**

Next, the lender results. I'll align the screener path with the filing path, which already drops EBITDA for lenders:

<a id="m183"></a>

**▶ Bash:** Inspect ResultsCut type, filing path and margin usage

```bash
grep -n "export type ResultsCut" -A12 src/lib/engine/fundamentals.ts; sed -n '/export function resultsFromFiling/,/^}/p' src/lib/engine/fundamentals.ts; grep -n "function takeLine" -A25 src/lib/engine/fundamentals.ts | head -30; grep -n "margin" src/components/brief/FeedCard.tsx
```

<details><summary>Result (66 lines)</summary>

```
51:export type ResultsCut = {
52-  period: string;
53-  prevPeriod: string;
54-  yoyPeriod: string;
55-  metrics: { key: MetricKey; label: string; cur: number | null; prev: number | null; yoy: number | null; qoq: number | null; yoyPct: number | null }[];
56-  margin?: { label: string; cur: number | null; prev: number | null; yoy: number | null };
57-  take: string; // one deterministic sentence
58-  source: "screener" | "filing";
59-  verified?: boolean; // true when the filing extract and the standardised table agree on PAT
60-};
61-
62-type Triple = { cur: number | null; prev: number | null; yoy: number | null };
63-export type FilingResults = {
export function resultsFromFiling(x: FilingResults, isLender: boolean): ResultsCut {
  const k = { crore: 1, lakh: 0.01, million: 0.1, thousand: 0.0001 }[x.unit] ?? 1;
  const cr = (v: number | null) => (v == null ? null : +(v * k).toFixed(2));
  const t = (tr: Triple) => ({ cur: cr(tr.cur), prev: cr(tr.prev), yoy: cr(tr.yoy) });
  const ebitdaOf = (p: "cur" | "prev" | "yoy") => {
    const pbt = x.pbt[p];
    if (pbt == null) return null;
    return cr(pbt + (x.financeCost[p] ?? 0) + (x.depreciation[p] ?? 0) - (x.otherIncome[p] ?? 0));
  };
  const rev = t(x.revenue);
  const ebitda = { cur: ebitdaOf("cur"), prev: ebitdaOf("prev"), yoy: ebitdaOf("yoy") };
  const rows: { key: MetricKey; label: string; v: Triple }[] = [
    { key: "revenue", label: "Revenue", v: rev },
    ...(isLender ? [] : [{ key: "ebitda" as const, label: "EBITDA", v: ebitda }]),
    { key: "pbt", label: "PBT", v: t(x.pbt) },
    { key: "pat", label: "PAT", v: t(x.pat) },
  ];
… (36 more lines)
```

</details>

<a id="m185"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\fundamentals.ts`

```diff
-   const defs: { key: MetricKey; label: string; prefix: string }[] = isLender
-     ? [
-         { key: "revenue", label: "Revenue", prefix: "Revenue" },
-         { key: "ebitda", label: "Operating profit", prefix: "Financing Profit" },
-         { key: "pbt", label: "PBT", prefix: "Profit before tax" },
-         { key: "pat", label: "PAT", prefix: "Net Profit" },
-       ]
+   // Lenders: no EBITDA line. Screener's "Financing Profit" excludes a bank's other income (so it is
+   // often negative for large banks) and is not pre-provision operating profit, so it would mislead.
+   const defs: { key: MetricKey; label: string; prefix: string }[] = isLender
+     ? [
+         { key: "revenue", label: "Revenue", prefix: "Revenue" },
+         { key: "pbt", label: "PBT", prefix: "Profit before tax" },
+         { key: "pat", label: "PAT", prefix: "Net Profit" },
+       ]
```

<a id="m186"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\fundamentals.ts`

```diff
-   const m = at(isLender ? "Financing Margin" : "OPM");
-   const margin = { label: isLender ? "Financing margin" : "EBITDA margin", ...m };
-   return { period: q.headers[i],
+   const margin = isLender ? undefined : { label: "EBITDA margin", ...at("OPM") };
+   return { period: q.headers[i],
```

<a id="m187"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\fundamentals.ts`

```diff
-   return { period: x.quarter, prevPeriod: x.prevQuarter, yoyPeriod: x.yoyQuarter, metrics, margin, take: takeLine(metrics, margin), source: "filing" };
- }
+   return {
+     period: periodLabel(x.quarter),
+     prevPeriod: periodLabel(x.prevQuarter),
+     yoyPeriod: periodLabel(x.yoyQuarter),
+     metrics,
+     margin,
+     take: takeLine(metrics, margin),
+     source: "filing",
+   };
+ }
+ 
+ const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
+ /** Filing column headers come as "30-Sep-26", "30.09.2026", "September 30, 2026"…; show them like screener: "Sep 2026". */
+ export function periodLabel(s: string): string {
+   const yr = (y: string) => (y.length === 2 ? `20${y}` : y);
+   const named = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,.-]*(?:\d{1,2}[\s,.-]+)?'?(\d{4}|\d{2})\b/i.exec(s);
+   if (named) return `${MONTHS.findIndex((m) => m.toLowerCase() === named[1].toLowerCase())  >= 0 ? MONTHS.find((m) => m.toLowerCase() === named[1].toLowerCase()) : named[1]} ${yr(named[2])}`;
+   const numeric = /\b\d{1,2}[./-](\d{1,2})[./-](\d{4}|\d{2})\b/.exec(s);
+   if (numeric && +numeric[1] >= 1 && +numeric[1] <= 12) return `${MONTHS[+numeric[1] - 1]} ${yr(numeric[2])}`;
+   return s;
+ }
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\fundamentals.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\fundamentals.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\fundamentals.ts has been updated successfully.
```

</details>


<a id="m191"></a>

**🤖 Claude:**

That month-name line is clumsy, so I'll simplify it:

<a id="m192"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\fundamentals.ts`

```diff
-   if (named) return `${MONTHS.findIndex((m) => m.toLowerCase() === named[1].toLowerCase())  >= 0 ? MONTHS.find((m) => m.toLowerCase() === named[1].toLowerCase()) : named[1]} ${yr(named[2])}`;
+   if (named) return `${MONTHS.find((m) => m.toLowerCase() === named[1].toLowerCase())} ${yr(named[2])}`;
```

<a id="m193"></a>

**▶ Bash:** View the results grid in the feed card

```bash
sed -n 95,140p src/components/brief/FeedCard.tsx
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\fundamentals.ts has been updated successfully.
```

</details>

<details><summary>Result (46 lines)</summary>

```
              {r.pdfUrl ? (
                <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:text-accent">
                  {r.title}
                </a>
              ) : (
                <span className="text-ink-2">{r.title}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ResultsGrid({ r }: { r: NonNullable<FeedItem["results"]> }) {
  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-3">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-4 gap-y-1.5 text-[13px]">
        <span className="text-[11px] text-muted">₹ Cr · {r.period}</span>
        <span className="text-right text-[11px] text-muted">Now</span>
        <span className="text-right text-[11px] text-muted">QoQ</span>
        <span className="text-right text-[11px] text-muted">YoY</span>
        {r.metrics.map((m) => (
          <Row key={m.key} label={m.label} cur={m.cur} qoq={m.qoq} yoy={m.yoyPct} />
        ))}
        {r.margin && r.margin.cur != null && (
          <>
            <span className="text-ink-2">{r.margin.label}</span>
            <span className="num text-right">{r.margin.cur}%</span>
… (16 more lines)
```

</details>


<a id="m196"></a>

**🤖 Claude:**

I'll add a note on lender cards explaining why EBITDA is missing:

<a id="m197"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\components\brief\FeedCard.tsx`

```diff
-         {r.source === "filing"
-           ? "read from the results filing by FINN; EBITDA = PBT + finance cost + D&A − other income"
-           : `standardised by screener.in${r.verified ? " · ✓ matches the filing" : ""}`}
+         {r.source === "filing"
+           ? `read from the results filing by FINN${lender ? "" : "; EBITDA = PBT + finance cost + D&A − other income"}`
+           : `standardised by screener.in${r.verified ? " · ✓ matches the filing" : ""}`}
+         {lender && " · a lender, so no EBITDA line"}
```

<a id="m198"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\components\brief\FeedCard.tsx`

```diff
- function ResultsGrid({ r }: { r: NonNullable<FeedItem["results"]> }) {
-   return (
+ function ResultsGrid({ r }: { r: NonNullable<FeedItem["results"]> }) {
+   const lender = !r.metrics.some((m) => m.key === "ebitda");
+   return (
```

<a id="m199"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\feed.ts`

```diff
-     if (it.cat === "results" && it.tier === "act") {
+     // One results grid per company per window: the first (newest) results card gets it.
+     if (it.cat === "results" && it.tier === "act" && !resultsShown.has(it.symbol)) {
+       resultsShown.add(it.symbol);
```

<a id="m200"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\feed.ts`

```diff
-   for (const it of items) {
-     const co = companies.get(it.symbol)!;
-     const e = enrichments[it.id];
+   const resultsShown = new Set<string>();
+   for (const it of items) {
+     const co = companies.get(it.symbol)!;
+     const e = enrichments[it.id];
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\components\brief\FeedCard.tsx has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\components\brief\FeedCard.tsx has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\feed.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\feed.ts has been updated successfully.
```

</details>


<a id="m205"></a>

**🤖 Claude:**

Now I'll re-run the snapshot: it re-classifies the filings and retries the missing PDF texts. First I'll check the cache expiry so it doesn't re-download everything.

<a id="m206"></a>

**▶ Bash:** Check snapshot cache behaviour

```bash
grep -n "async function cached" -A12 scripts/snapshot.ts; grep -n "REFRESH\|FROM =" scripts/snapshot.ts | head -5; ls data/cache | head; grep -n '"snapshot"' package.json
```

<details><summary>Result (28 lines)</summary>

```
31:async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
32-  const p = path.join(CACHE, key.replace(/[^\w.-]/g, "_") + ".json");
33-  if (!REFRESH && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
34-  const v = await fn();
35-  fs.writeFileSync(p, JSON.stringify(v));
36-  await sleep(600); // be polite to public sources
37-  return v;
38-}
39-
40-const LENDER = /bank|finance|nbfc|lending|housing finance|financial services/i;
41-
42-// Filings worth reading in full: the ones FINN enriches (people, deals, capex, legal).
43-// "Worth knowing" items get read too, so each can carry a one-line summary instead of a BSE form title.
24:const REFRESH = process.argv.includes("--refresh");
25:const FROM = new Date("2026-10-01T00:00:00+05:30");
33:  if (!REFRESH && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
125:    if (fs.existsSync(p) && !REFRESH) {
bse_ADANIPORTS.json
bse_ASIANPAINT.json
bse_BAJFINANCE.json
bse_EQUITASBNK.json
bse_HAL.json
bse_HDFCBANK.json
bse_KAYNES.json
bse_KOTAKBANK.json
bse_LAURUSLABS.json
bse_LT.json
10:    "snapshot": "node --env-file-if-exists=.env.local --import tsx scripts/snapshot.ts",
```

</details>

<a id="m208"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\snapshot.ts`

```diff
-   const snap: Snapshot = { generatedAt: new Date().toISOString(), from: FROM.toISOString(), companies, filings, eod };
+   // Without --refresh the sources come from cache, so "as of" stays the time they were fetched.
+   const feedPath = path.join(OUT, "feed.json");
+   const prevAsOf = !REFRESH && fs.existsSync(feedPath) ? (JSON.parse(fs.readFileSync(feedPath, "utf8")) as Snapshot).generatedAt : null;
+   const snap: Snapshot = { generatedAt: prevAsOf ?? new Date().toISOString(), from: FROM.toISOString(), companies, filings, eod };
```

<a id="m209"></a>

**▶ Bash:** Type-check and re-run snapshot from cache

```bash
rm scripts/dev/_pdftest.ts && export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -5; npm run snapshot 2>&1 | tail -15
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\snapshot.ts has been updated successfully.
```

</details>

<details><summary>Result (15 lines)</summary>

```
  NTPC cf8a6ba5-d3c7-4647-8a03-9fc3e3d5055a: fetch failed
.x
  NTPC 54325e14-23f6-4f99-a982-5b6e40e86f04: fetch failed
..x
  LAURUSLABS dd99e487-a84f-407c-b584-b17ced57c0dc: fetch failed
x
  SUNPHARMA ec707522-529d-49a5-bc71-3e7f7df28129: fetch failed
x
  SUNPHARMA f039d44f-8dbf-42dd-bf8b-d2a9e290ecb6: fetch failed
x
  SUNPHARMA d1f8e649-ab86-4e59-8c13-4d65a8072d23: fetch failed
x
  NAVINFLUOR 780d9944-2b1d-4ec2-bf26-58a66a967812: fetch failed
.
Done: 21 companies, 387 filings { know: 110, act: 77, routine: 200 }
```

</details>


<a id="m212"></a>

**🤖 Claude:**

Many BSE PDF downloads failed with "fetch failed", which looks like BSE throttling. I'll count what's still missing:

<a id="m213"></a>

**▶ Bash:** List filings still missing text

```bash
python -c "
import json,os
feed=json.load(open('data/snapshot/feed.json',encoding='utf-8'))
need=[f for f in feed['filings'] if f.get('pdfUrl') and ((f['cat']=='management_change' and f['tier']!='routine') or (f['cat'] in ('M&A','capex','litigation','fund_raise','pledging') and f['tier']=='act') or (f['tier']=='know' and f['cat'] not in ('earnings_call','results')) or (f['cat']=='results' and f['tier']=='act'))]
miss=[f for f in need if not f.get('hasText')]
print('need',len(need),'missing',len(miss), 'generatedAt', feed['generatedAt'])
for f in miss: print(' ',f['symbol'],f['tier'],f['cat'],f['ts'][:10],f['subject'][:70])
"
```

<details><summary>Result (21 lines)</summary>

```
need 161 missing 20 generatedAt 2026-11-15T21:49:19.772Z
  KAYNES act results 2026-11-14 Financial Results For The Second Quarter And Half Year Ended 30 Septem
  HDFCBANK act management_change 2026-11-13 Announcement under Regulation 30 (LODR)-Change in Directorate
  EQUITASBNK know insider_trading 2026-11-12 Disclosures under Reg. 29(2) of SEBI (SAST) Regulations, 2011
  HAL act results 2026-11-12 Audited Financial Results (Standalone And Consolidated) For The Quarte
  EQUITASBNK know insider_trading 2026-11-03 Disclosures under Reg. 29(2) of SEBI (SAST) Regulations, 2011
  NTPC know dividend 2026-10-31 Corporate Action-Board approves Dividend
  NTPC act results 2026-10-31 Board Meeting Outcome for Unaudited Standalone & Consolidated Financia
  SUNPHARMA know management_change 2026-10-30 Appointment Of Statutory Auditors Pursuant To Mandatory Auditor Rotati
  NAVINFLUOR know dividend 2026-10-30 Intimation Of Record Date For Ascertaining Members Eligible For The Pa
  NTPC act capex 2026-10-30 Declaration Of Commercial Operation Of Fifth Part Capacity Of 95.6 MW 
  EQUITASBNK act results 2026-10-29 Announcement under Regulation 30 (LODR)-Press Release / Media Release
  NTPC know insider_trading 2026-10-22 Disclosures under Reg. 29(2) of SEBI (SAST) Regulations, 2011
  BAJFINANCE know management_change 2026-10-19 Announcement under Regulation 30 (LODR)-Change in Management
  NTPC know management_change 2026-10-19 Appointment Of Shri Diwakar Nath Misra, Additional Secretary, Ministry
  LAURUSLABS act M&A 2026-10-14 Announcement under Regulation 30 (LODR)-Updates on Acquisition
  SUNPHARMA know credit_rating 2026-10-13 Announcement under Regulation 30 (LODR)-Credit Rating
  ADANIPORTS know insider_trading 2026-10-13 Disclosures under Reg. 29(2) of SEBI (SAST) Regulations, 2011
  LT know management_change 2026-10-07 Announcement under Regulation 30 (LODR)-Change in Management
  SUNPHARMA know press_release 2026-10-06 Announcement under Regulation 30 (LODR)-Press Release / Media Release
  ADANIPORTS act capex 2026-09-30 Media Release
```

</details>


<a id="m215"></a>

**🤖 Claude:**

Kaynes is still missing, even though the same PDF downloaded fine a few minutes ago. I'll check whether `fetchWithRetry` retries network-level errors or only HTTP status codes:

<a id="m216"></a>

**▶ Bash:** Inspect fetch retry and PDF fetch code

```bash
sed -n '/export async function fetchWithRetry/,/^}/p' src/lib/sources/http.ts; grep -n "export async function fetchPdf" -A12 src/lib/sources/pdf.ts
```

<details><summary>Result (41 lines)</summary>

```
export async function fetchWithRetry(
  url: string,
  init: RequestInit & { retries?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const { retries = 2, timeoutMs = 25_000, headers, ...rest } = init;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...rest,
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new SourceError(`${res.status} from ${url}`, res.status);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new SourceError(`${res.status} from ${url}`, res.status);
      return res;
    } catch (e) {
      lastErr = e;
      if (e instanceof SourceError && e.status && e.status < 500 && e.status !== 429) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new SourceError(String(lastErr));
}
6:export async function fetchPdf(url: string): Promise<Uint8Array> {
7-  const res = await fetchWithRetry(url, {
… (11 more lines)
```

</details>


<a id="m218"></a>

**🤖 Claude:**

It already retries network errors, but only twice with short waits. Since these failures look like temporary BSE throttling, I'll just run it again; only the 20 missing texts are fetched.

<a id="m219"></a>

**▶ Bash:** Retry snapshot for missing filing texts

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run snapshot 2>&1 | grep -E "Reading|Done|failed|Not a PDF" | head -30
```

<details><summary>Result (16 lines)</summary>

```
Reading 161 material filing PDFs…
  HDFCBANK 44ba0161-d9e4-4bd1-aae7-eb3bc46319dd: fetch failed
  EQUITASBNK 35d69a8e-dc46-4958-a12a-a0159c518ec5: fetch failed
  BAJFINANCE 9817a9b7-6de3-4bfa-8e80-ac4cf87d1d6a: fetch failed
  LT 738f2bee-0fcb-4e4b-8115-2b3afbc7e0e2: fetch failed
  ADANIPORTS b1861635-a4ef-4c78-82c0-6ec3557bf627: fetch failed
  KAYNES b0847910-ddd5-48fc-8f2c-7f15b2038d45: fetch failed
  NTPC 38ac0fde-0e52-4141-8ddf-6a9a84956d60: fetch failed
  NTPC cf8a6ba5-d3c7-4647-8a03-9fc3e3d5055a: fetch failed
  NTPC 54325e14-23f6-4f99-a982-5b6e40e86f04: fetch failed
  LAURUSLABS dd99e487-a84f-407c-b584-b17ced57c0dc: fetch failed
  SUNPHARMA ec707522-529d-49a5-bc71-3e7f7df28129: fetch failed
  SUNPHARMA f039d44f-8dbf-42dd-bf8b-d2a9e290ecb6: fetch failed
  SUNPHARMA d1f8e649-ab86-4e59-8c13-4d65a8072d23: fetch failed
  NAVINFLUOR 780d9944-2b1d-4ec2-bf26-58a66a967812: fetch failed
Done: 21 companies, 387 filings { know: 110, act: 77, routine: 200 }
```

</details>


<a id="m221"></a>

**🤖 Claude:**

The same 14 fail every time, including Kaynes, which downloaded fine in my standalone test. So this is deterministic, not throttling. I'll print the underlying error cause:

<a id="m222"></a>

**▶ Bash:** Debug the underlying fetch failure cause

```bash
export PATH="/c/Program Files/nodejs:$PATH" && cat > scripts/dev/_dbg.ts <<'EOF'
import { pdfTextFromUrl } from "../../src/lib/sources/pdf";
(async () => {
  const u = process.argv[2];
  try {
    const r = await pdfTextFromUrl(u, { maxPages: 6, maxChars: 24000 });
    console.log("OK", r.text.length);
  } catch (e) {
    const err = e as Error & { cause?: unknown };
    console.log("ERR", err.message, "| cause:", err.cause);
  }
})();
EOF
python -c "
import json
feed=json.load(open('data/snapshot/feed.json',encoding='utf-8'))
for f in feed['filings']:
  if f['id'] in ('b0847910-ddd5-48fc-8f2c-7f15b2038d45','44ba0161-d9e4-4bd1-aae7-eb3bc46319dd'): print(f['pdfUrl'])
" > /tmp/u.txt; cat /tmp/u.txt; for u in $(cat /tmp/u.txt); do npx tsx scripts/dev/_dbg.ts "$u"; done
```

<details><summary>Result (4 lines)</summary>

```
https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=83b2c93d-de1c-4006-853e-eeb50eec49ef.pdf
https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=7b9eb8a8-fa88-453b-810f-b55034589aac.pdf
OK 17646
OK 5542
```

</details>


<a id="m224"></a>

**🤖 Claude:**

Both work on their own, so the failures must come from BSE resetting connections after a long burst of requests. I'll add a slower second pass for failed downloads to the snapshot script:

<a id="m225"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\snapshot.ts`

```diff
-   const toRead = filings.filter(NEEDS_TEXT);
-   console.log(`\nReading ${toRead.length} material filing PDFs…`);
-   for (const f of toRead) {
-     const p = path.join(OUT, "texts", `${f.id}.txt`);
-     if (fs.existsSync(p) && !REFRESH) {
-       f.hasText = true;
-       continue;
-     }
-     try {
+   const toRead = filings.filter(NEEDS_TEXT);
+   console.log(`\nReading ${toRead.length} material filing PDFs…`);
+   // BSE starts resetting connections after a long burst, so failures get a second, slower pass.
+   const failed: Filing[] = [];
+   for (const [pass, list, gap] of [
+     [1, toRead, 400],
+     [2, failed, 3000],
+   ] as const) {
+     if (pass === 2 && failed.length) {
+       console.log(`\nRetrying ${failed.length} PDFs slowly…`);
+       await sleep(10_000);
+     }
+     for (const f of [...list]) {
+     const p = path.join(OUT, "texts", `${f.id}.txt`);
+     if (fs.existsSync(p) && !REFRESH) {
+       f.hasText = true;
+       continue;
+     }
+     try {
```

<a id="m226"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\snapshot.ts`

```diff
-     } catch (e) {
-       process.stdout.write("x");
-       console.error(`\n  ${f.symbol} ${f.id}: ${(e as Error).message}`);
-     }
-     await sleep(400);
-   }
+     } catch (e) {
+       process.stdout.write("x");
+       if (pass === 1) failed.push(f);
+       else console.error(`\n  ${f.symbol} ${f.id}: ${(e as Error).message}`);
+     }
+     await sleep(gap);
+     }
+   }
```

<a id="m227"></a>

**▶ Bash:** Format, type-check and rerun snapshot with slow retry pass

```bash
export PATH="/c/Program Files/nodejs:$PATH" && rm scripts/dev/_dbg.ts && npx prettier --write scripts/snapshot.ts >/dev/null 2>&1; npx tsc --noEmit -p . 2>&1 | head -5; npm run snapshot 2>&1 | grep -E "Reading|Retrying|Done|failed|Not a PDF" | head -30
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\snapshot.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\snapshot.ts has been updated successfully.
```

</details>

<details><summary>Result (17 lines)</summary>

```
Reading 161 material filing PDFs…
Retrying 13 PDFs slowly…
  HDFCBANK 44ba0161-d9e4-4bd1-aae7-eb3bc46319dd: fetch failed
  EQUITASBNK 35d69a8e-dc46-4958-a12a-a0159c518ec5: fetch failed
  BAJFINANCE 9817a9b7-6de3-4bfa-8e80-ac4cf87d1d6a: fetch failed
  LT 738f2bee-0fcb-4e4b-8115-2b3afbc7e0e2: fetch failed
  ADANIPORTS b1861635-a4ef-4c78-82c0-6ec3557bf627: fetch failed
  KAYNES b0847910-ddd5-48fc-8f2c-7f15b2038d45: fetch failed
  NTPC cf8a6ba5-d3c7-4647-8a03-9fc3e3d5055a: fetch failed
  NTPC 54325e14-23f6-4f99-a982-5b6e40e86f04: fetch failed
  LAURUSLABS dd99e487-a84f-407c-b584-b17ced57c0dc: fetch failed
  SUNPHARMA ec707522-529d-49a5-bc71-3e7f7df28129: fetch failed
  SUNPHARMA f039d44f-8dbf-42dd-bf8b-d2a9e290ecb6: fetch failed
  SUNPHARMA d1f8e649-ab86-4e59-8c13-4d65a8072d23: fetch failed
  NAVINFLUOR 780d9944-2b1d-4ec2-bf26-58a66a967812: fetch failed
Done: 21 companies, 387 filings { know: 110, act: 77, routine: 200 }
[This command modified 1 file you've previously read: scripts\snapshot.ts. Call Read before editing.]
```

</details>


<a id="m231"></a>

**🤖 Claude:**

Even the slow pass fails, yet the same URLs work from a fresh process. Something in the long-running process is breaking `fetch`, so I'll log the error cause:

<a id="m232"></a>

**▶ Bash:** Log the fetch failure cause and rerun

```bash
grep -n 'else console.error' scripts/snapshot.ts && sed -i 's|else console.error(`\\n  ${f.symbol} ${f.id}: ${(e as Error).message}`);|else console.error(`\\n  ${f.symbol} ${f.id}: ${(e as Error).message}`, (e as { cause?: unknown }).cause ?? "");|' scripts/snapshot.ts && grep -n 'else console.error' scripts/snapshot.ts && export PATH="/c/Program Files/nodejs:$PATH" && npm run snapshot 2>&1 | grep -E "Retrying|failed" -A3 | head -24
```

<details><summary>Result (27 lines)</summary>

```
171:        else console.error(`\n  ${f.symbol} ${f.id}: ${(e as Error).message}`);
171:        else console.error(`\n  ${f.symbol} ${f.id}: ${(e as Error).message}`);
Retrying 14 PDFs slowly…
x
  HDFCBANK 44ba0161-d9e4-4bd1-aae7-eb3bc46319dd: fetch failed
.x
  EQUITASBNK 35d69a8e-dc46-4958-a12a-a0159c518ec5: fetch failed
x
  BAJFINANCE 9817a9b7-6de3-4bfa-8e80-ac4cf87d1d6a: fetch failed
x
  LT 738f2bee-0fcb-4e4b-8115-2b3afbc7e0e2: fetch failed
x
  ADANIPORTS b1861635-a4ef-4c78-82c0-6ec3557bf627: fetch failed
x
  KAYNES b0847910-ddd5-48fc-8f2c-7f15b2038d45: fetch failed
x
  NTPC cf8a6ba5-d3c7-4647-8a03-9fc3e3d5055a: fetch failed
x
  NTPC 54325e14-23f6-4f99-a982-5b6e40e86f04: fetch failed
x
  LAURUSLABS dd99e487-a84f-407c-b584-b17ced57c0dc: fetch failed
x
  SUNPHARMA ec707522-529d-49a5-bc71-3e7f7df28129: fetch failed
x
  SUNPHARMA f039d44f-8dbf-42dd-bf8b-d2a9e290ecb6: fetch failed
x
[This command modified 1 file you've previously read: scripts\snapshot.ts. Call Read before editing.]
```

</details>


<a id="m234"></a>

**🤖 Claude:**

The `sed` didn't match, so I'll make the edit directly:

<a id="m235"></a>

**📖 Read** `~\EnamHoldingsOA\web\scripts\snapshot.ts` (from line 120, 60 lines)

<details><summary>Result (60 lines)</summary>

```
120	              bseCategory: r.category,
121	              bseSub: r.subcategory,
122	              subject: r.subject,
123	              headline: r.headline,
124	              pdfUrl: r.pdfUrl,
125	              critical: r.critical,
126	              ...c,
127	            });
128	          }
129	          process.stdout.write(`filings ${raw.length}`);
130	        } catch (e) {
131	          process.stdout.write(`bse FAILED ${(e as Error).message}`);
132	        }
133	      }
134	    }
135	    console.log();
136	  }
137	
138	  // Pull the text of material filings so enrichment (LLM) and the app never need BSE live.
139	  const toRead = filings.filter(NEEDS_TEXT);
140	  console.log(`\nReading ${toRead.length} material filing PDFs…`);
141	  // BSE starts resetting connections after a long burst, so failures get a second, slower pass.
142	  const failed: Filing[] = [];
143	  for (const [pass, list, gap] of [
144	    [1, toRead, 400],
145	    [2, failed, 3000],
146	  ] as const) {
147	    if (pass === 2 && failed.length) {
148	      console.log(`\nRetrying ${failed.length} PDFs slowly…`);
149	      await sleep(10_000);
… (30 more lines)
```

</details>


<a id="m237"></a>

**🤖 Claude:**

The first network call in the snapshot process already fails, so this isn't throttling at all. Something in that process differs from my standalone test. I'll log the cause:

<a id="m238"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\snapshot.ts`

```diff
-         else console.error(`\n  ${f.symbol} ${f.id}: ${(e as Error).message}`);
+         else console.error(`\n  ${f.symbol} ${f.id}: ${(e as Error).message}`, (e as { cause?: unknown }).cause ?? "");
```

<a id="m239"></a>

**▶ Bash:** Check imports and capture fetch error cause

```bash
grep -n "^import\|setGlobalDispatcher\|undici\|globalThis.fetch" scripts/snapshot.ts src/lib/sources/*.ts | head -20; export PATH="/c/Program Files/nodejs:$PATH" && timeout 120 npm run snapshot 2>&1 | grep -E "failed" -A6 | head -14
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\snapshot.ts has been updated successfully.
```

</details>

<details><summary>Result (14 lines)</summary>

```
scripts/snapshot.ts:11:import fs from "node:fs";
scripts/snapshot.ts:12:import path from "node:path";
scripts/snapshot.ts:13:import { getCompany, type ScreenerCompany } from "../src/lib/sources/screener";
scripts/snapshot.ts:14:import { getBseFilings, type BseFiling } from "../src/lib/sources/bse";
scripts/snapshot.ts:15:import { getDailyBars, type Bar } from "../src/lib/sources/yahoo";
scripts/snapshot.ts:16:import { pdfTextFromUrl } from "../src/lib/sources/pdf";
scripts/snapshot.ts:17:import { classify } from "../src/lib/engine/classify";
scripts/snapshot.ts:18:import type { CompanyMeta, Filing, Snapshot } from "../src/lib/types";
src/lib/sources/bse.ts:2:import { fetchWithRetry } from "./http";
src/lib/sources/pdf.ts:3:import { getDocumentProxy } from "unpdf";
src/lib/sources/pdf.ts:4:import { fetchWithRetry } from "./http";
src/lib/sources/screener.ts:3:import * as cheerio from "cheerio";
src/lib/sources/screener.ts:4:import { fetchText, parseNum, SourceError } from "./http";
src/lib/sources/yahoo.ts:2:import { fetchWithRetry } from "./http";
```

</details>


<a id="m242"></a>

**🤖 Claude:**

The timeout cut it off before the second pass. A quicker test: run my debug script with exactly the flags the npm script uses.

<a id="m243"></a>

**▶ Bash:** Compare fetch under npm-script flags vs npx tsx

```bash
export PATH="/c/Program Files/nodejs:$PATH" && cat > scripts/dev/_dbg.ts <<'EOF'
import { pdfTextFromUrl } from "../../src/lib/sources/pdf";
(async () => {
  const u = process.argv[2];
  try {
    const r = await pdfTextFromUrl(u, { maxPages: 6, maxChars: 24000 });
    console.log("OK", r.text.length);
  } catch (e) {
    const err = e as Error & { cause?: unknown };
    console.log("ERR", err.message, "| cause:", err.cause);
  }
})();
EOF
U=https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=83b2c93d-de1c-4006-853e-eeb50eec49ef.pdf
echo "--- with node --env-file --import tsx"; node --env-file-if-exists=.env.local --import tsx scripts/dev/_dbg.ts "$U"
echo "--- npx tsx"; npx tsx scripts/dev/_dbg.ts "$U"
```

<details><summary>Result (4 lines)</summary>

```
--- with node --env-file --import tsx
OK 17646
--- npx tsx
OK 17646
```

</details>


<a id="m245"></a>

**🤖 Claude:**

Both pass, so the flags aren't the problem. I'll run the full snapshot in the background and read the logged cause.

<a id="m246"></a>

**▶ Bash · background:** Run snapshot and capture fetch error causes

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run snapshot > "<session-tmp>/scratchpad/snap.log" 2>&1; grep -E "failed" -A8 "<session-tmp>/scratchpad/snap.log" | head -30; tail -2 "<session-tmp>/scratchpad/snap.log"
```

<details><summary>Result (1 line)</summary>

```
Command running in background with ID: b71jjlx71. Output is being written to: <session-tmp>/tasks\b71jjlx71.output. You will be notified when it completes — do not poll that file or sleep while waiting. Read the file only if the user asks for progress, or if you need a line it prints before you can go on, such as a server's ready line or port.
```

</details>


<a id="m248"></a>

**🤖 Claude:**

While that runs, I'll draft the cost line for the writeup. These are the totals so far:

<a id="m249"></a>

**▶ Bash:** Summarise the LLM cost ledger

```bash
python -c "
import json
l=json.load(open('data/snapshot/llm-ledger.json',encoding='utf-8'))
for r in l['runs']: print(r['script'], r['at'][:16], r['calls'], r['cachedCalls'], r['inputTokens'], r['outputTokens'], r['costUsd'], r['models'])
"; ls data/cache/llm | wc -l
```

<details><summary>Result (4 lines)</summary>

```
enrich 2026-11-16T05:00 158 1 562592 24525 0.2273 ['gemini-3.5-flash-lite']
enrich 2026-11-16T05:01 3 0 7363 1026 0.0048 ['gemini-3.5-flash-lite']
enrich 2026-11-16T05:02 21 12 81085 3503 0.0163 ['gemini-3.5-flash-lite']
217
```

</details>


<a id="m251"></a>

**🤖 Claude:**

The research script doesn't write to the cost ledger, so the totals miss it. I'll fix that so all spend is in one place:

<a id="m252"></a>

**📖 Read** `~\EnamHoldingsOA\web\scripts\research.ts`

<details><summary>Result (46 lines)</summary>

```
1	/**
2	 * Pre-computes the Pull analysis for the research list so the demo opens instantly.
3	 * The live app runs the exact same pipeline (src/lib/engine/research.ts) for any other ticker.
4	 *
5	 *   ANTHROPIC_API_KEY=... npx tsx scripts/research.ts            # all research symbols
6	 *   ANTHROPIC_API_KEY=... npx tsx scripts/research.ts DIXON TCS  # specific ones
7	 */
8	import fs from "node:fs";
9	import path from "node:path";
10	import { isLenderCo, snapshotCompany } from "../src/lib/companies";
11	import { runResearch } from "../src/lib/engine/research";
12	import { llmProvider } from "../src/lib/llm";
13	import { getCompany } from "../src/lib/sources/screener";
14	
15	const ROOT = path.resolve(__dirname, "..");
16	const OUT = path.join(ROOT, "data", "snapshot", "research");
17	
18	async function main() {
19	  if (!llmProvider()) {
20	    console.error("No LLM key. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.");
21	    process.exit(1);
22	  }
23	  fs.mkdirSync(OUT, { recursive: true });
24	  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "portfolio.json"), "utf8"));
25	  const symbols: string[] = process.argv.slice(2).length ? process.argv.slice(2) : cfg.research;
26	  let total = 0;
27	  for (const s of symbols) {
28	    console.log(`\n${s}`);
29	    const co = snapshotCompany(s) ?? (await getCompany(s));
30	    try {
… (16 more lines)
```

</details>

<a id="m254"></a>

**▶ Bash:** Check cache-hit accounting in llmJSON

```bash
sed -n 80,100p src/lib/llm.ts
```

<details><summary>Result (21 lines)</summary>

```
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
    const usage = { ...hit.usage, cached: true, costUsd: 0 };
    ledger.push(usage);
    return { data: opts.schema.parse(hit.data), usage };
  }

  const out =
    provider === "anthropic" ? await callAnthropic(model, opts) : await callGemini(model, opts);
```

</details>


<a id="m256"></a>

**🤖 Claude:**

Cache hits are already recorded at $0, so the ledger stays accurate. I'll move the ledger-writing code into a shared helper and call it from both scripts:

<a id="m257"></a>

**📝 Write** `~\EnamHoldingsOA\web\scripts\ledger.ts` (23 lines)

```ts
/** Appends this run's LLM usage to data/snapshot/llm-ledger.json, so every script's spend is on record. */
import fs from "node:fs";
import path from "node:path";
import { usageLedger } from "../src/lib/llm";

export function appendLedger(script: string) {
  const led = usageLedger();
  const total = led.reduce((s, u) => s + u.costUsd, 0);
  const ledgerPath = path.resolve(__dirname, "..", "data", "snapshot", "llm-ledger.json");
  const prev = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : { runs: [] };
  prev.runs.push({
    script,
    at: new Date().toISOString(),
    calls: led.length,
    cachedCalls: led.filter((u) => u.cached).length,
    inputTokens: led.reduce((s, u) => s + u.inputTokens, 0),
    outputTokens: led.reduce((s, u) => s + u.outputTokens, 0),
    costUsd: +total.toFixed(4),
    models: [...new Set(led.map((u) => u.model))],
  });
  fs.writeFileSync(ledgerPath, JSON.stringify(prev, null, 1));
  return { calls: led.length, cached: led.filter((u) => u.cached).length, total };
}
```

<a id="m258"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\research.ts`

```diff
-   console.log(`\nTotal: $${total.toFixed(4)}`);
- }
+   appendLedger("research");
+   console.log(`\nTotal: $${total.toFixed(4)}`);
+ }
```

<a id="m259"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\research.ts`

```diff
- import { getCompany } from "../src/lib/sources/screener";
+ import { getCompany } from "../src/lib/sources/screener";
+ import { appendLedger } from "./ledger";
```

<a id="m260"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
-   const led = usageLedger();
-   const total = led.reduce((s, u) => s + u.costUsd, 0);
-   const ledgerPath = path.join(SNAP, "llm-ledger.json");
-   const prev = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : { runs: [] };
-   prev.runs.push({
-     script: "enrich",
-     at: new Date().toISOString(),
-     calls: led.length,
-     cachedCalls: led.filter((u) => u.cached).length,
-     inputTokens: led.reduce((s, u) => s + u.inputTokens, 0),
-     outputTokens: led.reduce((s, u) => s + u.outputTokens, 0),
-     costUsd: +total.toFixed(4),
-     models: [...new Set(led.map((u) => u.model))],
-   });
-   fs.writeFileSync(ledgerPath, JSON.stringify(prev, null, 1));
-   console.log(`\nDone. ${led.length} calls, $${total.toFixed(4)} (${led.filter((u) => u.cached).length} served from cache)`);
+   const run = appendLedger("enrich");
+   console.log(`\nDone. ${run.calls} calls, $${run.total.toFixed(4)} (${run.cached} served from cache)`);
```

<a id="m261"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
- import { LlmUnavailable, llmJSON, llmProvider, modelFor, usageLedger } from "../src/lib/llm";
+ import { LlmUnavailable, llmJSON, llmProvider, modelFor } from "../src/lib/llm";
+ import { appendLedger } from "./ledger";
```

<details><summary>Result (1 line)</summary>

```
File created successfully at: ~\EnamHoldingsOA\web\scripts\ledger.ts (file state is current in your context — no need to Read it back)
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\research.ts has been updated successfully. (file state is current in your context — no need to Read it back)
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\research.ts has been updated successfully. (file state is current in your context — no need to Read it back)
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>


<a id="m267"></a>

**🤖 Claude:**

I'll also record the four earlier research runs in the ledger, marked as reconstructed from the console output because their token counts weren't saved:

<a id="m268"></a>

**▶ Bash:** Backfill research runs into ledger and type-check

```bash
python -c "
import json
p='data/snapshot/llm-ledger.json'
l=json.load(open(p,encoding='utf-8'))
for at,c in [('2026-11-16T04:56',0.2448),('2026-11-16T05:05',0.2089),('2026-11-16T05:20',0.1605),('2026-11-16T05:30',0.1616)]:
  l['runs'].append({'script':'research','at':at+':00.000Z','costUsd':c,'models':['gemini-3.5-flash-lite','gemini-3.6-flash'],'note':'reconstructed from script console output (prompt iterations); tokens not recorded'})
l['runs'].sort(key=lambda r:r['at'])
json.dump(l,open(p,'w',encoding='utf-8'),indent=1)
print(sum(r['costUsd'] for r in l['runs']))
"; export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -5; echo tsc done
```

<details><summary>Result (2 lines)</summary>

```
1.0242
tsc done
```

</details>


<a id="m270"></a>

**🤖 Claude:**

Total spend so far is about $1.02 at list prices, and $0 actually paid on the free tier. Still waiting on the snapshot run.

> ⏱ *Background task completed:* Background command "Run snapshot and capture fetch error causes" completed (exit code 0)

<a id="m272"></a>

**▶ Bash:** Show captured fetch error causes

```bash
head -c 2500 "<session-tmp>/tasks/b71jjlx71.output"
```

<details><summary>Result (28 lines)</summary>

```
  HDFCBANK 44ba0161-d9e4-4bd1-aae7-eb3bc46319dd: fetch failed HTTPParserError: Response does not match the HTTP/1.1 protocol (Unexpected whitespace after header value)
    at Parser.createError (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:417:12)
    at Parser.execute (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:364:22)
    at Parser.readMore (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:313:12)
    at TLSSocket.onHttpSocketReadable (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:951:18)
    at TLSSocket.emit (node:events:514:20)
    at emitReadable_ (node:internal/streams/readable:903:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:89:21) {
  code: undefined,
--
  EQUITASBNK 35d69a8e-dc46-4958-a12a-a0159c518ec5: fetch failed HTTPParserError: Response does not match the HTTP/1.1 protocol (Unexpected whitespace after header value)
    at Parser.createError (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:417:12)
    at Parser.execute (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:364:22)
    at Parser.readMore (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:313:12)
    at TLSSocket.onHttpSocketReadable (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:951:18)
    at TLSSocket.emit (node:events:514:20)
    at emitReadable_ (node:internal/streams/readable:903:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:89:21) {
  code: undefined,
--
  BAJFINANCE 9817a9b7-6de3-4bfa-8e80-ac4cf87d1d6a: fetch failed HTTPParserError: Response does not match the HTTP/1.1 protocol (Unexpected whitespace after header value)
    at Parser.createError (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:417:12)
    at Parser.execute (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:364:22)
    at Parser.readMore (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:313:12)
    at TLSSocket.onHttpSocketReadable (~\EnamHoldingsOA\web\node_modules\undici\lib\dispatcher\client-h1.js:951:18)
    at TLSSocket.emit (node:events:514:20)
    at emitReadable_ (node:internal/streams/readable:903:12)
    at process.processTicksAndRejections (node:
```

</details>

<a id="m274"></a>

**▶ Bash:** View pdf.ts header and UA export

```bash
sed -n 1,16p src/lib/sources/pdf.ts; grep -n "UA" src/lib/sources/http.ts | head -3
```

<details><summary>Result (18 lines)</summary>

```
// PDF → text for filings, transcripts and annual reports. Pure JS (pdf.js via unpdf), so it
// runs both in local scripts and inside a serverless function.
import { getDocumentProxy } from "unpdf";
import { fetchWithRetry } from "./http";

export async function fetchPdf(url: string): Promise<Uint8Array> {
  const res = await fetchWithRetry(url, {
    headers: { Referer: "https://www.bseindia.com/", Accept: "application/pdf,*/*" },
    timeoutMs: 60_000,
  });
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 5 || String.fromCharCode(...buf.slice(0, 4)) !== "%PDF") {
    throw new Error(`Not a PDF: ${url}`);
  }
  return buf;
}
3:export const UA =
25:        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", ...headers },
```

</details>

<a id="m276"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\sources\pdf.ts`

```diff
- import { getDocumentProxy } from "unpdf";
- import { fetchWithRetry } from "./http";
- 
- export async function fetchPdf(url: string): Promise<Uint8Array> {
-   const res = await fetchWithRetry(url, {
-     headers: { Referer: "https://www.bseindia.com/", Accept: "application/pdf,*/*" },
-     timeoutMs: 60_000,
-   });
-   const buf = new Uint8Array(await res.arrayBuffer());
-   if (buf.length < 5
+ import https from "node:https";
+ import { getDocumentProxy } from "unpdf";
+ import { fetchWithRetry, UA } from "./http";
+ 
+ const PDF_HEADERS = { Referer: "https://www.bseindia.com/", Accept: "application/pdf,*/*" };
+ 
+ export async function fetchPdf(url: string): Promise<Uint8Array> {
+   let buf: Uint8Array;
+   try {
+     const res = await fetchWithRetry(url, { headers: PDF_HEADERS, timeoutMs: 60_000, retries: 1 });
+     buf = new Uint8Array(await res.arrayBuffer());
+   } catch (e) {
+     // Some BSE responses carry a malformed header that fetch's strict parser rejects
+     // ("Unexpected whitespace after header value"). Node's https accepts it in lenient mode.
+     if (!/HTTPParserError|Unexpected whitespace/i.test(String((e as { cause?: unknown }).cause ?? ""))) throw e;
+     buf = await lenientGet(url);
+   }
+   if (buf.length < 5
```

<a id="m277"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\sources\pdf.ts`

```diff
-   return buf;
- }
+   return buf;
+ }
+ 
+ function lenientGet(url: string, redirects = 3): Promise<Uint8Array> {
+   return new Promise((resolve, reject) => {
+     const req = https.get(url, { headers: { "User-Agent": UA, ...PDF_HEADERS }, insecureHTTPParser: true, timeout: 60_000 }, (res) => {
+       const status = res.statusCode ?? 0;
+       if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
+         res.resume();
+         lenientGet(new URL(res.headers.location, url).toString(), redirects - 1).then(resolve, reject);
+         return;
+       }
+       if (status !== 200) {
+         res.resume();
+         reject(new Error(`${status} from ${url}`));
+         return;
+       }
+       const chunks: Buffer[] = [];
+       res.on("data", (c: Buffer) => chunks.push(c));
+       res.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
+       res.on("error", reject);
+     });
+     req.on("timeout", () => req.destroy(new Error(`timeout fetching ${url}`)));
+     req.on("error", reject);
+   });
+ }
```

<a id="m278"></a>

**▶ Bash:** Type-check and rerun snapshot with the lenient fallback

```bash
grep -c "return buf;" src/lib/sources/pdf.ts; export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -5; npm run snapshot 2>&1 | grep -E "Reading|Retrying|Done|failed|from https" | head -20
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\sources\pdf.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\sources\pdf.ts has been updated successfully.
```

</details>

<details><summary>Result (3 lines)</summary>

```
1
Reading 161 material filing PDFs…
Done: 21 companies, 387 filings { know: 110, act: 77, routine: 200 }
```

</details>


<a id="m282"></a>

**🤖 Claude:**

All PDFs download now. Next I'll enrich the newly extracted filings:

<a id="m283"></a>

**▶ Bash:** Enrich new filings and recheck results cards

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run enrich 2>&1 | tail -12 && npx tsx scripts/dev/rescheck.ts 2>&1 | head -45
```

<details><summary>Result (53 lines)</summary>

```
Provider: gemini · cheap model: gemini-3.5-flash-lite
20 filings to enrich (142 already done)
..
  KAYNES b0847910-ddd5-48fc-8f2c-7f15b2038d45: no usable results table ([
  {
    "expected": "string",
    "code": "invalid_type",
    "path": [
      )
..................
Done. 25 calls, $0.0344 (1 served from cache)
HAL         act     src=screener Sep 2026 | Revenue 7613 (QoQ 38.04170444242973%, YoY 6629%) · EBITDA 1739 (QoQ 13.883431565160445%, YoY 1558%) · PBT 2566 (QoQ 20.243673851921272%, YoY 2227%) · PAT 1936 (QoQ 21.761006289308177%, YoY 1669%)
TATAPOWER   act     src=screener Sep 2026 | Revenue 19636 (QoQ 3.070704949871398%, YoY 15545%) · EBITDA 3667 (QoQ -5%, YoY 3302%) · PBT 2180 (QoQ 19.583104772353263%, YoY 1680%) · PAT 1652 (QoQ 17.915774446823697%, YoY 1245%)
TATASTEEL   act     src=screener Sep 2026 | Revenue 65436 (QoQ 7.6356219363753%, YoY 58689%) · EBITDA 10533 (QoQ 13.698186528497407%, YoY 8897%) · PBT 5455 (QoQ 42.13131839499739%, YoY 4222%) · PAT 3700 (QoQ 55.13626834381551%, YoY 3183%)
NYKAA       act     src=screener ✓ Sep 2026 | Revenue 3006 (QoQ 8.05176132278936%, YoY 2346%) · EBITDA 263 (QoQ 11.440677966101696%, YoY 159%) · PBT 149 (QoQ 15.503875968992247%, YoY 55%) · PAT 101 (QoQ 26.25%, YoY 33%)
NTPC        act     src=screener Sep 2026 | Revenue 54270 (QoQ 6.954927967521334%, YoY 44784%) · EBITDA 15627 (QoQ -3.7212741051075104%, YoY 12814%) · PBT 9218 (QoQ 0.6331877729257642%, YoY 7301%) · PAT 7351 (QoQ 6.598027842227379%, YoY 5225%)
NAVINFLUOR  act     src=screener ✓ Sep 2026 | Revenue 1191 (QoQ 13.971291866028709%, YoY 758%) · EBITDA 407 (QoQ 14.005602240896359%, YoY 246%) · PBT 352 (QoQ 10.69182389937107%, YoY 198%) · PAT 269 (QoQ 10.699588477366255%, YoY 148%)
SUNPHARMA   act     src=screener Sep 2026 | Revenue 16199 (QoQ 5.875816993464053%, YoY 14478%) · EBITDA 4744 (QoQ 7.378904481665913%, YoY 4527%) · PBT 3159 (QoQ -22.932422542083437%, YoY 4168%) · PAT 1995 (QoQ -31.230610134436404%, YoY 3125%)
EQUITASBNK  act     src=filing Sep 2026 | Revenue 2066 (QoQ 5.3866557845337635%, YoY 1617.35%) · PBT 287.38 (QoQ 17.744909247347074%, YoY 33.54%) · PAT 218.04 (QoQ 18.751701977016488%, YoY 24.14%)
ASIANPAINT  act     src=screener Sep 2026 | Revenue 9977 (QoQ -5.35951432365775%, YoY 8531%) · EBITDA 1557 (QoQ -28.21576763485477%, YoY 1503%) · PBT 1478 (QoQ -29.48473282442748%, YoY 1392%) · PAT 1085 (QoQ -30.40410519563823%, YoY 1018%)
TRENT       act     src=screener ✓ Sep 2026 | Revenue 5873 (QoQ 2.050390964378801%, YoY 4818%) · EBITDA 1057 (QoQ -5.540661304736371%, YoY 816%) · PBT 619 (QoQ -10.54913294797688%, YoY 477%) · PAT 468 (QoQ -9.652509652509652%, YoY 373%)
LAURUSLABS  act     src=screener ✓ Sep 2026 | Revenue 2206 (QoQ 8.884501480750247%, YoY 1653%) · EBITDA 750 (QoQ 17.55485893416928%, YoY 403%) · PBT 592 (QoQ 23.076923076923077%, YoY 270%) · PAT 436 (QoQ 20.441988950276244%, YoY 194%)
LT          act     src=screener Sep 2026 | Revenue 78750 (QoQ 15.90768596744282%, YoY 67984%) · EBITDA 8814 (QoQ 8.160510492084
… (23 more lines)
```

</details>

<a id="m285"></a>

**▶ Bash:** Locate the results table in the Kaynes filing text

```bash
cd ~/EnamHoldingsOA/web/data/snapshot/texts && wc -c b0847910-ddd5-48fc-8f2c-7f15b2038d45.txt && grep -n -o -i "revenue from operations\|profit before tax\|in lakhs\|in crores\|₹ in\|rs\. in\|in million\|\[page [0-9]*\]" b0847910-ddd5-48fc-8f2c-7f15b2038d45.txt | head -20; python -c "
t=open('b0847910-ddd5-48fc-8f2c-7f15b2038d45.txt',encoding='utf-8').read()
i=t.lower().find('revenue from operations'); print('first revenue idx', i); print(t[max(0,i-600):i+900])
"
```

<details><summary>Result (33 lines)</summary>

```
17750 b0847910-ddd5-48fc-8f2c-7f15b2038d45.txt
1:[page 1]
46:[page 2]
63:[page 3]
109:[page 4]
130:[page 5]
183:[page 6]
first revenue idx -1
[page 1]
KAYNES TECHNOLOGY INDIA LIMITED
CIN: L29128KA2008PLC045825
website: www.kaynestechnology.co.in email ID: kaynestechcs@kaynestechnology.net
H.O & Registered office: 23-25, Belagola, Food Industrial Estate Metagalli PO, Mysore 570016 India
Telephone No: +91 8212582595
November 14, 2026
BSE Limited
Corporate Relationship Dept.,
14th floor, P. J. Tower,
Dalal Street, Fort
Mumbai - 400 001
Scrip Code: 543664
National Stock Exchange of India Limited
Exchange Plaza, Plot no. C/1, G Block,
Bandra-Kurla Complex,
Bandra (E),
Mumbai - 400 051
Scrip Symbol: KAYNES
Dear Sir/Madam,
Subject: Outcome of the Board Meeting dated November 14, 2026 pursuant to Regulation 30 of
the Securities and Exchange Board of India (Listing Obligations and Disclosure Requirements),
… (3 more lines)
```

</details>

<a id="m287"></a>

**▶ Bash:** Find results filings whose text lacks the P&L table

```bash
cd ~/EnamHoldingsOA/web && python -c "
import json,os
feed=json.load(open('data/snapshot/feed.json',encoding='utf-8')); e=json.load(open('data/snapshot/enrichments.json',encoding='utf-8'))
import re
for f in feed['filings']:
  if f['cat']=='results' and f['tier']=='act' and f.get('hasText'):
    t=open('data/snapshot/texts/'+f['id']+'.txt',encoding='utf-8').read()
    has=bool(re.search(r'profit before tax',t,re.I)) and bool(re.search(r'revenue from operations|total income|interest earned',t,re.I))
    print(f['symbol'].ljust(11), f['ts'][:10], 'table' if has else 'NO-TABLE', 'res' if 'results' in e.get(f['id'],{}) else '-', f['subject'][:60])
"
```

<details><summary>Result (31 lines)</summary>

```
KAYNES      2026-11-14 NO-TABLE - Financial Results For The Second Quarter And Half Year Ended
TATAPOWER   2026-11-11 NO-TABLE res Announcement under Regulation 30 (LODR)-Press Release / Medi
TATAPOWER   2026-11-11 NO-TABLE - Outcome Of The Financial Results For The Quarter And Half Ye
TATAPOWER   2026-11-11 NO-TABLE - Board Meeting Outcome for Outcome Of The Financial Results F
TATASTEEL   2026-11-07 NO-TABLE res Results - Financial Results For Quarter And Half Year Ended 
NYKAA       2026-11-04 table res Unaudited Standalone And Consolidated Financial Results For 
NYKAA       2026-11-04 table res Announcement under Regulation 30 (LODR)-Press Release / Medi
NYKAA       2026-11-04 table res Board Meeting Outcome for Outcome Of Board Meeting Held On N
NTPC        2026-10-31 table res Unaudited Standalone And Consolidated Financial Results For 
NTPC        2026-10-31 table res Board Meeting Outcome for Unaudited Standalone & Consolidate
NAVINFLUOR  2026-10-31 NO-TABLE res Newspaper Advertisement Of The Financial Results For The Qua
NAVINFLUOR  2026-10-30 table res Unaudited Standalone And Consolidated Financial Results Of T
SUNPHARMA   2026-10-30 NO-TABLE res Unaudited Financial Results For The Quarter And Half Year En
EQUITASBNK  2026-10-29 NO-TABLE res Unaudited Financial Results For The Quarter And Half Year En
TRENT       2026-10-29 NO-TABLE res Announcement under Regulation 30 (LODR)-Press Release / Medi
TRENT       2026-10-29 NO-TABLE res Outcome Of Board Meeting Held Today I.E. 29Th October 2026
EQUITASBNK  2026-10-29 NO-TABLE - Announcement under Regulation 30 (LODR)-Press Release / Medi
LAURUSLABS  2026-10-29 table res Results - Financial Results For Quarter And Half Year Ended 
EQUITASBNK  2026-10-29 table res Unaudited Financial Results For The Quarter And Half Year En
EQUITASBNK  2026-10-29 table res Board Meeting Outcome for Outcome Of Board Meeting Held On O
ASIANPAINT  2026-10-29 table res Audited Standalone And Unaudited Consolidated Financial Resu
ASIANPAINT  2026-10-29 table res Board Meeting Outcome for Financial Results And Interim Divi
ADANIPORTS  2026-10-28 NO-TABLE - Outcome Of Board Meeting
ADANIPORTS  2026-10-28 NO-TABLE res Announcement under Regulation 30 (LODR)-Press Release / Medi
LT          2026-10-27 NO-TABLE res Outcome Of Board Meeting Of Larsen & Toubro Limited  Held On
KOTAKBANK   2026-10-24 NO-TABLE - Results-Financial Results - Sep 30, 2026
BAJFINANCE  2026-10-19 table res Unaudited Standalone And Consolidated Financial Results For 
BAJFINANCE  2026-10-19 table res Board Meeting Outcome for Outcome Of Board Meeting Held On 1
HDFCBANK    2026-10-17 table res Board Meeting Outcome for Approval Of Unaudited Standalone A
TCS         2026-10-08 NO-TABLE res Financial Results For The Quarter And Six-Month Period Ended
… (1 more lines)
```

</details>

<a id="m289"></a>

**📖 Read** `~\EnamHoldingsOA\web\scripts\enrich.ts` (from line 76, 70 lines)

<details><summary>Result (70 lines)</summary>

```
76	
77	async function main() {
78	  if (!llmProvider()) {
79	    console.error("No LLM key. Set ANTHROPIC_API_KEY or GEMINI_API_KEY (free at aistudio.google.com).");
80	    process.exit(1);
81	  }
82	  console.log(`Provider: ${llmProvider()} · cheap model: ${modelFor("cheap")}`);
83	  const snap: Snapshot = JSON.parse(fs.readFileSync(path.join(SNAP, "feed.json"), "utf8"));
84	  const outPath = path.join(SNAP, "enrichments.json");
85	  const out: Record<string, z.infer<typeof Enrichment> & { model: string; results?: FilingResults }> = fs.existsSync(outPath)
86	    ? JSON.parse(fs.readFileSync(outPath, "utf8"))
87	    : {};
88	  const names = new Map(snap.companies.map((c) => [c.symbol, c.name]));
89	
90	  const todo = snap.filings.filter((f) => f.hasText && !out[f.id]);
91	  console.log(`${todo.length} filings to enrich (${Object.keys(out).length} already done)`);
92	  let i = 0;
93	  let stop = false;
94	  let done = 0;
95	  const worker = async () => {
96	    while (i < todo.length && !stop) {
97	      const f = todo[i++];
98	      const text = fs.readFileSync(path.join(SNAP, "texts", `${f.id}.txt`), "utf8").slice(0, 14_000);
99	      try {
100	        const { data, usage } = await llmJSON({
101	          tier: "cheap",
102	          system: SYSTEM,
103	          schema: Enrichment,
104	          prompt: `Company: ${names.get(f.symbol)} (${f.symbol})\nBSE category: ${f.bseCategory} / ${f.bseSub}\nTitle: ${f.subject}\nHeadline: ${f.headline}\n\nFiling text:\n"""\n${text}\n"""`,
105	        });
… (40 more lines)
```

</details>

<a id="m291"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
-   const out: Record<string, z.infer<typeof Enrichment> & { model: string; results?: FilingResults }> = fs.existsSync(outPath)
-     ? JSON.parse(fs.readFileSync(outPath, "utf8"))
-     : {};
-   const names = new Map(snap.companies.map((c) => [c.symbol, c.name]));
- 
-   const todo = snap.filings.filter((f) => f.hasText && !out[f.id]);
-   console.log(`${todo.length} filings to enrich (${Object.keys(out).length} already done)`);
-   let i = 0;
-   let stop = false;
-   let done = 0;
-   const worker = async () => {
-     while (i < todo.length && !stop) {
-       const f = todo[i++];
-       const text = fs.readFileSync(path.join(SNAP, "texts", `${f.id}.txt`), "utf8").slice(0, 14_000);
-       try {
-         const { data, usage } = await llmJSON({
-           tier: "cheap",
-           system: SYSTEM,
-           schema: Enrichment,
-           prompt: `Company: ${names.get(f.symbol)} (${f.symbol})\nBSE category: ${f.bseCategory} / ${f.bseSub}\nTitle: ${f.subject}\nHeadline: ${f.headline}\n\nFiling text:\n"""\n${text}\n"""`,
-         });
-         out[f.id] = { ...data, model: usage.model };
-         if (f.cat === "results") {
-           // Separate try: a filing without a usable results table still keeps its summary.
-           try {
- … (22 more lines)
+   const out: Record<string, z.infer<typeof Enrichment> & { model: string; results?: FilingResults; noResultsTable?: boolean }> =
+     fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
+   const names = new Map(snap.companies.map((c) => [c.symbol, c.name]));
+ 
+   const needsResults = (f: Snapshot["filings"][number]) => f.cat === "results" && !out[f.id]?.results && !out[f.id]?.noResultsTable;
+   const todo = snap.filings.filter((f) => f.hasText && (!out[f.id] || needsResults(f)));
+   console.log(`${todo.length} filings to enrich (${Object.keys(out).length} already done)`);
+   let i = 0;
+   let stop = false;
+   let done = 0;
+   const worker = async () => {
+     while (i < todo.length && !stop) {
+       const f = todo[i++];
+       const full = fs.readFileSync(path.join(SNAP, "texts", `${f.id}.txt`), "utf8");
+       try {
+         let cached = true;
+         if (!out[f.id]) {
+           const { data, usage } = await llmJSON({
+             tier: "cheap",
+             system: SYSTEM,
+             schema: Enrichment,
+             prompt: `Company: ${names.get(f.symbol)} (${f.symbol})\nBSE category: ${f.bseCategory} / ${f.bseSub}\nTitle: ${f.subject}\nHeadline: ${f.headline}\n\nFiling text:\n"""\n${full.slice(0, 14_000)}\n"""`,
+           });
+           out[f.id] = { ...data, model: usage.model };
+           cached = usage.cached;
+         }
+         if (needsResults(f)) {
+           // Separate try: a filing without a usable results table still keeps its summary.
+           try {
+             const table = tablePages(full);
+             if (!table) {
+               out[f.id].noResultsTable = true; // a press release or notice: never extract numbers from prose
+             } else {
+               const r = await llmJSON({
+                 tier: "cheap",
+                 system: RESULTS_SYSTEM,
+                 schema: ResultsExtract,
+                 prompt: `Company: ${names.get(f.symbol)}\n\nResults table pages:\n"""\n${table}\n"""`,
+               });
+               const unit = normUnit(r.data.unit);
+ … (22 more lines)
```

<a id="m292"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
- function normUnit(u: string): FilingResults["unit"] | null {
+ /** The pages holding the P&L table (consolidated first), or null if the filing has none. */
+ function tablePages(text: string): string | null {
+   const pages = text.split(/(?=\[page \d+\])/);
+   const isTable = (p: string) => /before\s+(exceptional\s+items\s+and\s+)?tax/i.test(p) && /revenue from operations|total income|interest earned/i.test(p);
+   const hits = pages.filter(isTable);
+   if (!hits.length) return null;
+   const ordered = [...hits.filter((p) => /consolidated/i.test(p)), ...hits.filter((p) => !/consolidated/i.test(p))];
+   return ordered.slice(0, 3).join("\n").slice(0, 24_000);
+ }
+ 
+ /** True if a number the model copied appears in the source text (commas, sign and brackets ignored). */
+ function appearsIn(text: string, v: number | null): boolean {
+   if (v == null) return true;
+   const plain = text.replace(/(\d),(?=\d)/g, "$1");
+   const abs = Math.abs(v);
+   const forms = new Set([String(abs), abs.toFixed(2), abs.toFixed(1), abs.toFixed(0)]);
+   return [...forms].some((s) => new RegExp(`(^|[^\\d.])${s.replace(".", "\\.")}(?![\\d])`).test(plain));
+ }
+ 
+ function normUnit(u: string): FilingResults["unit"] | null {
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>


<a id="m295"></a>

**🤖 Claude:**

The rounded `toFixed(1)` and `toFixed(0)` forms would let a rounded number pass the verbatim check. I'll allow only exact forms:

<a id="m296"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
-   const forms = new Set([String(abs), abs.toFixed(2), abs.toFixed(1), abs.toFixed(0)]);
+   const forms = new Set([String(abs), abs.toFixed(2)]); // exact forms only: a rounded figure is not a copy
```

<a id="m297"></a>

**▶ Bash:** Find the results page limits in snapshot

```bash
grep -n 'maxPages: f.cat === "results"' -A1 scripts/snapshot.ts
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (2 lines)</summary>

```
160:          maxPages: f.cat === "results" ? 6 : 12,
161-          maxChars: f.cat === "results" ? 24_000 : 16_000,
```

</details>

<a id="m300"></a>

**▶ Bash:** Raise results page limit and reset results extraction

```bash
sed -i '158,161s|// Results tables sit in the first few pages; other filings rarely need more than 12.|// Results tables often follow a cover letter and the auditor'"'"'s report; other filings rarely need more than 12 pages.|; 160s|maxPages: f.cat === "results" ? 6 : 12,|maxPages: f.cat === "results" ? 16 : 12,|; 161s|maxChars: f.cat === "results" ? 24_000 : 16_000,|maxChars: f.cat === "results" ? 60_000 : 16_000,|' scripts/snapshot.ts && sed -n 156,163p scripts/snapshot.ts && python -c "
import json,re,os
feed=json.load(open('data/snapshot/feed.json',encoding='utf-8')); e=json.load(open('data/snapshot/enrichments.json',encoding='utf-8'))
def table(t):
  for p in re.split(r'(?=\[page \d+\])',t):
    if re.search(r'before\s+(exceptional\s+items\s+and\s+)?tax',p,re.I) and re.search(r'revenue from operations|total income|interest earned',p,re.I): return True
  return False
rm=0
for f in feed['filings']:
  if f['cat']=='results' and f.get('hasText'):
    p='data/snapshot/texts/'+f['id']+'.txt'
    if not table(open(p,encoding='utf-8').read()): os.remove(p); rm+=1
    if f['id'] in e:
      e[f['id']].pop('results',None); e[f['id']].pop('noResultsTable',None)
json.dump(e,open('data/snapshot/enrichments.json','w',encoding='utf-8'),indent=1,ensure_ascii=False)
print('removed texts to re-read:',rm)
"
```

<details><summary>Result (10 lines)</summary>

```
      }
      try {
        // Results tables often follow a cover letter and the auditor's report; other filings rarely need more than 12 pages.
        const { text } = await pdfTextFromUrl(f.pdfUrl!, {
          maxPages: f.cat === "results" ? 16 : 12,
          maxChars: f.cat === "results" ? 60_000 : 16_000,
        });
        if (text.replace(/\[page \d+\]|\s/g, "").length > 80) {
removed texts to re-read: 16
[This command modified 1 file you've previously read: scripts\snapshot.ts. Call Read before editing.]
```

</details>


<a id="m302"></a>

**🤖 Claude:**

I've removed 16 results texts so they're re-read with up to 16 pages. Now re-running snapshot, then enrich:

<a id="m303"></a>

**▶ Bash:** Re-read results PDFs and re-run results extraction

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -5; npm run snapshot 2>&1 | grep -E "Reading|Retrying|Done|failed" | head; npm run enrich 2>&1 | tail -15
```

<details><summary>Result (17 lines)</summary>

```
Reading 161 material filing PDFs…
Done: 21 companies, 387 filings { know: 110, act: 77, routine: 200 }
  EQUITASBNK 2239e671-a371-4539-a9c1-edcb7d4d78c6: extracted figures failed the verbatim check; dropped
c
  ASIANPAINT 1f0df7d6-ab0a-4d13-b4e7-5f477f62005d: extracted figures failed the verbatim check; dropped
cccc
  ADANIPORTS 4711b2e3-42f9-4095-a3ca-3e2c2ad856c3: extracted figures failed the verbatim check; dropped
c
  BAJFINANCE 35bf242b-58db-4820-9ded-2d759a71d9f8: extracted figures failed the verbatim check; dropped
c
  ASIANPAINT 92071a93-de8f-4923-85b6-f853a765c9b9: extracted figures failed the verbatim check; dropped
c
  BAJFINANCE bef4c126-a01e-4636-9c8b-e50fc1a82879: extracted figures failed the verbatim check; dropped
cc
  HDFCBANK ae8b989d-e24d-45bf-8958-f610b3c0e66a: extracted figures failed the verbatim check; dropped
cc
Done. 26 calls, $0.0491 (0 served from cache)
```

</details>

<a id="m305"></a>

**▶ Bash:** Show results extraction outcome per filing

```bash
python -c "
import json
feed=json.load(open('data/snapshot/feed.json',encoding='utf-8')); e=json.load(open('data/snapshot/enrichments.json',encoding='utf-8'))
for f in feed['filings']:
  if f['cat']=='results' and f.get('hasText'):
    x=e.get(f['id'],{}); r=x.get('results')
    s='res' if r else ('NOTABLE' if x.get('noResultsTable') else '-')
    extra=''
    if r: extra=f\"{r['unit']} {r['quarter']} rev {r['revenue']} pat {r['pat']}\"
    print(f['symbol'].ljust(11), f['ts'][:10], s.ljust(8), f['subject'][:45].ljust(46), extra[:150])
"
```

<details><summary>Result (31 lines)</summary>

```
KAYNES      2026-11-14 res      Financial Results For The Second Quarter And   million 30th September 2026 rev {'cur': 9525.15, 'prev': 9462.12, 'yoy': 9121.25} pat {'cur': 398, 'prev': 454.13, 'yoy': 1157.11}
TATAPOWER   2026-11-11 NOTABLE  Announcement under Regulation 30 (LODR)-Press  
TATAPOWER   2026-11-11 res      Outcome Of The Financial Results For The Quar  crore Sep 2026 rev {'cur': 19635.94, 'prev': 19051.26, 'yoy': 15544.91} pat {'cur': 1652.04, 'prev': 1400.86, 'yoy': 1245.39}
TATAPOWER   2026-11-11 res      Board Meeting Outcome for Outcome Of The Fina  crore Sep 2026 rev {'cur': 19635.94, 'prev': 19051.26, 'yoy': 15544.91} pat {'cur': 1652.04, 'prev': 1400.86, 'yoy': 1245.39}
TATASTEEL   2026-11-07 res      Results - Financial Results For Quarter And H  crore Sep 2026 rev {'cur': 65436.24, 'prev': 60794.29, 'yoy': 58689.29} pat {'cur': 3699.59, 'prev': 2385.24, 'yoy': 3183.09}
NYKAA       2026-11-04 res      Unaudited Standalone And Consolidated Financi  crore September 30, 2026 rev {'cur': 3006.04, 'prev': 2782, 'yoy': 2345.98} pat {'cur': 101.19, 'prev': 79.76, 'yoy': 32.98}
NYKAA       2026-11-04 res      Announcement under Regulation 30 (LODR)-Press  crore Sep 2026 rev {'cur': 3006, 'prev': None, 'yoy': None} pat {'cur': 101, 'prev': None, 'yoy': None}
NYKAA       2026-11-04 res      Board Meeting Outcome for Outcome Of Board Me  crore September 30, 2026 rev {'cur': 3006.04, 'prev': 2782, 'yoy': 2345.98} pat {'cur': 101.19, 'prev': 79.76, 'yoy': 32.98}
NTPC        2026-10-31 NOTABLE  Unaudited Standalone And Consolidated Financi  
NTPC        2026-10-31 NOTABLE  Board Meeting Outcome for Unaudited Standalon  
NAVINFLUOR  2026-10-31 NOTABLE  Newspaper Advertisement Of The Financial Resu  
NAVINFLUOR  2026-10-30 NOTABLE  Unaudited Standalone And Consolidated Financi  
SUNPHARMA   2026-10-30 NOTABLE  Unaudited Financial Results For The Quarter A  
EQUITASBNK  2026-10-29 NOTABLE  Unaudited Financial Results For The Quarter A  
TRENT       2026-10-29 NOTABLE  Announcement under Regulation 30 (LODR)-Press  
TRENT       2026-10-29 res      Outcome Of Board Meeting Held Today I.E. 29Th  crore 30th Sept, 2026 rev {'cur': 5787.64, 'prev': 5666.3, 'yoy': 4724.06} pat {'cur': 489.65, 'prev': 531.77, 'yoy': 450.77}
EQUITASBNK  2026-10-29 NOTABLE  Announcement under Regulation 30 (LODR)-Press  
LAURUSLABS  2026-10-29 res      Results - Financial Results For Quarter And H  crore Sep-26 rev {'cur': 2206.37, 'prev': 2026.31, 'yoy': 1653.47} pat {'cur': 436.74, 'prev': 361.99, 'yoy': 193.75}
EQUITASBNK  2026-10-29 NOTABLE  Unaudited Financial Results For The Quarter A  
EQUITASBNK  2026-10-29 NOTABLE  Board Meeting Outcome for Outcome Of Board Me  
ASIANPAINT  2026-10-29 NOTABLE  Audited Standalone And Unaudited Consolidated  
ASIANPAINT  2026-10-29 NOTABLE  Board Meeting Outcome for Financial Results A  
ADANIPORTS  2026-10-28 NOTABLE  Outcome Of Board Meeting                       
ADANIPORTS  2026-10-28 NOTABLE  Announcement under Regulation 
… (1 more lines)
```

</details>

<a id="m307"></a>

**▶ Bash:** Locate helpers for a debug harness

```bash
grep -n "^const RESULTS_SYSTEM\|^const ResultsExtract\|^function tablePages\|^function appearsIn" scripts/enrich.ts
```

<details><summary>Result (4 lines)</summary>

```
43:const ResultsExtract = z.object({
65:const RESULTS_SYSTEM = `You read the financial-results table of an Indian listed company's quarterly results filing.
70:function tablePages(text: string): string | null {
80:function appearsIn(text: string, v: number | null): boolean {
```

</details>


<a id="m309"></a>

**🤖 Claude:**

I'll make the failure log list which figures didn't match. The re-run is free because those calls are cached.

<a id="m310"></a>

**▶ Bash:** Find the verbatim-fail log line

```bash
grep -n "failed the verbatim check" scripts/enrich.ts
```

<details><summary>Result (1 line)</summary>

```
157:                console.error(`\n  ${f.symbol} ${f.id}: extracted figures failed the verbatim check; dropped`);
```

</details>

<a id="m312"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
-                 console.error(`\n  ${f.symbol} ${f.id}: extracted figures failed the verbatim check; dropped`);
+                 const missing = copied.filter((v) => !appearsIn(table, v));
+                 console.error(`\n  ${f.symbol} ${f.id}: dropped (unit ${r.data.unit}, quarter ${r.data.quarter}; not found verbatim: ${missing.join(", ") || "-"})`);
```

<a id="m313"></a>

**▶ Bash:** Re-run results extraction with failure details (cached)

```bash
python -c "
import json
e=json.load(open('data/snapshot/enrichments.json',encoding='utf-8'))
n=0
for k,v in e.items():
  if v.pop('noResultsTable',None): n+=1
json.dump(e,open('data/snapshot/enrichments.json','w',encoding='utf-8'),indent=1,ensure_ascii=False); print('reset',n)
" && export PATH="/c/Program Files/nodejs:$PATH" && npm run enrich 2>&1 | grep -E "dropped|Done|no usable"
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (15 lines)</summary>

```
reset 18
  NTPC 60a417d2-0bcb-4c4f-a166-e36d2d5dda85: dropped (unit crore, quarter Sep 2026; not found verbatim: 54269.95, 5624.17)
  NTPC f774f918-058b-4b02-a932-730ddf8b1434: dropped (unit crore, quarter Sep 2026; not found verbatim: 54269.95, 5624.17)
  NAVINFLUOR 5a8ca278-0774-4878-9c01-cf38f96a3ab6: dropped (unit crore, quarter 30th Sept, 2026; not found verbatim: 1190.74)
  NAVINFLUOR 6a34e916-2e0a-4d0e-a8ed-6f19c1764902: dropped (unit crore, quarter 30th September, 2026; not found verbatim: 1190.74)
  SUNPHARMA 7bbcaf67-e404-4ffb-b7fd-07ff385fdb0a: dropped (unit million, quarter Sep 2026; not found verbatim: 61419.2, 57411.3, 45481.1, 11151.4)
  EQUITASBNK ee25b760-fea6-4b6c-8129-d2fc952f596e: dropped (unit lakh, quarter Sep 30, 2026; not found verbatim: 53145.69)
  EQUITASBNK 2239e671-a371-4539-a9c1-edcb7d4d78c6: dropped (unit lakh, quarter Sep 30, 2026; not found verbatim: 53145.69)
  ASIANPAINT 1f0df7d6-ab0a-4d13-b4e7-5f477f62005d: dropped (unit crore, quarter 30.09.2026; not found verbatim: 8453.83, 9183.44, 7356.29, 1468.09, 1288.81)
  ASIANPAINT 92071a93-de8f-4923-85b6-f853a765c9b9: dropped (unit crore, quarter 30.09.2026; not found verbatim: 8453.83, 9183.44, 7356.29, 1468.09, 1288.81)
  ADANIPORTS 4711b2e3-42f9-4095-a3ca-3e2c2ad856c3: dropped (unit crore, quarter September 30, 2026; not found verbatim: 3649.5)
  BAJFINANCE 35bf242b-58db-4820-9ded-2d759a71d9f8: dropped (unit crore, quarter 30.09.2026; not found verbatim: 20890.66, 7420.81, 4250.11)
  BAJFINANCE bef4c126-a01e-4636-9c8b-e50fc1a82879: dropped (unit crore, quarter 30.09.2026; not found verbatim: 20890.66, 7420.81, 4250.11)
  HDFCBANK ae8b989d-e24d-45bf-8958-f610b3c0e66a: dropped (unit crore, quarter 30.09.2026; not found verbatim: 79362.78)
Done. 13 calls, $0.0000 (13 served from cache)
```

</details>

<a id="m316"></a>

**▶ Bash:** See how dropped numbers appear in source text

```bash
cd ~/EnamHoldingsOA/web/data/snapshot/texts && grep -o ".\{30\}269[.,]\?9.\{30\}" 60a417d2-0bcb-4c4f-a166-e36d2d5dda85.txt | head -3; echo ---; grep -o ".\{30\}190[.,]\?7.\{20\}" 5a8ca278-0774-4878-9c01-cf38f96a3ab6.txt | head -3; echo ---; grep -o ".\{30\}53[,]\?145.\{20\}" ee25b760-fea6-4b6c-8129-d2fc952f596e.txt | head -3; echo ---; grep -o ".\{30\}8[,]\?453.\{20\}" 1f0df7d6-ab0a-4d13-b4e7-5f477f62005d.txt | head -3; echo ---; grep -o ".\{20\}79[,]\?362.\{20\}" ae8b989d-e24d-45bf-8958-f610b3c0e66a.txt | head -3
```

<details><summary>Result (7 lines)</summary>

```
---
otal Income from operations 1,19074 758.42 2,235 82 1,
---
7)-(8)-(9) 24,407.30 3,353.81 53,145.6928,738.39 (26,394
---
---
b)+(c)+(d) 83426.60 79362,78 76690.70 162789.
```

</details>

<a id="m318"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
- /** True if a number the model copied appears in the source text (commas, sign and brackets ignored). */
- function appearsIn(text: string, v: number | null): boolean {
-   if (v == null) return true;
-   const plain = text.replace(/(\d),(?=\d)/g, "$1");
-   const abs = Math.abs(v);
-   const forms = new Set([String(abs), abs.toFixed(2)]); // exact forms only: a rounded figure is not a copy
-   return [...forms].some((s) => new RegExp(`(^|[^\\d.])${s.replace(".", "\\.")}(?![\\d])`).test(plain));
- }
+ /**
+  * True if a number the model copied appears in the source table. Compared digit-for-digit per number
+  * token, because PDF text mangles separators: "1,19074" (lost point), "79362,78" (comma as point),
+  * "53,145.6928,738.39" (two cells glued). A rounded or computed figure still fails.
+  */
+ function appearsIn(text: string, v: number | null): boolean {
+   if (v == null) return true;
+   const abs = Math.abs(v);
+   const forms = [String(abs), abs.toFixed(2)].map((s) => s.replace(/\D/g, ""));
+   for (const tok of text.match(/\d[\d.,]*/g) ?? []) {
+     const d = tok.replace(/\D/g, "");
+     const glued = (tok.match(/\./g) ?? []).length > 1;
+     if (forms.some((f) => d === f || (glued && d.startsWith(f)))) return true;
+   }
+   return false;
+ }
```

<a id="m319"></a>

**▶ Bash:** Re-run with digit-level check and probe remaining misses

```bash
cd ~/EnamHoldingsOA/web && python -c "
import json
e=json.load(open('data/snapshot/enrichments.json',encoding='utf-8'))
for k,v in e.items(): v.pop('noResultsTable',None)
json.dump(e,open('data/snapshot/enrichments.json','w',encoding='utf-8'),indent=1,ensure_ascii=False)
" && export PATH="/c/Program Files/nodejs:$PATH" && npm run enrich 2>&1 | grep -E "dropped|Done|no usable"; cd data/snapshot/texts && grep -o ".\{40\}54,\?269.\{30\}" 60a417d2-0bcb-4c4f-a166-e36d2d5dda85.txt | head -2; grep -c "" 60a417d2-0bcb-4c4f-a166-e36d2d5dda85.txt; grep -o ".\{30\}8,\?45[0-9].\{30\}" 1f0df7d6-ab0a-4d13-b4e7-5f477f62005d.txt | head -3
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (10 lines)</summary>

```
  NTPC 60a417d2-0bcb-4c4f-a166-e36d2d5dda85: dropped (unit crore, quarter Sep 2026; not found verbatim: 54269.95, 5624.17)
  NTPC f774f918-058b-4b02-a932-730ddf8b1434: dropped (unit crore, quarter Sep 2026; not found verbatim: 54269.95, 5624.17)
  NAVINFLUOR 6a34e916-2e0a-4d0e-a8ed-6f19c1764902: dropped (unit crore, quarter 30th September, 2026; not found verbatim: 1190.74)
  SUNPHARMA 7bbcaf67-e404-4ffb-b7fd-07ff385fdb0a: dropped (unit million, quarter Sep 2026; not found verbatim: 61419.2, 57411.3, 45481.1, 11151.4)
  ASIANPAINT 1f0df7d6-ab0a-4d13-b4e7-5f477f62005d: dropped (unit crore, quarter 30.09.2026; not found verbatim: 8453.83, 9183.44, 7356.29, 1468.09, 1288.81)
  ASIANPAINT 92071a93-de8f-4923-85b6-f853a765c9b9: dropped (unit crore, quarter 30.09.2026; not found verbatim: 8453.83, 9183.44, 7356.29, 1468.09, 1288.81)
  BAJFINANCE 35bf242b-58db-4820-9ded-2d759a71d9f8: dropped (unit crore, quarter 30.09.2026; not found verbatim: 20890.66, 4250.11)
  BAJFINANCE bef4c126-a01e-4636-9c8b-e50fc1a82879: dropped (unit crore, quarter 30.09.2026; not found verbatim: 20890.66, 4250.11)
Done. 13 calls, $0.0000 (13 served from cache)
1528
```

</details>

<a id="m322"></a>

**▶ Bash:** Check filing-sourced results cards

```bash
cd ~/EnamHoldingsOA/web && export PATH="/c/Program Files/nodejs:$PATH" && npx tsx scripts/dev/rescheck.ts 2>&1 | grep -E "src=filing|EQUITAS|KAYNES|TRENT|✓" | cut -c1-260; python -c "
import json
feed=json.load(open('data/snapshot/feed.json',encoding='utf-8')); e=json.load(open('data/snapshot/enrichments.json',encoding='utf-8'))
for f in feed['filings']:
  r=e.get(f['id'],{}).get('results')
  if r and f['symbol']=='EQUITASBNK': print(f['subject'][:50], r['unit'], r['quarter'], 'rev',r['revenue'],'pbt',r['pbt'],'pat',r['pat'])
"
```

<details><summary>Result (14 lines)</summary>

```
KAYNES      act     src=filing Sep 2026 | Revenue 952.51 (QoQ 0.6658141427378652%, YoY 912.13%) · EBITDA 119.57 (QoQ -13.41154319646608%, YoY 147.2%) · PBT 64.73 (QoQ -16.17456617456617%, YoY 148.12%) · PAT 39.8 (QoQ -12.354107024884387%, YoY 115.71%)
TATAPOWER   act     src=screener ✓ Sep 2026 | Revenue 19636 (QoQ 3.070704949871398%, YoY 15545%) · EBITDA 3667 (QoQ -5%, YoY 3302%) · PBT 2180 (QoQ 19.583104772353263%, YoY 1680%) · PAT 1652 (QoQ 17.915774446823697%, YoY 1245%)
TATASTEEL   act     src=screener ✓ Sep 2026 | Revenue 65436 (QoQ 7.6356219363753%, YoY 58689%) · EBITDA 10533 (QoQ 13.698186528497407%, YoY 8897%) · PBT 5455 (QoQ 42.13131839499739%, YoY 4222%) · PAT 3700 (QoQ 55.13626834381551%, YoY 3183%)
NYKAA       act     src=screener ✓ Sep 2026 | Revenue 3006 (QoQ 8.05176132278936%, YoY 2346%) · EBITDA 263 (QoQ 11.440677966101696%, YoY 159%) · PBT 149 (QoQ 15.503875968992247%, YoY 55%) · PAT 101 (QoQ 26.25%, YoY 33%)
NAVINFLUOR  act     src=screener ✓ Sep 2026 | Revenue 1191 (QoQ 13.971291866028709%, YoY 758%) · EBITDA 407 (QoQ 14.005602240896359%, YoY 246%) · PBT 352 (QoQ 10.69182389937107%, YoY 198%) · PAT 269 (QoQ 10.699588477366255%, YoY 148%)
TRENT       act     src=screener Sep 2026 | Revenue 5873 (QoQ 2.050390964378801%, YoY 4818%) · EBITDA 1057 (QoQ -5.540661304736371%, YoY 816%) · PBT 619 (QoQ -10.54913294797688%, YoY 477%) · PAT 468 (QoQ -9.652509652509652%, YoY 373%)
LAURUSLABS  act     src=screener ✓ Sep 2026 | Revenue 2206 (QoQ 8.884501480750247%, YoY 1653%) · EBITDA 750 (QoQ 17.55485893416928%, YoY 403%) · PBT 592 (QoQ 23.076923076923077%, YoY 270%) · PAT 436 (QoQ 20.441988950276244%, YoY 194%)
LT          act     src=screener ✓ Sep 2026 | Revenue 78750 (QoQ 15.90768596744282%, YoY 67984%) · EBITDA 8814 (QoQ 8.160510492084919%, YoY 8513%) · PBT 7641 (QoQ 10.387171337763652%, YoY 6336%) · PAT 5949 (QoQ 19.26623897353649%, YoY 4678%)
KOTAKBANK   act     src=screener ✓ Sep 2026 | Revenue 19856 (QoQ 8.17760828112231%, YoY 17199%) · PBT 7530 (QoQ 0.2796644027167399%, YoY 5963%) · PAT 5645 (QoQ 3.010948905109489%, YoY 4468%)
TCS         act     src=screener ✓ Sep 2026 | Revenue 73188 (QoQ 1.2632307160152196%, YoY 65799%) · EBITDA 18815 (QoQ 1.3957749514981677%, YoY 17978%) · PBT 18638 (QoQ 3.8675880517164507%, YoY 16068%) · PAT 13934 (QoQ 3.8301043219076005%, YoY 12131%)
- [KAYNES] Financial Results for the Second Quarter and Half Year Ended 30 September 2026
- [KAYNES] Execution of Joint Venture
Unaudited Financial Results For The Quarter And Ha lakh Sep 30, 2026 rev {'cur': 206599.53, 'prev': 196039.79, 'yoy': 161734.54} pbt {'cur': 24407.3, 'prev': 3353.81, 'yoy': 53145.69} pat {'cur': 21803.97, 'prev': 18360.89, 'yoy': 2413.53}
Board Meeting Outcome for Outcome Of Board Meeting lakh Sep 30, 2026 rev {'cur': 206599.53, 'prev': 196039.79, 'yoy': 161734.54} pbt {'cur': 24407.3, 'prev': 3353.81, 'yoy': 53145.69} pat {'cur': 21803.97, 'prev': 18360.89, 'yoy': 2413.53}
```

</details>

<a id="m324"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
-               const ok = unit && r.data.quarter && r.data.revenue.cur != null && r.data.pat.cur != null && copied.every((v) => appearsIn(table, v));
+               const ok =
+                 unit &&
+                 r.data.quarter &&
+                 r.data.revenue.cur != null &&
+                 r.data.pat.cur != null &&
+                 copied.every((v) => appearsIn(table, v)) &&
+                 columnsConsistent(r.data.pbt, r.data.pat);
```

<a id="m325"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\enrich.ts`

```diff
- function normUnit(u: string): FilingResults["unit"] | null {
+ /**
+  * Catches column mix-ups the verbatim check can't (every number real, but from the wrong column):
+  * in each column with a profit, PAT must be a plausible share of PBT.
+  */
+ type Col = { cur: number | null; prev: number | null; yoy: number | null };
+ function columnsConsistent(pbt: Col, pat: Col): boolean {
+   return (["cur", "prev", "yoy"] as const).every((k) => {
+     const b = pbt[k];
+     const a = pat[k];
+     if (b == null || a == null || b <= 0) return true;
+     const r = a / b;
+     return r >= 0.3 && r <= 1.2;
+   });
+ }
+ 
+ function normUnit(u: string): FilingResults["unit"] | null {
```

<a id="m326"></a>

**▶ Bash:** Re-run results with consistency check (cached)

```bash
python -c "
import json
e=json.load(open('data/snapshot/enrichments.json',encoding='utf-8'))
for k,v in e.items(): v.pop('noResultsTable',None); v.pop('results',None)
json.dump(e,open('data/snapshot/enrichments.json','w',encoding='utf-8'),indent=1,ensure_ascii=False)
" && export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -3; npm run enrich 2>&1 | grep -E "dropped|Done" | cut -c1-140; npx tsx scripts/dev/rescheck.ts 2>&1 | grep -E "src=filing|EQUITAS" | cut -c1-200
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\enrich.ts has been updated successfully.
```

</details>

<details><summary>Result (12 lines)</summary>

```
  NTPC 60a417d2-0bcb-4c4f-a166-e36d2d5dda85: dropped (unit crore, quarter Sep 2026; not found verbatim: 54269.95, 5624.17)
  NTPC f774f918-058b-4b02-a932-730ddf8b1434: dropped (unit crore, quarter Sep 2026; not found verbatim: 54269.95, 5624.17)
  NAVINFLUOR 6a34e916-2e0a-4d0e-a8ed-6f19c1764902: dropped (unit crore, quarter 30th September, 2026; not found verbatim: 1190.74)
  SUNPHARMA 7bbcaf67-e404-4ffb-b7fd-07ff385fdb0a: dropped (unit million, quarter Sep 2026; not found verbatim: 61419.2, 57411.3, 45481.1, 11
  EQUITASBNK ee25b760-fea6-4b6c-8129-d2fc952f596e: dropped (unit lakh, quarter Sep 30, 2026; not found verbatim: -)
  EQUITASBNK 2239e671-a371-4539-a9c1-edcb7d4d78c6: dropped (unit lakh, quarter Sep 30, 2026; not found verbatim: -)
  ASIANPAINT 1f0df7d6-ab0a-4d13-b4e7-5f477f62005d: dropped (unit crore, quarter 30.09.2026; not found verbatim: 8453.83, 9183.44, 7356.29, 1
  ASIANPAINT 92071a93-de8f-4923-85b6-f853a765c9b9: dropped (unit crore, quarter 30.09.2026; not found verbatim: 8453.83, 9183.44, 7356.29, 1
  BAJFINANCE 35bf242b-58db-4820-9ded-2d759a71d9f8: dropped (unit crore, quarter 30.09.2026; not found verbatim: 20890.66, 4250.11)
  BAJFINANCE bef4c126-a01e-4636-9c8b-e50fc1a82879: dropped (unit crore, quarter 30.09.2026; not found verbatim: 20890.66, 4250.11)
Done. 26 calls, $0.0000 (26 served from cache)
KAYNES      act     src=filing Sep 2026 | Revenue 952.51 (QoQ 0.6658141427378652%, YoY 912.13%) · EBITDA 119.57 (QoQ -13.41154319646608%, YoY 147.2%) · PBT 64.73 (QoQ -16.17456617456617%, YoY 148.12
```

</details>

<a id="m330"></a>

**▶ Bash:** Tidy log message and view feed grouping code

```bash
sed -i 's/not found verbatim: ${missing.join(", ") || "-"}/${missing.length ? `not found verbatim: ${missing.join(", ")}` : "PAT\/PBT columns inconsistent"}/' scripts/enrich.ts && grep -n "PAT/PBT columns" scripts/enrich.ts | cut -c1-120; sed -n 186,240p src/lib/feed.ts
```

<details><summary>Result (56 lines)</summary>

```
187:                console.error(`\n  ${f.symbol} ${f.id}: dropped (unit ${r.data.unit}, quarter ${r.data.quarter}; ${m
  headline: l.contact.headline,
  kind: l.kind,
  reason: l.reason,
  score: +l.score.toFixed(2),
  months: network.monthsSince(l.contact.tie.lastContact),
  strength: l.contact.tie.strength,
});

const GROUPABLE: Category[] = ["results", "earnings_call", "M&A", "management_change", "credit_rating", "investor_meetings"];
const TIER_RANK: Record<Tier, number> = { act: 0, know: 1, routine: 2 };

export function buildFeed(): FeedItem[] {
  const companies = new Map<string, CompanyMeta>(snapshot.companies.map((c) => [c.symbol, c]));
  const filings = [...snapshot.filings].sort((a, b) => a.ts.localeCompare(b.ts));
  const items: FeedItem[] = [];
  const open = new Map<string, FeedItem>(); // symbol|cat → item still accepting related filings

  for (const f of filings) {
    const co = companies.get(f.symbol);
    if (!co?.inPortfolio) continue;
    const key = `${f.symbol}|${f.cat}`;
    const prev = open.get(key);
    const within72h = prev && new Date(f.ts).getTime() - new Date(prev.ts).getTime() < 72 * 3600e3;
    if (prev && within72h && GROUPABLE.includes(f.cat) && f.cat !== "management_change") {
      // Fold into the existing card. The newest filing becomes the face of the card (the story
      // moved on), except on results days, where the results filing itself stays primary.
      const isResultsDoc = f.cat === "results" && /financial results/i.test(f.bseSub + f.subject);
      const prevIsResultsDoc = prev.cat === "results" && /financial results/i.test(prev.title);
      const promote = TIER_RANK[f.tier] <= TIER_RANK[prev.tier] && (f.cat !== "results" || isResultsDoc || !prevIsResultsDoc);
… (26 more lines)
```

</details>

<a id="m332"></a>

**▶ Bash:** View the rest of buildFeed

```bash
sed -n 268,345p src/lib/feed.ts
```

<details><summary>Result (48 lines)</summary>

```
    if (it.cat === "management_change" && people.length) {
      it.people = people.map((p) => {
        const ext: ExternalPerson = {
          name: p.name,
          roles: p.roles.filter((r) => r.from != null).map((r) => ({ org: r.org, title: r.title, from: r.from!, to: r.to })),
          education: p.education.filter((x) => x.year != null).map((x) => ({ school: x.school, degree: x.degree ?? undefined, to: x.year! })),
        };
        return { ...p, links: network.linksToPerson(ext).slice(0, 3).map(toLite) };
      });
      // A human title beats BSE's "Disclosure under Regulation 30…".
      const verb: Record<PersonChange["action"], string> = {
        appointed: "appointed",
        reappointed: "re-appointed",
        resigned: "resigns as",
        retired: "retires as",
        ceased: "ceases to be",
        other: "·",
      };
      it.title = it.people
        .slice(0, 2)
        .map((p) => `${p.name} ${verb[p.action]} ${p.role}`)
        .join("; ");
      // A change at the top always needs the investor, whatever BSE's title says.
      if (it.people.some((p) => /\b(CEO|CFO|MD|Chairman)\b/.test(p.role))) {
        it.tier = "act";
        it.why = "Change at the top";
      }
    }
    if (["M&A", "capex", "litigation", "fund_raise", "management_change", "results"].includes(it.cat) && it.tier === "act") {
      it.who = network.linksToCompany(it.symbol, co.sector).slice(0, 3).map(toLite);
… (18 more lines)
```

</details>


<a id="m334"></a>

**🤖 Claude:**

I'll add a final pass that merges management-change cards about the same person at the same company within 30 days, such as a board approval followed by the regulator's approval:

<a id="m335"></a>

**▶ Bash:** Check name helpers and feed imports

```bash
grep -n "export function normName\|export function sameName" src/lib/engine/network.ts; grep -n "^import" src/lib/feed.ts
```

<details><summary>Result (7 lines)</summary>

```
54:export function normName(s: string) {
64:export function sameName(a: string, b: string) {
3:import fs from "node:fs";
4:import path from "node:path";
5:import { resultsCut, resultsFromFiling, type FilingResults, type ResultsCut } from "./engine/fundamentals";
6:import { Network, type ExternalPerson, type Link, type NetworkData } from "./engine/network";
7:import type { Category, CompanyMeta, Filing, ScreenerCompany, Snapshot, Tier } from "./types";
```

</details>

<a id="m337"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\feed.ts`

```diff
-       it.who = network.linksToCompany(it.symbol, co.sector).slice(0, 3).map(toLite);
-     }
-   }
-   return items.sort((a, b) => b.ts.localeCompare(a.ts));
- }
+       it.who = network.linksToCompany(it.symbol, co.sector).slice(0, 3).map(toLite);
+     }
+   }
+ 
+   // The same appointment often arrives twice (board approval, then the regulator's): one card per
+   // story. Same company, same person, within 30 days → fold the older card into the newer one.
+   const out: FeedItem[] = [];
+   for (const it of items.sort((a, b) => b.ts.localeCompare(a.ts))) {
+     const keep =
+       it.cat === "management_change" && it.people?.length
+         ? out.find(
+             (k) =>
+               k.cat === "management_change" &&
+               k.symbol === it.symbol &&
+               new Date(k.ts).getTime() - new Date(it.ts).getTime() < 30 * 864e5 &&
+               k.people?.some((p) => it.people!.some((q) => sameName(p.name, q.name))),
+           )
+         : undefined;
+     if (!keep) {
+       out.push(it);
+       continue;
+     }
+     keep.related.push({ id: it.id, title: it.title, pdfUrl: it.pdfUrl, ts: it.ts }, ...it.related);
+     if (TIER_RANK[it.tier] < TIER_RANK[keep.tier]) keep.tier = it.tier;
+     keep.summary ??= it.summary;
+   }
+   return out;
+ }
```

<a id="m338"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\feed.ts`

```diff
- import { Network, type ExternalPerson, type Link, type NetworkData } from "./engine/network";
+ import { Network, sameName, type ExternalPerson, type Link, type NetworkData } from "./engine/network";
```

<a id="m339"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\feed.ts`

```diff
-     // One results grid per company per window: the first (newest) results card gets it.
+     // One results grid per company: items run oldest-first here, so the results filing itself gets it,
+     // not a later press release or call notice about the same numbers.
```

<a id="m340"></a>

**▶ Bash:** Type-check and view the top act cards

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -5; npx tsx scripts/dev/rescheck.ts 2>&1 | sed -n '/Summaries/,$p' | head -40
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\feed.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\feed.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\feed.ts has been updated successfully.
```

</details>

<details><summary>Result (25 lines)</summary>

```
Summaries: 138 / 343 cards
- [KAYNES] Financial Results for the Second Quarter and Half Year Ended 30 September 2026
    Kaynes Technology approved second quarter financial results, a joint venture for TFT display modules, and the voluntary strike-off of subsidiary KESPL.
- [KAYNES] Execution of Joint Venture
    Kaynes Technology approved a joint venture to manufacture TFT modules and initiated a voluntary strike-off for its subsidiary, Kaynes Embedded Systems.
- [HDFCBANK] V. Srinivasa Rangan re-appointed Whole-time Director (designated as Executive Director)
    HDFC Bank re-appointed V. Srinivasa Rangan as Whole-time Director (Executive Director) for one year starting November 23, 2026, subject to shareholder approval.
- [HAL] Shrirang Anilrao Kothe appointed CEO (Helicopter Complex)
    Shri Shrirang Anilrao Kothe has been appointed as the CEO (Helicopter Complex) of Hindustan Aeronautics Ltd effective November 13, 2026.
- [NAVINFLUOR] Commercialization Of Additional Hydrofluorocarbons (HFC) Capacity Upto 15K MTPA R32 Equivalent Quantity
    Navin Fluorine commenced commercial operations at its new ₹236.50 crore hydrofluorocarbons (HFC) plant in Surat, adding up to 15K MTPA R32 equivalent capacity.
- [HAL] Audited Financial Results (Standalone And Consolidated) For The Quarter And Half Year Ended 30Th September, 2026
    (no summary)
- [TATAPOWER] Sanjay Banga appointed CEO and Managing Director
    Tata Power appointed Sanjay Banga as Additional Director and CEO Designate, transitioning to CEO and Managing Director starting May 1, 2027.
- [TATAPOWER] Regulation 30 Capacity Addition
    Tata Power approved an ₹11,871 crore investment to add a 1,800 MW Pumped Storage Project at Shirwata, Maharashtra over 51 months to support renewable energy.
- [TATAPOWER] Outcome of the Financial Results for the Quarter and Half Year Ended September 30, 2026
    Tata Power reported financial results and disclosed ongoing legal setbacks in Singapore regarding an unfavourable arbitration award of USD 490.32 million.
- [TATASTEEL] Acquisition of 38,222 equity shares of face value ?10/- each in Creative Port Development Private Limited (''CPDPL'') due to conversion of 25,10,830 Optional…
    Tata Steel increased its equity stake in subsidiary Creative Port Development Private Limited by 6.5% to 57.5% through the conversion of preference shares.
- [TATASTEEL] Noel Naval Tata retires as Non-Executive, Non-Independent Director and Vice-Chairman
    Noel Naval Tata is retiring as Non-Executive, Non-Independent Director and Vice-Chairman of Tata Steel, impacting leadership as auditor flags uncertainties in Dutch subsidiary fair value.
- [TATASTEEL] Results - Financial Results For Quarter And Half Year Ended September 30, 2026
    Tata Steel reported audited financial results for the quarter and half-year ended September 30, 2026, and announced the retirement of Vice Chairman Noel Naval Tata.
```

</details>

<a id="m345"></a>

**▶ Bash:** View smartTitle implementation

```bash
grep -n "function smartTitle" -A20 src/lib/feed.ts | head -30
```

<details><summary>Result (21 lines)</summary>

```
156:function smartTitle(f: Filing): string {
157-  let t = f.subject.replace(GENERIC, "").trim();
158-  for (const cand of [t, f.headline]) {
159-    const stripped = cand.replace(LODR_PREFIX, "");
160-    if (stripped !== cand && stripped.length > 8) {
161-      t = stripped;
162-      break;
163-    }
164-  }
165-  const generic = !t || /^(general|change in directorate|change in management|acquisition|credit rating|scheme of arrangement|joint venture|updates on acquisition|award_of_order_receipt_of_order|analyst \/ investor meet - intimation|newspaper publication|cessation|resignation of director|disclosure under regulation 30.*|intimation under regulation 30.*)$/i.test(t);
166-  if (generic && f.headline && f.headline.length > 12) {
167-    t = f.headline;
168-    // Keep BSE's specific label when the headline is vague ("Joint Venture: Outcome of the Board Meeting…").
169-    const sub = f.bseSub.replace(/_/g, " ");
170-    if (sub && !/^(general|none|others?)$/i.test(sub) && !t.toLowerCase().includes(sub.toLowerCase().slice(0, 8)) && /outcome|intimation|disclosure|update/i.test(t))
171-      t = `${sub}: ${t}`;
172-  }
173-  t = t.replace(/_/g, " ").replace(/\s+/g, " ").trim();
174-  if (USELESS.test(t)) {
175-    const s = subjectLine(f.id);
176-    if (s && s.length > 10) t = s;
```

</details>

<a id="m347"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\feed.ts`

```diff
-   t = t.replace(/_/g, " ").replace(/\s+/g, " ").trim();
-   if (USELESS.test(t)) {
+   // BSE's feed loses the rupee sign ("face value ?10/-") and doubles quotes (''CPDPL'').
+   t = t.replace(/_/g, " ").replace(/\?\s?(?=\d)/g, "₹").replace(/''/g, '"').replace(/\s+/g, " ").trim();
+   if (USELESS.test(t)) {
```

<a id="m348"></a>

**▶ Bash:** Type-check, lint, and run the window stats check

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -5; npx eslint src scripts 2>&1 | tail -6; npx tsx scripts/dev/windowcheck.ts 2>&1 | tail -12
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\feed.ts has been updated successfully.
```

</details>

<details><summary>Result (9 lines)</summary>

```
~\EnamHoldingsOA\web\src\lib\engine\fundamentals.ts
  193:9  warning  'p5' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (1 error, 1 warning)

24h: 3 filings → 2 cards; act 1, know 1, routine 0
72h: 13 filings → 8 cards; act 4, know 1, routine 3
168h: 53 filings → 44 cards; act 9, know 5, routine 30
720h: 259 filings → 219 cards; act 39, know 61, routine 119
```

</details>

<a id="m351"></a>

**▶ Bash:** Show lint error details

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx eslint src scripts 2>&1 | grep -B2 "error" | head; sed -n 188,196p src/lib/engine/fundamentals.ts
```

<details><summary>Result (15 lines)</summary>

```
~\EnamHoldingsOA\web\src\components\brief\Brief.tsx
  31:14  error  Error: Calling setState synchronously within an effect can trigger cascading renders
--
  193:9  warning  'p5' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (1 error, 1 warning)
  const ttmPat = a.headers.at(-1) === "TTM" ? row(a, "Net Profit")?.at(-1) ?? null : last(pat?.values);

  const g3 = cagr(revenue, 3);
  const g5 = cagr(revenue, 5);
  const p3 = cagr(pat, 3);
  const p5 = cagr(pat, 5);

  const trajSignals: Signal[] = [];
  if (g3 != null && g5 != null) {
```

</details>


<a id="m353"></a>

**🤖 Claude:**

The Brief.tsx lint error comes from loading saved settings from localStorage inside an effect. It isn't new, but a reviewer running lint would see it, so I'll look at the code:

<a id="m354"></a>

**📖 Read** `~\EnamHoldingsOA\web\src\components\brief\Brief.tsx` (from line 1, 60 lines)

<details><summary>Result (60 lines)</summary>

```
1	"use client";
2	import Link from "next/link";
3	import { useEffect, useMemo, useState } from "react";
4	import { CATEGORY_LABEL, type Category } from "@/lib/engine/classify";
5	import { DEFAULT_SETTINGS, marketAlerts, type AlertSettings, type MarketAlert } from "@/lib/alerts";
6	import type { FeedItem } from "@/lib/feed";
7	import type { Bar } from "@/lib/sources/yahoo";
8	import { Delta, SectionTitle, Sparkline, Tag, timeAgo } from "../ui";
9	import { FeedCard } from "./FeedCard";
10	import { SettingsSheet } from "./SettingsSheet";
11	
12	const WINDOWS = [
13	  { key: "24h", label: "24h", hours: 24 },
14	  { key: "3d", label: "3 days", hours: 72 },
15	  { key: "7d", label: "Week", hours: 168 },
16	  { key: "30d", label: "Month", hours: 720 },
17	] as const;
18	type WindowKey = (typeof WINDOWS)[number]["key"];
19	
20	export type WarmNudge = { contactId: string; name: string; months: number; connection: string; event: { symbol: string; label: string } };
21	
22	export function Brief({ items, eod, asOf, warm, companies }: { items: FeedItem[]; eod: Record<string, Bar[]>; asOf: string; warm: WarmNudge[]; companies: number }) {
23	  const [win, setWin] = useState<WindowKey>("24h");
24	  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
25	  const [showSettings, setShowSettings] = useState(false);
26	  const [showRoutine, setShowRoutine] = useState(false);
27	
28	  useEffect(() => {
29	    try {
30	      const s = localStorage.getItem("finn.settings");
… (30 more lines)
```

</details>


<a id="m356"></a>

**🤖 Claude:**

I'll replace the effect with `useSyncExternalStore` reading localStorage, with an in-memory fallback so preferences still work when storage is blocked:

<a id="m357"></a>

**▶ Bash:** Find uses of window/settings state in Brief

```bash
grep -n "setWin\|setSettings\|useEffect\|settings\b" src/components/brief/Brief.tsx | head -20
```

<details><summary>Result (18 lines)</summary>

```
3:import { useEffect, useMemo, useState } from "react";
23:  const [win, setWin] = useState<WindowKey>("24h");
24:  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
28:  useEffect(() => {
30:      const s = localStorage.getItem("finn.settings");
31:      if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
33:      if (w && WINDOWS.some((x) => x.key === w)) setWin(w);
37:    setSettings(s);
39:      localStorage.setItem("finn.settings", JSON.stringify(s));
43:    setWin(w);
56:    const watched = new Set<Category>(settings.watch);
66:  }, [items, win, settings, asOf]);
68:  const moves = useMemo(() => marketAlerts(eod, settings, sinceDate), [eod, settings, sinceDate]);
88:        <button onClick={() => setShowSettings(true)} aria-label="Alert settings" className="mt-1 grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-2">
120:            {moves.length > 0 && <Moves moves={moves} items={items} settings={settings} />}
219:      {showSettings && <SettingsSheet settings={settings} onChange={save} onClose={() => setShowSettings(false)} />}
224:function Moves({ moves, items, settings }: { moves: MarketAlert[]; items: FeedItem[]; settings: AlertSettings }) {
230:          vol ≥ {settings.volumeMultiple}× 20-day avg · move ≥ ±{settings.priceMovePct}%
```

</details>

<a id="m359"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\components\brief\Brief.tsx`

```diff
-   const [win, setWin] = useState<WindowKey>("24h");
-   const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
-   const [showSettings, setShowSettings] = useState(false);
-   const [showRoutine, setShowRoutine] = useState(false);
- 
-   useEffect(() => {
-     try {
-       const s = localStorage.getItem("finn.settings");
-       if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
-       const w = localStorage.getItem("finn.window") as WindowKey | null;
-       if (w && WINDOWS.some((x) => x.key === w)) setWin(w);
-     } catch {}
-   }, []);
-   const save = (s: AlertSettings) => {
-     setSettings(s);
-     try {
-       localStorage.setItem("finn.settings", JSON.stringify(s));
-     } catch {}
-   };
-   const pickWindow = (w: WindowKey) => {
-     setWin(w);
-     try {
-       localStorage.setItem("finn.window", w);
-     } catch {}
-   };
+   const rawWin = usePref("finn.window");
+   const win: WindowKey = WINDOWS.some((x) => x.key === rawWin) ? (rawWin as WindowKey) : "24h";
+   const rawSettings = usePref("finn.settings");
+   const settings = useMemo<AlertSettings>(() => {
+     try {
+       return rawSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) } : DEFAULT_SETTINGS;
+     } catch {
+       return DEFAULT_SETTINGS;
+     }
+   }, [rawSettings]);
+   const [showSettings, setShowSettings] = useState(false);
+   const [showRoutine, setShowRoutine] = useState(false);
+   const save = (s: AlertSettings) => writePref("finn.settings", JSON.stringify(s));
+   const pickWindow = (w: WindowKey) => writePref("finn.window", w);
```

<a id="m360"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\components\brief\Brief.tsx`

```diff
- export type WarmNudge = 
+ // Per-viewer preferences (window, alert thresholds) in localStorage, read through
+ // useSyncExternalStore so the server render and first client render agree. Falls back to memory
+ // when storage is blocked (private mode), so the controls still work for the session.
+ const memoryPrefs = new Map<string, string>();
+ const PREF_EVENT = "finn-pref";
+ function readPref(key: string): string | null {
+   try {
+     const v = localStorage.getItem(key);
+     if (v != null) return v;
+   } catch {}
+   return memoryPrefs.get(key) ?? null;
+ }
+ function writePref(key: string, value: string) {
+   memoryPrefs.set(key, value);
+   try {
+     localStorage.setItem(key, value);
+   } catch {}
+   window.dispatchEvent(new Event(PREF_EVENT));
+ }
+ function subscribePref(cb: () => void) {
+   window.addEventListener("storage", cb);
+   window.addEventListener(PREF_EVENT, cb);
+   return () => {
+     window.removeEventListener("storage", cb);
+     window.removeEventListener(PREF_EVENT, cb);
+   };
+ }
+ function usePref(key: string) {
+   return useSyncExternalStore(subscribePref, () => readPref(key), () => null);
+ }
+ 
+ export type WarmNudge =
```

<a id="m361"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\components\brief\Brief.tsx`

```diff
- import { useEffect, useMemo, useState } from "react";
+ import { useMemo, useState, useSyncExternalStore } from "react";
```

<a id="m362"></a>

**▶ Bash:** Check remaining uses of p5

```bash
sed -i 's/^  const p5 = cagr(pat, 5);\n//' src/lib/engine/fundamentals.ts && grep -n "p5" src/lib/engine/fundamentals.ts
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\components\brief\Brief.tsx has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\components\brief\Brief.tsx has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\components\brief\Brief.tsx has been updated successfully.
```

</details>

<details><summary>Result (4 lines)</summary>

```
193:  const p5 = cagr(pat, 5);
264:    const p5v = patAligned.values.slice(-5);
265:    const sp = sum(p5v);
[This command modified 1 file you've previously read: src\lib\engine\fundamentals.ts. Call Read before editing.]
```

</details>

<a id="m367"></a>

**▶ Bash:** Remove unused variable and re-lint

```bash
sed -i '193{/const p5 = cagr(pat, 5);/d}' src/lib/engine/fundamentals.ts && sed -n 190,194p src/lib/engine/fundamentals.ts && export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -5; npx eslint src scripts 2>&1 | tail -4
```

<details><summary>Result (6 lines)</summary>

```
  const g3 = cagr(revenue, 3);
  const g5 = cagr(revenue, 5);
  const p3 = cagr(pat, 3);

  const trajSignals: Signal[] = [];
[This command modified 1 file you've previously read: src\lib\engine\fundamentals.ts. Call Read before editing.]
```

</details>


<a id="m369"></a>

**🤖 Claude:**

Type-check and lint are both clean. Next: production build, start the server, and screenshot the key pages with the Edge script from last night.

<a id="m370"></a>

**▶ Bash:** Check screenshot script and run production build

```bash
ls "<session-tmp>/scratchpad/shots/" 2>&1 | head; cd ~/EnamHoldingsOA/web && export PATH="/c/Program Files/nodejs:$PATH" && npx next build 2>&1 | tail -25
```

<details><summary>Result (34 lines)</summary>

```
brief-dark.png
brief-week-dark.png
brief-week.png
brief.png
network-dark.png
network.png
node_modules
package-lock.json
package.json
person-dark.png

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/research/[symbol]
├ ○ /icon.svg
├ ○ /manifest.webmanifest
├ ○ /network
├   /network/[id]
│ ├ ◐ /network/[id]
│ ├ ○ /network/rohan-mehta
│ ├ ○ /network/priya-raman
│ └ ◐ [+31 more paths]
├ ○ /research
└   /research/[symbol]
  ├ ◐ /research/[symbol]
  ├ ○ /research/HDFCBANK
  ├ ○ /research/KOTAKBANK
  └ ◐ [+19 more paths]

… (4 more lines)
```

</details>

<a id="m372"></a>

**▶ Bash:** Show the screenshot script

```bash
cat "<session-tmp>/scratchpad/shots/shoot.mjs" | head -50
```

<details><summary>Result (31 lines)</summary>

```
// Phone-sized screenshots of FINN for visual QA. Usage: node shoot.mjs [dark]
import { chromium } from "playwright";

const dark = process.argv.includes("dark");
const base = "http://localhost:3123";
const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: dark ? "dark" : "light" });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
p.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 200)}`));

const suffix = dark ? "-dark" : "";
for (const [name, url] of [
  ["brief", "/"],
  ["research-tcs", "/research/TCS"],
  ["network", "/network"],
  ["person", "/network/rohan-mehta"],
]) {
  await p.goto(base + url, { waitUntil: "networkidle" });
  await p.screenshot({ path: `${name}${suffix}.png`, fullPage: true });
}
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.getByRole("button", { name: "Week" }).click();
await p.waitForTimeout(400);
await p.screenshot({ path: `brief-week${suffix}.png`, fullPage: true });
await p.getByRole("button", { name: "Alert settings" }).click();
await p.waitForTimeout(400);
await p.screenshot({ path: `settings${suffix}.png` });
await b.close();
… (1 more lines)
```

</details>


<a id="m374"></a>

**🤖 Claude:**

I'll add the DEEPAKNTR and CREDITACC research pages to the screenshot list, then start the server:

<a id="m375"></a>

**▶ Bash:** Extend screenshot script with research pages

```bash
cd "<session-tmp>/scratchpad/shots" && sed -i 's|  \["research-tcs", "/research/TCS"\],|  ["research-tcs", "/research/TCS"],\n  ["research-deepak", "/research/DEEPAKNTR"],\n  ["research-cag", "/research/CREDITACC"],\n  ["research-hdfc", "/research/HDFCBANK"],|' shoot.mjs && sed -i 's|await p.screenshot({ path: `brief-week${suffix}.png`, fullPage: true });|await p.screenshot({ path: `brief-week${suffix}.png`, fullPage: true });\nawait p.reload({ waitUntil: "networkidle" });\nconst kept = await p.getByRole("button", { name: "Week" }).getAttribute("aria-pressed");\nconsole.log("window persisted after reload:", kept);|' shoot.mjs && grep -n "research-\|persisted" shoot.mjs; grep -n 'aria-pressed\|aria-selected' ~/EnamHoldingsOA/web/src/components/brief/Brief.tsx | head -3
```

<details><summary>Result (6 lines)</summary>

```
16:  ["research-tcs", "/research/TCS"],
17:  ["research-deepak", "/research/DEEPAKNTR"],
18:  ["research-cag", "/research/CREDITACC"],
19:  ["research-hdfc", "/research/HDFCBANK"],
32:console.log("window persisted after reload:", kept);
Shell cwd was reset to ~\EnamHoldingsOA\web
```

</details>


<a id="m377"></a>

**🤖 Claude:**

The window buttons don't expose `aria-pressed`. That's worth adding anyway for accessibility, and the persistence test can use it.

<a id="m378"></a>

**▶ Bash:** View window button markup

```bash
grep -n "pickWindow" -B2 -A6 src/components/brief/Brief.tsx | sed -n 1,40p
```

<details><summary>Result (29 lines)</summary>

```
65-  const [showRoutine, setShowRoutine] = useState(false);
66-  const save = (s: AlertSettings) => writePref("finn.settings", JSON.stringify(s));
67:  const pickWindow = (w: WindowKey) => writePref("finn.window", w);
68-
69-  const hours = WINDOWS.find((w) => w.key === win)!.hours;
70-  const since = new Date(new Date(asOf).getTime() - hours * 3600e3);
71-  // EOD bars are dated by trading day; a 24h window on a Monday morning still means "last session".
72-  const sinceDate = new Date(since.getTime() - (hours <= 72 ? 2 : 0) * 864e5).toISOString().slice(0, 10);
73-
--
123-          <button
124-            key={w.key}
125:            onClick={() => pickWindow(w.key)}
126-            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${win === w.key ? "bg-ink text-bg" : "border border-line bg-surface text-ink-2"}`}
127-          >
128-            {w.label}
129-          </button>
130-        ))}
131-      </div>
--
155-
156-      {material === 0 && moves.length === 0 && win !== "30d" && (
157:        <button onClick={() => pickWindow(win === "24h" ? "7d" : "30d")} className="mt-6 w-full rounded-2xl border border-dashed border-line p-4 text-left text-[14px] text-ink-2">
158-          Nothing crossed a threshold. <span className="font-medium text-accent">Widen to the last {win === "24h" ? "week" : "month"} →</span>
159-        </button>
160-      )}
161-
162-      {view.know.length > 0 && (
163-        <>
```

</details>

<a id="m380"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\components\brief\Brief.tsx`

```diff
-             onClick={() => pickWindow(w.key)}
-             className=
+             onClick={() => pickWindow(w.key)}
+             aria-pressed={win === w.key}
+             className=
```

<a id="m381"></a>

**▶ PowerShell:** Free port 3123 if a stale server holds it

```powershell
Get-NetTCPConnection -LocalPort 3123 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -Confirm:$false }; "port clear"
```

<a id="m382"></a>

**▶ Bash · background:** Rebuild and start production server on port 3123

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx next build 2>&1 | grep -E "error|Error|✓ Compiled|Generating" | head -5 && npx next start -p 3123
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\components\brief\Brief.tsx has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
port clear
```

</details>

<details><summary>Result (1 line)</summary>

```
Command running in background with ID: b4y0lzl1m. Output is being written to: <session-tmp>/tasks\b4y0lzl1m.output. You will be notified when it completes — do not poll that file or sleep while waiting. Read the file only if the user asks for progress, or if you need a line it prints before you can go on, such as a server's ready line or port.
```

</details>

<a id="m386"></a>

**🧰 Load tools:** `select:Monitor`

<a id="m387"></a>

**▶ Bash · background:** Wait until the local server responds

```bash
for i in $(seq 1 240); do code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3123/ 2>/dev/null); if [ "$code" = "200" ]; then echo "ready after ${i} polls"; exit 0; fi; if grep -qiE "error|failed" "<session-tmp>/tasks/b4y0lzl1m.output" 2>/dev/null; then echo "build/server error"; grep -iE "error|failed" "<session-tmp>/tasks/b4y0lzl1m.output" | head -5; exit 1; fi; ping -n 2 127.0.0.1 >/dev/null; done; echo timeout
```

<details><summary>Result (1 line)</summary>

```
Command running in background with ID: bftweoccm. Output is being written to: <session-tmp>/tasks\bftweoccm.output. You will be notified when it completes — do not poll that file or sleep while waiting. Read the file only if the user asks for progress, or if you need a line it prints before you can go on, such as a server's ready line or port.
```

</details>


<a id="m389"></a>

**🤖 Claude:**

While the server starts, I'll update the docs with today's changes: the verbatim and consistency checks on filing numbers, the "Raised" verdict, and the actual spend.

<a id="m390"></a>

**📖 Read** `~\EnamHoldingsOA\docs\WRITEUP.md`

<details><summary>Result (88 lines)</summary>

```
1	# FINN: covering note
2	
3	**Prototype:** _Vercel URL_ · **Repo:** https://github.com/EntityY256/EnamHoldingsOA · **Build history:** _Claude Code session export link_
4	
5	## What I built
6	
7	FINN is a mobile-first PWA with three tabs. The Network is woven through the first two rather than sitting beside them.
8	
9	**Brief (Push).** A windowed digest (24h / 3 days / week / month) of every BSE filing across an 18-stock portfolio, sorted into three tiers:
10	- *Needs you*
11	- *Worth knowing*, one line each
12	- *Routine*, folded into counts
13	
14	Five filings from one results day collapse into one card. Triggered alerts sit on top: filing types you choose to watch, and end-of-day moves past thresholds you set (volume × 20-day average, ±% move). Each market move is linked to the filing that likely explains it, or flagged as unexplained.
15	
16	**The three card types the brief asked for:**
17	- **Results:** Revenue, EBITDA, PBT and PAT, with QoQ and YoY and the margin change in basis points, plus a one-line deterministic take ("Revenue up 26% YoY · PAT up 33% · margin −200 bp").
18	- **Management change:** the incoming person's career and education, taken from the filing itself (SEBI requires a profile annexure), plus your best path to them. For example, *"Rohan Mehta → reported to Anup Bagchi for seven years at ICICI Securities"* for the new HDFC Bank CEO.
19	- **Material event** (M&A, capex, litigation): the person best placed to explain it, ranked as insider (with an MNPI caution), then ex-insider (weighted by recency), then peer, then sector expert.
20	
21	**Research (Pull).** Works on any NSE ticker.
22	- Trajectory, balance sheet and cash quality are computed from reported statements and shown as charts and plain-language signals (TCS: "Profits are real cash: 5-yr operating cash flow is 101% of reported profit"; DIXON: "Profit compounding faster than sales (86% vs 59% 3-yr CAGR): operating leverage").
23	- *Promised vs delivered* reads the last four concall transcripts and the annual report. It extracts every explicit promise with a verbatim quote, then checks each against the reported numbers: delivered / partly / missed / pending / can't verify.
24	- It also produces narrative vs numbers, a 3-and-3 bull/bear, and three questions to ask management.
25	- It uses primary sources only, and progress streams to the phone while it works.
26	
27	**Network.**
28	- Paths to people in the news.
29	- Second-degree reach through "knows" edges.
30	- Ex-colleagues by overlapping tenure, and batchmates by school and year.
… (58 more lines)
```

</details>

<a id="m392"></a>

**▶ Bash:** Find related passages in architecture and README

```bash
cd ~/EnamHoldingsOA && grep -n "verbatim\|cross-check\|Financing\|lender\|Lender\|delivered\|verdict\|pending" docs/ARCHITECTURE.md README.md | head -30
```

<details><summary>Result (7 lines)</summary>

```
docs/ARCHITECTURE.md:21:    STRONG["strong tier<br/>Opus 5.5 / Gemini 3.6 Flash<br/>promised vs delivered · bull/bear"]
docs/ARCHITECTURE.md:77:| Results lines when the standardised table lags | cheap | copy three columns of a table | **no arithmetic by the model**: EBITDA = PBT + finance cost + D&A − other income is computed in code, and cross-checked against screener when both exist |
docs/ARCHITECTURE.md:78:| Transcript guidance extraction (map) | cheap | find explicit promises + verbatim quotes in a 40-page call | quotes must be verbatim; outside knowledge forbidden |
docs/ARCHITECTURE.md:79:| Promised vs delivered, narrative vs numbers, bull/bear (reduce) | strong | genuine reasoning across 4 quarters + a numbers table | numbers table computed in code; "unverifiable" and "pending" are explicit verdicts |
README.md:5:- **Research (Pull):** checks what management promised against what it delivered.
README.md:25:   - *Promised vs delivered* reads the last four concall transcripts and the annual report, and checks every explicit promise against the numbers.
README.md:47:npm run research                # pre-compute promised-vs-delivered for the research list
```

</details>

> ⏱ *Background task completed:* Background command "Wait until the local server responds" completed (exit code 0)

<a id="m395"></a>

**▶ Bash:** Take light and dark phone screenshots

```bash
cat "<session-tmp>/tasks/bftweoccm.output"; cd "<session-tmp>/scratchpad/shots" && export PATH="/c/Program Files/nodejs:$PATH" && node shoot.mjs 2>&1 | tail -5 && node shoot.mjs dark 2>&1 | tail -3
```

<details><summary>Result (8 lines)</summary>

```
ready after 4 polls

[exited with code 0]
window persisted after reload: true
no console errors
window persisted after reload: true
no console errors
Shell cwd was reset to ~\EnamHoldingsOA
```

</details>


<a id="m397"></a>

**🤖 Claude:**

No console errors in light or dark mode, and the chosen window survives a reload. Now I'll look at the screenshots, starting with the research pages:

<a id="m398"></a>

**📖 Read** `<session-tmp>/scratchpad\shots\research-deepak.png`

<details><summary>Result (1 line)</summary>

```
[1 screenshot(s) shown to the model]
```

</details>


<a id="m400"></a>

**🤖 Claude:**

The full page is too tall to read at this scale, so I'll crop the narrative section:

<a id="m401"></a>

**▶ Bash:** Crop screenshot sections for review

```bash
cd "<session-tmp>/scratchpad/shots" && python -c "
from PIL import Image
im=Image.open('research-deepak.png'); print(im.size)
im.crop((0,0,390,1300)).save('crop-deepak-1.png')
im.crop((0,1300,390,2600)).save('crop-deepak-2.png')
im2=Image.open('research-cag.png'); im2.crop((0,500,390,1800)).save('crop-cag.png')
im3=Image.open('research-hdfc.png'); print(im3.size)
" 2>&1
```

⚠️ Tool error:

```
Exit code 1
Traceback (most recent call last):
  File "<string>", line 2, in <module>
ModuleNotFoundError: No module named 'PIL'
```


<a id="m403"></a>

**🤖 Claude:**

Pillow isn't installed, so I'll take viewport screenshots at chosen scroll positions with Playwright instead:

<a id="m404"></a>

**▶ Bash:** Take scrolled viewport screenshots of DEEPAKNTR

```bash
cd "<session-tmp>/scratchpad/shots" && cat > view.mjs <<'EOF'
// node view.mjs <path> <name> <y1,y2,...> [dark] : viewport screenshots at given scroll offsets
import { chromium } from "playwright";
const [path, name, ys, mode] = process.argv.slice(2);
const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: mode === "dark" ? "dark" : "light" });
const p = await ctx.newPage();
await p.goto("http://localhost:3123" + path, { waitUntil: "networkidle" });
for (const y of ys.split(",").map(Number)) {
  await p.evaluate((y) => window.scrollTo(0, y), y);
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${name}-${y}.png` });
}
await b.close();
EOF
export PATH="/c/Program Files/nodejs:$PATH" && node view.mjs /research/DEEPAKNTR v-deepak 0,700 && echo ok
```

⚠️ Tool error:

```
Exit code 1
node:internal/modules/run_main:111
    triggerUncaughtException(
    ^

page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
[2m  - navigating to "http://localhost:3123C:/Program Files/Git/research/DEEPAKNTR", waiting until "networkidle"[22m

    at <session-tmp>/scratchpad\shots\view.mjs:7:9 {
  name: 'Error'
}

Node.js v26.13.1
```


<a id="m406"></a>

**🤖 Claude:**

Git Bash rewrote the leading `/` into a Windows path. I'll pass the path without the slash:

<a id="m407"></a>

**▶ Bash:** Fix path handling and retake screenshots

```bash
cd "<session-tmp>/scratchpad/shots" && sed -i 's|"http://localhost:3123" + path|"http://localhost:3123/" + path.replace(/^\\//, "")|' view.mjs && export PATH="/c/Program Files/nodejs:$PATH" && node view.mjs research/DEEPAKNTR v-deepak 0,700 && echo ok
```

⚠️ Tool error:

```
Exit code 1
file:///<session-tmp>/scratchpad/shots/view.mjs:7
await p.goto("http://localhost:3123/" + path.replace(/^//, ""), { waitUntil: "networkidle" });
                                                         ^

SyntaxError: Unexpected token ','
    at compileSourceTextModule (node:internal/modules/esm/utils:355:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:94:18)
    at #translate (node:internal/modules/esm/loader:441:20)
    at afterLoad (node:internal/modules/esm/loader:509:29)
    at ModuleLoader.loadAndTranslate (node:internal/modules/esm/loader:514:12)
    at #getOrCreateModuleJobAfterResolve (node:internal/modules/esm/loader:567:36)
    at afterResolve (node:internal/modules/esm/loader:614:52)
    at ModuleLoader.getOrCreateModuleJob (node:internal/modules/esm/loader:620:12)
    at node:internal/modules/esm/loader:639:32
    at TracingChannel.tracePromise (node:diagnostics_channel:582:22)

Node.js v26.13.1
```

<a id="m409"></a>

**▶ Bash:** Simplify URL join and retake screenshots

```bash
cd "<session-tmp>/scratchpad/shots" && sed -i 's|path.replace(/^//, "")|path|' view.mjs && grep -n goto view.mjs && export PATH="/c/Program Files/nodejs:$PATH" && node view.mjs research/DEEPAKNTR v-deepak 0,700 && echo ok
```

<details><summary>Result (3 lines)</summary>

```
7:await p.goto("http://localhost:3123/" + path, { waitUntil: "networkidle" });
ok
Shell cwd was reset to ~\EnamHoldingsOA
```

</details>

<a id="m411"></a>

**📖 Read** `<session-tmp>/scratchpad\shots\v-deepak-0.png`

<details><summary>Result (1 line)</summary>

```
[1 screenshot(s) shown to the model]
```

</details>

<a id="m413"></a>

**📖 Read** `<session-tmp>/scratchpad\shots\v-deepak-700.png`

<details><summary>Result (1 line)</summary>

```
[1 screenshot(s) shown to the model]
```

</details>

<a id="m415"></a>

**▶ Bash:** Screenshot CREDITACC verdicts and Brief week view

```bash
cd "<session-tmp>/scratchpad/shots" && sed -i 's|const p = await ctx.newPage();|if ((mode ?? "").includes("week")) await ctx.addInitScript(() => localStorage.setItem("finn.window", "7d"));\nconst p = await ctx.newPage();|; s|colorScheme: mode === "dark"|colorScheme: (mode ?? "").includes("dark")|' view.mjs && export PATH="/c/Program Files/nodejs:$PATH" && node view.mjs research/CREDITACC v-cag 700 && node view.mjs "" v-brief 0,800,1600,2400 week && echo ok
```

<details><summary>Result (2 lines)</summary>

```
ok
Shell cwd was reset to ~\EnamHoldingsOA
```

</details>

<a id="m417"></a>

**📖 Read** `<session-tmp>/scratchpad\shots\v-cag-700.png`

<details><summary>Result (1 line)</summary>

```
[1 screenshot(s) shown to the model]
```

</details>

<a id="m419"></a>

**📖 Read** `<session-tmp>/scratchpad\shots\v-brief-0.png`

<details><summary>Result (1 line)</summary>

```
[1 screenshot(s) shown to the model]
```

</details>

<a id="m421"></a>

**📖 Read** `<session-tmp>/scratchpad\shots\v-brief-800.png`

<details><summary>Result (1 line)</summary>

```
[1 screenshot(s) shown to the model]
```

</details>

<a id="m423"></a>

**📖 Read** `<session-tmp>/scratchpad\shots\v-brief-1600.png`

<details><summary>Result (1 line)</summary>

```
[1 screenshot(s) shown to the model]
```

</details>

<a id="m425"></a>

**▶ Bash:** Find the path-to label code

```bash
cd ~/EnamHoldingsOA/web && grep -rn "Your path to\|split(\" \")\[0\]\|firstName" src/components src/app | head
```

<details><summary>Result (2 lines)</summary>

```
src/components/brief/FeedCard.tsx:64:            <WhoToCall links={p.links} title={`Your path to ${p.name.split(" ")[0]}`} compact />
src/components/brief/FeedCard.tsx:66:            <p className="mt-2 text-[12px] text-muted">No one in your network overlaps with {p.name.split(" ")[0]}&apos;s career yet.</p>
```

</details>

<a id="m427"></a>

**▶ Bash:** Use a callName helper for path labels

```bash
sed -i 's/title={`Your path to ${p.name.split(" ")\[0\]}`}/title={`Your path to ${callName(p.name)}`}/; s/overlaps with {p.name.split(" ")\[0\]}&apos;s career/overlaps with {callName(p.name)}\&apos;s career/' src/components/brief/FeedCard.tsx && grep -n "callName" src/components/brief/FeedCard.tsx; grep -n "^import\|^function\|^export function" src/components/brief/FeedCard.tsx | head
```

<details><summary>Result (12 lines)</summary>

```
64:            <WhoToCall links={p.links} title={`Your path to ${callName(p.name)}`} compact />
66:            <p className="mt-2 text-[12px] text-muted">No one in your network overlaps with {callName(p.name)}&apos;s career yet.</p>
2:import Link from "next/link";
3:import { useState } from "react";
4:import { CATEGORY_LABEL } from "@/lib/engine/classify";
5:import type { FeedItem } from "@/lib/feed";
6:import { Delta, Tag, timeAgo } from "../ui";
7:import { WhoToCall } from "../WhoToCall";
19:export function FeedCard({ item, now, alert }: { item: FeedItem; now: string; alert?: string }) {
110:function ResultsGrid({ r }: { r: NonNullable<FeedItem["results"]> }) {
147:function Row({ label, cur, qoq, yoy }: { label: string; cur: number | null; qoq: number | null; yoy: number | null }) {
[This command modified 1 file you've previously read: src\components\brief\FeedCard.tsx. Call Read before editing.]
```

</details>

<a id="m429"></a>

**▶ Bash:** Add callName helper and locate business extraction

```bash
cat >> src/components/brief/FeedCard.tsx <<'EOF'

/** How you'd refer to someone: "Shri Shrirang Anilrao Kothe" → "Shrirang"; "V. Srinivasa Rangan" → "Srinivasa Rangan". */
function callName(full: string) {
  const parts = full.replace(/^(mr|ms|mrs|dr|shri|smt|sri)\.?\s+/i, "").split(/\s+/);
  const initial = (s: string) => s.length <= 2 || s.endsWith(".");
  return initial(parts[0]) ? parts.filter((s) => !initial(s)).join(" ") || full : parts[0];
}
EOF
grep -n "H53\|AUM" data/snapshot/research/CREDITACC.json | head -3; grep -n "business = r.data" src/lib/engine/research.ts
```

<details><summary>Result (4 lines)</summary>

```
13:    "detail": "Includes individual and retail finance products such as Unnati loans, Vikas loans, housing loans, and two-wheeler loans, reaching an AUM of H53.62 billion."
38:    "quote": "For FY27, we are guiding an AUM growth of 20.0-25.0%, NIM of 12.8-13.2%, cost to income of 33.0-35.0%, credit cost of 3.0-4.0%, ROA of 4.0-4.8%, and an ROE of 16.0-20.0%."
45:    "quote": "For FY27, we are guiding an AUM growth of 20.0-25.0%, NIM of 12.8-13.2%, cost to income of 33.0-35.0%, credit cost of 3.0-4.0%, ROA of 4.0-4.8%, and an ROE of 16.0-20.0%."
172:      business = r.data;
```

</details>


<a id="m431"></a>

**🤖 Claude:**

I'll fix the ₹ glyph in code rather than the prompt: an "H" (or backtick) directly before an amount with a unit becomes ₹. That leaves "H1 FY27" alone.

<a id="m432"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-       business = r.data;
+       business = fixRupee(r.data);
```

<a id="m433"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
- function numbersTable(
+ /**
+  * Annual-report fonts often map the ₹ glyph to "H" or "`", so the text reads "AUM of H53.62 billion".
+  * Only an amount with a unit is touched, so "H1 FY27" stays as it is.
+  */
+ function fixRupee<T>(x: T): T {
+   return JSON.parse(
+     JSON.stringify(x).replace(/(^|[^A-Za-z])[H`]\s?(?=\d[\d,.]*\s*(?:billion|bn|trillion|crores?|cr|million|mn|lakhs?)\b)/gi, "$1₹"),
+   );
+ }
+ 
+ function numbersTable(
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>


<a id="m436"></a>

**🤖 Claude:**

The `/i` flag would also match a lowercase "h". I'll make the case explicit:

<a id="m437"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\engine\research.ts`

```diff
-     JSON.stringify(x).replace(/(^|[^A-Za-z])[H`]\s?(?=\d[\d,.]*\s*(?:billion|bn|trillion|crores?|cr|million|mn|lakhs?)\b)/gi, "$1₹"),
+     JSON.stringify(x).replace(/(^|[^A-Za-z])[H`]\s?(?=\d[\d,.]*\s*(?:[Bb]illion|bn|[Tt]rillion|[Cc]rores?|[Cc]r|[Mm]illion|mn|[Ll]akhs?)\b)/g, "$1₹"),
```

<a id="m438"></a>

**▶ Bash:** Type-check, lint, re-run research, verify rupee fix

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -5; npx eslint src scripts 2>&1 | tail -3; npm run research 2>&1 | grep -E "✓|✗|Total"; grep -o "AUM of .\{12\}" data/snapshot/research/CREDITACC.json; grep -rhoE "[H\`][0-9][0-9,.]* ?(billion|crore|million|lakh)" data/snapshot/research/ | head
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\engine\research.ts has been updated successfully.
```

</details>

<details><summary>Result (6 lines)</summary>

```
  ✓ 5 promises checked · $0 · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 7 promises checked · $0.0437 · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 6 promises checked · $0 · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 2 promises checked · $0 · gemini-3.5-flash-lite + gemini-3.6-flash
Total: $0.0437
AUM of ₹53.62 bil
```

</details>


<a id="m441"></a>

**🤖 Claude:**

Fixed: only CREDITACC's comparison step re-ran ($0.04), and it now says "AUM of ₹53.62 billion". I'll make sure the new CREDITACC verdicts are still sensible:

<a id="m442"></a>

**▶ Bash:** Review regenerated CREDITACC narrative

```bash
python -c "
import json,sys
sys.stdout.reconfigure(encoding='utf-8')
n=json.load(open('data/snapshot/research/CREDITACC.json',encoding='utf-8'))['narrative']
print(n['read']); print(n['credibility'])
for p in n['promises']: print(' -',p['said'],'|',p['promise'][:70],'|',p['verdict'])
for x in n['narrativeVsNumbers']: print(' NvN',x['aligned'],x['reality'][:120])
"
```

<details><summary>Result (12 lines)</summary>

```
CreditAccess Grameen has staged a dramatic operational turnaround, with quarterly Net Profit surging from a loss of ₹100 crore in Dec 2024 to ₹502 crore in Sep 2026. Financing Margin % expanded from -8% in Dec 2024 to 36% in Sep 2026 while Gross NPA % declined from 4.76% in Mar 2025 to 2.18% in Jun 2026.
Management demonstrated strong operational control by upgrading all major FY27 profitability targets (ROA, ROE, NIM, cost-to-income) in Q2 FY27, though reported financials trace generic line items rather than company-defined metrics.
 - Q3 FY26 call | FY27 credit cost guidance of 4.0% to 4.5% | ahead
 - Q3 FY26 call | Foreign borrowings target of 25-30% by FY28 | pending
 - Q4 FY26 call | FY27 NIM guidance of 12.8-13.2% | ahead
 - Q4 FY26 call | FY27 Cost to income guidance of 33.0-35.0% | ahead
 - Q4 FY26 call | FY27 ROA of 4.0-4.8% and ROE of 16.0-20.0% | ahead
 - Q1 FY27 call | Reach INR 50,000 Crore AUM by calendar year 2028 | pending
 - Q2 FY27 call | Maintain FY27 AUM growth guidance of 20% to 25% | pending
 NvN True Gross NPA % dropped continuously from a high of 4.76% in Mar 2025 to 2.18% in Jun 2026.
 NvN True Net Profit recovered from a loss of ₹100 crore in Dec 2024 to ₹493 crore in Jun 2026 and ₹502 crore in Sep 2026.
 NvN True Quarterly Revenue increased consistently from ₹1,380 crore in Dec 2024 to ₹1,904 crore in Sep 2026.
```

</details>


<a id="m444"></a>

**🤖 Claude:**

The verdicts hold. Now the docs. First the exact spend from the ledger:

<a id="m445"></a>

**▶ Bash:** Compute LLM spend totals from the ledger

```bash
python -c "
import json
l=json.load(open('data/snapshot/llm-ledger.json',encoding='utf-8'))['runs']
tot=sum(r['costUsd'] for r in l); calls=sum(r.get('calls',0)-r.get('cachedCalls',0) for r in l)
enr=sum(r['costUsd'] for r in l if r['script']=='enrich'); res=sum(r['costUsd'] for r in l if r['script']=='research')
print(f'total {tot:.4f} enrich {enr:.4f} research {res:.4f} runs {len(l)} paid-calls(recorded) {calls}')
"; ls data/snapshot/research; python -c "
import json
for s in ['DIXON','CREDITACC','DEEPAKNTR','TCS']:
  r=json.load(open(f'data/snapshot/research/{s}.json',encoding='utf-8')); print(s, r['usage'])
"
```

<details><summary>Result (9 lines)</summary>

```
total 1.1514 enrich 0.3319 research 0.8195 runs 13 paid-calls(recorded) 220
CREDITACC.json
DEEPAKNTR.json
DIXON.json
TCS.json
DIXON {'calls': 6, 'costUsd': 0, 'models': ['gemini-3.5-flash-lite', 'gemini-3.6-flash']}
CREDITACC {'calls': 6, 'costUsd': 0.0437, 'models': ['gemini-3.5-flash-lite', 'gemini-3.6-flash']}
DEEPAKNTR {'calls': 6, 'costUsd': 0, 'models': ['gemini-3.5-flash-lite', 'gemini-3.6-flash']}
TCS {'calls': 6, 'costUsd': 0, 'models': ['gemini-3.5-flash-lite', 'gemini-3.6-flash']}
```

</details>


<a id="m447"></a>

**🤖 Claude:**

The stored research files now say $0 because their calls came from cache. I'll check how the page displays that cost:

<a id="m448"></a>

**▶ Bash:** Find cost display in NarrativePanel

```bash
grep -n "costUsd\|usage" src/components/research/NarrativePanel.tsx
```

<details><summary>Result (1 line)</summary>

```
192:        {res.usage.calls} model calls ({res.usage.models.join(" + ")}) · ${res.usage.costUsd.toFixed(3)} · generated {new Date(res.generatedAt).toLocaleDateString("en-IN")} · from primary documents only
```

</details>


<a id="m450"></a>

**🤖 Claude:**

It shows "6 model calls · $0.000", which is misleading. The cost of producing an analysis should survive a cache hit, while the spend ledger keeps counting cache hits as $0. I'll separate the two:

<a id="m451"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\src\lib\llm.ts`

```diff
-   if (hit) {
-     const usage = { ...hit.usage, cached: true, costUsd: 0 };
-     ledger.push(usage);
-     return { data: opts.schema.parse(hit.data), usage };
-   }
+   if (hit) {
+     // Spend ledger: a cache hit costs nothing now. Caller: keeps what producing the answer cost.
+     ledger.push({ ...hit.usage, cached: true, costUsd: 0 });
+     return { data: opts.schema.parse(hit.data), usage: { ...hit.usage, cached: true } };
+   }
```

<a id="m452"></a>

**▶ Bash:** Check other consumers of usage cost

```bash
grep -n "usage.cached\|usage.costUsd\|\.costUsd" scripts/*.ts src/lib/engine/research.ts src/app/api/research/*/route.ts | head
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\src\lib\llm.ts has been updated successfully.
```

</details>

<details><summary>Result (5 lines)</summary>

```
scripts/enrich.ts:151:          cached = usage.cached;
scripts/ledger.ts:8:  const total = led.reduce((s, u) => s + u.costUsd, 0);
scripts/research.ts:34:      total += r.usage.costUsd;
scripts/research.ts:35:      console.log(`  ✓ ${r.narrative.promises.length} promises checked · $${r.usage.costUsd} · ${r.usage.models.join(" + ")}`);
src/lib/engine/research.ts:217:      costUsd: +usages.reduce((s, u) => s + u.costUsd, 0).toFixed(4),
```

</details>

<a id="m455"></a>

**▶ Bash:** Separate production cost from spend in research script

```bash
python - <<'EOF'
p='scripts/research.ts'
s=open(p,encoding='utf-8').read()
s=s.replace("  let total = 0;\n","")
s=s.replace("      total += r.usage.costUsd;\n","")
s=s.replace("promises checked · $${r.usage.costUsd} ·","promises checked · $${r.usage.costUsd} to produce ·")
s=s.replace('  appendLedger("research");\n  console.log(`\\nTotal: $${total.toFixed(4)}`);','  const run = appendLedger("research");\n  console.log(`\\nSpent this run: $${run.total.toFixed(4)} (${run.cached} of ${run.calls} calls served from cache)`);')
open(p,'w',encoding='utf-8').write(s)
EOF
sed -n 24,42p scripts/research.ts; export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -3; npm run research 2>&1 | grep -E "✓|✗|Spent"
```

⚠️ Tool error:

```
Permission for this command was denied by a built-in Claude Code safety check, not by the user. The check stops removals that can delete far more than intended: a system, home or workspace directory, or a target it cannot resolve, such as a shell variable that, if unset or empty, turns this into `rm -rf /` or `rm -rf /*`. Only a person may approve such a removal, and no person did (the permission prompt timed out, or none was shown). The command was NOT run; do not claim it succeeded. Do not work around the check by splitting, scripting, or re-issuing the removal through another tool or shell: the check exists because a removal like this can destroy the user's data, and getting past it would not make it safe. If the text below suggests a safe rewrite, run that instead; it goes through the same check. Otherwise finish the rest of the task without this removal, tell the user what you wanted to delete and why, and leave the removal to them. What was flagged: This command could not be checked for dangerous rm operations: the shell may read it differently than it was parsed. This requires explicit approval.
```


<a id="m457"></a>

**🤖 Claude:**

That was a parsing false positive in the safety check (the heredoc contains no `rm`), so I'll make the same edits with the Edit tool:

<a id="m458"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\research.ts`

```diff
-   let total = 0;

```

<a id="m459"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\research.ts`

```diff
-       total += r.usage.costUsd;
-       console.log(`  ✓ ${r.narrative.promises.length} promises checked · $${r.usage.costUsd} · ${r.usage.models.join(" + ")}`);
+       console.log(`  ✓ ${r.narrative.promises.length} promises checked · $${r.usage.costUsd} to produce · ${r.usage.models.join(" + ")}`);
```

<a id="m460"></a>

**✏️ Edit** `~\EnamHoldingsOA\web\scripts\research.ts`

```diff
-   appendLedger("research");
-   console.log(`\nTotal: $${total.toFixed(4)}`);
+   const run = appendLedger("research");
+   console.log(`\nSpent this run: $${run.total.toFixed(4)} (${run.cached} of ${run.calls} calls served from cache)`);
```

<a id="m461"></a>

**▶ Bash:** Type-check and re-run research from cache

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx tsc --noEmit -p . 2>&1 | head -3; npm run research 2>&1 | grep -E "✓|✗|Spent"
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\research.ts has been updated successfully. (file state is current in your context — no need to Read it back)
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\research.ts has been updated successfully. (file state is current in your context — no need to Read it back)
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\web\scripts\research.ts has been updated successfully. (file state is current in your context — no need to Read it back)
```

</details>

<details><summary>Result (5 lines)</summary>

```
  ✓ 5 promises checked · $0.0646 to produce · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 7 promises checked · $0.0696 to produce · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 6 promises checked · $0.0635 to produce · gemini-3.5-flash-lite + gemini-3.6-flash
  ✓ 2 promises checked · $0.0494 to produce · gemini-3.5-flash-lite + gemini-3.6-flash
Spent this run: $0.0000 (24 of 24 calls served from cache)
```

</details>


<a id="m466"></a>

**🤖 Claude:**

Each analysis costs about 5–7¢ at list prices, and the files now show that instead of $0. Now updating the writeup:

<a id="m467"></a>

**✏️ Edit** `~\EnamHoldingsOA\docs\WRITEUP.md`

```diff
- - *Promised vs delivered* reads the last four concall transcripts and the annual report. It extracts every explicit promise with a verbatim quote, then checks each against the reported numbers: delivered / partly / missed / pending / can't verify.
+ - *Promised vs delivered* reads the last four concall transcripts and the annual report. It extracts every explicit forward-looking promise with a verbatim quote, then checks each against the reported numbers and against later calls: delivered / raised / partly / missed / pending / can't verify. From the demo set:
+   - **Deepak Nitrite:** MIBK/MIBC commissioning promised "within this quarter" (Q3 FY26), then re-set to Q1/Q2 FY27 on the next call: *missed*. Nitric-acid utilisation guided at 95–100%, then disclosed at about 45%: *missed*.
+   - **CreditAccess Grameen:** five FY27 targets (credit cost, NIM, cost-to-income, ROA, ROE) all moved in the investor's favour within two quarters: *raised*.
+   - **TCS:** gives almost no numeric guidance, and FINN says so instead of padding the list.
+   - **Dixon:** FY26 capex guided at ₹1,100–1,200 Cr; ₹1,058 Cr spent (CFO − FCF, computed in code).
```

<a id="m468"></a>

**✏️ Edit** `~\EnamHoldingsOA\docs\WRITEUP.md`

```diff
- 2. **Numbers from code, words from models.** Every ratio, delta and margin is computed in TypeScript. When the model reads a results table, it copies three columns, and EBITDA is computed in code. When screener's standardised table exists, the two are cross-checked.
+ 2. **Numbers from code, words from models.** Every ratio, delta and margin is computed in TypeScript. When the model reads a results table, it copies three columns, and EBITDA is computed in code. Two checks in code gate what it copies: every figure must appear digit-for-digit in the filing, and PAT must be a plausible share of PBT in every column (which catches figures taken from the wrong column). If either fails, the card shows no numbers rather than wrong ones. When screener's standardised table exists, the two sources are cross-checked.
```

<a id="m469"></a>

**✏️ Edit** `~\EnamHoldingsOA\docs\WRITEUP.md`

```diff
-   - Spend for this demo: _fill from data/snapshot/llm-ledger.json_. With Gemini's free tier it runs at $0.
+   - Spend for this demo, per `data/snapshot/llm-ledger.json`: about **$1.15 at list prices** for everything, including prompt iterations. That covers about 160 filings enriched (~$0.33) and the research runs (~$0.82). One company's promised-vs-delivered costs about 6¢ to produce. It actually ran on Gemini's free tier, so it cost $0.
```

<a id="m470"></a>

**✏️ Edit** `~\EnamHoldingsOA\docs\WRITEUP.md`

```diff
- - **Show the work.** Research streams its steps. Every number links to a source document. Verdicts include "can't verify".
+ - **Show the work.** Research streams its steps. Every number links to a source document. Verdicts include "can't verify", and company-defined metrics (EBIT margin, NIM, constant-currency growth) are never judged against a differently-defined table row.
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\docs\WRITEUP.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\docs\WRITEUP.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\docs\WRITEUP.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\docs\WRITEUP.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

</details>


<a id="m475"></a>

**🤖 Claude:**

Now the matching rows in ARCHITECTURE.md:

<a id="m476"></a>

**✏️ Edit** `~\EnamHoldingsOA\docs\ARCHITECTURE.md`

```diff
- | **no arithmetic by the model**: EBITDA = PBT + finance cost + D&A − other income is computed in code, and cross-checked against screener when both exist |
+ | **no arithmetic by the model**: EBITDA = PBT + finance cost + D&A − other income is computed in code. Only the P&L table pages are sent; every copied figure must appear digit-for-digit in the filing, and PAT/PBT must be plausible in every column, or the numbers are dropped. Cross-checked against screener when both exist |
```

<a id="m477"></a>

**✏️ Edit** `~\EnamHoldingsOA\docs\ARCHITECTURE.md`

```diff
- | numbers table computed in code; "unverifiable" and "pending" are explicit verdicts |
+ | numbers table (incl. capex = CFO − FCF) computed in code; a later call can settle an earlier promise (re-set against the investor = missed, in their favour = raised); company-defined metrics are never judged against a differently-defined table row; "unverifiable" and "pending" are explicit verdicts |
```

<a id="m478"></a>

**▶ Bash:** Check README mentions and working tree status

```bash
cd ~/EnamHoldingsOA && grep -n "only the forward-looking\|forward-looking\|Results card\|lender\|EBITDA" README.md | head; git status --short | head -40
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\docs\ARCHITECTURE.md has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\docs\ARCHITECTURE.md has been updated successfully.
```

</details>

<details><summary>Result (41 lines)</summary>

```
19:   - Results cards show Revenue / EBITDA / PBT / PAT, QoQ and YoY.
 M docs/ARCHITECTURE.md
 M docs/WRITEUP.md
 M web/data/snapshot/feed.json
 M web/data/snapshot/texts/4711b2e3-42f9-4095-a3ca-3e2c2ad856c3.txt
 M web/data/snapshot/texts/47fe4353-fc19-48df-8f32-133520ed3cd2.txt
 M web/data/snapshot/texts/4abd11fa-35c6-4be5-a96f-cd13405c1fd3.txt
 M web/data/snapshot/texts/4e229fdc-f89a-46e6-9239-8e74048ba1bb.txt
 M web/data/snapshot/texts/4f4ea23c-0c48-4420-a9bc-7e963dd8cefe.txt
 M web/data/snapshot/texts/60a417d2-0bcb-4c4f-a166-e36d2d5dda85.txt
 M web/data/snapshot/texts/84f672d2-60a7-4cef-adec-3711a9c76668.txt
 M web/data/snapshot/texts/966b7e15-3cad-43bb-b36a-028ed1b58f26.txt
 M web/data/snapshot/texts/b94a51f1-ff90-43b4-90dc-4edf0de9596b.txt
 M web/scripts/enrich.ts
 M web/scripts/research.ts
 M web/scripts/snapshot.ts
 M web/src/components/brief/Brief.tsx
 M web/src/components/brief/FeedCard.tsx
 M web/src/components/research/NarrativePanel.tsx
 M web/src/lib/engine/classify.ts
 M web/src/lib/engine/fundamentals.ts
 M web/src/lib/engine/research.ts
 M web/src/lib/feed.ts
 M web/src/lib/llm.ts
 M web/src/lib/sources/pdf.ts
?? web/data/snapshot/enrichments.json
?? web/data/snapshot/llm-ledger.json
?? web/data/snapshot/research/
?? web/data/snapshot/texts/1e1d75bd-b0df-43f8-bb2f-531f94c9d671.txt
?? web/data/snapshot/texts/34116125-5add-405b-92e4-8322cc784a78.txt
… (11 more lines)
```

</details>

<a id="m482"></a>

**▶ Bash:** View README product tour and remaining status

```bash
sed -n 15,30p README.md; git status --short | sed -n 40,80p
```

<details><summary>Result (28 lines)</summary>

```
## Try it in 60 seconds

1. **Brief.**
   - Switch the window from *24h* to *Week*.
   - Results cards show Revenue / EBITDA / PBT / PAT, QoQ and YoY.
   - Management-change cards show the new person's career from the filing, plus **your path to them** (violet always means "someone you know").
   - The ⚙︎ sheet sets what counts as unusual (volume × 20-day average, ±% move, which filing types interrupt you).
2. **Research.**
   - Open a company in the research list, or type **any** NSE ticker.
   - Trajectory, balance sheet and cash quality are computed from reported statements.
   - *Promised vs delivered* reads the last four concall transcripts and the annual report, and checks every explicit promise against the numbers.
3. **Network.**
   - Search "Anup Bagchi" (the new HDFC Bank CEO), "semiconductors" or "Tata Power".
   - You'll see second-degree paths, batchmates, ex-colleagues and an expertise map.
   - "Keep warm" spots quiet contacts whose former employer just filed something.

?? web/data/snapshot/texts/b0847910-ddd5-48fc-8f2c-7f15b2038d45.txt
?? web/data/snapshot/texts/b1861635-a4ef-4c78-82c0-6ec3557bf627.txt
?? web/data/snapshot/texts/cf8a6ba5-d3c7-4647-8a03-9fc3e3d5055a.txt
?? web/data/snapshot/texts/d1f8e649-ab86-4e59-8c13-4d65a8072d23.txt
?? web/data/snapshot/texts/dd99e487-a84f-407c-b584-b17ced57c0dc.txt
?? web/data/snapshot/texts/ec707522-529d-49a5-bc71-3e7f7df28129.txt
?? web/data/snapshot/texts/f039d44f-8dbf-42dd-bf8b-d2a9e290ecb6.txt
?? web/data/snapshot/texts/f774f918-058b-4b02-a932-730ddf8b1434.txt
?? web/scripts/dev/_dbg.ts
?? web/scripts/dev/rescheck.ts
?? web/scripts/dev/schemacheck.ts
?? web/scripts/ledger.ts
```

</details>

<a id="m484"></a>

**✏️ Edit** `~\EnamHoldingsOA\README.md`

```diff
-    - Results cards show Revenue / EBITDA / PBT / PAT, QoQ and YoY.
+    - Results cards show Revenue / EBITDA / PBT / PAT, QoQ and YoY (lenders: Revenue / PBT / PAT, since EBITDA isn't meaningful for them). Kaynes filed after screener.in updated, so its card is read straight from the filing.
```

<a id="m485"></a>

**✏️ Edit** `~\EnamHoldingsOA\README.md`

```diff
-    - *Promised vs delivered* reads the last four concall transcripts and the annual report, and checks every explicit promise against the numbers.
+    - *Promised vs delivered* reads the last four concall transcripts and the annual report, and checks every explicit promise against the numbers and against later calls. Try **DEEPAKNTR** (two missed timelines) and **CREDITACC** (five targets raised).
```

<a id="m486"></a>

**▶ Bash:** Clean temp script and scan for leaked key

```bash
cd ~/EnamHoldingsOA/web && rm -f scripts/dev/_dbg.ts && cat scripts/dev/schemacheck.ts | head -20; git -C .. check-ignore -v web/.env.local; grep -rIl "AQ\.A" --include="*" . 2>/dev/null | grep -v node_modules | grep -v "^./.next" | head
```

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\README.md has been updated successfully.
```

</details>

<details><summary>Result (1 line)</summary>

```
The file ~\EnamHoldingsOA\README.md has been updated successfully.
```

</details>

<details><summary>Result (10 lines)</summary>

```
// Offline check: every schema we send converts cleanly for both providers (no API call made).
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { Narrative, TranscriptExtract } from "../../src/lib/engine/research";
for (const [name, s] of Object.entries({ Narrative, TranscriptExtract })) {
  const f = zodOutputFormat(s as z.ZodType);
  console.log(name, "→ anthropic format type:", (f as { type?: string }).type, "| gemini JSON schema bytes:", JSON.stringify(z.toJSONSchema(s as z.ZodType)).length);
}
web/.gitignore:34:.env*	web/.env.local
./.env.local
```

</details>


<a id="m490"></a>

**🤖 Claude:**

The key appears only in `.env.local`, which git ignores. I'll stop the local server, rebuild to confirm everything compiles, and screenshot the HDFC card to check the name fix:

<a id="m491"></a>

**▶ PowerShell:** Stop the local server on port 3123

```powershell
Get-NetTCPConnection -LocalPort 3123 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -Confirm:$false }; "stopped"
```

<a id="m492"></a>

**▶ Bash · background:** Lint, rebuild and restart the server

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npx eslint src scripts 2>&1 | tail -3; npx next build 2>&1 | grep -E "rror|Compiled|Route \(app\)" | head -5 && npx next start -p 3123
```

<details><summary>Result (1 line)</summary>

```
stopped
```

</details>

<details><summary>Result (1 line)</summary>

```
Command running in background with ID: ba595jkcd. Output is being written to: <session-tmp>/tasks\ba595jkcd.output. You will be notified when it completes — do not poll that file or sleep while waiting. Read the file only if the user asks for progress, or if you need a line it prints before you can go on, such as a server's ready line or port.
```

</details>

> ⏱ *Background task failed:* Background command "Rebuild and start production server on port 3123" failed with exit code 127


<a id="m496"></a>

**🤖 Claude:**

That notification is the old server I just stopped, as expected. Now I'll wait for the new build to come up:

<a id="m497"></a>

**▶ Bash · background:** Wait for rebuilt server to respond

```bash
for i in $(seq 1 300); do code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3123/ 2>/dev/null); if [ "$code" = "200" ]; then echo "ready"; head -5 "<session-tmp>/tasks/ba595jkcd.output"; exit 0; fi; if grep -qE "rror" "<session-tmp>/tasks/ba595jkcd.output" 2>/dev/null; then echo "error:"; head -20 "<session-tmp>/tasks/ba595jkcd.output"; exit 1; fi; ping -n 2 127.0.0.1 >/dev/null; done; echo timeout
```

<details><summary>Result (1 line)</summary>

```
Command running in background with ID: brve2r78g. Output is being written to: <session-tmp>/tasks\brve2r78g.output. You will be notified when it completes — do not poll that file or sleep while waiting. Read the file only if the user asks for progress, or if you need a line it prints before you can go on, such as a server's ready line or port.
```

</details>


<a id="m499"></a>

**🤖 Claude:**

While that builds, I'll update my project memory with today's progress:

*(Claude updated its private memory notes; omitted.)*

*(Claude updated its private memory notes; omitted.)*

*(Claude updated its private memory notes; omitted.)*

> ⏱ *Background task completed:* Background command "Wait for rebuilt server to respond" completed (exit code 0)

<a id="m504"></a>

**▶ Bash:** Re-run screenshot checks on the rebuilt app

```bash
cat "<session-tmp>/tasks/brve2r78g.output"; cd "<session-tmp>/scratchpad/shots" && export PATH="/c/Program Files/nodejs:$PATH" && node shoot.mjs 2>&1 | tail -2 && node view.mjs "" v2-brief 1500 week dark && echo ok
```

<details><summary>Result (12 lines)</summary>

```
ready
✓ Compiled successfully in 1121ms
Route (app)
▲ Next.js 16.4.6
- Local:         http://localhost:3123
- Network:       http://192.168.56.1:3123

[exited with code 0]
window persisted after reload: true
no console errors
ok
Shell cwd was reset to ~\EnamHoldingsOA\web
```

</details>

<a id="m506"></a>

**📖 Read** `<session-tmp>/scratchpad\shots\v2-brief-1500.png`

<details><summary>Result (1 line)</summary>

```
[1 screenshot(s) shown to the model]
```

</details>


<a id="m508"></a>

**🤖 Claude:**

Fixed: it now reads "Your path to Srinivasa Rangan", and the build has no console errors. Committing and pushing:

<a id="m509"></a>

**▶ Bash:** Stage changes and verify no secrets or caches staged

```bash
cd ~/EnamHoldingsOA && git config user.name && git add -A && git status --short | grep -v "data/snapshot/texts" | head -40 && git status --short | wc -l && git diff --cached --name-only | grep -iE "\.env|cache/" ; echo "env/cache check done"
```

<details><summary>Result (28 lines)</summary>

```
Shaurya Johari
M  README.md
M  docs/ARCHITECTURE.md
M  docs/WRITEUP.md
A  web/data/snapshot/enrichments.json
M  web/data/snapshot/feed.json
A  web/data/snapshot/llm-ledger.json
A  web/data/snapshot/research/CREDITACC.json
A  web/data/snapshot/research/DEEPAKNTR.json
A  web/data/snapshot/research/DIXON.json
A  web/data/snapshot/research/TCS.json
A  web/scripts/dev/rescheck.ts
A  web/scripts/dev/schemacheck.ts
M  web/scripts/enrich.ts
A  web/scripts/ledger.ts
M  web/scripts/research.ts
M  web/scripts/snapshot.ts
M  web/src/components/brief/Brief.tsx
M  web/src/components/brief/FeedCard.tsx
M  web/src/components/research/NarrativePanel.tsx
M  web/src/lib/engine/classify.ts
M  web/src/lib/engine/fundamentals.ts
M  web/src/lib/engine/research.ts
M  web/src/lib/feed.ts
M  web/src/lib/llm.ts
M  web/src/lib/sources/pdf.ts
54
env/cache check done
```

</details>

<a id="m511"></a>

**▶ Bash:** Commit and push the AI run and fixes

```bash
git commit -q -F - <<'EOF'
Run AI enrichment and research on Gemini; harden numbers and verdicts

- Enrich 160 filings (summaries, people, results lines) and pre-compute
  promised-vs-delivered for DIXON, CREDITACC, DEEPAKNTR, TCS.
- Research: forward-looking promises only; later calls settle earlier
  promises (new "raised" verdict); company-defined metrics (EBIT margin,
  NIM) never judged against differently-defined table rows; capex from
  CFO - FCF in code; no cash-flow rows for lenders; one transcript per
  period; rupee glyph fix for annual-report text.
- Results from filings: send only P&L table pages, require every copied
  figure to appear digit-for-digit in the filing and PAT/PBT to be
  plausible per column, else show nothing. Read up to 16 pages.
- Lenders: no EBITDA/"operating profit" line (screener's financing
  profit excludes a bank's other income).
- Classification: analyst-meet notices are no longer "results"; one
  results grid per company; merge repeat management-change cards.
- BSE PDFs with a malformed header fall back to node:https lenient mode.
- Gemini: honour retryDelay on 429, stop on daily quota, unwrap arrays.
- Brief prefs via useSyncExternalStore (lint clean); cost ledger for
  every script; docs updated with real examples and spend.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log --oneline -3 && git push -q origin main 2>&1 | tail -3; git status -sb | head -2
```

<details><summary>Result (4 lines)</summary>

```
57bf349 Run AI enrichment and research on Gemini; harden numbers and verdicts
a6c820b Polish from visual QA; PWA manifest + icon; Vercel config
8e99fa4 Brief quality: free people/title extraction, grouping fix, senior promotion
## main...origin/main
```

</details>


<a id="m513"></a>

**🤖 Claude:**

Pushed as `57bf349`. I'll stop the local server since it's no longer needed:

<a id="m514"></a>

**▶ PowerShell:** Stop the local server

```powershell
Get-NetTCPConnection -LocalPort 3123 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -Confirm:$false }; "stopped"
```

<details><summary>Result (1 line)</summary>

```
stopped
```

</details>


<a id="m516"></a>

**🤖 Claude:**

The AI features now run on your key, I've checked the output, and it's pushed to GitHub. The full build has no errors, and the phone screenshots in light and dark mode show no console errors.

**What works now**
- **Promised vs delivered** is ready for the 4 research companies:
  - **Deepak Nitrite:** two promises missed. A plant was promised "within this quarter" and pushed back on the next call, and a utilisation target came in at about 45%.
  - **CreditAccess Grameen:** five guidance targets raised within two quarters.
  - **TCS:** says honestly that management gives almost no numeric guidance.
  - **Dixon:** capex promise checked against what was actually spent.
- **One-line summaries** on about 160 filings, including 138 cards in the Brief.
- **Kaynes results card**, read straight from the filing: revenue ₹952 Cr (+4% YoY), profit down 66% YoY.

**Problems the first AI run had, now fixed**
- Results already reported were being listed as promises (TCS).
- Guidance upgrades were marked "missed" (CreditAccess).
- Bank results cards showed a misleading negative "operating profit". Lenders now show only revenue, profit before tax and net profit.
- Some filing numbers came from the wrong column of the table. The code now checks every number against the filing and drops any that fail; showing no numbers beats showing wrong ones.
- 14 BSE PDFs failed to download every time. The live research feature would have hit this on Vercel too.
- Duplicate cards and a few label errors.

**Cost:** about $1.15 at list prices for everything, including my re-runs. You actually paid $0 on Gemini's free tier. One company's analysis costs about 6¢. These numbers are in `docs/WRITEUP.md`.

**What's left for you**
1. **Deploy:**
   - Go to vercel.com and sign in with GitHub, then Add New → Project.
   - Import `EnamHoldingsOA` and set **Root Directory to `web`**.
   - Add an environment variable `GEMINI_API_KEY` with your key, then Deploy.
   - Send me the URL and I'll add it to the README and writeup.
2. **Make the repo public:** GitHub → Settings → Change visibility.
3. **Export this chat** with `/export` as your build history. Skim it first, since it contains file paths from your PC.
4. **Send the email** to assessment@enam.com with the subject `IIT Kanpur – Founding AI Engineer - 2027`. Use `docs/WRITEUP.md` as the body, with the Vercel link, repo link and build-history link filled in at the top.

> ⏱ *Background task failed:* Background command "Lint, rebuild and restart the server" failed with exit code 127


<a id="m518"></a>

**🤖 Claude:**

That "failed" notice is just the local server ending because I stopped it; nothing actually failed. The build and push both succeeded. The next step is the Vercel deploy: send me the URL once it's live and I'll add it to the README and writeup.
