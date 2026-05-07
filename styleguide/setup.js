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
