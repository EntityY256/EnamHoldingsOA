# AI build history

FINN was built in a single Claude Code session (Claude Opus 5.5, running in VS Code on Windows), from reading the brief to the deployed prototype. This folder is that session, exported. The prototype itself calls Gemini (cheap and strong tiers) at runtime; those calls are logged in [`web/data/snapshot/llm-ledger.json`](../../web/data/snapshot/llm-ledger.json), not here.

| Part | When | What happens |
|---|---|---|
| [1 · Overnight build](part-1-overnight-build.md) | 16 Nov 02:31 IST → 03:41 IST | From the brief to a working prototype: probing which data sources respond, the rule classifier, the engines, the Brief / Research / Network screens, and visual QA from phone-sized screenshots. No LLM key yet, so everything that isn't language was built as plain code. |
| [2 · AI layer and quality](part-2-ai-run-and-quality.md) | 16 Nov 10:16 IST → 11:25 IST | A free Gemini key is added and enrichment and research run for the first time. Most of this part is checking the models' output against the filings and transcripts, and fixing the pipeline where it was wrong. |
| [3 · Deploy and submission](part-3-deploy-and-submit.md) | 16 Nov 17:28 IST → 18 Nov 16:00 IST | Vercel environment setup, a production smoke test, the covering note, and this export. |
| [Sub-agent](subagent-nextjs-docs.md) | Part 1 | A read-only agent that read the Next.js 16 docs bundled in `node_modules` before any code was written. The installed version is newer than the model's training data. |

## Who did what

