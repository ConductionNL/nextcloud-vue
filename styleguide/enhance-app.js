// Vue 3 app setup for every live example in the styleguide.
//
// Vue 2 had one global constructor, so `setup.js` could call `Vue.component`,
// `Vue.directive`, `Vue.prototype` and `Vue.use` once and every preview picked
// them up. Vue 3 scopes all four to an app instance, and vue-styleguidist
// creates one app per example, so the registrations move here: styleguidist
// calls this function with each preview app before it mounts.
import { createPinia, setActivePinia } from 'pinia'
import { NcButton } from '@nextcloud/vue'
import { h } from 'vue'

// One store instance shared by every example, which is what the Vue 2 setup did
// with a single PiniaVuePlugin install.
const pinia = createPinia()
setActivePinia(pinia)
window.__pinia = pinia

// The @nextcloud/vue components read `$route` and `$router` internally. There is
// no router in the sandbox, so hand them a shape that answers without crashing.
const route = {
	query: {},
	params: {},
	path: '/',
	name: null,
	hash: '',
	matched: [],
	fullPath: '/',
	meta: {},
}
const router = {
	currentRoute: { value: route, ...route },
	push: () => Promise.resolve(),
	replace: () => Promise.resolve(),
	go: () => {},
	back: () => {},
	forward: () => {},
	resolve: () => ({ href: '/' }),
}

export default function enhancePreviewApp(app) {
	app.use(pinia)

	// NcButton opens dialogs in almost every example. Registering it globally
	// keeps the examples about the component being documented.
	app.component('NcButton', NcButton)

	// A link the sandbox can render, for examples that pass the `route` prop.
	app.component('RouterLink', (props, { slots }) => h('a', { href: '#' }, slots.default?.()))
	app.component('router-link', (props, { slots }) => h('a', { href: '#' }, slots.default?.()))

	// @nextcloud/vue uses v-tooltip internally. Without a directive registered,
	// Vue logs "Failed to resolve directive: tooltip" on every render.
	app.directive('tooltip', {})

	app.config.globalProperties.$route = route
	app.config.globalProperties.$router = router
}
