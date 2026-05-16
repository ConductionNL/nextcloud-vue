/**
 * Jest test setup — provides Nextcloud global mocks.
 */

// Polyfill structuredClone for Node < 17 / jsdom
if (typeof global.structuredClone === 'undefined') {
	global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
}

// Mock the global OC object that Nextcloud provides
global.OC = {
	requestToken: 'test-token-12345',
	webroot: '',
	config: {
		session_lifetime: 86400,
	},
}

// Mock window.fetch if not available in jsdom
if (!global.fetch) {
	global.fetch = jest.fn()
}

// Patch pinia's bundled vue-demi for correct Vue 2 behaviour in tests.
//
// vue-demi 0.14.x (shipped inside node_modules/pinia/node_modules/vue-demi)
// sets isVue2=false because Vue 2.7 has the Composition API built-in, but
// pinia relies on isVue2 to decide whether to use Vue.set() when adding
// new reactive state properties.  Without Vue.set, new keys on a reactive
// object aren't tracked by Vue 2's observer, so toRefs() receives a plain
// object and all state access breaks.
//
// Patching the cached module object here propagates to pinia's own
// require('vue-demi') because Jest resolves both to the same absolute path.
const path = require('path')
const Vue2 = require('vue').default || require('vue')
// vue-demi may be hoisted to root node_modules (modern npm) or nested under
// pinia (older npm); resolve from either location.
const vueDemiNested = path.resolve(__dirname, '../node_modules/pinia/node_modules/vue-demi')
const vueDemiHoisted = path.resolve(__dirname, '../node_modules/vue-demi')
const fs = require('fs')
const vueDemi = require(fs.existsSync(vueDemiNested) ? vueDemiNested : vueDemiHoisted)
if (!vueDemi.hasInjectionContext) {
	// Vue 3.3+ API missing in vue-demi for Vue 2; returning false is correct
	// because inject() only works inside component setup in Vue 2.
	vueDemi.hasInjectionContext = () => false
}
if (!vueDemi.isVue2) {
	// Switch to Vue 2 mode so pinia uses Vue.set() for reactive state init.
	vueDemi.isVue2 = true
	vueDemi.isVue3 = false
	vueDemi.Vue2 = Vue2
	vueDemi.set = (target, key, val) => {
		if (Array.isArray(target)) {
			target.length = Math.max(target.length, key)
			target.splice(key, 1, val)
			return val
		}
		Vue2.set(target, key, val)
		return val
	}
	vueDemi.del = (target, key) => {
		if (Array.isArray(target)) { target.splice(key, 1); return }
		Vue2.delete(target, key)
	}
}

// Install PiniaVuePlugin so store state is reactive in Vue 2 tests.
// Without this, pinia's toRefs(state) receives a plain object and
// computed properties / state access inside stores silently misbehave.
const Vue = require('vue').default || require('vue')
const { PiniaVuePlugin } = require('pinia')
Vue.use(PiniaVuePlugin)

// Register t/n as global Vue methods — consumer apps normally do this via
// Vue.mixin({ methods: { t, n } }) in their main.js. Mirror that here so
// components using `{{ t('nextcloud-vue', '...') }}` in templates render.
const { translate, translatePlural } = require('@nextcloud/l10n')
Vue.mixin({ methods: { t: translate, n: translatePlural } })
