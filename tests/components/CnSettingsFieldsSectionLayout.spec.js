/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Two layouts of a settings section the boards draw (DqBeheerinstellingen):
 * the save button beside a one-field form (`saveInline`, Serviceaccount
 * "Dit account gebruiken"), and the fields marked `advanced` behind one
 * disclosure after the rest (Zaak-e-mail "Geavanceerd").
 *
 * @spec openspec/changes/settings-fields-inline-save-and-advanced/specs/settings-fields-inline-save-and-advanced/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnSettingsFieldsSection from '../../src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))

const TEXT = { props: ['modelValue', 'label', 'error'], emits: ['update:modelValue'], template: '<label class="text">{{ label }}<input :value="modelValue" :aria-invalid="error ? \'true\' : null" @input="$emit(\'update:modelValue\', $event.target.value)"></label>' }
const STUBS = {
	NcTextField: TEXT,
	NcTextArea: TEXT,
	NcSettingsSection: { props: ['name'], template: '<section class="settings-section"><h2>{{ name }}</h2><slot /></section>' },
	NcNoteCard: { props: ['type'], template: '<div class="note"><slot /></div>' },
	NcButton: { props: ['disabled', 'type'], template: '<button class="button" :type="type || \'button\'" :disabled="disabled"><slot /></button>' },
}

/**
 * @param {object} props Props.
 * @return {Promise<object>} The section once its values loaded.
 */
async function mountSection(props) {
	const wrapper = mount(CnSettingsFieldsSection, {
		props: { appId: 'myapp', name: 'Section', ...props },
		global: { stubs: STUBS },
	})
	await flushPromises()
	return wrapper
}

const shown = (node) => node.element.style.display !== 'none'
function keys(node) {
	return node.findAll('[data-testid^="cn-settings-field-"]')
		.map((field) => field.attributes('data-testid').replace('cn-settings-field-', ''))
		.filter((key) => !key.includes('-'))
}

describe('CnSettingsFieldsSection layouts', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.request.mockReset()
		axios.get.mockResolvedValue({ data: { userId: 'svc-dossiq', folder: 'INBOX', sender: '', pattern: '' } })
		axios.request.mockResolvedValue({ data: {} })
	})

	it('draws the save button beside a one-field form with saveInline', async () => {
		const wrapper = await mountSection({ fields: [{ key: 'userId', label: 'User name' }], saveInline: true, saveLabel: 'Use this account' })
		const row = wrapper.find('[data-testid="cn-settings-fields-inline-row"]')
		expect(row.exists()).toBe(true)
		expect(row.find('[data-testid="cn-settings-field-userId"]').exists()).toBe(true)
		expect(row.find('[data-testid="cn-settings-fields-save"]').text()).toBe('Use this account')
		expect(wrapper.findAll('[data-testid="cn-settings-fields-save"]')).toHaveLength(1)
	})

	it('keeps the save button under the form without saveInline', async () => {
		const wrapper = await mountSection({ fields: [{ key: 'userId', label: 'User name' }] })
		expect(wrapper.find('[data-testid="cn-settings-fields-inline-row"]').exists()).toBe(false)
		expect(wrapper.find('.cn-settings-fields__save [data-testid="cn-settings-fields-save"]').exists()).toBe(true)
	})

	const MAIL = [
		{ key: 'folder', label: 'Folder' },
		{ key: 'sender', label: 'Sender address', advanced: true },
		{ key: 'pattern', label: 'Case number pattern', advanced: true },
	]

	it('puts the advanced fields behind one closed disclosure after the rest', async () => {
		const wrapper = await mountSection({ fields: MAIL, advancedLabel: 'Advanced' })
		expect(keys(wrapper.find('.cn-settings-fields__grid'))).toEqual(['folder'])
		const toggle = wrapper.find('[data-testid="cn-settings-fields-advanced-toggle"]')
		expect(toggle.text()).toBe('Advanced')
		expect(toggle.attributes('aria-expanded')).toBe('false')
		expect(shown(wrapper.find('[data-testid="cn-settings-fields-advanced"]'))).toBe(false)

		await toggle.trigger('click')
		expect(toggle.attributes('aria-expanded')).toBe('true')
		const advanced = wrapper.find('[data-testid="cn-settings-fields-advanced"]')
		expect(shown(advanced)).toBe(true)
		expect(toggle.attributes('aria-controls')).toBe(advanced.attributes('id'))
		expect(keys(advanced)).toEqual(['sender', 'pattern'])
	})

	it('saves an advanced field with the rest, and opens the disclosure on its error', async () => {
		const wrapper = await mountSection({ fields: [MAIL[0], { ...MAIL[1], required: true }], saveAll: true })
		await wrapper.find('[data-testid="cn-settings-fields-advanced-toggle"]').trigger('click')
		await wrapper.find('[data-testid="cn-settings-field-folder"] input').setValue('Cases')
		await wrapper.find('[data-testid="cn-settings-fields-advanced-toggle"]').trigger('click')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-settings-fields-advanced-toggle"]').attributes('aria-expanded')).toBe('true')
		expect(shown(wrapper.find('[data-testid="cn-settings-fields-advanced"]'))).toBe(true)
	})

	it('draws no disclosure when no field is advanced', async () => {
		const wrapper = await mountSection({ fields: [MAIL[0]] })
		expect(wrapper.find('[data-testid="cn-settings-fields-advanced-toggle"]').exists()).toBe(false)
	})
})
