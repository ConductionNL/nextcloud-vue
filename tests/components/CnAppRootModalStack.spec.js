/**
 * CnAppRoot wires up the nested-modal stacking fix.
 *
 * `src/utils/modalStack.js` is only useful once something installs it, and
 * nothing in the library's own dialogs does — the collision it fixes involves
 * dialogs the CONSUMING app writes, so the install has to happen once at the app
 * shell. If this wiring is ever dropped, the unit tests in
 * `tests/utils/modalStack.spec.js` all keep passing while every real app goes
 * back to two dialogs tied on one z-index and the lower one intercepting clicks.
 * Hence this separate spec.
 *
 * @see tests/utils/modalStack.spec.js for the mechanism itself.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import {
	isModalStackInstalled,
	resetModalStack,
} from '../../src/utils/modalStack.js'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const manifest = () => ({
	version: '1.0.0',
	dependencies: [],
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }],
})

/**
 * Mount CnAppRoot nested in a wrapper, as production does.
 *
 * @return {object} The @vue/test-utils wrapper.
 */
function mountShell() {
	const Wrapper = {
		render() {
			return h(CnAppRoot, {
				manifest: manifest(),
				appId: 'myapp',
				isLoading: false,
				translate: (k) => k,
				requiresApps: [],
			})
		},
	}
	return mount(Wrapper, {
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
}

describe('CnAppRoot — nested-modal stacking wiring', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
		global.OC = global.OC || {}
		global.OC.appswebroots = {}
		resetModalStack()
	})

	afterEach(() => {
		resetModalStack()
	})

	it('installs the modal stack on mount', () => {
		expect(isModalStackInstalled()).toBe(false)

		const wrapper = mountShell()

		expect(isModalStackInstalled()).toBe(true)
		wrapper.unmount()
	})

	it('releases it again on unmount', () => {
		const wrapper = mountShell()
		wrapper.unmount()

		expect(isModalStackInstalled()).toBe(false)
	})

	it('keeps it installed while an outer shell is still mounted', () => {
		// OpenBuild's BuilderHost renders a second CnAppRoot for the app being
		// previewed. The inner shell unmounting must not blind the outer one.
		const outer = mountShell()
		const inner = mountShell()

		inner.unmount()
		expect(isModalStackInstalled()).toBe(true)

		outer.unmount()
		expect(isModalStackInstalled()).toBe(false)
	})
})
