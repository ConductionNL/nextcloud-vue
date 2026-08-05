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
		// Header uses NcSettingsSection directly so its description subtitle renders.
		expect(wrapper.findComponent({ name: 'NcSettingsSection' }).exists()).toBe(true)
		expect(wrapper.vm.resolvedTitle).toBe('Shillinq Settings')
		expect(wrapper.vm.resolvedDescription).toBe('Configure your Shillinq installation')
		expect(wrapper.props('docUrl')).toBe('https://x/docs')
	})

	it('honours explicit title/description overrides', () => {
		const wrapper = mountShell({ title: 'Custom', description: 'Desc' })
		expect(wrapper.vm.resolvedTitle).toBe('Custom')
		expect(wrapper.vm.resolvedDescription).toBe('Desc')
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

	it('prefers an explicit appVersion prop over loadState for the version', () => {
		const wrapper = mountShell({ appVersion: '1.2.3' })
		expect(wrapper.findComponent({ name: 'CnVersionInfoCard' }).props('appVersion')).toBe('1.2.3')
		// version comes from the prop, so loadState is never queried for 'version'
		expect(loadState).not.toHaveBeenCalledWith('shillinq', 'version', expect.anything())
	})

	it('reads the real up-to-date signal from loadState when isUpToDate is not passed', () => {
		loadState.mockImplementation((app, key, def) => (key === 'isUpToDate' ? false : (key === 'configuredVersion' ? '0.8.0' : def)))
		const wrapper = mountShell()
		const card = wrapper.findComponent({ name: 'CnVersionInfoCard' })
		expect(card.props('isUpToDate')).toBe(false)
		expect(card.props('configuredVersion')).toBe('0.8.0')
	})

	it('lets an explicit isUpToDate prop override the loadState signal', () => {
		loadState.mockImplementation((app, key, def) => (key === 'isUpToDate' ? false : def))
		const wrapper = mountShell({ isUpToDate: true })
		expect(wrapper.findComponent({ name: 'CnVersionInfoCard' }).props('isUpToDate')).toBe(true)
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
