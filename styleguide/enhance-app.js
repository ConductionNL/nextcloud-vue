// Vue 3 app setup for every live example in the styleguide.
//
// Vue 2 had one global constructor, so `setup.js` could call `Vue.component`,
// `Vue.directive`, `Vue.prototype` and `Vue.use` once and every preview picked
// them up. Vue 3 scopes all four to an app instance, and vue-styleguidist
// creates one app per example, so the registrations move here: styleguidist
// calls this function with each preview app before it mounts.
import { createPinia, setActivePinia } from 'pinia'
import { NcButton } from '@nextcloud/vue'
import { translate, translatePlural } from '@nextcloud/l10n'
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
	// `to` is declared so it does not fall through onto the anchor, where an
	// object target would render as to="[object Object]".
	app.component('RouterLink', {
		props: { to: { type: [String, Object], default: '' } },
		setup(props, { slots }) {
			return () => h('a', { href: '#' }, slots.default?.())
		},
	})

	// @nextcloud/vue uses v-tooltip internally. Without a directive registered,
	// Vue logs "Failed to resolve directive: tooltip" on every render.
	app.directive('tooltip', {})

	app.config.globalProperties.$route = route
	app.config.globalProperties.$router = router

	// Vue 2 templates ran inside `with (this)`, so a template calling t(...)
	// fell through to window.t. A Vue 3 template compiled by @vue/compiler-sfc
	// resolves it on the render context instead, so t and n have to be on the
	// app. e2e/harness/main.js installs them the same way, and the migration
	// notes record that without them every this.t(...) throws at render.
	app.config.globalProperties.t = translate
	app.config.globalProperties.n = translatePlural
}
