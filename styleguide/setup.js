import Vue from 'vue'
import { PiniaVuePlugin, createPinia } from 'pinia'
import { NcButton } from '@nextcloud/vue'
import { translate, translatePlural } from '@nextcloud/l10n'
import '../src/css/index.css'

// Nextcloud sets window.t and window.n as globals in real apps; components
// call t() / n() in templates expecting this. Register the mocked versions so
// Vue's `with(this)` template scope can fall through to the global object.
window.t = translate
window.n = translatePlural

// NcButton is used in almost every component example to trigger dialogs or
// demonstrate interactions. Register it globally to avoid per-example imports.
Vue.component('NcButton', NcButton)

// @nextcloud/vue components access $route/$router internally. Stub them so
// components that call this.$route.query etc. don't crash in the styleguide.
Vue.prototype.$route = { query: {}, params: {}, path: '/', name: null, hash: '', matched: [], fullPath: '/', meta: {} }
Vue.prototype.$router = {
	currentRoute: { query: {}, params: {}, path: '/', name: null, hash: '', matched: [], fullPath: '/', meta: {} },
	push: () => Promise.resolve(),
	replace: () => Promise.resolve(),
	go: () => {},
	back: () => {},
	forward: () => {},
	resolve: () => ({ href: '/' }),
}

// Register a no-op v-tooltip directive stub so @nextcloud/vue components that
// use v-tooltip internally don't log "Failed to resolve directive: tooltip".
Vue.directive('tooltip', { bind() {}, update() {}, unbind() {} })

// Register a no-op <router-link> stub so examples using the `route` prop
// (which renders as <router-link>) don't crash with "Unknown custom element".
Vue.component('RouterLink', {
	functional: true,
	props: { to: [String, Object] },
	render(h, ctx) {
		return h('a', { attrs: { href: '#' } }, ctx.children)
	},
})
Vue.component('router-link', {
	functional: true,
	props: { to: [String, Object] },
	render(h, ctx) {
		return h('a', { attrs: { href: '#' } }, ctx.children)
	},
})

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

    /* Semantic element colors — solid backgrounds for buttons/badges */
    --color-error: #DB0606;
    --color-error-rgb: 219, 6, 6;
    --color-error-hover: #df2525;
    --color-error-text: #ffffff;
    --color-warning: #A37200;
    --color-warning-rgb: 163, 114, 0;
    --color-warning-hover: #8a6000;
    --color-warning-text: #ffffff;
    --color-success: #2d7b41;
    --color-success-rgb: 45, 123, 65;
    --color-success-hover: #428854;
    --color-success-text: #ffffff;
    --color-info: #0071ad;
    --color-info-rgb: 0, 113, 173;
    --color-info-hover: #197fb5;
    --color-info-text: #ffffff;

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

    /* Box shadow */
    --color-box-shadow: rgba(77, 77, 77, 0.5);
    --color-box-shadow-rgb: 77, 77, 77;

    /* Loading spinner */
    --color-loading-light: #cccccc;
    --color-loading-dark: #444444;

    /* Misc */
    --color-favorite: #A37200;
    --color-scrollbar: rgba(34, 34, 34, 0.15);
    --color-placeholder-light: #e6e6e6;
    --color-placeholder-dark: #cccccc;

    /* Font weight for interactive elements (buttons, etc.) */
    --font-weight-element: bold;

    /* Background plain (used for header/primary-colored surfaces) */
    --color-background-plain: #00679e;
    --color-background-plain-text: #ffffff;

    /* Icon invert filters */
    --primary-invert-if-bright: no;
    --primary-invert-if-dark: invert(100%);
    --background-invert-if-dark: no;
    --background-invert-if-bright: invert(100%);
    --background-image-invert-if-bright: no;
    --filter-background-blur: blur(25px);

    /* Body layout */
    --body-container-margin: 8px;
    --body-container-radius: 12px;
    --breakpoint-mobile: 1024px;
    --list-min-width: 200px;
    --list-max-width: 300px;
    --sidebar-min-width: 300px;
    --sidebar-max-width: 500px;
    --header-menu-item-height: 44px;
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
