"""Renders TikTok carousel posts (PNG slides) and slideshow videos (MP4, no audio).

Run:  .venv\Scripts\python make_posts.py   (a ready-made environment lives in .venv)
Edit POSTS below to change wording; re-run to regenerate.
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
# Keep text out of TikTok's UI: caption/buttons at the bottom, icon rail on the right.
SAFE_L, SAFE_R, SAFE_T, SAFE_B = 90, 930, 220, 1460

INK = (43, 30, 26)
CREAM = (246, 239, 231)
BLUSH = (242, 215, 207)
ACCENT = (200, 85, 61)
SAGE = (143, 169, 139)
MUTED = (120, 100, 92)
WHITE = (255, 255, 255)

FONTS = "C:/Windows/Fonts/"
def font(name, size):
    return ImageFont.truetype(FONTS + name, size)

SERIF_B = "georgiab.ttf"
SANS = "segoeui.ttf"
SANS_SB = "seguisb.ttf"
SANS_B = "segoeuib.ttf"
SANS_BL = "seguibl.ttf"


def wrap(draw, text, f, width):
    lines = []
    for para in text.split("\n"):
        words, line = para.split(" "), ""
        for w in words:
            test = (line + " " + w).strip()
            if draw.textlength(test, font=f) <= width:
                line = test
            else:
                if line:
                    lines.append(line)
                line = w
        lines.append(line)
    return lines


def text_block(draw, x, y, text, f, fill, width, spacing=1.25):
    text = text.replace("'", "’")  # typographic apostrophes
    lines = wrap(draw, text, f, width)
    lh = int(f.size * spacing)
    for ln in lines:
        draw.text((x, y), ln, font=f, fill=fill)
        y += lh
    return y


def base(bg=CREAM):
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    # soft decorative shapes
    d.ellipse((620, -260, 1400, 520), fill=BLUSH if bg == CREAM else (bg[0] - 12, bg[1] - 12, bg[2] - 12))
    d.ellipse((-300, 1500, 360, 2160), fill=(236, 226, 214) if bg == CREAM else (bg[0] - 8, bg[1] - 8, bg[2] - 8))
    return img, d


def page_dots(d, i, n, color=INK):
    if n <= 1:
        return
    total = n * 26
    x = (W - total) // 2
    for k in range(n):
        r = 7 if k == i else 5
        c = color if k == i else (190, 175, 165)
        cx = x + k * 26 + 13
        d.ellipse((cx - r, 160 - r, cx + r, 160 + r), fill=c)


def cover(s, i, n):
    img, d = base()
    page_dots(d, i, n)
    y = 470
    kf = font(SANS_B, 40)
    d.rounded_rectangle((SAFE_L, y, SAFE_L + d.textlength(s["kicker"], font=kf) + 56, y + 70), 35, fill=ACCENT)
    d.text((SAFE_L + 28, y + 10), s["kicker"], font=kf, fill=WHITE)
    y += 120
    y = text_block(d, SAFE_L, y, s["title"], font(SERIF_B, 96), INK, SAFE_R - SAFE_L, 1.16)
    if s.get("sub"):
        y = text_block(d, SAFE_L, y + 30, s["sub"], font(SANS, 46), MUTED, SAFE_R - SAFE_L)
    d.text((SAFE_L, SAFE_B - 40), "swipe  \u2192", font=font(SANS_SB, 44), fill=ACCENT)
    return img


def point(s, i, n):
    img, d = base()
    page_dots(d, i, n)
    y = 430
    if s.get("num") is not None:
        d.ellipse((SAFE_L, y, SAFE_L + 150, y + 150), fill=ACCENT)
        nf = font(SANS_BL, 84)
        t = str(s["num"])
        d.text((SAFE_L + 75 - d.textlength(t, font=nf) / 2, y + 18), t, font=nf, fill=WHITE)
        y += 200
    elif s.get("label"):
        d.text((SAFE_L, y), s["label"].upper(), font=font(SANS_B, 40), fill=ACCENT)
        y += 80
    y = text_block(d, SAFE_L, y, s["title"], font(SERIF_B, 80), INK, SAFE_R - SAFE_L, 1.15)
    d.line((SAFE_L, y + 30, SAFE_L + 120, y + 30), fill=ACCENT, width=6)
    text_block(d, SAFE_L, y + 80, s["body"], font(SANS, 50), INK, SAFE_R - SAFE_L, 1.38)
    return img


def table(s, i, n):
    img, d = base()
    page_dots(d, i, n)
    y = 360
    y = text_block(d, SAFE_L, y, s["title"], font(SERIF_B, 74), INK, SAFE_R - SAFE_L, 1.15) + 40
    for label, value, note in s["rows"]:
        d.rounded_rectangle((SAFE_L, y, SAFE_R, y + 250), 28, fill=WHITE)
        d.rectangle((SAFE_L, y, SAFE_L + 14, y + 250), fill=ACCENT)
        text_block(d, SAFE_L + 50, y + 30, label, font(SANS_B, 44), INK, SAFE_R - SAFE_L - 90)
        d.text((SAFE_L + 50, y + 100), value, font=font(SANS_BL, 64), fill=ACCENT)
        d.text((SAFE_L + 50, y + 185), note, font=font(SANS, 34), fill=MUTED)
        y += 285
    if s.get("foot"):
        text_block(d, SAFE_L, y + 10, s["foot"], font(SANS, 36), MUTED, SAFE_R - SAFE_L)
    return img


def checklist(s, i, n):
    img, d = base()
    page_dots(d, i, n)
    y = 400
    if s.get("label"):
        d.text((SAFE_L, y), s["label"].upper(), font=font(SANS_B, 40), fill=ACCENT)
        y += 80
    y = text_block(d, SAFE_L, y, s["title"], font(SERIF_B, 76), INK, SAFE_R - SAFE_L, 1.15) + 50
    bf = font(SANS, 48)
    for item in s["items"]:
        d.ellipse((SAFE_L, y + 14, SAFE_L + 34, y + 48), fill=SAGE)
        d.line((SAFE_L + 8, y + 31, SAFE_L + 15, y + 39), fill=WHITE, width=5)
        d.line((SAFE_L + 15, y + 39, SAFE_L + 27, y + 23), fill=WHITE, width=5)
        y = text_block(d, SAFE_L + 64, y, item, bf, INK, SAFE_R - SAFE_L - 64, 1.32) + 34
    return img


def versus(s, i, n):
    img, d = base()
    page_dots(d, i, n)
    y = 400
    y = text_block(d, SAFE_L, y, s["title"], font(SERIF_B, 76), INK, SAFE_R - SAFE_L, 1.15) + 50
    qf = font(SANS, 46)
    for arrow_from, arrow_to in s["pairs"]:
        n_lines = len(wrap(d, arrow_from, qf, SAFE_R - SAFE_L - 88))
        box_h = 34 + n_lines * 58 + 24 + 90 + 30
        d.rounded_rectangle((SAFE_L, y, SAFE_R, y + box_h), 28, fill=WHITE)
        ty = text_block(d, SAFE_L + 44, y + 34, arrow_from, qf, MUTED, SAFE_R - SAFE_L - 88)
        d.text((SAFE_L + 44, ty + 20), "\u2192 " + arrow_to, font=font(SANS_BL, 66), fill=ACCENT)
        y += box_h + 40
    return img


def closing(s, i, n):
    img, d = base(INK)
    page_dots(d, i, n, color=CREAM)
    y = 560
    y = text_block(d, SAFE_L, y, s["title"], font(SERIF_B, 92), CREAM, SAFE_R - SAFE_L, 1.15)
    y = text_block(d, SAFE_L, y + 40, s.get("sub", ""), font(SANS, 48), (220, 200, 190), SAFE_R - SAFE_L)
    btn = s.get("cta", "Follow for daily frizz fixes")
    bf = font(SANS_B, 46)
    bw = d.textlength(btn, font=bf) + 90
    d.rounded_rectangle((SAFE_L, y + 70, SAFE_L + bw, y + 170), 50, fill=ACCENT)
    d.text((SAFE_L + 45, y + 92), btn, font=bf, fill=WHITE)
    return img


def myth(s, i, n):
    img, d = base()
    page_dots(d, i, n)
    y = 400
    tw = SAFE_R - SAFE_L - 88
    # Myth card
    mf = font(SERIF_B, 64)
    m_lines = len(wrap(d, "“" + s["myth"] + "”", mf, tw))
    mh = 40 + 60 + m_lines * 76 + 40
    d.rounded_rectangle((SAFE_L, y, SAFE_R, y + mh), 28, fill=(236, 226, 214))
    d.text((SAFE_L + 44, y + 36), "MYTH", font=font(SANS_BL, 40), fill=ACCENT)
    text_block(d, SAFE_L + 44, y + 100, "“" + s["myth"] + "”", mf, MUTED, tw, 1.18)
    y += mh + 40
    # Fact card
    ff = font(SANS, 50)
    f_lines = len(wrap(d, s["fact"], ff, tw))
    fh = 40 + 60 + f_lines * 69 + 40
    d.rounded_rectangle((SAFE_L, y, SAFE_R, y + fh), 28, fill=WHITE)
    d.rectangle((SAFE_L, y, SAFE_L + 14, y + fh), fill=SAGE)
    d.text((SAFE_L + 44, y + 36), "FACT", font=font(SANS_BL, 40), fill=SAGE)
    text_block(d, SAFE_L + 44, y + 100, s["fact"], ff, INK, tw, 1.38)
    return img


RENDER = {"cover": cover, "point": point, "table": table, "checklist": checklist, "versus": versus, "closing": closing, "myth": myth}

POSTS = [
    {
        "slug": "01-winter-frizz",
        "slides": [
            {"t": "cover", "kicker": "WINTER HAIR", "title": "Why your hair frizzes MORE in winter", "sub": "+ 5 fixes that actually help"},
            {"t": "point", "label": "The cause", "title": "Your hair is thirsty", "body": "Cold air outside and dry heating inside pull moisture out of your hair. Dry strands get a raised, rough outer layer, so they look puffy."},
            {"t": "point", "label": "Plus", "title": "Static", "body": "Hats, scarves and dry air build up static, so strands push away from each other."},
            {"t": "point", "num": 1, "title": "Wash a little less", "body": "Shampoo strips your natural oils. Try every 2\u20133 days if your hair allows it."},
            {"t": "point", "num": 2, "title": "Turn the shower down", "body": "Very hot water dries hair out. Lukewarm is kinder to it."},
            {"t": "point", "num": 3, "title": "Blot, don't rub", "body": "Rubbing with a towel roughs hair up. Squeeze it dry with a microfiber towel or an old T-shirt."},
            {"t": "point", "num": 4, "title": "Seal your ends", "body": "A leave-in conditioner or one drop of oil on damp ends helps lock moisture in."},
            {"t": "point", "num": 5, "title": "Sleep on satin", "body": "Satin or silk pillowcases create less friction than cotton, so you wake up smoother."},
            {"t": "closing", "title": "Save this for your next bad hair day", "sub": "New frizz fix every day."},
        ],
    },
    {
        "slug": "02-heat-by-hair-type",
        "slides": [
            {"t": "cover", "kicker": "HEAT STYLING", "title": "Stop using max heat on your hair", "sub": "Here's the temperature your hair type actually needs"},
            {"t": "table", "title": "Your heat guide", "rows": [
                ("Fine, thin or colour-treated", "150\u2013175\u00b0C", "300\u2013350\u00b0F"),
                ("Normal / medium", "175\u2013200\u00b0C", "350\u2013390\u00b0F"),
                ("Thick, coarse or very curly", "200\u2013220\u00b0C", "390\u2013430\u00b0F"),
            ], "foot": "General guide. Your tool's manual comes first."},
            {"t": "checklist", "label": "Always", "title": "3 rules for every hair type", "items": [
                "Use a heat protectant, every single time",
                "Start low. Only go up if it isn't working",
                "One slow pass beats five fast ones",
            ]},
            {"t": "closing", "title": "Save this before you style tomorrow", "sub": "Your future hair will thank you."},
        ],
    },
    {
        "slug": "03-heat-mistakes",
        "slides": [
            {"t": "cover", "kicker": "STOP DOING THIS", "title": "5 heat styling mistakes that are frying your hair"},
            {"t": "point", "num": 1, "title": "Styling damp hair", "body": "Water trapped in the strand turns to steam under heat and can damage it from the inside. Dry it fully first."},
            {"t": "point", "num": 2, "title": "Skipping heat protectant", "body": "It's the cheapest insurance your hair will ever get."},
            {"t": "point", "num": 3, "title": "Max heat on fine hair", "body": "Fine hair needs far less heat than thick hair. More heat \u2260 better results."},
            {"t": "point", "num": 4, "title": "Going over the same bit again and again", "body": "Every extra pass is extra heat. Use smaller sections and go slower instead."},
            {"t": "point", "num": 5, "title": "Never cleaning your tool", "body": "Product build-up on plates and bristles gets baked onto your hair. Wipe it down when it's cool."},
            {"t": "closing", "title": "Which one are you guilty of?", "sub": "Be honest in the comments.", "cta": "Follow for more hair fixes"},
        ],
    },
    {
        "slug": "04-flat-iron-vs-brush",
        "slides": [
            {"t": "cover", "kicker": "WHICH ONE?", "title": "Flat iron or straightening brush?", "sub": "Which one is actually right for you"},
            {"t": "checklist", "label": "Flat iron", "title": "Best for sleek, glass-straight hair", "items": [
                "Precise around roots and edges",
                "Sleekest possible finish",
                "Trade-off: can look flat and takes longer on thick hair",
            ]},
            {"t": "checklist", "label": "Heated straightening brush", "title": "Best for quick, natural-looking smooth", "items": [
                "Easy for beginners: you just brush",
                "Keeps more volume",
                "Trade-off: not as sleek, less precise at the roots",
            ]},
            {"t": "versus", "title": "The quick answer", "pairs": [
                ("Want glass-sleek, special-occasion hair?", "Flat iron"),
                ("Want fast, everyday smooth hair?", "Heated brush"),
            ]},
            {"t": "closing", "title": "Team flat iron or team brush?", "sub": "Tell me in the comments.", "cta": "Follow for honest hair-tool tips"},
        ],
    },
    {
        "slug": "05-morning-routine",
        "slides": [
            {"t": "cover", "kicker": "10 MINUTES", "title": "The frizz-free morning routine", "sub": "for people who are always running late"},
            {"t": "point", "num": 1, "title": "Start with fully dry hair", "body": "Heat on damp hair = damage and more frizz later."},
            {"t": "point", "num": 2, "title": "Detangle gently", "body": "Wide-tooth comb, start at the ends and work up."},
            {"t": "point", "num": 3, "title": "Heat protectant", "body": "Mist it all over, then comb it through."},
            {"t": "point", "num": 4, "title": "Work in 4 sections", "body": "Smaller sections = fewer passes = less heat."},
            {"t": "point", "num": 5, "title": "Slow, root to tip", "body": "One slow, steady pass per section."},
            {"t": "point", "num": 6, "title": "Let it cool", "body": "Hands off for a minute. Hair holds its shape better once it's cooled down."},
            {"t": "point", "num": 7, "title": "One drop of oil", "body": "On the ends only, to tame flyaways."},
            {"t": "closing", "title": "Save this for tomorrow morning", "sub": "Done in 10 minutes."},
        ],
    },
    {
        "slug": "06-heat-damage-signs",
        "slides": [
            {"t": "cover", "kicker": "HAIR CHECK", "title": "5 signs your hair is heat damaged", "sub": "and what to do about it"},
            {"t": "point", "num": 1, "title": "Split ends that keep coming back", "body": "Even soon after a trim."},
            {"t": "point", "num": 2, "title": "It feels rough or straw-like", "body": "Especially at the ends."},
            {"t": "point", "num": 3, "title": "It snaps when you brush it", "body": "Little broken pieces on your brush or clothes."},
            {"t": "point", "num": 4, "title": "It won't hold a style", "body": "Curls drop and straight hair puffs up again fast."},
            {"t": "point", "num": 5, "title": "It looks dull", "body": "Even right after washing."},
            {"t": "checklist", "label": "What helps", "title": "Give it a reset", "items": [
                "Trim off the damaged ends",
                "Lower your heat setting",
                "Deep conditioner once a week",
                "Plan a few heat-free days",
            ]},
            {"t": "closing", "title": "How many did you get?", "sub": "Comment your number.", "cta": "Follow for daily frizz fixes"},
        ],
    },
    {
        "slug": "07-gifts-running-late",
        "slides": [
            {"t": "cover", "kicker": "GIFT GUIDE", "title": "Gifts for the girl who's always running late"},
            {"t": "point", "num": 1, "title": "Satin pillowcase", "body": "Less friction overnight = less frizz in the morning."},
            {"t": "point", "num": 2, "title": "Claw clips", "body": "The 5-second hairstyle. You can never have too many."},
            {"t": "point", "num": 3, "title": "Heated straightening brush", "body": "Smooths while you brush. Much quicker than a flat iron on thick hair."},
            {"t": "point", "num": 4, "title": "Microfiber hair towel", "body": "Dries faster and roughs hair up less than a normal towel."},
            {"t": "point", "num": 5, "title": "Travel-size hair oil", "body": "Lives in her bag for emergency flyaways."},
            {"t": "closing", "title": "Send this to someone who needs a hint", "sub": "More gift guides coming.", "cta": "Follow for more"},
        ],
    },
    # ---------------- Batch 2 ----------------
    {
        "slug": "08-frizz-myths",
        "slides": [
            {"t": "cover", "kicker": "MYTH vs FACT", "title": "5 frizz myths you probably still believe"},
            {"t": "myth", "myth": "Frizzy hair means dirty hair", "fact": "Frizz usually means your hair is dry or its outer layer is roughed up. Washing more can actually make it worse."},
            {"t": "myth", "myth": "Brush 100 strokes a night for shiny hair", "fact": "Over-brushing adds friction and breakage. Brush gently, and only as much as you need to."},
            {"t": "myth", "myth": "Higher heat keeps hair straighter for longer", "fact": "Too much heat damages hair, and damaged hair frizzes more. Use the lowest setting that works."},
            {"t": "myth", "myth": "Heat protectant is a gimmick", "fact": "It doesn't make hair heat-proof, but it helps reduce damage. Use it every time you use heat."},
            {"t": "myth", "myth": "Everyone should wash their hair daily", "fact": "Lots of people don't need to. Daily shampoo can strip the oils that keep frizz down. Find what your scalp needs."},
            {"t": "closing", "title": "Which one did you believe?", "sub": "No judgement. Tell me below.", "cta": "Follow for daily frizz fixes"},
        ],
    },
    {
        "slug": "09-sleep-less-frizz",
        "slides": [
            {"t": "cover", "kicker": "NIGHT ROUTINE", "title": "Wake up with less frizz", "sub": "5 things to do before bed"},
            {"t": "point", "num": 1, "title": "Never sleep on wet hair", "body": "Wet hair is at its weakest, and a night of rubbing on the pillow is a recipe for frizz and breakage."},
            {"t": "point", "num": 2, "title": "Switch to satin or silk", "body": "A satin pillowcase or bonnet means less friction than cotton."},
            {"t": "point", "num": 3, "title": "Tie it up loosely", "body": "A loose braid, or a high loose bun for curls. No tight hair ties."},
            {"t": "point", "num": 4, "title": "Use a scrunchie", "body": "Satin or fabric scrunchies don't snag or leave dents like thin elastics."},
            {"t": "point", "num": 5, "title": "A tiny bit on the ends", "body": "A small amount of leave-in or oil on dry ends before bed."},
            {"t": "closing", "title": "Save this and try it tonight", "sub": "Tell me how you wake up tomorrow."},
        ],
    },
    {
        "slug": "10-hair-type-test",
        "slides": [
            {"t": "cover", "kicker": "30-SECOND TEST", "title": "Is your hair fine, medium or coarse?", "sub": "It decides how much heat you should use"},
            {"t": "point", "label": "The test", "title": "Take one single strand", "body": "Pull out one shed hair and roll it between your thumb and finger."},
            {"t": "table", "title": "What did you feel?", "rows": [
                ("Can barely feel it", "Fine", "Lowest heat. Lightweight products."),
                ("Can feel it, but it's smooth", "Medium", "Medium heat works for most."),
                ("Feels thick, almost wiry", "Coarse", "Can take more heat. Richer products."),
            ], "foot": "Check our heat guide post for the exact temperatures."},
            {"t": "closing", "title": "Comment your hair type", "sub": "I'll make posts for each one.", "cta": "Follow so you don't miss it"},
        ],
    },
    {
        "slug": "11-how-to-use-straightening-brush",
        "slides": [
            {"t": "cover", "kicker": "BEGINNER GUIDE", "title": "How to use a straightening brush properly", "sub": "Most people skip step 4"},
            {"t": "point", "num": 1, "title": "Start with dry hair", "body": "Fully dry, not damp. Detangle it first so the brush glides."},
            {"t": "point", "num": 2, "title": "Heat protectant", "body": "Mist it all over and comb it through."},
            {"t": "point", "num": 3, "title": "Start on a low setting", "body": "You can always go up. You can't undo too much heat."},
            {"t": "point", "num": 4, "title": "Small sections", "body": "No wider than the brush. Big sections = more passes = more heat."},
            {"t": "point", "num": 5, "title": "Slow, root to tip", "body": "Brush slowly with gentle tension. Keep the hot base away from your scalp."},
            {"t": "point", "num": 6, "title": "Let it cool, then oil", "body": "Wait a minute before touching it, then one drop of oil on the ends."},
            {"t": "closing", "title": "Save this before your first try", "sub": "Real demo coming soon.", "cta": "Follow so you see it"},
        ],
    },
    {
        "slug": "12-habits-causing-frizz",
        "slides": [
            {"t": "cover", "kicker": "STOP DOING THIS", "title": "6 everyday habits secretly causing your frizz"},
            {"t": "point", "num": 1, "title": "Rubbing with a towel", "body": "Squeeze and blot instead."},
            {"t": "point", "num": 2, "title": "Brushing wet hair roughly", "body": "Wet hair is more fragile. Use a wide-tooth comb and start at the ends."},
            {"t": "point", "num": 3, "title": "Really hot showers", "body": "They dry hair out. Lukewarm is kinder."},
            {"t": "point", "num": 4, "title": "Touching your hair all day", "body": "Every touch adds friction. Hands off!"},
            {"t": "point", "num": 5, "title": "Cotton pillowcase", "body": "More friction overnight. Satin is smoother."},
            {"t": "point", "num": 6, "title": "Putting off trims", "body": "Split ends travel up the strand and look frizzy."},
            {"t": "closing", "title": "How many do you do?", "sub": "Be honest. Comment your number.", "cta": "Follow for daily frizz fixes"},
        ],
    },
    {
        "slug": "13-heat-protectant-101",
        "slides": [
            {"t": "cover", "kicker": "HEAT PROTECTANT 101", "title": "You're probably using heat protectant wrong"},
            {"t": "point", "label": "What it does", "title": "A buffer, not a shield", "body": "It helps reduce heat damage. It doesn't make your hair heat-proof, so you still need sensible temperatures."},
            {"t": "point", "label": "When", "title": "Before ANY heat", "body": "Before blow-drying and before straightening. Check the label: some go on damp hair, some on dry."},
            {"t": "point", "label": "How much", "title": "Mist, don't drench", "body": "An even, light layer all over, then comb it through so every strand gets some."},
            {"t": "versus", "title": "Spray or cream?", "pairs": [
                ("Fine or thin hair?", "Spray"),
                ("Thick, coarse or curly hair?", "Cream"),
            ]},
            {"t": "closing", "title": "Save this for your next styling day", "sub": "Your ends will thank you."},
        ],
    },
    {
        "slug": "14-stocking-fillers",
        "slides": [
            {"t": "cover", "kicker": "GIFT GUIDE", "title": "Stocking fillers for hair lovers", "sub": "All budget-friendly"},
            {"t": "point", "num": 1, "title": "Satin scrunchies", "body": "Gentle on hair, and look nice on the wrist too."},
            {"t": "point", "num": 2, "title": "Satin sleep bonnet", "body": "Less frizz overnight, especially for curls."},
            {"t": "point", "num": 3, "title": "Travel-size hair oil", "body": "For flyaways on the go."},
            {"t": "point", "num": 4, "title": "Claw clip set", "body": "Everyone needs more claw clips. It's the law."},
            {"t": "point", "num": 5, "title": "Mini heat protectant", "body": "The gift that says “I care about your ends”."},
            {"t": "closing", "title": "Tag who you're buying for", "sub": "Or send it as a hint.", "cta": "Follow for more gift ideas"},
        ],
    },
    # ---------------- Batch 3 (scheduled task) ----------------
    {
        "slug": "15-blow-dry-without-frizz",
        "slides": [
            {"t": "cover", "kicker": "BLOW-DRY BASICS", "title": "How to blow-dry without the frizz", "sub": "Most people point the dryer the wrong way"},
            {"t": "point", "num": 1, "title": "Blot out the water first", "body": "Squeeze gently with a microfiber towel. Less water means less time under heat."},
            {"t": "point", "num": 2, "title": "Protectant on damp hair", "body": "Pick one made for blow-drying and comb it through before you start."},
            {"t": "point", "num": 3, "title": "Rough-dry on medium", "body": "Dry to about 80% with your fingers on a medium setting. Save the brush for the end."},
            {"t": "point", "num": 4, "title": "Point the nozzle down", "body": "Aim the air from root to tip. Blowing upwards roughs up the outer layer of the hair."},
            {"t": "point", "num": 5, "title": "Use the flat nozzle", "body": "It sends the air where you want it, instead of blasting hair in every direction."},
            {"t": "point", "num": 6, "title": "Finish with the cool shot", "body": "A blast of cool air at the end helps set your style."},
            {"t": "closing", "title": "Which step do you skip?", "sub": "Save this for wash day.", "cta": "Follow for daily frizz fixes"},
        ],
    },
    {
        "slug": "16-rainy-day-frizz",
        "slides": [
            {"t": "cover", "kicker": "UK WEATHER", "title": "Rainy day frizz: what actually helps", "sub": "Because it's always raining"},
            {"t": "myth", "myth": "The right product makes hair rain-proof", "fact": "Nothing blocks water completely. Anti-humidity sprays and serums can slow frizz down, not stop it."},
            {"t": "point", "label": "Before you leave", "title": "Smooth and seal", "body": "A little serum or oil on the lengths helps keep damp air from puffing up your hair."},
            {"t": "versus", "title": "Quick swaps for wet days", "pairs": [
                ("Wearing it down in drizzle?", "Try a braid"),
                ("Cotton hat over your hair?", "Satin-lined hat"),
            ]},
            {"t": "checklist", "label": "In your bag", "title": "The rainy day kit", "items": [
                "A claw clip or fabric scrunchie",
                "A mini bottle of hair oil or serum",
                "A compact umbrella (obviously)",
            ]},
            {"t": "point", "label": "Caught out?", "title": "Hands off while it's wet", "body": "Let it dry first, then smooth it down with a drop of oil on your palms."},
            {"t": "closing", "title": "Save this for the next downpour", "sub": "So, tomorrow then.", "cta": "Follow for daily frizz fixes"},
        ],
    },
]


def make_video(frames, path, fps=30, hold=3.0, cover_hold=2.4, fade=0.35):
    import imageio_ffmpeg
    w = imageio_ffmpeg.write_frames(path, (W, H), fps=fps, codec="libx264", pix_fmt_out="yuv420p",
                                    quality=8, macro_block_size=8, ffmpeg_log_level="error")
    w.send(None)
    nf = int(fade * fps)
    for k, img in enumerate(frames):
        h = cover_hold if k == 0 else hold
        for _ in range(int(h * fps) - nf):
            w.send(img.tobytes())
        if k + 1 < len(frames):
            nxt = frames[k + 1]
            for j in range(nf):
                w.send(Image.blend(img, nxt, (j + 1) / (nf + 1)).tobytes())
    w.close()


if __name__ == "__main__":
    root = os.path.dirname(os.path.abspath(__file__))
    for p in POSTS:
        folder = os.path.join(root, p["slug"])
        os.makedirs(folder, exist_ok=True)
        n = len(p["slides"])
        imgs = []
        for i, s in enumerate(p["slides"]):
            img = RENDER[s["t"]](s, i, n)
            img.save(os.path.join(folder, f"slide-{i + 1:02d}.png"), optimize=True)
            imgs.append(img)
        make_video(imgs, os.path.join(folder, f"{p['slug']}.mp4"))
        print("done", p["slug"], n, "slides")
