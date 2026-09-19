/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `CnNotificationPreferences` mounted with no props still works.
 *
 * THE REGRESSION THIS EXISTS TO PREVENT, because it has already happened once.
 * This component has shipped since #446 as a self-contained settings pane: it
 * takes NO props, fetches OpenRegister's preferences for itself, scopes them to
 * the app whose settings modal is open, and renders its own switches.
 * `CnAppRoot` mounts it that way as the default of its `#user-settings` slot,
 * so every app in the fleet gets it without passing anything.
 *
 * An earlier revision of notification-preferences-ui REPLACED this file in
 * place with a props-driven matrix. Every one of those callers then rendered an
 * empty pane. No error, no warning, no failing test: the component was there,
 * it mounted, and it showed nothing. That is the exact silent failure a
 * published library must not ship.
 *
 * The new screen now lives beside it as `CnNotificationMatrix`. These cases
 * hold the old contract still: mount with nothing, and get the populated pane.
 *
 * @spec openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), put: jest.fn() },
}))

const axios = require('@nextcloud/axios').default
const { flushPromises, mount } = require('@vue/test-utils')
const CnNotificationPreferences = require('../../src/components/CnNotificationPreferences/CnNotificationPreferences.vue').default

const RESULTS = [
	{
		schema: 'case',
		schemaTitle: 'Cases',
		application: 'dossiq',
		notification: 'caseAssigned',
		enabled: true,
		source: 'user-override',
	},
	{
		schema: 'case',
		schemaTitle: 'Cases',
		application: 'dossiq',
		notification: 'caseHandoffIntake',
		enabled: false,
		source: 'app-default',
	},
]

/**
 * Mount the pane exactly as `CnAppRoot` does: with nothing.
 *
 * @param {object} provide What a CnAppRoot ancestor would inject.
 * @return {Promise<object>} The wrapper, after its own read.
 */
async function mountPane(provide = {}) {
	const wrapper = mount(CnNotificationPreferences, {
		global: {
			provide,
			stubs: {
				NcAppSettingsSection: { template: '<section><slot /></section>' },
				NcButton: { template: '<button><slot /></button>' },
				NcCheckboxRadioSwitch: {
					props: ['modelValue'],
					template: '<label class="switch" :data-checked="String(modelValue)"><slot /></label>',
				},
				NcEmptyContent: {
					props: ['name'],
					template: '<div class="empty">{{ name }}</div>',
				},
				NcLoadingIcon: true,
			},
		},
	})
	await flushPromises()
	return wrapper
}

beforeEach(() => {
	jest.clearAllMocks()
	axios.get.mockResolvedValue({ data: { results: RESULTS, total: RESULTS.length } })
	axios.put.mockResolvedValue({ data: {} })
})

describe('mounted with no props at all', () => {
	it('fetches its own preferences', async () => {
		// The whole contract. A caller that passes nothing gets a working pane,
		// which is how CnAppRoot mounts it.
		await mountPane()

		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toBe('/apps/openregister/api/notification-preferences')
	})

	it('renders a populated pane, one switch per notification', async () => {
		const wrapper = await mountPane()

		const switches = wrapper.findAll('.switch')
		expect(switches.length).toBe(2)
		expect(wrapper.text()).toContain('caseAssigned')
	})

	it('shows what each one is set to, rather than defaulting everything off', async () => {
		const wrapper = await mountPane()

		const switches = wrapper.findAll('.switch')
		expect(switches.map((entry) => entry.attributes('data-checked'))).toEqual(['true', 'false'])
	})

	it('does not render the empty state when there are preferences, which is the control', async () => {
		// Without this, a pane that always rendered "no notifications" would
		// still pass a test that only counted a fetch.
		const wrapper = await mountPane()

		expect(wrapper.find('.empty').exists()).toBe(false)
	})

	it('says so when the app really has none', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		const wrapper = await mountPane()

		expect(wrapper.find('.empty').text()).toBe('No notifications')
	})

	it('says the preferences could not be loaded rather than showing an empty pane', async () => {
		// An empty pane and an unreachable platform look identical to a reader.
		axios.get.mockRejectedValue(new Error('down'))
		const wrapper = await mountPane()

		expect(wrapper.find('.empty').text()).toBe('Notification preferences unavailable')
	})
})

describe('scoped to the app whose settings are open', () => {
	it('shows only that app\'s notifications', async () => {
		// The endpoint answers for every schema this person can read, so an
		// unscoped pane lists other apps' notifications inside this app's
		// settings modal.
		axios.get.mockResolvedValue({
			data: {
				results: [
					...RESULTS,
					{ schema: 'subsidie', schemaTitle: 'Grants', application: 'opencatalogi', notification: 'granted', enabled: true },
				],
			},
		})
		const wrapper = await mountPane({ cnAppId: 'dossiq' })

		expect(wrapper.findAll('.switch').length).toBe(2)
		expect(wrapper.text()).not.toContain('granted')
	})

	it('shows everything when there is no app to scope by, which is the control', async () => {
		// Standalone, outside CnAppRoot. An always-empty pane would be worse
		// than an unscoped one.
		const wrapper = await mountPane()

		expect(wrapper.findAll('.switch').length).toBe(2)
	})
})
