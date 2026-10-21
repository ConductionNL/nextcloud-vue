/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The field kinds that hold more than one value: a multi-choice field
 * (`checkboxes`, or `select` with `multiple`) saving a list, a `pairs` field
 * saving key-to-value rows as one object, a field reading one key inside a
 * JSON-valued setting (`path`), and a scope field whose value fills the
 * section's url (`{key}` tokens) and reloads it.
 *
 * @spec openspec/changes/settings-fields-lists/specs/settings-fields-section/spec.md#requirement-a-field-can-hold-several-values
 * @spec openspec/changes/settings-fields-lists/specs/settings-fields-section/spec.md#requirement-a-field-can-hold-key-to-value-rows
 * @spec openspec/changes/settings-fields-lists/specs/settings-fields-section/spec.md#requirement-a-field-can-edit-one-key-of-a-json-setting
 * @spec openspec/changes/settings-fields-lists/specs/settings-fields-section/spec.md#requirement-a-scope-field-fills-the-url
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnSettingsFieldsSection from '../../src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))

const TEXT = { props: ['modelValue', 'label', 'type', 'placeholder', 'error'], emits: ['update:modelValue'], template: '<label class="text">{{ label }}<input :type="type || \'text\'" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)"></label>' }
const STUBS = {
	NcTextField: TEXT,
	NcTextArea: { ...TEXT, template: '<label class="text">{{ label }}<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea></label>' },
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'inputLabel', 'multiple'], emits: ['update:modelValue'], template: '<div class="select" :data-multiple="String(!!multiple)"></div>' },
	NcCheckboxRadioSwitch: { props: ['modelValue', 'type', 'value'], emits: ['update:modelValue'], template: '<label class="switch" :data-type="type" :data-checked="type === \'radio\' ? String(modelValue === value) : String(!!modelValue)"><input type="checkbox" :checked="type === \'radio\' ? modelValue === value : modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>' },
	NcSettingsSection: { props: ['name'], template: '<section class="settings-section"><h2>{{ name }}</h2><slot /></section>' },
	NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
	NcButton: { props: ['disabled', 'type', 'ariaLabel'], emits: ['click'], template: '<button class="button" :type="type || \'button\'" :aria-label="ariaLabel" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
}

/**
 * @param {object} props The section's props.
 * @return {Promise<object>}
 */
async function mountSection(props) {
	const wrapper = mount(CnSettingsFieldsSection, {
		props: { appId: 'myapp', name: 'Section', ...props },
		global: { stubs: STUBS },
	})
	await flushPromises()
	return wrapper
}

const field = (wrapper, key) => wrapper.find(`[data-testid="cn-settings-field-${key}"]`)

/**
 * Submit the section's form and let its requests settle.
 *
 * @param {object} wrapper The mounted section.
 * @return {Promise<void>}
 */
async function submit(wrapper) {
	await wrapper.find('form').trigger('submit')
	await flushPromises()
}

const SEARCH = { key: 'searchFields', label: 'Search on', type: 'checkboxes', options: [{ value: 'name', label: 'Name' }, { value: 'email', label: 'E-mail' }, { value: 'phone', label: 'Phone' }] }

