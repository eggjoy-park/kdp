# Card Illustrations

This directory holds the scene illustrations shown on each sentence card.

## File naming

Use the sentence's `id` as the filename:

| Sentence id       | Expected file              |
|-------------------|----------------------------|
| `greetings-01`    | `images/greetings-01.svg`  |
| `greetings-02`    | `images/greetings-02.svg`  |
| `greetings-03`    | `images/greetings-03.svg`  |
| `restaurant-01`   | `images/restaurant-01.svg` |
| `emergency-01`    | `images/emergency-01.svg`  |

A missing file (or one that fails to load) gracefully falls back to the
category emoji in a soft pastel tile — so the layout never breaks.

## Recommended format

- **Format**: SVG (preferred — vector, tiny, crisp at any size, supports CSS theming)
- **Aspect ratio**: 1:1 square (the card crops to `object-fit: cover`)
- **Canvas**: design within a 240×240 viewBox so the artwork stays centered
  when scaled down to the 96×96 desktop tile or 100% width on mobile
- **Style**: keep the palette warm and friendly, matching the site's pastel
  theme (`#fffbf5` page, `#fff0e0` page-2, `#f97316` coral accent)
- **No external dependencies**: prefer inline SVG so illustrations work
  offline and don't require network access

PNG / JPG / WebP / GIF are also accepted; the validator allows
`.svg .png .jpg .jpeg .webp .gif`.

## Adding a new illustration

1. Drop the file into this directory using the naming convention above.
2. Optionally add or update the `imageAlt` field in `data/sentences.json`
   for accessibility. A descriptive alt (e.g. *"Two people greeting each
   other with a polite bow"*) is preferred; leave it empty only if the
   image is purely decorative.
3. Run `node validate.js` to confirm the path is well-formed.

That's it — the next page load will pick it up automatically.
