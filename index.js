/**
 * Portfolio V2 - Main Script
 * Refactored for better organization and maintainability.
 */

(function () {
  'use strict';

  // --- Configuration ---
  const CONFIG = {
    defaultLang: 'es',
    cvFiles: {
      es: '/assets/docs/CV_ES_WEB_ANDREY_VILLALOBOS_GOMEZ.pdf',
      en: '/assets/docs/CV_EN_WEB_ANDREY_VILLALOBOS_GOMEZ.pdf',
    },
    api: {
      contact: 'https://formsubmit.co/ajax/avg2620@gmail.com',
      translations: 'translations.json',
    },
    selectors: {
      langButtons: '.lang-btn',
      langSwitch: '.lang-switch',
      textNodes: '[data-i18n]',
      galleryButtons: '[data-gallery-trigger]',
      gallery: {
        tag: '[data-gallery-tag]',
        title: '[data-gallery-title]',
        description: '[data-gallery-description]',
        stack: '[data-gallery-stack]',
        link: '[data-gallery-link]',
      },
      contact: {
        form: '#contact-form',
        status: '[data-contact-status]',
      },
      ui: {
        scrollTop: '[data-scroll-top]',
        cvButton: '[data-cv-btn]',
        lottie: '[data-lottie]',
      },
    },
  };

  // --- State Management ---
  const State = {
    currentLang: document.documentElement.lang || CONFIG.defaultLang,
    translations: {},
    rawTranslations: {},
    galleryIndex: 0,
  };

  // --- Modules ---

  const I18n = {
    init: async () => {
      try {
        const response = await fetch(CONFIG.api.translations);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        State.rawTranslations = await response.json();
        State.translations = Object.fromEntries(
          Object.entries(State.rawTranslations).map(([lang, data]) => [
            lang,
            I18n.flatten(data),
          ])
        );
        I18n.setLanguage(State.currentLang);
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    },

    flatten: (data, prefix = '') => {
      return Object.entries(data).reduce((acc, [key, value]) => {
        const composedKey = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(value)) {
          value.forEach((entry, index) => {
            Object.assign(acc, I18n.flatten(entry, `${composedKey}.${index}`));
          });
        } else if (typeof value === 'object' && value !== null) {
          Object.assign(acc, I18n.flatten(value, composedKey));
        } else {
          acc[composedKey] = value;
        }
        return acc;
      }, {});
    },

    get: (key, lang = State.currentLang) => {
      return State.translations[lang]?.[key] || key;
    },

    setLanguage: (lang) => {
      if (!State.translations[lang]) return;

      State.currentLang = lang;
      document.documentElement.lang = lang;

      // Update Title
      const siteTitle = State.translations[lang].siteTitle;
      if (siteTitle) document.title = siteTitle;

      // Update Language Switcher UI
      const langSwitch = document.querySelector(CONFIG.selectors.langSwitch);
      if (langSwitch) langSwitch.dataset.activeLang = lang;

      document.querySelectorAll(CONFIG.selectors.langButtons).forEach((btn) => {
        const isActive = btn.dataset.lang === lang;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });

      // Update CV Button
      const cvBtn = document.querySelector(CONFIG.selectors.ui.cvButton);
      if (cvBtn) {
        const file = CONFIG.cvFiles[lang] || CONFIG.cvFiles.es;
        cvBtn.href = file;
        // Extract filename for download attribute
        cvBtn.download = file.split('/').pop();
        cvBtn.setAttribute('hreflang', lang);
      }

      // Update All Text Nodes
      I18n.updateTextNodes();

      // Trigger Updates in other modules
      Gallery.render();
      ContactForm.updateStatusMessage();
    },

    updateTextNodes: () => {
      const dictionary = State.translations[State.currentLang];
      document.querySelectorAll(CONFIG.selectors.textNodes).forEach((node) => {
        const key = node.dataset.i18n;
        if (key && dictionary[key]) {
          node.textContent = dictionary[key];
        }
      });
    },
  };

  const Gallery = {
    init: () => {
      const buttons = document.querySelectorAll(CONFIG.selectors.galleryButtons);
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          State.galleryIndex = Number(btn.dataset.galleryTrigger);
          Gallery.render();
        });
      });
    },

    render: () => {
      // Update Buttons State
      document.querySelectorAll(CONFIG.selectors.galleryButtons).forEach((btn) => {
        const isActive = Number(btn.dataset.galleryTrigger) === State.galleryIndex;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });

      // Update Content
      const langData = State.rawTranslations[State.currentLang];
      const item = langData?.gallery?.items?.[State.galleryIndex];

      if (!item) return;

      const els = CONFIG.selectors.gallery;
      const setContent = (sel, text) => {
        const el = document.querySelector(sel);
        if (el) el.textContent = text;
      };

      setContent(els.tag, item.tag);
      setContent(els.title, item.name);
      setContent(els.description, item.description);
      const renderStack = (stackItems) => {
        const container = document.querySelector(els.stack);
        if (!container) return;

        container.innerHTML = '';

        if (!Array.isArray(stackItems) || !stackItems.length) {
          container.setAttribute('hidden', 'true');
          return;
        }

        container.removeAttribute('hidden');

        stackItems.forEach((entry) => {
          if (!entry?.label) return;
          const chip = document.createElement('span');
          chip.className = 'stack-chip';
          chip.setAttribute('role', 'listitem');

          if (entry.icon) {
            const icon = document.createElement('img');
            icon.src = entry.icon;
            icon.alt = entry.label;
            icon.loading = 'lazy';
            chip.appendChild(icon);
          }

          const label = document.createElement('span');
          label.textContent = entry.label;
          chip.appendChild(label);

          container.appendChild(chip);
        });
      };

      renderStack(item.stack);

      const linkEl = document.querySelector(els.link);
      if (linkEl) {
        linkEl.textContent = item.linkLabel;
        linkEl.href = item.link;
      }
    },
  };

  const ContactForm = {
    init: () => {
      const form = document.querySelector(CONFIG.selectors.contact.form);
      if (form) {
        form.addEventListener('submit', ContactForm.handleSubmit);
      }
    },

    handleSubmit: async (event) => {
      event.preventDefault();
      const form = event.target;

      ContactForm.setStatus('pending');

      const formData = Object.fromEntries(new FormData(form).entries());

      try {
        const response = await fetch(CONFIG.api.contact, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error('Network error');

        ContactForm.setStatus('success');
        form.reset();
      } catch (error) {
        console.error('Form submission error:', error);
        ContactForm.setStatus('error');
      }
    },

    setStatus: (state) => {
      const statusEl = document.querySelector(CONFIG.selectors.contact.status);
      if (!statusEl) return;

      statusEl.dataset.state = state;
      ContactForm.updateStatusMessage();
    },

    updateStatusMessage: () => {
      const statusEl = document.querySelector(CONFIG.selectors.contact.status);
      if (!statusEl || !statusEl.dataset.state) return;

      const stateKeys = {
        pending: 'contact.form.sending',
        success: 'contact.form.success',
        error: 'contact.form.error',
      };

      const key = stateKeys[statusEl.dataset.state];
      if (key) {
        statusEl.textContent = I18n.get(key);
      }
    },
  };

  const UI = {
    init: () => {
      UI.initScrollTop();
      UI.initLangButtons();
    },

    initScrollTop: () => {
      const btn = document.querySelector(CONFIG.selectors.ui.scrollTop);
      if (!btn) return;

      btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      const toggle = () => {
        btn.classList.toggle('visible', window.scrollY > 240);
      };

      window.addEventListener('scroll', toggle);
      toggle();
    },

    initLangButtons: () => {
      document.querySelectorAll(CONFIG.selectors.langButtons).forEach((btn) => {
        btn.addEventListener('click', () => I18n.setLanguage(btn.dataset.lang));
      });
    },
  };

  const LottieAnimations = {
    init: () => {
      const nodes = document.querySelectorAll(CONFIG.selectors.ui.lottie);
      if (!nodes.length) return;

      const start = () => {
        if (!window.lottie) return;

        nodes.forEach((node) => {
          if (node.dataset.lottieLoaded) return;

          window.lottie.loadAnimation({
            container: node,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: node.dataset.lottie,
          });

          node.dataset.lottieLoaded = 'true';
        });
      };

      if (window.lottie) {
        start();
      } else {
        window.addEventListener(
          'load',
          () => {
            start();
          },
          { once: true }
        );
      }
    },
  };

  // --- App Initialization ---
  const init = () => {
    I18n.init();
    Gallery.init();
    ContactForm.init();
    UI.init();
    LottieAnimations.init();
  };

  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