describe('CnSettingsFieldsSection fields with several values', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.request.mockReset()
		axios.request.mockResolvedValue({ data: {} })
	})

	it('draws checkboxes in a fieldset named by the label and saves the chosen values as a list, in option order', async () => {
		axios.get.mockResolvedValue({ data: { searchFields: ['email'] } })
		const wrapper = await mountSection({ fields: [SEARCH] })
		expect(field(wrapper, 'searchFields').find('legend').text()).toBe('Search on')
		expect(field(wrapper, 'searchFields').find('[data-testid="cn-settings-field-option-searchFields-email"]').attributes('data-checked')).toBe('true')
		expect(field(wrapper, 'searchFields').find('[data-testid="cn-settings-field-option-searchFields-name"]').attributes('data-checked')).toBe('false')
		await field(wrapper, 'searchFields').find('[data-testid="cn-settings-field-option-searchFields-name"] input').setChecked(true)
		await submit(wrapper)
		expect(axios.request.mock.calls[0][0].data).toEqual({ searchFields: ['name', 'email'] })
	})

	it('reads a multi-choice value stored as JSON text or comma text, and saves it back in that form', async () => {
		axios.get.mockResolvedValue({ data: { json: '["name"]', csv: 'phone,email' } })
		const wrapper = await mountSection({
			fields: [
				{ ...SEARCH, key: 'json', saveAs: 'json' },
				{ ...SEARCH, key: 'csv', saveAs: 'csv' },
			],
		})
		expect(field(wrapper, 'json').find('[data-testid="cn-settings-field-option-json-name"]').attributes('data-checked')).toBe('true')
		expect(field(wrapper, 'csv').find('[data-testid="cn-settings-field-option-csv-email"]').attributes('data-checked')).toBe('true')
		await field(wrapper, 'json').find('[data-testid="cn-settings-field-option-json-phone"] input').setChecked(true)
		await field(wrapper, 'csv').find('[data-testid="cn-settings-field-option-csv-phone"] input').setChecked(false)
		await submit(wrapper)
		expect(axios.request.mock.calls[0][0].data).toEqual({ json: '["name","phone"]', csv: 'email' })
	})

	it('refuses an empty required multi-choice field', async () => {
		axios.get.mockResolvedValue({ data: { searchFields: ['name'] } })
		const wrapper = await mountSection({ fields: [{ ...SEARCH, required: true }] })
		await field(wrapper, 'searchFields').find('[data-testid="cn-settings-field-option-searchFields-name"] input').setChecked(false)
		await submit(wrapper)
		expect(axios.request).not.toHaveBeenCalled()
		expect(field(wrapper, 'searchFields').text()).toContain('Search on is required.')
	})

	it('offers a select with multiple as a multi-select and saves the chosen values as a list', async () => {
		axios.get.mockResolvedValue({ data: { provinces: ['UT'] } })
		const wrapper = await mountSection({
			fields: [{ key: 'provinces', label: 'Provinces', type: 'select', multiple: true, options: [{ value: 'UT', label: 'Utrecht' }, { value: 'GE', label: 'Gelderland' }] }],
		})
		const select = wrapper.findComponent({ name: 'NcSelect' })
		expect(select.props('multiple')).toBe(true)
		expect(select.props('modelValue')).toEqual([expect.objectContaining({ value: 'UT', label: 'Utrecht' })])
		select.vm.$emit('update:modelValue', [{ value: 'UT', label: 'Utrecht' }, { value: 'GE', label: 'Gelderland' }])
		await flushPromises()
		await submit(wrapper)
		expect(axios.request.mock.calls[0][0].data).toEqual({ provinces: ['UT', 'GE'] })
	})
})

describe('CnSettingsFieldsSection key-to-value rows', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.request.mockReset()
		axios.request.mockResolvedValue({ data: {} })
	})

	const RATES = { key: 'rates', label: 'Exchange rates', type: 'pairs', keyLabel: 'Currency', valueLabel: 'Rate', valueType: 'number', addLabel: 'Add a rate' }

	it('draws one row per stored key and saves the rows as one object', async () => {
		axios.get.mockResolvedValue({ data: { rates: { USD: 0.92 } } })
		const wrapper = await mountSection({ fields: [RATES] })
		const rows = field(wrapper, 'rates').findAll('[data-testid="cn-settings-field-pair-rates"]')
		expect(rows).toHaveLength(1)
		expect(rows[0].findAll('input')[0].element.value).toBe('USD')
		expect(rows[0].findAll('input')[1].element.value).toBe('0.92')

		await field(wrapper, 'rates').find('[data-testid="cn-settings-field-pair-add-rates"]').trigger('click')
		const added = field(wrapper, 'rates').findAll('[data-testid="cn-settings-field-pair-rates"]')[1]
		await added.findAll('input')[0].setValue('GBP')
		await added.findAll('input')[1].setValue('1.17')
		await submit(wrapper)
		expect(axios.request.mock.calls[0][0].data).toEqual({ rates: { USD: 0.92, GBP: 1.17 } })
	})

	it('removes a row, leaves out rows without a key, and saves JSON text with saveAs json', async () => {
		axios.get.mockResolvedValue({ data: { rates: '{"USD":0.92,"GBP":1.17}' } })
		const wrapper = await mountSection({ fields: [{ ...RATES, saveAs: 'json' }] })
		const remove = field(wrapper, 'rates').findAll('[data-testid="cn-settings-field-pair-remove-rates"]')
		expect(remove[0].attributes('aria-label')).toBe('Remove USD')
		await remove[0].trigger('click')
		await field(wrapper, 'rates').find('[data-testid="cn-settings-field-pair-add-rates"]').trigger('click')
		await submit(wrapper)
		expect(axios.request.mock.calls[0][0].data).toEqual({ rates: '{"GBP":1.17}' })
	})

	it('refuses two rows with the same key', async () => {
		axios.get.mockResolvedValue({ data: { rates: { USD: 1 } } })
		const wrapper = await mountSection({ fields: [RATES] })
		await field(wrapper, 'rates').find('[data-testid="cn-settings-field-pair-add-rates"]').trigger('click')
		const added = field(wrapper, 'rates').findAll('[data-testid="cn-settings-field-pair-rates"]')[1]
		await added.findAll('input')[0].setValue('USD')
		await submit(wrapper)
		expect(axios.request).not.toHaveBeenCalled()
		expect(field(wrapper, 'rates').text()).toContain('Exchange rates holds USD twice.')
	})
	it('checks each key against pattern and each value against valueAbove', async () => {
		axios.get.mockResolvedValue({ data: { rates: { USD: 1 } } })
		const fields = [{ ...RATES, pattern: '^[A-Z]{3}$', patternMessage: 'Use a three-letter currency code for every rate.', valueAbove: 0, valueMessage: 'Every rate must be a number above zero.' }]
		const wrapper = await mountSection({ fields })
		await field(wrapper, 'rates').find('[data-testid="cn-settings-field-pair-add-rates"]').trigger('click')
		let added = field(wrapper, 'rates').findAll('[data-testid="cn-settings-field-pair-rates"]')[1]
		await added.findAll('input')[0].setValue('DOLLAR')
		await added.findAll('input')[1].setValue('2')
		await submit(wrapper)
		expect(axios.request).not.toHaveBeenCalled()
		expect(field(wrapper, 'rates').text()).toContain('Use a three-letter currency code for every rate.')

		added = field(wrapper, 'rates').findAll('[data-testid="cn-settings-field-pair-rates"]')[1]
		await added.findAll('input')[0].setValue('GBP')
		await added.findAll('input')[1].setValue('0')
		await submit(wrapper)
		expect(axios.request).not.toHaveBeenCalled()
		expect(field(wrapper, 'rates').text()).toContain('Every rate must be a number above zero.')
	})
})

