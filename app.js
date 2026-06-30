/* ============================================
   Korean Daily Phrases - App Logic
   - Loads sentences.json
   - Renders cards grouped by category
   - Handles language switching with localStorage persistence
   - TTS via Web Speech API (ko-KR)
   - Error banner for fetch failures
   ============================================ */

(function () {
  'use strict';

  const DATA_URL = 'data/sentences.json';
  const STORAGE_KEY = 'kimchi-language';

  /** @type {{data: any, currentLanguage: string, sentencesByCategory: Map<string, any[]>}} */
  const state = {
    data: null,
    currentLanguage: 'en',
    sentencesByCategory: new Map(),
  };

  const els = {
    container: null,
    languageSelect: null,
    errorBanner: null,
    errorMessage: null,
    retryButton: null,
    siteTitle: null,
    siteSubtitle: null,
    footerNote: null,
  };

  // ============================================
  // TTS Module
  // ============================================
  const tts = {
    supported: false,
    koreanVoice: null,
    voicesReady: false,
    currentUtterance: null,
    currentButton: null,

    init() {
      this.supported =
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof SpeechSynthesisUtterance !== 'undefined';

      if (!this.supported) {
        this.refreshButtonStates();
        return;
      }

      const findKorean = () => {
        try {
          const voices = window.speechSynthesis.getVoices();
          this.koreanVoice =
            voices.find((v) => v.lang && v.lang.toLowerCase() === 'ko-kr') ||
            voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ko')) ||
            null;
          this.voicesReady = true;
          this.refreshButtonStates();
        } catch (err) {
          console.warn('Voice enumeration failed:', err);
          this.voicesReady = true;
        }
      };

      findKorean();

      if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = findKorean;
      }
    },

    /** Update every play button's disabled/title state based on current TTS capability. */
    refreshButtonStates() {
      if (!state.data) return;
      const ui = getUi();
      if (!ui) return;
      const buttons = document.querySelectorAll('.play-button');
      buttons.forEach((btn) => {
        if (btn.style.display === 'none') return; // hidden due to empty ko
        if (!this.supported) {
          btn.disabled = true;
          btn.title = ui.ttsUnsupported;
          return;
        }
        if (this.voicesReady && !this.koreanVoice) {
          btn.disabled = true;
          btn.title = ui.ttsNoKoreanVoice;
          return;
        }
        btn.disabled = false;
        btn.title = '';
      });
    },

    handleClick(button, sentence) {
      if (!this.supported) return;
      if (!sentence || !sentence.ko || !sentence.ko.trim()) return;

      // Same button while speaking → stop
      if (this.currentButton === button && window.speechSynthesis.speaking) {
        this.stop();
        return;
      }

      // Different button (or previous utterance finished but button still highlighted) → reset and start new
      if (this.currentButton && this.currentButton !== button) {
        this.resetButton(this.currentButton);
        try {
          window.speechSynthesis.cancel();
        } catch (_) {}
      }

      const utterance = new SpeechSynthesisUtterance(sentence.ko);
      utterance.lang = 'ko-KR';
      if (this.koreanVoice) utterance.voice = this.koreanVoice;
      utterance.rate = 0.9;

      const finalize = () => {
        if (this.currentButton === button) {
          this.resetButton(button);
        }
      };
      utterance.onend = finalize;
      utterance.onerror = finalize;

      this.currentUtterance = utterance;
      this.currentButton = button;
      this.setButtonPlaying(button);

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('speechSynthesis.speak failed:', err);
        this.resetButton(button);
      }
    },

    setButtonPlaying(button) {
      const ui = getUi();
      if (!ui) return;
      button.classList.add('is-playing');
      button.textContent = '\u23F9 ' + ui.stopButton;
    },

    resetButton(button) {
      if (!button) return;
      const ui = getUi();
      button.classList.remove('is-playing');
      if (ui) button.textContent = '\u25B6 ' + ui.playButton;
      if (this.currentButton === button) {
        this.currentButton = null;
        this.currentUtterance = null;
      }
    },

    stop() {
      if (this.supported) {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {}
      }
      if (this.currentButton) {
        this.resetButton(this.currentButton);
      }
    },
  };

  // ============================================
  // DOM
  // ============================================
  function cacheDom() {
    els.container = document.getElementById('sentences-container');
    els.languageSelect = document.getElementById('language-select');
    els.errorBanner = document.getElementById('error-banner');
    els.errorMessage = document.getElementById('error-message');
    els.retryButton = document.getElementById('retry-button');
    els.siteTitle = document.getElementById('site-title');
    els.siteSubtitle = document.getElementById('site-subtitle');
    els.footerNote = document.getElementById('footer-note');
  }

  // ============================================
  // Error banner
  // ============================================
  function showError() {
    if (els.errorBanner) els.errorBanner.hidden = false;
  }

  function hideError() {
    if (els.errorBanner) els.errorBanner.hidden = true;
  }

  function wireRetryButton() {
    if (!els.retryButton || els.retryButton.dataset.wired === 'true') return;
    els.retryButton.dataset.wired = 'true';
    els.retryButton.addEventListener('click', () => {
      hideError();
      init();
    });
  }

  // ============================================
  // Storage
  // ============================================
  function getStoredLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function persistLanguage(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {
      // private mode or storage disabled - silently ignore
    }
  }

  // ============================================
  // Data
  // ============================================
  async function loadData() {
    const response = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' ' + response.statusText);
    }
    return await response.json();
  }

  function groupSentencesByCategory(data) {
    const grouped = new Map();
    for (const key of Object.keys(data.categories)) {
      grouped.set(key, []);
    }
    for (const sentence of data.sentences) {
      const bucket = grouped.get(sentence.category);
      if (bucket) bucket.push(sentence);
    }
    return grouped;
  }

  // ============================================
  // Language selector
  // ============================================
  function populateLanguageSelector(data) {
    els.languageSelect.innerHTML = '';
    for (const lang of data.supportedLanguages) {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.flag + ' ' + lang.label;
      els.languageSelect.appendChild(option);
    }
  }

  function setLanguage(lang, data) {
    if (!data.ui[lang]) {
      console.warn(
        'Language "' + lang + '" not in data.ui, falling back to ' + data.defaultLanguage,
      );
      lang = data.defaultLanguage;
    }
    state.currentLanguage = lang;
    els.languageSelect.value = lang;
    persistLanguage(lang);
  }

  // ============================================
  // UI labels
  // ============================================
  function getUi() {
    return state.data && state.data.ui[state.currentLanguage];
  }

  function updateUILabels() {
    const ui = getUi();
    if (!ui) return;
    els.siteTitle.textContent = ui.siteTitle;
    els.siteSubtitle.textContent = ui.siteSubtitle;
    els.footerNote.textContent = ui.footerNote;
    if (els.errorMessage) els.errorMessage.textContent = ui.dataLoadError;
    if (els.retryButton) els.retryButton.textContent = ui.retryButton;
    document.title = ui.siteTitle;
  }

  // ============================================
  // Card / category rendering
  // ============================================
  function createCard(sentence, ui) {
    const translation = sentence.translations[state.currentLanguage];
    const hasTranslation = translation && translation.meaning;
    const hasKoreanText = !!(sentence.ko && sentence.ko.trim());

    const card = document.createElement('article');
    card.className = 'sentence-card';
    card.dataset.sentenceId = sentence.id;

    const korean = document.createElement('p');
    korean.className = 'korean-text';
    korean.textContent = sentence.ko;
    card.appendChild(korean);

    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'play-button';
    playButton.dataset.sentenceId = sentence.id;
    playButton.setAttribute('aria-label', 'Listen to ' + sentence.ko);
    playButton.textContent = '\u25B6 ' + ui.playButton;
    if (!hasKoreanText) {
      playButton.style.display = 'none';
    }
    card.appendChild(playButton);

    const meaning = document.createElement('p');
    meaning.className = 'meaning';
    if (hasTranslation) {
      meaning.textContent = translation.meaning;
    } else {
      meaning.textContent = '\u2014';
      meaning.style.fontStyle = 'italic';
      meaning.style.color = 'var(--text-muted)';
    }
    card.appendChild(meaning);

    const pronunciation = document.createElement('p');
    pronunciation.className = 'pronunciation';
    pronunciation.textContent =
      hasTranslation && translation.pronunciation ? translation.pronunciation : '\u2014';
    card.appendChild(pronunciation);

    return card;
  }

  function createCategorySection(categoryKey, sentences, data) {
    const section = document.createElement('section');
    section.className = 'category-section';
    section.dataset.category = categoryKey;

    const title = document.createElement('h2');
    title.className = 'category-title';
    const localized =
      data.categories[categoryKey] && data.categories[categoryKey][state.currentLanguage];
    title.textContent = localized || categoryKey;
    section.appendChild(title);

    const ui = data.ui[state.currentLanguage];
    for (const sentence of sentences) {
      section.appendChild(createCard(sentence, ui));
    }

    return section;
  }

  function render() {
    if (!state.data) return;
    const ui = getUi();
    if (!ui) return;

    els.container.innerHTML = '';
    state.sentencesByCategory = groupSentencesByCategory(state.data);

    for (const [categoryKey, sentences] of state.sentencesByCategory) {
      if (sentences.length === 0) continue;
      els.container.appendChild(createCategorySection(categoryKey, sentences, state.data));
    }

    updateUILabels();
    tts.refreshButtonStates();
  }

  // ============================================
  // Event delegation for play buttons
  // ============================================
  function handleContainerClick(e) {
    const button = e.target.closest('.play-button');
    if (!button || button.disabled) return;
    if (!state.data) return;
    const sentenceId = button.dataset.sentenceId;
    if (!sentenceId) return;
    const sentence = state.data.sentences.find((s) => s.id === sentenceId);
    if (sentence) {
      tts.handleClick(button, sentence);
    }
  }

  function wireContainerEvents() {
    if (!els.container || els.container.dataset.wired === 'true') return;
    els.container.dataset.wired = 'true';
    els.container.addEventListener('click', handleContainerClick);
  }

  // ============================================
  // Init
  // ============================================
  async function init() {
    cacheDom();
    wireRetryButton();
    wireContainerEvents();
    hideError();

    try {
      state.data = await loadData();
      state.sentencesByCategory = groupSentencesByCategory(state.data);
      populateLanguageSelector(state.data);

      const stored = getStoredLanguage();
      const initial = stored && state.data.ui[stored] ? stored : state.data.defaultLanguage;
      setLanguage(initial, state.data);
      render();

      tts.init(); // safe to call after first render so it can refresh button states

      if (!els.languageSelect.dataset.wired) {
        els.languageSelect.dataset.wired = 'true';
        els.languageSelect.addEventListener('change', (e) => {
          tts.stop();
          setLanguage(e.target.value, state.data);
          render();
        });
      }
    } catch (err) {
      console.error('Failed to load sentence data:', err);
      showError();
      els.container.innerHTML = '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
