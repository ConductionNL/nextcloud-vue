/**
 * Tests for CnAppRoot's environment banner: prop, organisation fallback,
 * tenant switch, failed read.
 *
 * @spec openspec/changes/environment-banner/tasks.md#task-2
 */

import { flushPromises, mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		post: jest.fn().mockRejectedValue(new Error('no batch route')),
		get: jest.fn().mockRejectedValue(new Error('no route')),
	},
}))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))

const axios = require('@nextcloud/axios').default
const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')
const { resetEnvironmentWarning } = require('../../src/composables/useEnvironment.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const manifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'app.home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
	dependencies: [],
}

function mountRoot(propsData = {}) {
	return mount(CnAppRoot, {
		propsData: { manifest, appId: 'myapp', translate: (k) => k, ...propsData },
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div />' } },
	})
}

const banner = (wrapper) => wrapper.find('[data-testid="cn-environment-banner"]')

describe('CnAppRoot environment banner', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
		resetEnvironmentWarning()
		document.title = 'MyApp'
		axios.get.mockReset().mockRejectedValue(new Error('no route'))
	})

	it('shows the acceptance banner and prefixes the title', async () => {
		const wrapper = mountRoot({ environment: 'acceptance' })
		await flushPromises()
		expect(banner(wrapper).text()).toBe('Acceptance environment')
		expect(document.title).toBe('[ACC] MyApp')
		wrapper.unmount()
		expect(document.title).toBe('MyApp')
	})

	it('shows nothing for production', async () => {
		const wrapper = mountRoot({ environment: 'production' })
		await flushPromises()
		expect(banner(wrapper).exists()).toBe(false)
		expect(document.title).toBe('MyApp')
	})

	it('reads the active organisation when the prop is empty, and follows a tenant switch', async () => {
		const wrapper = mountRoot()
		const ctx = wrapper.vm.cnTenantContext
		ctx.setActiveTenant('org-1', { uuid: 'org-1', environment: 'test' })
		await flushPromises()
		expect(banner(wrapper).text()).toBe('Test environment')
		ctx.setActiveTenant('org-2', { uuid: 'org-2', environment: 'production' })
		await flushPromises()
		expect(banner(wrapper).exists()).toBe(false)
	})

	it('lets the prop win over the organisation', async () => {
		const wrapper = mountRoot({ environment: 'development' })
		wrapper.vm.cnTenantContext.setActiveTenant('org-1', { uuid: 'org-1', environment: 'acceptance' })
		await flushPromises()
		expect(banner(wrapper).text()).toBe('Development environment')
	})

	it('reads the environment from OpenRegister when only the uuid is known', async () => {
		axios.get.mockResolvedValue({ data: { environment: 'acceptance' } })
		const wrapper = mountRoot()
		wrapper.vm.cnTenantContext.setActiveTenant('org-9')
		await flushPromises()
		expect(banner(wrapper).text()).toBe('Acceptance environment')
	})

	it('shows nothing and warns once when the read fails', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountRoot()
		wrapper.vm.cnTenantContext.setActiveTenant('org-a')
		await flushPromises()
		wrapper.vm.cnTenantContext.setActiveTenant('org-b')
		await flushPromises()
		expect(banner(wrapper).exists()).toBe(false)
		expect(warn.mock.calls.filter((c) => String(c[0]).includes('[useEnvironment]'))).toHaveLength(1)
		warn.mockRestore()
	})
})
