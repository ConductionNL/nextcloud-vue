/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Two pieces of DqInstellingenAlgemeen: "Huisstijl" draws its four fields in
 * one row (`columns: 4`), and "Teksten en toegang" names a setting kept
 * elsewhere as a labelled line of text, not as an input ("Toegestane
 * websites (CORS)", a `note` field). A note holds no value: it is never read
 * as one, marked dirty or saved.
 *
 * @spec openspec/changes/settings-fields-four-columns-and-note/specs/settings-fields-four-columns-and-note/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnSettingsFieldsSection from '../../src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))

const TEXT = { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<label class="text">{{ label }}<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></label>' }
const STUBS = {
	NcTextField: TEXT,
	NcSettingsSection: { props: ['name'], template: '<section class="settings-section"><h2>{{ name }}</h2><slot /></section>' },
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
	NcButton: { props: ['disabled'], template: '<button class="button" :disabled="disabled"><slot /></button>' },
}

async function mountSection(props) {
	const wrapper = mount(CnSettingsFieldsSection, { props: { appId: 'myapp', name: 'Section', ...props }, global: { stubs: STUBS } })
	await flushPromises()
	return wrapper
}

describe('CnSettingsFieldsSection: four columns and a note', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.request.mockReset()
		axios.get.mockResolvedValue({ data: { sender: 'Gemeente', cors: 'should not be read' } })
		axios.request.mockResolvedValue({ data: {} })
	})

	it('lays the fields out in four columns when asked', async () => {
		const wrapper = await mountSection({ columns: 4, fields: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' }, { key: 'd', label: 'D' }] })
		expect(wrapper.find('.cn-settings-fields__grid').classes()).toContain('cn-settings-fields__grid--4')
		expect(CnSettingsFieldsSection.props.columns.validator(4)).toBe(true)
	})

	it('draws a note as its label and a line of text, with no input', async () => {
		const wrapper = await mountSection({
			fields: [{ key: 'cors', label: 'Allowed websites (CORS)', type: 'note', text: 'Set in the portal app, not here.' }],
		})
		const field = wrapper.find('[data-testid="cn-settings-field-cors"]')
		expect(field.find('.cn-settings-field__note-label').text()).toBe('Allowed websites (CORS)')
		expect(field.find('[data-testid="cn-settings-field-note-cors"]').text()).toBe('Set in the portal app, not here.')
		expect(field.find('input').exists()).toBe(false)
	})

	it('never saves a note', async () => {
		const wrapper = await mountSection({
			saveAll: true,
			fields: [{ key: 'sender', label: 'Sender' }, { key: 'cors', label: 'CORS', type: 'note', text: 'Elsewhere.' }],
		})
		await wrapper.find('[data-testid="cn-settings-field-sender"] input').setValue('Gemeente Zuiddrecht')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request).toHaveBeenCalled()
		expect(JSON.stringify(axios.request.mock.calls)).toContain('sender')
		const bodies = axios.request.mock.calls.map(([config]) => JSON.stringify(config.data || {}))
		expect(bodies.join(' ')).not.toContain('cors')
	})
})
