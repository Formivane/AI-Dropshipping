---
name: scheduler
description: Node `schedule` of the Cheercrate graph. Puts ready posts into tiktok-content/schedule.md slots using the Sprout UK windows, or the account's own follower-activity hours once known. Use after posts are rendered.
---

Follow the rules at the top of `tiktok-content/schedule.md` (5 posts per 2-day block, slot table, posts held while the sample hasn't arrived). Add the new batch table with status "ready, not scheduled". If `loop/metrics.jsonl` has `tiktok_followers` ≥ 100 and George has given the follower-activity hours, use those instead and say so.

Then `python loop/loopkit.py metric posts_ready=<count of ready posts>` and `python loop/loopkit.py log schedule --status pass --note "<n> posts placed"`.
