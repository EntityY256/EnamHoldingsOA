# FINN: covering note

**Prototype:** _Vercel URL_ · **Repo:** https://github.com/EntityY256/EnamHoldingsOA · **Build history:** _Claude Code session export link_

## What I built

FINN is a mobile-first PWA with three tabs. The Network is woven through the first two rather than sitting beside them.

**Brief (Push).** A windowed digest (24h / 3 days / week / month) of every BSE filing across an 18-stock portfolio, sorted into three tiers:
- *Needs you*
- *Worth knowing*, one line each
- *Routine*, folded into counts

Five filings from one results day collapse into one card. Triggered alerts sit on top: filing types you choose to watch, and end-of-day moves past thresholds you set (volume × 20-day average, ±% move). Each market move is linked to the filing that likely explains it, or flagged as unexplained.

**The three card types the brief asked for:**
- **Results:** Revenue, EBITDA, PBT and PAT, with QoQ and YoY and the margin change in basis points, plus a one-line deterministic take ("Revenue up 26% YoY · PAT up 33% · margin −200 bp").
- **Management change:** the incoming person's career and education, taken from the filing itself (SEBI requires a profile annexure), plus your best path to them. For example, *"Rohan Mehta → reported to Anup Bagchi for seven years at ICICI Securities"* for the new HDFC Bank CEO.
- **Material event** (M&A, capex, litigation): the person best placed to explain it, ranked as insider (with an MNPI caution), then ex-insider (weighted by recency), then peer, then sector expert.

**Research (Pull).** Works on any NSE ticker.
- Trajectory, balance sheet and cash quality are computed from reported statements and shown as charts and plain-language signals (TCS: "Profits are real cash: 5-yr operating cash flow is 101% of reported profit"; DIXON: "Profit compounding faster than sales (86% vs 59% 3-yr CAGR): operating leverage").
- *Promised vs delivered* reads the last four concall transcripts and the annual report. It extracts every explicit forward-looking promise with a verbatim quote, then checks each against the reported numbers and against later calls: delivered / raised / partly / missed / pending / can't verify. From the demo set:
  - **Deepak Nitrite:** MIBK/MIBC commissioning promised "within this quarter" (Q3 FY26), then re-set to Q1/Q2 FY27 on the next call: *missed*. Nitric-acid utilisation guided at 95–100%, then disclosed at about 45%: *missed*.
  - **CreditAccess Grameen:** five FY27 targets (credit cost, NIM, cost-to-income, ROA, ROE) all moved in the investor's favour within two quarters: *raised*.
  - **TCS:** gives almost no numeric guidance, and FINN says so instead of padding the list.
  - **Dixon:** FY26 capex guided at ₹1,100–1,200 Cr; ₹1,058 Cr spent (CFO − FCF, computed in code).
- It also produces narrative vs numbers, a 3-and-3 bull/bear, and three questions to ask management.
- It uses primary sources only, and progress streams to the phone while it works.

**Network.**
- Paths to people in the news.
- Second-degree reach through "knows" edges.
- Ex-colleagues by overlapping tenure, and batchmates by school and year.
- An expertise map ("rural lending", "semiconductors", …).
- "Keep warm" nudges: a quiet contact's former employer just filed something, which is a natural reason to call.
- Search across all of it.

## Point of view on interaction

- **Subtraction is the product.** The headline counts what FINN handled for you, not what it found. The default view is about three cards, not a feed.
- **The network appears at the moment of need.** It shows inside the card about the CFO change, not on a separate contacts screen. Violet always means "someone you know", so the eye learns it.
- **You own "unusual."** Thresholds and watched categories live one tap away and apply instantly.
- **Show the work.** Research streams its steps. Every number links to a source document. Verdicts include "can't verify", and company-defined metrics (EBIT margin, NIM, constant-currency growth) are never judged against a differently-defined table row.

## Key decisions and trade-offs

