// Offline check: every schema we send converts cleanly for both providers (no API call made).
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { Narrative, TranscriptExtract } from "../../src/lib/engine/research";
for (const [name, s] of Object.entries({ Narrative, TranscriptExtract })) {
  const f = zodOutputFormat(s as z.ZodType);
  console.log(name, "→ anthropic format type:", (f as { type?: string }).type, "| gemini JSON schema bytes:", JSON.stringify(z.toJSONSchema(s as z.ZodType)).length);
}
