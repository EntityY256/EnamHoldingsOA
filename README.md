# FINN: Financial Investment Agent

A mobile-first agent for a public-markets investor. It does three things:
- **Brief (Push):** tells you what changed and why you should care.
- **Research (Pull):** checks what management promised against what it delivered.
- **Network:** tells you who you know who can explain it.

> **Live demo:** _add Vercel URL here_ · open it on a phone (or "Add to Home Screen")
> Built for the ENAM Holdings Founding AI Engineer build challenge.

## The idea in one line

An investor's scarcest resource is attention, so FINN's headline is a subtraction: **"6 things need you. 41 more handled."** Everything else is folded away. When something does matter, the card already shows the person in your network who can explain it.

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

## What's real, what's mock

| Real | Mock |
|---|---|
| 387 BSE filings (1 Oct–16 Nov 2026) across an 18-stock portfolio; Yahoo EOD; screener.in statements; actual transcripts and annual reports | The investor's network: **33 synthetic contacts**, designed to overlap with the real career histories of executives named in those filings (HDFC Bank, Kotak, Tata Power, Equitas, Trent…) |

## Run locally

```bash
cd web
npm install
cp .env.example .env.local      # add ONE key: GEMINI_API_KEY (free) or ANTHROPIC_API_KEY
npm run dev                     # http://localhost:3000

npm run snapshot                # re-fetch filings, prices, statements, filing texts (no LLM)
npm run enrich                  # one-line summaries, people, results lines (cheap model, cached)
npm run research                # pre-compute promised-vs-delivered for the research list
```

The app runs **without any key**:
- Classification, tiering, results numbers, fundamentals, alerts and all network matching are plain code.
- A key only adds the summaries and the research narrative.

## Repo map

```
web/
  src/lib/sources/     bse.ts · screener.ts · yahoo.ts · pdf.ts         ← data plumbing
  src/lib/engine/      classify.ts · fundamentals.ts · network.ts · research.ts
  src/lib/llm.ts       two tiers × two providers, hashed cache, cost ledger
  src/lib/feed.ts      grouping, titles, per-card enrichment for the Brief
  src/app/             / (Brief) · /research/[symbol] · /network/[id] · /api/research/[symbol]
  scripts/             snapshot.ts · enrich.ts · research.ts
  data/                portfolio.json · network.json (synthetic) · snapshot/ (committed)
docs/
  ARCHITECTURE.md      pipelines, privacy, models, cloud (with diagram)
  WRITEUP.md           the covering note
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data pipelines, privacy model, LLM routing and cloud layout.