1. **BSE API over NSE.** NSE's API rejects scripted clients. BSE's works, carries full history, and labels every filing with its own taxonomy. That made classification a rules problem instead of an LLM problem: about 400 filings classified in milliseconds, for free. The model is used only where language actually needs understanding.
2. **Numbers from code, words from models.** Every ratio, delta and margin is computed in TypeScript. When the model reads a results table, it copies three columns, and EBITDA is computed in code. Two checks in code gate what it copies: every figure must appear digit-for-digit in the filing, and PAT must be a plausible share of PBT in every column (which catches figures taken from the wrong column). If either fails, the card shows no numbers rather than wrong ones. When screener's standardised table exists, the two sources are cross-checked.
3. **The network never touches a model.** Matching is deterministic and explainable. That's the privacy architecture and the product: every suggestion says *why*.
4. **Snapshot-first.** Exchanges block datacenter IPs, so the demo set is pre-fetched and committed, and the demo can't break. Research on any other ticker runs live.
5. **No autonomous agent (yet).** Research is a fixed map→reduce workflow: predictable cost, auditable steps. An open-ended "Ask FINN" agent is the obvious next step once there are evals to keep it honest.

## Architecture (details and diagram in `docs/ARCHITECTURE.md`)

- **Pipelines.**
  - BSE filings, PDF text, screener statements and Yahoo EOD are fetched by `npm run snapshot` into committed JSON.
  - Enrichment (`npm run enrich`) runs the cheap model over material filings.
  - Research runs live per ticker.
  - Entity linking: ticker → BSE code via screener; filing → person by extraction from the Regulation 30 annexure; person → network by normalised organisation, tenure overlap and school-year.
- **Security and privacy.**
  - The network is private to the investor, stored per-tenant and encrypted in production, and never in a prompt or a log.
  - Only professional fields are stored, with deletion on request.
  - Data comes in through the investor's own exports (e.g. the LinkedIn data export), not scraping.
  - Insiders are flagged against MNPI.
  - The design is aligned with the DPDP Act 2023.
  - **This demo uses a clearly-labelled synthetic network.** Real people appear only through public exchange disclosures.
- **LLMs.**
  - Two tiers behind one interface: *cheap* (Claude Haiku 5.5 / Gemini 3.5 Flash-Lite) for extraction, *strong* (Claude Opus 5.5 / Gemini 3.6 Flash) only for the promised-vs-delivered reasoning.
  - Structured outputs are validated with zod.
  - Calls are cached by content hash, system prompts are frozen for prompt caching, bulk work runs at low effort, and a cost ledger records spend.
  - Spend for this demo, per `data/snapshot/llm-ledger.json`: about **$1.15 at list prices** for everything, including prompt iterations. That covers about 160 filings enriched (~$0.33) and the research runs (~$0.82). One company's promised-vs-delivered costs about 6¢ to produce. It actually ran on Gemini's free tier, so it cost $0.
- **Cloud.**
  - Vercel hosts the app and API routes.
  - In production: an Indian-IP ingestion worker polling every 5 minutes in market hours, Postgres with pgvector, object storage for PDFs, a queue-triggered enrichment step, and Web Push for alerts.

## What I deliberately left out

- Real-time ingestion and push notifications. The Brief is computed from a snapshot; the production design is above.
- Auth and multi-user tenancy, and a database.
- Real LinkedIn data. The terms prohibit scraping, and the brief allows synthetic profiles.
- A free-form chat agent: it would be easy to build and hard to make trustworthy without evals.
- Intraday data, and a full test suite. There's a sanity script: `npm run check`.

## Where I'd take it next

1. **Live loop:** a 5-minute BSE/NSE poller, then enrichment, then rules, then push to the phone, with the same cards.
2. **Guidance ledger:** carry every promise forward quarter to quarter across the whole portfolio, so you can see which management teams over-promise.
3. **Calendar-aware diligence:** "You're meeting the Kaynes CFO tomorrow: here's his career, your two overlaps, and the three numbers to ask about."
4. **Close the loop on the network:** after a call, a voice note updates tie strength and expertise tags, so the network gets smarter with use.
5. **"Ask FINN":** a tool-using agent over the same engines, with evals on extraction accuracy before it ships.
