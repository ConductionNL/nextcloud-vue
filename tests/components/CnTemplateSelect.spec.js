/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTemplateSelect: start a form from a named template (dossiq's
 * RecordTemplateSelect and TemplatePicker, now one component).
 *
 * @spec openspec/changes/dq-abstract-forms/specs/template-select/spec.md
 */
import axios from '@nextcloud/axios'
import { showError } from '@nextcloud/dialogs'
import { flushPromises, mount } from '@vue/test-utils'
import CnTemplateSelect from '../../src/components/CnTemplateSelect/CnTemplateSelect.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showError: jest.fn() }))

/**
 * @param {object} props Props.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The select.
 */
async function mountSelect(props) {
	const wrapper = mount(CnTemplateSelect, { props: { inputLabel: 'Start from a template', ...props } })
	await flushPromises()
	return wrapper
}

beforeEach(() => {
	axios.get.mockReset()
	showError.mockReset()
})

describe('CnTemplateSelect over record templates', () => {
	it('lists the named templates of the schema it is given', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ uuid: 't1', name: 'Quick plan', values: { scope: 'all' } }, { uuid: 't2' }, { name: 'no id' }] } })
		const wrapper = await mountSelect({ schema: 'searchPlan' })

		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/record-templates', { params: { schema: 'searchPlan' } })
		expect(wrapper.findComponent({ name: 'NcSelect' }).attributes('inputlabel')).toBe('Start from a template')
		expect(wrapper.vm.options).toEqual([{ id: 't1', name: 'Quick plan', values: { scope: 'all' } }])
	})

	it('hands the chosen template to the form, and null when cleared', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ uuid: 't1', name: 'Quick plan', values: { scope: 'all' } }] } })
		const wrapper = await mountSelect({ schema: 'searchPlan' })
		const select = wrapper.findComponent({ name: 'NcSelect' })
		select.vm.$emit('update:modelValue', wrapper.vm.options[0])
		select.vm.$emit('update:modelValue', null)

		expect(wrapper.emitted('apply')).toEqual([[{ id: 't1', name: 'Quick plan', values: { scope: 'all' } }], [null]])
	})

	it('draws nothing while there is no template, and asks nothing without a source', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		const empty = await mountSelect({ schema: 'searchPlan' })
		expect(empty.find('.cn-template-select').exists()).toBe(false)

		axios.get.mockClear()
		await mountSelect({})
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('hides itself on a failed read and says so in a toast, never a stale list', async () => {
		axios.get.mockResolvedValueOnce({ data: { results: [{ uuid: 't1', name: 'Quick plan' }] } })
		const wrapper = await mountSelect({ schema: 'a' })
		axios.get.mockRejectedValueOnce(new Error('down'))
		await wrapper.setProps({ schema: 'b' })
		await flushPromises()

		expect(wrapper.find('.cn-template-select').exists()).toBe(false)
		expect(showError).toHaveBeenCalledWith('Could not read the templates')
	})
})

describe('CnTemplateSelect over an app endpoint', () => {
	it('reads the url with its params and maps each row', async () => {
		axios.get.mockResolvedValue({ data: { items: [{ id: 'c1', name: 'Rejection', body: 'Dear', presets: { result: 'r1' } }, { name: 'no id' }] } })
		const mapOption = (row) => (row.id ? { id: row.id, name: row.name, body: row.body, presets: row.presets } : null)
		const wrapper = await mountSelect({ url: '/apps/myapp/api/content-templates/result', params: { caseType: 'ct-1', case: 'c-9' }, mapOption })

		expect(axios.get).toHaveBeenCalledWith('/nc/apps/myapp/api/content-templates/result', { params: { caseType: 'ct-1', case: 'c-9' } })
		expect(wrapper.vm.options).toEqual([{ id: 'c1', name: 'Rejection', body: 'Dear', presets: { result: 'r1' } }])
	})

	it('reads again when the params change', async () => {
		axios.get.mockResolvedValue({ data: { items: [] } })
		const wrapper = await mountSelect({ url: '/apps/myapp/api/t', params: { caseType: 'a' } })
		await wrapper.setProps({ params: { caseType: 'b' } })
		await flushPromises()

		expect(axios.get).toHaveBeenLastCalledWith('/nc/apps/myapp/api/t', { params: { caseType: 'b' } })
	})
})

describe('CnTemplateSelect test id', () => {
	it('puts the host test id on the select a test clicks', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ uuid: 't1', name: 'Quick plan' }] } })
		const wrapper = mount(CnTemplateSelect, { props: { inputLabel: 'Template', schema: 's' }, attrs: { 'data-testid': 'template-picker' } })
		await flushPromises()

		expect(wrapper.findComponent({ name: 'NcSelect' }).attributes('data-testid')).toBe('template-picker')
	})
})
