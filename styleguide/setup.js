import Vue from 'vue'
import { PiniaVuePlugin, createPinia } from 'pinia'
import { NcButton } from '@nextcloud/vue'
import { translate, translatePlural, setLanguage } from '@nextcloud/l10n'
import '../src/css/index.css'
import { registerTranslations } from '../src'

// --- Translations -----------------------------------------------------------

// window.t / window.n are read by Vue templates compiled by @nextcloud/vue
// (their `with(this)` scope falls through to globals). Because translate()
// from our mocked @nextcloud/l10n is reactive (see mocks/l10n.js),
// switching language at runtime auto-rerenders dependent components.
window.t = translate
window.n = translatePlural

const initialLang = navigator.language?.split(/[-_]/)[0] || 'en'
setLanguage(initialLang)
registerTranslations()
window.__nclLang = initialLang

window.switchLanguage = (lang) => {
    setLanguage(lang)
    registerTranslations()
	window.__nclLang = lang
}

// --- Component globals ------------------------------------------------------

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
