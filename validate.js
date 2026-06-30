#!/usr/bin/env node
/* ============================================
   sentences.json validator
   - Checks required schema fields
   - Verifies every supported language has UI strings,
     category labels, and sentence translations
   - Detects duplicate sentence IDs and orphan categories
   - Exits 0 on success, 1 on any validation error
   ============================================ */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'data', 'sentences.json');
const STRICT_ALL_LANGUAGES = process.argv.includes('--all-languages');

let errors = 0;
function fail(msg) {
  console.error('  \u2717 ' + msg);
  errors += 1;
}
function ok(msg) {
  console.log('  \u2713 ' + msg);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function main() {
  console.log('Validating ' + DATA_PATH + '\n');

  // 1. File exists and is parseable
  let data;
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    data = JSON.parse(raw);
    ok('JSON parseable');
  } catch (err) {
    fail('Cannot read/parse JSON: ' + err.message);
    process.exit(1);
  }

  // 2. Top-level required keys
  const requiredTop = ['version', 'defaultLanguage', 'supportedLanguages', 'ui', 'categories', 'sentences'];
  for (const key of requiredTop) {
    if (!(key in data)) {
      fail('Missing top-level field: ' + key);
    }
  }
  if (errors > 0) process.exit(1);
  ok('All top-level fields present');

  // 3. supportedLanguages shape
  if (!Array.isArray(data.supportedLanguages) || data.supportedLanguages.length === 0) {
    fail('supportedLanguages must be a non-empty array');
    process.exit(1);
  }
  const langCodes = new Set();
  for (const lang of data.supportedLanguages) {
    if (!isNonEmptyString(lang.code)) fail('supportedLanguage entry missing code: ' + JSON.stringify(lang));
    else if (langCodes.has(lang.code)) fail('Duplicate language code: ' + lang.code);
    else langCodes.add(lang.code);
    if (!isNonEmptyString(lang.label)) fail('supportedLanguage "' + (lang.code || '?') + '" missing label');
  }
  if (!langCodes.has(data.defaultLanguage)) {
    fail('defaultLanguage "' + data.defaultLanguage + '" is not in supportedLanguages');
  }
  if (errors > 0) process.exit(1);
  ok('supportedLanguages valid (' + langCodes.size + ' language(s))');

  // 4. ui translations present per language
  for (const lang of langCodes) {
    if (!data.ui[lang]) {
      fail('ui["' + lang + '"] is missing');
      continue;
    }
    const uiKeys = ['siteTitle', 'siteSubtitle', 'playButton', 'stopButton', 'footerNote'];
    for (const k of uiKeys) {
      if (!isNonEmptyString(data.ui[lang][k])) {
        fail('ui["' + lang + '"].' + k + ' is missing or empty');
      }
    }
  }
  if (errors > 0) process.exit(1);
  ok('ui translations present for every language');

  // 5. categories shape
  if (typeof data.categories !== 'object' || Array.isArray(data.categories)) {
    fail('categories must be a plain object');
    process.exit(1);
  }
  const categoryKeys = Object.keys(data.categories);
  if (categoryKeys.length === 0) fail('categories is empty');
  for (const key of categoryKeys) {
    for (const lang of langCodes) {
      if (!isNonEmptyString(data.categories[key][lang])) {
        fail('categories["' + key + '"]["' + lang + '"] missing');
      }
    }
  }
  if (errors > 0) process.exit(1);
  ok('categories valid (' + categoryKeys.length + ' categor(y/ies), all languages labeled)');

  // 6. sentences shape
  if (!Array.isArray(data.sentences)) {
    fail('sentences must be an array');
    process.exit(1);
  }
  if (data.sentences.length === 0) fail('sentences is empty');
  const seenIds = new Set();
  for (const s of data.sentences) {
    if (!isNonEmptyString(s.id)) {
      fail('Sentence missing id: ' + JSON.stringify(s));
      continue;
    }
    if (seenIds.has(s.id)) {
      fail('Duplicate sentence id: ' + s.id);
      continue;
    }
    seenIds.add(s.id);
    if (!isNonEmptyString(s.category)) {
      fail('Sentence "' + s.id + '" missing category');
    } else if (!categoryKeys.includes(s.category)) {
      fail('Sentence "' + s.id + '" references unknown category "' + s.category + '"');
    }
    if (!isNonEmptyString(s.ko)) {
      fail('Sentence "' + s.id + '" missing ko (Korean) text');
    }
    if (typeof s.translations !== 'object' || s.translations === null) {
      fail('Sentence "' + s.id + '" missing translations');
      continue;
    }
    // Default language must always have a translation
    const defaultTrans = s.translations[data.defaultLanguage];
    if (!defaultTrans) {
      fail('Sentence "' + s.id + '" missing translation for default language "' + data.defaultLanguage + '"');
    } else {
      if (!isNonEmptyString(defaultTrans.meaning)) {
        fail('Sentence "' + s.id + '" missing translations["' + data.defaultLanguage + '"].meaning');
      }
      if (!isNonEmptyString(defaultTrans.pronunciation)) {
        fail('Sentence "' + s.id + '" missing translations["' + data.defaultLanguage + '"].pronunciation');
      }
    }
    // Optional: ensure every supported language has a translation
    if (STRICT_ALL_LANGUAGES) {
      for (const lang of langCodes) {
        const t = s.translations[lang];
        if (!t || !isNonEmptyString(t.meaning) || !isNonEmptyString(t.pronunciation)) {
          fail('Sentence "' + s.id + '" missing/incomplete translation for "' + lang + '"');
        }
      }
    }
  }
  if (errors > 0) process.exit(1);
  ok('sentences valid (' + seenIds.size + ' sentence(s), no duplicates)');

  // 7. Categories with no sentences (warning, not error)
  const usedCategories = new Set(data.sentences.map((s) => s.category));
  for (const key of categoryKeys) {
    if (!usedCategories.has(key)) {
      console.warn('  ! category "' + key + '" has no sentences');
    }
  }

  console.log('\n\u2713 All checks passed.');
  process.exit(0);
}

main();
