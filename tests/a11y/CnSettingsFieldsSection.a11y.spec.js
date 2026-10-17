/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnSettingsFieldsSection`: every field has a
 * label (a select through NcSelect's `inputLabel`), a failing field is marked
 * and tied to its message, and the section reads clean with real
 * `@nextcloud/vue` controls, in the default and the board look.
 *
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-failing-field-says-why
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { baseUrl: 'https://api.example.org', apiKey: 'x', mode: 'live', retries: 3, enabled: true } })),
		request: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

const { flushPromises } = require('@vue/test-utils')
const CnSettingsFieldsSection = require('../../src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue').default
const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')

const FIELDS = [
	{ key: 'baseUrl', label: 'Server address', required: true, pattern: '^https://', patternMessage: 'Starts with https://', hint: 'The address of the service.' },
	{ key: 'apiKey', label: 'API key', type: 'secret' },
	{ key: 'mode', label: 'Mode', type: 'select', options: [{ value: 'live', label: 'Live' }, { value: 'test', label: 'Test' }] },
	{ key: 'retries', label: 'Retries', type: 'number', min: 0, max: 5 },
	{ key: 'enabled', label: 'Enabled', type: 'switch' },
	{ key: 'notes', label: 'Notes', type: 'textarea', wide: true },
	{ key: 'logo', label: 'Logo', type: 'image', initials: 'Example Org', uploadUrl: '/apps/theming/ajax/uploadImage', uploadParams: { key: 'logo' } },
]

/**
 * @param {string} look The provided look.
 * @return {Promise<object>}
 */
async function mountSection(look = 'nextcloud') {
	const wrapper = mountAttached(CnSettingsFieldsSection, {
		propsData: { appId: 'myapp', name: 'Connection', fields: FIELDS, columns: 2 },
		global: { provide: { cnLook: look } },
	})
	await flushPromises()
	return wrapper
}

describe('CnSettingsFieldsSection: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations, every control labelled', async () => {
		wrapper = await mountSection()
		await expectAccessible(wrapper)
		for (const control of wrapper.element.querySelectorAll('input:not([type="hidden"]), textarea')) {
			const labelled = control.id && wrapper.element.querySelector(`label[for="${control.id}"]`)
			expect(Boolean(labelled || control.getAttribute('aria-label') || control.getAttribute('aria-labelledby'))).toBe(true)
		}
	})

	it('has no violations in the board look', async () => {
		wrapper = await mountSection('board')
		await expectAccessible(wrapper)
	})

	it('marks a failing field and ties it to its message', async () => {
		wrapper = await mountSection()
		const address = wrapper.find('[data-testid="cn-settings-field-baseUrl"] input')
		await address.setValue('http://plain.example')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		const error = wrapper.find('[data-testid="cn-settings-field-error-baseUrl"]')
		expect(error.text()).toBe('Starts with https://')
		expect(address.attributes('aria-describedby') || '').toContain(error.attributes('id'))
		await expectAccessible(wrapper)
	})
})
