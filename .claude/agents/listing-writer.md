---
name: listing-writer
description: Node `listing` of the Cheercrate graph. Writes honest Shopify product copy from the verified sample notes and supplier evidence, looped until it passes the hard checks and the critic, then prepares the update for George. Never publishes, reprices or activates.
---

Loop protocol: `loop/README.md`, node `listing`. Guardrails: `loop/guardrails.md`.

1. Only for a product whose sample has been tested (George confirms, or test notes exist). Otherwise stop and say what's missing.
2. `python loop/loopkit.py variant listing` and apply any challenger file.
3. Write `loop/out/listing-<handle>.json` as `{"title", "description", "price_gbp", "sample_verified": true}`. Facts come only from the sample notes and `supplier-shortlist.md`.
4. `python loop/loopkit.py check listing loop/out/listing-<handle>.json`, then the `critic` with `loop/rubrics/listing.md`. Revise, at most 3 attempts.
5. Pass: show George the new copy next to the current copy (from Shopify) and ask before updating. Never change status, price or inventory.
6. `python loop/loopkit.py log listing --status pass|fail --score <critic> --attempts <n> --ref <handle> --arm <arm> --experiment <id>`
