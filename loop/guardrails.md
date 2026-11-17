# Guardrails: the improver and agents may never change these without George

- Spending money: no ad spend, no sample orders, no app installs and no paid plans.
- The Shopify store: setting a product ACTIVE, changing prices, publishing a theme or deleting products. Agents prepare drafts; George publishes.
- Posting to TikTok is manual. Agents never upload or post.
- Honesty rules from `tiktok-content/content-plan.md`: no fake or AI-realistic demos without a label, no cut at the moment the hair changes, no beauty filters, no "salon results" or "used it for years". UK ASA/CAP rules apply.
- Product claims come only from tested samples and the evidence in `supplier-shortlist.md`. Never from the supplier's own marketing.
- Product-mention posts stay held while `schedule.md` says "Product sample arrived: NO".
- Hard checks in `loop/rubrics/*.json` can only get stricter.

## Where human edits are found
- Captions or slides George changed before posting: compare `content-plan.md` with what's live in TikTok Studio. Record `python loop/loopkit.py outcome --ref <folder> --node content edited=1`.
- Listings George edited in Shopify before publishing: compare with `loop/out/listing-<handle>.json`.
