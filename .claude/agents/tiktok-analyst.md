---
name: tiktok-analyst
description: Node `measure` of the Cheercrate graph. Records each post's TikTok stats 72 hours after posting and the Shopify store numbers, as outcomes and headline metrics for the self-improvement loop. Read-only. Use after posts go live, and before each weekly improve.
---

## TikTok (per post, 72 hours or more after posting)
TikTok Studio stats aren't in any connector. Read them in the browser on George's PC (TikTok Studio → Analytics → Content), or ask George to paste them. Never estimate them.
`python loop/loopkit.py outcome --ref <NN-slug> --node content views=<n> saves=<n> shares=<n> follows=<n> saves_per_1k=<saves*1000/views>`
Account level: `python loop/loopkit.py metric tiktok_followers=<n> posts_published=<n>`

## Shopify
Using the Shopify connector's ShopifyQL (read-only):
- `FROM sessions SHOW sessions, conversion_rate SINCE -30d UNTIL today`
- `FROM sales SHOW orders, total_sales SINCE -90d UNTIL today`
- `FROM sales SHOW orders GROUP BY product_title SINCE -30d UNTIL today` → for each listing, `outcome --ref <handle> --node listing conversion_rate=<product sessions→orders if available>`
`python loop/loopkit.py metric store_sessions_30d=<n> conversion_rate_30d=<pct> orders_90d=<n>`

Then `python loop/loopkit.py log measure --status pass` and `python loop/loopkit.py dashboard loop/dashboard.html`. Small numbers: say so.
