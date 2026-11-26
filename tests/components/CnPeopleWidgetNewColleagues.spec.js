/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The people widget's New colleagues selection (board LpIntranet): the form
 * offers it only when the source has a start date field, with the two
 * windows; the widget lists the source's new colleagues with role and team,
 * marks who has not started yet with the weekday, and says so when no start
 * date field exists.
 *
 * @spec openspec/changes/people-new-colleagues/specs/people-widget/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnPeopleWidget from '@/components/CnPeopleWidget/CnPeopleWidget.vue'
import CnPeopleWidgetForm from '@/components/CnPeopleWidgetForm/CnPeopleWidgetForm.vue'

jest.mock('@nextcloud/l10n', () => ({
	getLanguage: () => 'en',
	translate: (app, text, vars = {}) => text.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`)),
}))

const nl = require('../../l10n/nl.json').translations

const stubs = {
	NcSelect: {
		name: 'NcSelect',
		props: ['modelValue', 'options', 'inputLabel'],
		emits: ['update:modelValue'],
		template: '<div class="nc-select" :data-label="inputLabel" :data-value="modelValue" />',
	},
}

async function mountForm(source, props = {}) {
	const w = mount(CnPeopleWidgetForm, { props, global: { stubs, provide: { cnPeopleSource: source } } })
	await flushPromises()
	return w
}

const selection = (w) => w.findAllComponents({ name: 'NcSelect' }).find((c) => c.props('inputLabel') === 'Selection')

describe('CnPeopleWidgetForm New colleagues', () => {
	it('offers New colleagues when the source has a start date field', async () => {
		const w = await mountForm({ hasStartDateField: () => Promise.resolve(true) })
		expect(selection(w).props('options').map((o) => o.value)).toEqual(['filter', 'new'])
		expect(nl['New colleagues']).toBe("Nieuwe collega's")
	})

	it('offers no selection without a start date field', async () => {
		const w = await mountForm({ hasStartDateField: () => Promise.resolve(false) })
		expect(selection(w)).toBeUndefined()
		const none = await mountForm(null)
		expect(selection(none)).toBeUndefined()
	})

	it('emits the windows with the mode, defaults 30 and 14', async () => {
		const w = await mountForm({ hasStartDateField: () => Promise.resolve(true) })
		selection(w).vm.$emit('update:modelValue', 'new')
		await flushPromises()
		const content = w.emitted('update:content').at(-1)[0]
		expect(content).toMatchObject({ selectionMode: 'new', newSinceDays: 30, newUntilDays: 14 })
		await w.find('[data-testid="cn-people-form-new-until"]').setValue('7')
		expect(w.emitted('update:content').at(-1)[0].newUntilDays).toBe(7)
	})

	it('keeps the form invalid for a window out of range', async () => {
		const w = await mountForm({ hasStartDateField: () => Promise.resolve(true) }, { value: { selectionMode: 'new' } })
		await w.find('[data-testid="cn-people-form-new-since"]').setValue('120')
		expect(w.vm.validate()).toEqual(['Must be between 1 and 90'])
		await w.find('[data-testid="cn-people-form-new-since"]').setValue('60')
		expect(w.vm.validate()).toEqual([])
		expect(w.emitted('update:content').at(-1)[0].newSinceDays).toBe(60)
	})
})

describe('CnPeopleWidget New colleagues', () => {
	const answer = {
		configured: true,
		users: [
			{ id: 'yasmina', displayName: 'Yasmina El Amrani', role: 'Adviseur', organisation: 'Team Wonen', startDate: '2026-10-12', starts: true },
			{ id: 'lotte', displayName: 'Lotte Verhoeven', role: 'Jurist', organisation: 'Team Recht', startDate: '2026-10-01', starts: false },
		],
	}

	async function mountWidget(content, source) {
		const w = mount(CnPeopleWidget, { props: { content, dataSource: source } })
		await flushPromises()
		return w
	}

	it('lists the new colleagues with role and team and the weekday of a future start', async () => {
		const fetchNewPeople = jest.fn(() => Promise.resolve(answer))
		const w = await mountWidget({ selectionMode: 'new', layout: 'list', newSinceDays: 500 }, { fetchPeople: jest.fn(), fetchNewPeople })
		expect(fetchNewPeople).toHaveBeenCalledWith(expect.objectContaining({ since: 90, until: 14 }))
		const items = w.findAll('.cn-people-widget__item')
		expect(items).toHaveLength(2)
		expect(items[0].text()).toContain('Adviseur')
		expect(items[0].text()).toContain('Team Wonen')
		expect(items[0].find('[data-testid="cn-people-starts"]').text()).toBe('Starts Monday')
		expect(items[1].find('[data-testid="cn-people-starts"]').exists()).toBe(false)
		expect(nl['Starts {weekday}']).toBe('begint {weekday}')
	})

	it('says the administrator has not set a start date field', async () => {
		const w = await mountWidget({ selectionMode: 'new' }, { fetchPeople: jest.fn(), fetchNewPeople: () => Promise.resolve({ configured: false, users: [] }) })
		expect(w.find('[data-testid="cn-people-no-start-field"]').exists()).toBe(true)
	})

	it('falls back to the directory when the source cannot list new colleagues', async () => {
		const fetchPeople = jest.fn(() => Promise.resolve({ users: [{ uid: 'a', displayName: 'A' }], total: 1, hasMore: false }))
		const w = await mountWidget({ selectionMode: 'new' }, { fetchPeople })
		expect(fetchPeople).toHaveBeenCalled()
		expect(w.findAll('.cn-people-widget__item')).toHaveLength(1)
	})
})
