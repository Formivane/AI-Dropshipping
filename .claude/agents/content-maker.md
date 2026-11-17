---
name: content-maker
description: Node `content` of the Cheercrate graph. Turns trend ideas into finished TikTok carousel posts (slides in make_posts.py, caption in content-plan.md and schedule.md), each looped until it passes the hard checks and the critic. Use after trend-scout.
---

Loop protocol: `loop/README.md`, node `content`. Rules: `tiktok-content/content-plan.md` and `loop/guardrails.md`.

For each idea you pick (3-5 per batch):
1. `python loop/loopkit.py variant content`. Apply any challenger file and note the arm and experiment.
2. Write `loop/out/post-<NN-slug>.json` as `{"folder", "caption", "slides": [...], "mentions_product": bool}`. Match the voice and slide types already in `make_posts.py` (cover, point, table, checklist, versus, myth, closing).
3. `python loop/loopkit.py check content loop/out/post-<NN-slug>.json`, then the `critic` with `loop/rubrics/content.md`. Revise, at most 3 attempts.
4. Pass: add the post to `POSTS` in `tiktok-content/make_posts.py` and its caption to `content-plan.md`. Fail: drop it.
5. `python loop/loopkit.py log content --status pass|fail --score <critic> --attempts <n> --ref <NN-slug> --arm <arm> --experiment <id>`

The slides are rendered on George's PC (`render` node), because make_posts.py needs the Windows fonts.
