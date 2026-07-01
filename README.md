# Korean Daily Phrases 🇨🇦

A lightweight static site for learning everyday Korean phrases. Each sentence card shows the Korean text, its meaning in your selected language, and a pronunciation in your language's script. Click **Listen** to hear the Korean spoken aloud via the browser's built-in Web Speech API.

## Features

- 📚 **Curated daily phrases** grouped by category (greetings, restaurant, emergency, …)
- 🔊 **Web Speech API playback** — no server, no API keys, no cost
- 🌐 **Multi-language UI** — language switcher re-renders translations, pronunciation, and UI labels instantly
- 📝 **Pronunciation in native script** — e.g. *an-nyeong-ha-se-yo* for English readers, *アンニョンハセヨ* for Japanese readers (extensible per language)
- ♿ **Accessible** — semantic HTML, ARIA labels, keyboard-friendly, respects `prefers-reduced-motion`
- 📱 **Mobile-first responsive** — works on phones, tablets, and desktops
- 💸 **100% free hosting** — pure static files, deploy anywhere

## File Structure

```
korean-daily-phrases/
├── index.html            # Page skeleton (header, main, footer, error banner)
├── styles.css            # Pastel theme, responsive layout, animations
├── app.js                # Data fetch, card rendering, language switching, TTS
├── data/
│   └── sentences.json    # All sentences + per-language translations
├── validate.js           # Schema validator for sentences.json (Node)
└── README.md             # This file
```

No build step. No npm install. No backend.

## Running Locally

The page uses `fetch()` to load `data/sentences.json`, which most browsers block when opening HTML files via `file://`. Run a local static server:

```bash
# Python 3 (built-in)
python3 -m http.server 8000

# Node (with npx, no install)
npx serve .

# PHP (if installed)
php -S localhost:8000
```

Then open <http://localhost:8000> in Chrome, Edge, or Safari for full TTS support.

## Deployment

Push the directory to any static host:

- **GitHub Pages**: push to `gh-pages` branch (or `/docs` folder on `main`)
- **Netlify**: drag-and-drop the folder at <https://app.netlify.com/drop>
- **Vercel**: `vercel deploy` from the project root
- **Cloudflare Pages**: connect the repo, build command empty, output dir `/`

No environment variables, no build commands needed.

## Browser Support

| Browser | Speech Synthesis | Notes |
|---|---|---|
| Chrome / Edge | ✅ Best | Korean voices usually pre-installed |
| Safari (macOS / iOS) | ✅ Good | Korean voice available on most systems |
| Firefox | ⚠️ Limited | Some Firefox builds lack Korean voices — UI shows a clear notice |

## Adding a New Sentence

Edit `data/sentences.json` and append to the `sentences` array:

```json
{
  "id": "restaurant-02",
  "category": "restaurant",
  "ko": "얼마예요?",
  "translations": {
    "en": {
      "meaning": "How much is it?",
      "pronunciation": "eol-ma-ye-yo"
    }
  }
}
```

Run `node validate.js` to confirm the schema is still valid.

## Adding a New Language

> *Note: The project currently ships with English only — this section documents how to extend it.*


The data structure is designed so adding a language means filling in three places — `ui`, `categories`, and each sentence's `translations`. See the example below for adding Japanese:

### 1. Update `supportedLanguages`

```json
"supportedLanguages": [
  { "code": "en", "label": "English",  "flag": "🇺🇸" },
  { "code": "ja", "label": "日本語",    "flag": "🇯🇵" }
]
```

### 2. Add a `ui.ja` block

```json
"ui": {
  "en": { /* ... existing ... */ },
  "ja": {
    "siteTitle": "韓国の日常フレーズ",
    "siteSubtitle": "韓国語のフレーズを聞いて学ぼう",
    "playButton": "聞く",
    "stopButton": "停止",
    "ttsUnsupported": "このブラウザは音声再生に対応していません。",
    "ttsNoKoreanVoice": "韓国語の音声がインストールされていません。",
    "dataLoadError": "データの読み込みに失敗しました。",
    "retryButton": "再試行",
    "footerNote": "Web Speech API を使用"
  }
}
```

### 3. Add a label per category

```json
"categories": {
  "greetings":  { "en": "Greetings", "ja": "挨拶" },
  "restaurant": { "en": "Restaurant", "ja": "レストラン" },
  "emergency":  { "en": "Emergency", "ja": "緊急" }
}
```

### 4. Add translations for every sentence

```json
{
  "id": "greetings-01",
  "category": "greetings",
  "ko": "안녕하세요",
  "translations": {
    "en": { "meaning": "Hello (polite)", "pronunciation": "an-nyeong-ha-se-yo" },
    "ja": { "meaning": "こんにちは（丁寧）", "pronunciation": "アンニョンハセヨ" }
  }
}
```

Then run `node validate.js --all-languages` to verify every language has a complete translation for every sentence.

> *Note: `categoryLabel` exists in the current data file but is not currently rendered by the UI.*

## Pronunciation Style per Language

> *Note: The project currently ships with English only — this section documents how to extend it.*


For best results, write pronunciation using the **phonetic inventory of the target language**:

| Language   | System              | Example (안녕하세요) |
|------------|---------------------|---------------------|
| English    | Revised Romanization with syllable breaks | `an-nyeong-ha-se-yo` |
| Japanese   | Katakana             | `アンニョンハセヨ` |
| Chinese    | Pinyin (no tones)    | `an nyeong ha se yo` |
| Spanish    | Spanish-friendly romanization | `an-nion-ja-se-yo` |
| French     | French-friendly romanization | `an-nionn-ha-sé-yo` |
| German     | German-friendly romanization | `an-njŏng-ha-sĕ-jo` |
| Arabic     | Arabic-friendly transliteration | `an-nyŏng-ha-sĕ-yo` |

The data structure allows any string — there's no validation enforcing a particular script.

## Validating `sentences.json`

```bash
node validate.js              # check required fields, default-language translations
node validate.js --all-languages   # also require every language to be fully translated
```

Exits with code `0` on success, `1` on any error. Useful in CI before deploying.

## Accessibility

- Semantic HTML (`<header>`, `<main>`, `<section>`, `<article>`, `<footer>`)
- Each play button has `aria-label="Listen to {korean}"`
- `prefers-reduced-motion` disables hover lift and pulse animation
- Color contrast meets WCAG AA
- Keyboard: Tab through cards, Space/Enter to play

## License

MIT — do whatever you want.

## Credits

- Korean sentences curated by the project authors
- Korean font: [Noto Sans KR](https://fonts.google.com/noto/specimen/Noto+Sans+KR) via Google Fonts
- Korean pronunciation synthesized by the user's browser via [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