- **Shaurya (human)** set the goal and the constraints: the deadline, the repository, the commit identity, a free choice of AI provider, and one standing instruction before going to sleep: *"Do whatever is the best and use less cost as possible"* ([here](part-1-overnight-build.md#m92)). Shaurya also added the API key, deployed to Vercel, and made the submission calls.
- **Claude Code (agent)** broke the brief into data → engines → screens. It chose the sources and stack after testing what actually responds, wrote and ran the code, and checked its own output against primary documents. It kept the build cheap with Gemini's free tier, a committed snapshot and a content-hash cache, so re-running the demo costs nothing.
- **Gemini (inside the product)** writes the language: filing one-liners, people extraction, guidance quotes, and promised-vs-delivered verdicts. Its output is treated as untrusted. Code validates the structure and recomputes or verifies every number.

## Where it went wrong, and how it was caught

| # | What went wrong | How it was caught → what changed |
|---|---|---|
| 1 | The brief's stated deadline (15 Nov) had already passed | The agent flagged it before building anything; Shaurya confirmed the working deadline was 16 Nov EOD. [→](part-1-overnight-build.md#m4) |
| 2 | NSE's API rejects scripted clients (HTTP 403) | Every candidate source was probed from the machine before any design was fixed. BSE's API became the filings source, and its own category labels turned classification into rules instead of LLM calls. [→](part-1-overnight-build.md#m50) |
| 3 | The installed Next.js (16.4) is newer than the model's training data | A sub-agent read the bundled docs first. The first production build then passed with 62 pages pre-rendered. [→](part-1-overnight-build.md#m67) · [build](part-1-overnight-build.md#m267) |
| 4 | The Brief said "3 things need you" but rendered no cards | The feed logic was checked in isolation and was correct. The served HTML showed the cause: a stale server from an earlier build still held the port. [→](part-1-overnight-build.md#m416) |
| 5 | A title heuristic overwrote good filing headlines | Spotted in the rendered Brief; the fallback was narrowed to genuinely useless titles. [→](part-1-overnight-build.md#m406) |
| 6 | Docs quoted illustrative numbers | They were replaced with the engine's real output: 9 of 52 filings in a week, and TCS cash conversion at 101%. [→](part-1-overnight-build.md#m473) |
| 7 | Chromium download stalled at 4.7 MB | Playwright was switched to the Edge already on the machine, to take phone-sized screenshots for visual QA. [→](part-1-overnight-build.md#m500) |
| 8 | The key file was saved as `.env.txt` | Found by listing file names, without ever printing the value. A free list-models call then confirmed the model IDs before any spend. [→](part-2-ai-run-and-quality.md#m9) |
| 9 | First research run: a TCS transcript was counted twice (screener mislabels its period); already-reported results were extracted as "promises"; an EBIT margin was judged against OPM; upgrades were marked "missed" | Found by reading the output against the transcripts. Fixes: dedupe by period and URL; prompt rules (forward-looking promises only, judged only against the same definition); a new **Raised** verdict. [→](part-2-ai-run-and-quality.md#m65) |
| 10 | Analyst-meet notices were classified as results | A rule now requires both the BSE sub-category and the text to match. [→](part-2-ai-run-and-quality.md#m175) |
| 11 | Lenders showed meaningless EBITDA and cash-flow lines | Removed for lenders, with a note on the card explaining why. [→](part-2-ai-run-and-quality.md#m182) |
| 12 | 14 BSE PDFs failed on every run, including Kaynes' results | Three plausible causes were tested and ruled out one by one: throttling, connection resets after a burst, and runtime flags. Logging the underlying error then showed Node's strict HTTP parser rejecting a malformed BSE header, and a lenient fallback fixed it. [start](part-2-ai-run-and-quality.md#m212) · [ruled out](part-2-ai-run-and-quality.md#m221) · [fixed](part-2-ai-run-and-quality.md#m282) |
| 13 | The model sometimes copied results figures that aren't in the filing, or took them from the wrong column | Every figure must now appear digit-for-digit in the filing, and PAT/PBT must be plausible in every column; otherwise the card shows no numbers. This was tightened twice: once against rounding, once against PDF digit artefacts. [→](part-2-ai-run-and-quality.md#m295) · [→](part-2-ai-run-and-quality.md#m309) |
| 14 | Research spend was missing from the cost ledger | Moved into a shared ledger helper used by every script. [→](part-2-ai-run-and-quality.md#m251) |
| 15 | The same appointment appeared as two cards (board approval, then regulator approval) | A merge pass now joins them. [→](part-2-ai-run-and-quality.md#m334) |
| 16 | The first Vercel link was a protected branch URL that shows reviewers a login wall | Checked with `curl` before submitting; the submission uses the public production domain. Live research was then run once in production to prove the key and data sources work there. [→](part-3-deploy-and-submit.md#m10) · [live run](part-3-deploy-and-submit.md#m18) |
| 17 | The first draft of this export quoted the agent's private memory notes | Caught by a leak scan before publishing; memory operations are now stripped. [→](part-3-deploy-and-submit.md#m38) |

## Accepted vs rewritten

- **Accepted from the model:** language, but only after schema validation. That covers summaries, verbatim guidance quotes with their source call, and verdict reasoning.
- **Never accepted from the model:** arithmetic. EBITDA, margins, capex (CFO − FCF) and every delta are computed in code. Copied figures pass only if they appear in the filing.
- **Rewritten:** the prompts, after the first run was read against the transcripts (#9). The agent's own code, whenever output or screenshots disagreed with the data (#4, #5, #10, #11, #15).

## How this export was made

- **Source:** Claude Code's session transcript (`.jsonl`, about 20 MB). A small script rendered it to Markdown. Prompts and Claude's messages are verbatim; tool calls appear as commands and diffs; long tool output is truncated and collapsed.
- **Removed:**
  - system-injected context;
  - attachments (the challenge PDF);
  - the agent's private memory notes;
  - personal paths and addresses.

  The transcript was scanned for API keys before export, and none appear in it.
- **Not stored by the transcript:** the model's reasoning. The "why" behind each action is in Claude's messages and in the table above.
- **Export time:** 18 Nov 2026 16:00 IST. The last few actions (committing this export) come after it.
