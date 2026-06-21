/**
 * Tests for CnAdminSettingsShell — the canonical admin-settings chrome.
 * Verifies the header + version card props, the default re-import wiring to
 * the AppHost endpoint, and the success/error emit contract.
 */

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url, params = {}) => url.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)) }))
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params = {}) => text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`),
}))

const { shallowMount, flushPromises } = require('@vue/test-utils')
const axios = require('@nextcloud/axios').default
const { loadState } = require('@nextcloud/initial-state')
const CnAdminSettingsShell = require('../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue').default

function mountShell(propsData = {}) {
	return shallowMount(CnAdminSettingsShell, {
		propsData: { appId: 'shillinq', appName: 'Shillinq', ...propsData },
	})
}

describe('CnAdminSettingsShell', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('renders the title header with computed defaults', () => {
		const wrapper = mountShell({ docUrl: 'https://x/docs' })
		const header = wrapper.findComponent({ name: 'CnSettingsSection' })
		expect(header.exists()).toBe(true)
		expect(header.props('name')).toBe('Shillinq Settings')
		expect(header.props('description')).toBe('Configure your Shillinq installation')
		expect(header.props('docUrl')).toBe('https://x/docs')
	})

	it('passes version to the version card, falling back to loadState', () => {
		loadState.mockReturnValueOnce('0.9.1')
		const wrapper = mountShell()
		const card = wrapper.findComponent({ name: 'CnVersionInfoCard' })
		expect(card.exists()).toBe(true)
		expect(card.props('appName')).toBe('Shillinq')
		expect(card.props('appVersion')).toBe('0.9.1')
		expect(loadState).toHaveBeenCalledWith('shillinq', 'version', 'Unknown')
	})

	it('prefers an explicit appVersion prop over loadState', () => {
		const wrapper = mountShell({ appVersion: '1.2.3' })
		expect(wrapper.findComponent({ name: 'CnVersionInfoCard' }).props('appVersion')).toBe('1.2.3')
		expect(loadState).not.toHaveBeenCalled()
	})

	it('re-imports via the canonical AppHost endpoint and emits reimported', async () => {
		axios.post.mockResolvedValueOnce({ data: { success: true, message: 'ok' } })
		const wrapper = mountShell()
		await wrapper.vm.reimport()
		expect(axios.post).toHaveBeenCalledWith('/apps/shillinq/api/settings/load')
		expect(wrapper.emitted('reimported')).toBeTruthy()
		expect(wrapper.emitted('reimported')[0][0]).toEqual({ success: true, message: 'ok' })
	})

	it('honours a reimportUrl override', async () => {
		axios.post.mockResolvedValueOnce({ data: {} })
		const wrapper = mountShell({ reimportUrl: '/apps/shillinq/api/settings/reimport' })
		await wrapper.vm.reimport()
		expect(axios.post).toHaveBeenCalledWith('/apps/shillinq/api/settings/reimport')
	})

	it('emits reimport-error when the backend reports failure', async () => {
		axios.post.mockResolvedValueOnce({ data: { success: false, message: 'nope' } })
		const wrapper = mountShell()
		await wrapper.vm.reimport()
		expect(wrapper.emitted('reimported')).toBeFalsy()
		expect(wrapper.emitted('reimport-error')).toBeTruthy()
	})

	it('emits reimport-error when the request throws', async () => {
		axios.post.mockRejectedValueOnce(new Error('500'))
		const wrapper = mountShell()
		await wrapper.vm.reimport()
		expect(wrapper.emitted('reimport-error')).toBeTruthy()
	})

	it('hides the version card when showVersionCard is false', () => {
		const wrapper = mountShell({ showVersionCard: false })
		expect(wrapper.findComponent({ name: 'CnVersionInfoCard' }).exists()).toBe(false)
	})
})
