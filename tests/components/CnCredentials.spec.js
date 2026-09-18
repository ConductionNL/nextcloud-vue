/**
 * Tests for CnCredentials — the credential pane's three claims about text and
 * links: the GitHub help says what a token must be able to do, an app may
 * override that help, the vault link points at the vault app this instance
 * actually runs, and a manifest reason reaches the reader translated.
 *
 * Each test was watched failing against the code before the fix:
 *  - the GitHub help read "read-only access", so a token made from it could
 *    not publish and the publish failed with a 403 nobody could explain;
 *  - PROVIDER_META was read directly, so `providerMeta` changed nothing;
 *  - the vault link was a hardcoded /apps/doriath, a 404 on every instance
 *    running the app under its new id;
 *  - the reason was interpolated raw, so a Dutch reader read English.
 */

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => url) }))
jest.mock('@nextcloud/l10n', () => ({
	translate: jest.fn((app, text, params = {}) => text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)),
}))

const { shallowMount } = require('@vue/test-utils')
const axios = require('@nextcloud/axios').default
const { translate } = require('@nextcloud/l10n')
const CnCredentials = require('../../src/components/CnCredentials/CnCredentials.vue').default

function mountPane(propsData = {}) {
	return shallowMount(CnCredentials, {
		propsData: { appId: 'buildiq', appName: 'Buildiq', ...propsData },
	})
}

describe('CnCredentials', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { results: [] } })
		global.window.OC = { appswebroots: {} }
	})

	afterEach(() => {
		delete global.window.OC
	})

	it('tells the reader a publishing token needs write access', () => {
		const wrapper = mountPane()
		wrapper.vm.form.provider = 'github'

		const help = wrapper.vm.activeMeta.setupHelp
		expect(help).toContain('Administration')
		expect(help).toContain('read and write')
		expect(help).not.toContain('read-only access to the repositories')
	})

	it('lets an app override the provider help it needs', () => {
		const wrapper = mountPane({
			providerMeta: { github: { setupHelp: 'Give the token Contents read and write.' } },
		})
		wrapper.vm.form.provider = 'github'

		expect(wrapper.vm.activeMeta.setupHelp).toBe('Give the token Contents read and write.')
		// Keys the app did not override keep the catalogue value.
		expect(wrapper.vm.activeMeta.secretLabel).toBe('Personal access token')
	})

	it('links to the vault app this instance runs', () => {
		global.window.OC = { appswebroots: { keepiq: '/custom_apps/keepiq' } }
		const wrapper = mountPane()

		expect(wrapper.vm.resolvedVaultUrl).toBe('/apps/keepiq')
	})

	it('links to the older vault app id when that is the one installed', () => {
		global.window.OC = { appswebroots: { doriath: '/custom_apps/doriath' } }
		const wrapper = mountPane()

		expect(wrapper.vm.resolvedVaultUrl).toBe('/apps/doriath')
	})

	it('offers no vault link when no vault app is installed', () => {
		const wrapper = mountPane()

		expect(wrapper.vm.resolvedVaultUrl).toBe('')
	})

	it('keeps an explicit vaultUrl and an explicit empty one', () => {
		global.window.OC = { appswebroots: { keepiq: '/custom_apps/keepiq' } }

		expect(mountPane({ vaultUrl: '/apps/elsewhere' }).vm.resolvedVaultUrl).toBe('/apps/elsewhere')
		expect(mountPane({ vaultUrl: '' }).vm.resolvedVaultUrl).toBe('')
	})

	it('translates a manifest reason in the consuming app bundle', () => {
		translate.mockImplementation((app, text) => (
			app === 'buildiq' && text === 'Publish your app to GitHub'
				? 'Publiceer je app op GitHub'
				: text
		))
		const wrapper = mountPane({
			appCredentials: [{ provider: 'github', reason: 'Publish your app to GitHub' }],
		})

		expect(wrapper.vm.reasonText('Publish your app to GitHub')).toBe('Publiceer je app op GitHub')
		expect(wrapper.vm.reasonText('')).toBe('')
	})
})
