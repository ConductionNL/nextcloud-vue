/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The optional "Date field for the period" of the register-source widget
 * forms: the date fields sampled from a source's records, the select that
 * shows only where the host dashboard offers a period, and the stat,
 * stats-block and table forms that keep the choice as the source's
 * `periodField`.
 */
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import CnObjectListWidgetForm from '../../src/components/CnObjectListWidgetForm/CnObjectListWidgetForm.vue'
import CnPeriodFieldSelect from '../../src/components/CnPeriodFieldSelect/CnPeriodFieldSelect.vue'
import CnStatsBlockWidgetForm from '../../src/components/CnStatsBlockWidgetForm/CnStatsBlockWidgetForm.vue'
import CnStatWidgetForm from '../../src/components/CnStatWidgetForm/CnStatWidgetForm.vue'
import { dateFieldsOf, fetchDateFields } from '../../src/utils/fetchDateFields.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('../../src/utils/fetchSchemaProperties.js', () => ({ fetchSchemaProperties: jest.fn(async () => []) }))

const axios = require('@nextcloud/axios').default

const records = [
	{ '@self': { created: '2026-01-01' }, title: 'Bouwvergunning', startDate: '2026-10-02', closedAt: null, decidedOn: '2026-11-01T09:30:00+01:00', count: 3 },
	{ title: 'Kapvergunning', startDate: '2026-11-15', closedAt: '2026-11-20T12:00:00Z', decidedOn: 'later', count: 1 },
]

const NcSelect = {
	name: 'NcSelect',
	props: ['modelValue', 'options', 'inputLabel', 'placeholder', 'clearable', 'loading'],
	template: '<div class="nc-select" />',
}

beforeEach(() => {
	axios.get.mockReset()
})

describe('dateFieldsOf', () => {
	it('keeps the fields whose every value is an ISO date, metadata and empty values left out', () => {
		expect(dateFieldsOf(records)).toEqual(['closedAt', 'startDate'])
	})

	it('reads nothing from no records', () => {
		expect(dateFieldsOf([])).toEqual([])
		expect(dateFieldsOf(null)).toEqual([])
		expect(dateFieldsOf([null, 'x'])).toEqual([])
	})
})

describe('fetchDateFields', () => {
	it('samples five records once per register and schema', async () => {
		axios.get.mockResolvedValue({ data: { results: records } })
		expect(await fetchDateFields('zaken', 'zaak')).toEqual(['closedAt', 'startDate'])
		expect(await fetchDateFields('zaken', 'zaak')).toEqual(['closedAt', 'startDate'])
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toContain('/apps/openregister/api/objects/zaken/zaak')
		expect(axios.get.mock.calls[0][1]).toEqual({ params: { _limit: 5 } })
	})

	it('answers no fields without a register or schema, and when the records cannot be read', async () => {
		expect(await fetchDateFields('', 'zaak')).toEqual([])
		axios.get.mockRejectedValue(new Error('403'))
		expect(await fetchDateFields('geheim', 'zaak')).toEqual([])
		expect(axios.get).toHaveBeenCalledTimes(1)
	})
})

describe('CnPeriodFieldSelect', () => {
	it('renders nothing and reads nothing where the host offers no period', async () => {
		const wrapper = mount(CnPeriodFieldSelect, { propsData: { register: 'zaken', schema: 'zaak' }, stubs: { NcSelect } })
		await flushPromises()
		expect(wrapper.findComponent(NcSelect).exists()).toBe(false)
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('offers the date fields where the host offers a period, keeping a stored choice', async () => {
		axios.get.mockResolvedValue({ data: { results: records } })
		const wrapper = mount(CnPeriodFieldSelect, {
			propsData: { register: 'meldingen', schema: 'melding', value: 'reportedOn' },
			provide: { cnOffersPeriodField: ref(true) },
			stubs: { NcSelect },
		})
		await flushPromises()
		const select = wrapper.findComponent(NcSelect)
		expect(select.props('options')).toEqual(['reportedOn', 'closedAt', 'startDate'])
		expect(select.props('inputLabel')).toBe('Date field for the period')

		select.vm.$emit('update:modelValue', 'startDate')
		select.vm.$emit('update:modelValue', null)
		expect(wrapper.emitted('update')).toEqual([['startDate'], ['']])
	})
})

describe('the register-source forms keep the period field', () => {
	it('stats block: on dataSource, written only when set', () => {
		const w = shallowMount(CnStatsBlockWidgetForm, { propsData: { editingWidget: { content: { dataSource: { register: 'r', schema: 's', periodField: 'startDate' } } } } })
		expect(w.vm.assembledContent.dataSource.periodField).toBe('startDate')
		expect(w.findComponent(CnPeriodFieldSelect).props()).toMatchObject({ register: 'r', schema: 's', value: 'startDate' })
		w.vm.updateField('periodField', '')
		expect(w.vm.assembledContent.dataSource).not.toHaveProperty('periodField')
	})

	it('stat card: on source, written only when set', () => {
		const w = shallowMount(CnStatWidgetForm, { propsData: { editingWidget: { content: { source: { register: 'r', schema: 's', metric: 'count', periodField: 'startDate' } } } } })
		expect(w.vm.assembledContent.source.periodField).toBe('startDate')
		w.vm.updateField('periodField', '')
		expect(w.vm.assembledContent.source).not.toHaveProperty('periodField')
	})

	it('table: on the content itself, written only when set', () => {
		const w = shallowMount(CnObjectListWidgetForm, { propsData: { editingWidget: { content: { register: 'r', schema: 's', periodField: 'startDate' } } } })
		expect(w.vm.assembledContent.periodField).toBe('startDate')
		w.vm.updatePeriodField('')
		expect(w.vm.assembledContent).not.toHaveProperty('periodField')
		w.vm.updatePeriodField('closedAt')
		expect(w.emitted('update:content').at(-1)[0].periodField).toBe('closedAt')
	})
})