describe('CnSettingsFieldsSection paths and scope', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.request.mockReset()
		axios.request.mockResolvedValue({ data: {} })
	})

	it('reads one key inside a JSON-valued setting and saves the whole setting back with that key changed', async () => {
		axios.get.mockResolvedValue({ data: { config: { vat_rates: '{"high":21,"low":9,"extra":5}' } } })
		const wrapper = await mountSection({
			valuesPath: 'config',
			fields: [
				{ key: 'vatHigh', path: 'vat_rates.high', label: 'High', type: 'number' },
				{ key: 'vatLow', path: 'vat_rates.low', label: 'Low', type: 'number' },
				{ key: 'vatZero', path: 'vat_rates.zero', label: 'Zero', type: 'number', default: 0 },
			],
		})
		expect(field(wrapper, 'vatHigh').find('input').element.value).toBe('21')
		expect(field(wrapper, 'vatZero').find('input').element.value).toBe('0')
		await field(wrapper, 'vatLow').find('input').setValue('6')
		await submit(wrapper)
		expect(axios.request).toHaveBeenCalledTimes(1)
		const sent = axios.request.mock.calls[0][0].data
		expect(Object.keys(sent)).toEqual(['vat_rates'])
		expect(JSON.parse(sent.vat_rates)).toEqual({ high: 21, low: 6, zero: 0, extra: 5 })
	})

	it('fills {key} in the section url from a scope field and reads again when the scope changes', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('tenantId=t2') ? { name: 'Two' } : { name: 'One' } }))
		const wrapper = await mountSection({
			url: '/apps/myapp/api/tenant-config?tenantId={tenantId}',
			fields: [
				{ key: 'tenantId', label: 'Tenant', type: 'select', scope: true, default: 't1', options: ['t1', 't2'] },
				{ key: 'name', label: 'Name' },
			],
		})
		expect(axios.get.mock.calls[0][0]).toContain('tenantId=t1')
		expect(field(wrapper, 'name').find('input').element.value).toBe('One')

		wrapper.findComponent({ name: 'NcSelect' }).vm.$emit('update:modelValue', { value: 't2', label: 't2' })
		await flushPromises()
		expect(axios.get.mock.calls.at(-1)[0]).toContain('tenantId=t2')
		expect(field(wrapper, 'name').find('input').element.value).toBe('Two')

		await field(wrapper, 'name').find('input').setValue('Second')
		await submit(wrapper)
		const call = axios.request.mock.calls[0][0]
		expect(call.url).toContain('tenantId=t2')
		expect(call.data).toEqual({ name: 'Second' })
	})
})

describe('CnSettingsFieldsSection action texts', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.request.mockReset()
	})

	it('says successText or failureText with the answer\'s values when the answer has no sentence', async () => {
		axios.get.mockResolvedValue({ data: {} })
		const fields = [{ key: 'test', label: 'Test connection', type: 'action', method: 'GET', url: '/x', okPath: 'available', successText: 'Reachable at {baseUrl}.', failureText: 'Not reachable.' }]
		axios.request.mockResolvedValueOnce({ data: { available: true, baseUrl: 'https://wiki.example' } })
		const wrapper = await mountSection({ fields })
		await wrapper.find('[data-testid="cn-settings-field-action-test"]').trigger('click')
		await flushPromises()
		let result = wrapper.find('[data-testid="cn-settings-field-action-result-test"]')
		expect(result.text()).toBe('Reachable at https://wiki.example.')
		expect(result.attributes('data-type')).toBe('success')

		axios.request.mockResolvedValueOnce({ data: { available: false } })
		await wrapper.find('[data-testid="cn-settings-field-action-test"]').trigger('click')
		await flushPromises()
		result = wrapper.find('[data-testid="cn-settings-field-action-result-test"]')
		expect(result.text()).toBe('Not reachable.')
		expect(result.attributes('data-type')).toBe('error')
	})
})
