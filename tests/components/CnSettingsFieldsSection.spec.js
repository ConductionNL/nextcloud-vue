/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings section declared as fields: it reads the app's settings, draws
 * the fields in columns, and saves them with one Save, which is on only while
 * something changed. A secret is replace-only, a failing field says why, and
 * the section says whether it saved. CnSettingsField is the shared field
 * CnSettingsPage renders too.
 *
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-section-declared-as-fields-reads-and-saves-the-apps-settings
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-one-save-per-section-with-a-dirty-state
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-failing-field-says-why
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-secret-is-replace-only
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnSettingsField from '../../src/components/CnSettingsField/CnSettingsField.vue'
import CnSettingsFieldsSection from '../../src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))

const TEXT = { props: ['modelValue', 'label', 'type', 'placeholder', 'error'], emits: ['update:modelValue'], template: '<label class="text">{{ label }}<input :type="type || \'text\'" :value="modelValue" :placeholder="placeholder" :aria-invalid="error ? \'true\' : null" @input="$emit(\'update:modelValue\', $event.target.value)"></label>' }
const STUBS = {
	NcTextField: TEXT,
	NcTextArea: TEXT,
	NcSelect: { props: ['modelValue', 'options', 'inputLabel'], emits: ['update:modelValue'], template: '<div class="select" :data-input-label="inputLabel" :data-options="JSON.stringify(options)" :data-value="modelValue && modelValue.value"></div>' },
	NcCheckboxRadioSwitch: { props: ['modelValue', 'type'], emits: ['update:modelValue'], template: '<label class="switch" :data-type="type"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>' },
	NcSettingsSection: { props: ['name'], template: '<section class="settings-section"><h2>{{ name }}</h2><slot /></section>' },
	NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
	NcButton: { props: ['disabled', 'type'], template: '<button class="button" :type="type || \'button\'" :disabled="disabled"><slot /></button>' },
}

const FIELDS = [
	{ key: 'baseUrl', label: 'Server address', required: true, pattern: '^https://', patternMessage: 'Starts with https://', hint: 'The address of the service.' },
	{ key: 'apiKey', label: 'API key', type: 'secret' },
	{ key: 'mode', label: 'Mode', type: 'select', options: [{ value: 'live', label: 'Live' }, { value: 'test', label: 'Test' }] },
	{ key: 'retries', label: 'Retries', type: 'number', min: 0, max: 5 },
	{ key: 'enabled', label: 'Enabled', type: 'switch' },
	{ key: 'notes', label: 'Notes', type: 'textarea', wide: true },
]

/**
 * @param {object} props Extra props.
 * @return {Promise<object>}
 */
async function mountSection(props = {}) {
	const wrapper = mount(CnSettingsFieldsSection, {
		props: { appId: 'myapp', name: 'Connection', fields: FIELDS, columns: 2, ...props },
		global: { stubs: STUBS },
	})
	await flushPromises()
	return wrapper
}

const input = (wrapper, key) => wrapper.find(`[data-testid="cn-settings-field-${key}"] input, [data-testid="cn-settings-field-${key}"] textarea`)
const save = (wrapper) => wrapper.find('[data-testid="cn-settings-fields-save"]')

