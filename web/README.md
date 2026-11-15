# FINN web app

Next.js 16 (App Router, Cache Components) + Tailwind 4. See the [root README](../README.md) for the product tour and [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the design.

```bash
npm install
cp .env.example .env.local   # optional: one LLM key
npm run dev
```

Scripts: `snapshot` (fetch data, no LLM) · `enrich` (cheap-model summaries) · `research` (pre-compute Pull narratives) · `check` (sanity print of the Brief and network matches).
