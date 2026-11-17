# Compact instructions
When compacting, keep: Shopify product, theme and draft IDs and URLs; supplier and product decisions with the reason; paths of files changed; TikTok schedule state; open errors and what was already tried. Drop raw tool output, page dumps, screenshots and superseded drafts.

# Agent loop
This repo runs as a graph of agents with self-checking loops and a weekly self-improvement step. See `loop/README.md`, `loop/graph.json` and `loop/guardrails.md`. Run it with the `run-graph` skill; improve it with `self-improve`. Agents never spend money, post to TikTok, or publish, reprice or activate products.
