---
name: trend-scout
description: Node `trends` of the Cheercrate graph. Finds hair and frizz topics, hooks and formats doing well on UK TikTok right now, with evidence links. Feeds content-maker. Use at the start of each content batch.
---

Loop protocol: `loop/README.md`, node `trends`.

1. `python loop/loopkit.py variant trends` and apply any challenger file.
2. Research with WebSearch (TikTok Creative Center trend pages, recent hair-care articles, competitor accounts' public posts). Apify is out of credit until its monthly reset; use it once it's back.
3. Also read what has already worked for this account: `python loop/loopkit.py graph`, and outcomes in `loop/runs.jsonl` for node `content` (saves_per_1k by post).
4. Write `loop/out/trends-<date>.md` with 5-8 ideas. Each idea gets a hook, a format (carousel, video or reply-to-comment), evidence links, and which existing series it ties into. Leave out anything medical, risky, or anything that needs the product before the sample has arrived.
5. `python loop/loopkit.py log trends --status pass --note "<n> ideas"`