describe('CnSettingsFieldsSection', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.request.mockReset()
		axios.get.mockResolvedValue({ data: { baseUrl: 'https://api.example.org', apiKey: 'stored-secret', mode: 'live', retries: 3, enabled: true, notes: '' } })
		axios.request.mockResolvedValue({ data: {} })
	})

	it('reads the app\'s settings endpoint and fills the fields, never the secret', async () => {
		const wrapper = await mountSection()
		expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/apps/myapp/api/settings'))
		expect(input(wrapper, 'baseUrl').element.value).toBe('https://api.example.org')
		expect(input(wrapper, 'apiKey').element.value).toBe('')
		expect(input(wrapper, 'apiKey').attributes('placeholder')).toBe('Stored. Type a new value to replace it.')
		expect(wrapper.find('[data-testid="cn-settings-field-mode"] .select').attributes('data-value')).toBe('live')
		expect(wrapper.find('[data-testid="cn-settings-field-mode"] .select').attributes('data-input-label')).toBe('Mode')
		expect(wrapper.find('.cn-settings-fields__grid').classes()).toContain('cn-settings-fields__grid--2')
		expect(wrapper.find('[data-testid="cn-settings-field-notes"]').classes()).toContain('cn-settings-fields__field--wide')
		expect(wrapper.text()).toContain('The address of the service.')
	})

	it('reads a configured url and a nested values path', async () => {
		axios.get.mockResolvedValue({ data: { settings: { baseUrl: 'https://x.example' } } })
		const wrapper = await mountSection({ url: '/apps/other/api/config', valuesPath: 'settings' })
		expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/apps/other/api/config'))
		expect(input(wrapper, 'baseUrl').element.value).toBe('https://x.example')
	})

	it('enables Save only while something changed, and says so', async () => {
		const wrapper = await mountSection()
		expect(save(wrapper).attributes('disabled')).toBeDefined()
		expect(wrapper.find('[data-testid="cn-settings-fields-dirty"]').exists()).toBe(false)
		await input(wrapper, 'baseUrl').setValue('https://api2.example.org')
		expect(save(wrapper).attributes('disabled')).toBeUndefined()
		expect(wrapper.find('[data-testid="cn-settings-fields-dirty"]').text()).toBe('Unsaved changes')
	})

	it('saves the section in one PUT, leaving out an untouched secret', async () => {
		const wrapper = await mountSection()
		await input(wrapper, 'baseUrl').setValue('https://api2.example.org')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request).toHaveBeenCalledTimes(1)
		const call = axios.request.mock.calls[0][0]
		expect(call.method).toBe('put')
		expect(call.url).toContain('/apps/myapp/api/settings')
		expect(call.data).toEqual({ baseUrl: 'https://api2.example.org', mode: 'live', retries: 3, enabled: true, notes: '' })
		expect(wrapper.find('[data-testid="cn-settings-fields-notice"]').text()).toBe('Saved.')
		expect(wrapper.find('[data-testid="cn-settings-fields-notice"]').attributes('data-type')).toBe('success')
		expect(save(wrapper).attributes('disabled')).toBeDefined()
		expect(wrapper.emitted('saved')[0][0]).toEqual(call.data)
	})

	it('sends a typed secret once, then shows it as stored again', async () => {
		axios.get.mockResolvedValue({ data: { baseUrl: 'https://a.example' } })
		const wrapper = await mountSection()
		expect(input(wrapper, 'apiKey').attributes('placeholder')).toBe('')
		await input(wrapper, 'apiKey').setValue('new-secret')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request.mock.calls[0][0].data.apiKey).toBe('new-secret')
		expect(input(wrapper, 'apiKey').element.value).toBe('')
		expect(input(wrapper, 'apiKey').attributes('placeholder')).toBe('Stored. Type a new value to replace it.')
	})

	it('marks a failing field, says why, and sends nothing', async () => {
		const wrapper = await mountSection()
		await input(wrapper, 'baseUrl').setValue('http://plain.example')
		await input(wrapper, 'retries').setValue('9')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-settings-field-error-baseUrl"]').text()).toBe('Starts with https://')
		expect(wrapper.find('[data-testid="cn-settings-field-error-retries"]').text()).toBe('Retries must be at most 5.')
		expect(input(wrapper, 'baseUrl').attributes('aria-invalid')).toBe('true')
		expect(wrapper.find('[data-testid="cn-settings-fields-notice"]').text()).toBe('Check the marked fields.')
		await input(wrapper, 'baseUrl').setValue('')
		await wrapper.find('form').trigger('submit')
		expect(wrapper.find('[data-testid="cn-settings-field-error-baseUrl"]').text()).toBe('Server address is required.')
	})

	it('says why a save failed', async () => {
		axios.request.mockRejectedValue({ response: { status: 500, data: { message: 'Database is read-only' } } })
		const wrapper = await mountSection()
		await input(wrapper, 'baseUrl').setValue('https://api3.example.org')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		const notice = wrapper.find('[data-testid="cn-settings-fields-notice"]')
		expect(notice.attributes('data-type')).toBe('error')
		expect(notice.text()).toContain('Database is read-only')
		expect(wrapper.emitted('save-error')).toHaveLength(1)
	})
})

describe('CnSettingsField', () => {
	it('labels a select through NcSelect and reads sourced options', async () => {
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [{ id: 7, title: 'Register A' }, { id: 8, title: 'Register B' }] }) }))
		const wrapper = mount(CnSettingsField, {
			props: { field: { key: 'register', label: 'Register', type: 'select', optionsUrl: '/apps/openregister/api/registers', optionLabel: 'title', optionValue: 'id' }, modelValue: 8 },
			global: { stubs: STUBS },
		})
		await flushPromises()
		const select = wrapper.find('.select')
		expect(select.attributes('data-input-label')).toBe('Register')
		expect(JSON.parse(select.attributes('data-options'))).toEqual([{ label: 'Register A', value: 7 }, { label: 'Register B', value: 8 }])
		expect(select.attributes('data-value')).toBe('8')
	})

	it('draws a boolean as a checkbox and a switch as a switch, as CnSettingsPage did', () => {
		const make = (type) => mount(CnSettingsField, { props: { field: { key: 'on', label: 'On', type } }, global: { stubs: STUBS } })
		expect(make('boolean').find('.switch').attributes('data-type')).toBe('checkbox')
		expect(make('switch').find('.switch').attributes('data-type')).toBe('switch')
	})

	it('ties its hint or error to the control', () => {
		const wrapper = mount(CnSettingsField, { props: { field: { key: 'x', label: 'X' }, hint: 'A hint', error: '' }, global: { stubs: { ...STUBS, NcTextField: { inheritAttrs: false, template: '<input v-bind="$attrs">' } } } })
		const hint = wrapper.find('.cn-settings-field__hint')
		expect(wrapper.find('input').attributes('aria-describedby')).toBe(hint.attributes('id'))
	})
})
