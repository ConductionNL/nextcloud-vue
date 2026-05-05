import Vue from 'vue'
import { PiniaVuePlugin, createPinia } from 'pinia'
import '../src/css/index.css'

// @nextcloud/vue components access $route/$router internally. Stub them so
// components that call this.$route.query etc. don't crash in the styleguide.
Vue.prototype.$route = { query: {}, params: {}, path: '/', name: null, hash: '', matched: [], fullPath: '/', meta: {} }
Vue.prototype.$router = { push: () => Promise.resolve(), replace: () => Promise.resolve(), go: () => {}, back: () => {}, forward: () => {}, resolve: () => ({ href: '/' }) }

// Pinia is required by store-backed components (CnObjectDataWidget, CnIndexPage, etc.)
Vue.use(PiniaVuePlugin)
window.__pinia = createPinia()

// Inject Nextcloud light-theme CSS variables so components render correctly
// without a real Nextcloud backend. Mirrors the tokens from @nextcloud/server.
const styleEl = document.createElement('style')
styleEl.textContent = `
  :root {
    /* Backgrounds */
    --color-main-background: #ffffff;
    --color-main-background-rgb: 255, 255, 255;
    --color-main-background-translucent: rgba(255, 255, 255, 0.97);
    --color-background-hover: #f5f5f5;
    --color-background-dark: #ededed;
    --color-background-darker: #dbdbdb;

    /* Text */
    --color-main-text: #222222;
    --color-text-maxcontrast: #6b6b6b;
    --color-text-error: #e9322d;
    --color-text-success: #2d7b35;

    /* Borders */
    --color-border: #dbdbdb;
    --color-border-dark: #b3b3b3;
    --color-border-maxcontrast: #888888;

    /* Semantic element colors */
    --color-element-error: #e9322d;
    --color-element-info: #0082c9;
    --color-element-success: #46ba61;
    --color-element-warning: #eca700;

    /* Semantic background/text pairs */
    --color-error: #fce4e4;
    --color-error-hover: #f5c6c6;
    --color-error-text: #8c1515;
    --color-warning: #fff3cd;
    --color-warning-hover: #ffe59a;
    --color-warning-text: #856404;
    --color-success: #d4edda;
    --color-success-hover: #b8dcc3;
    --color-success-text: #155724;
    --color-info: #d1ecf1;
    --color-info-hover: #b8e0e8;
    --color-info-text: #0c5460;

    /* Brand / primary */
    --color-primary: #00679e;
    --color-primary-text: #ffffff;
    --color-primary-hover: #045783;
    --color-primary-element: #0082c9;
    --color-primary-element-hover: #006ea0;
    --color-primary-element-text: #ffffff;
    --color-primary-light: #e6f3fb;
    --color-primary-light-hover: #d0e9f7;
    --color-primary-light-text: #005e8c;
    --color-primary-element-light: var(--color-primary-light);
    --color-primary-element-light-text: var(--color-primary-light-text);
    --color-primary-element-light-hover: var(--color-primary-light-hover);

    /* Typography */
    --font-face: system-ui, -apple-system, "Segoe UI", Roboto, Oxygen-Sans,
      Cantarell, Ubuntu, "Helvetica Neue", Arial, sans-serif;
    --default-font-size: 15px;
    --font-size-small: 13px;
    --default-line-height: 1.5;

    /* Animation */
    --animation-quick: 100ms;
    --animation-slow: 300ms;

    /* Borders */
    --border-width-input: 1px;
    --border-width-input-focused: 2px;
    --border-radius-small: 4px;
    --border-radius-element: 8px;
    --border-radius-container: 12px;
    --border-radius-container-large: 16px;
    --border-radius: var(--border-radius-small);
    --border-radius-large: var(--border-radius-element);
    --border-radius-rounded: 28px;
    --border-radius-pill: 100px;

    /* Sizing */
    --default-clickable-area: 34px;
    --clickable-area-large: 48px;
    --clickable-area-small: 24px;
    --default-grid-baseline: 4px;
    --header-height: 50px;
    --navigation-width: 300px;
    --sidebar-min-width: 300px;
    --sidebar-max-width: 500px;

    /* Misc */
    --color-box-shadow: rgba(0, 0, 0, 0.15);
    --color-loading-light: #ccc;
    --color-loading-dark: #888;
    --color-favorite: #ffde00;
  }

  body {
    font-family: var(--font-face);
    font-size: var(--default-font-size);
    line-height: var(--default-line-height);
    color: var(--color-main-text);
    background: var(--color-main-background);
    margin: 0;
    padding: 0;
  }
`
document.head.appendChild(styleEl)
