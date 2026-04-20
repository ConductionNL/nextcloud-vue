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

// Register t/n as global Vue methods — consumer apps normally do this via
// Vue.mixin({ methods: { t, n } }) in their main.js. Mirror that here so
// components using `{{ t('nextcloud-vue', '...') }}` in templates render.
const Vue = require('vue').default || require('vue')
const { translate, translatePlural } = require('@nextcloud/l10n')
Vue.mixin({ methods: { t: translate, n: translatePlural } })
