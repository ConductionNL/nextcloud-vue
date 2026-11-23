/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A log table's cells (DqZaakContact contact moments): the date widget's short
 * date with its time, the icon-label widget's icon picked by value, and the
 * object list handing its `rowTitle` to the table.
 *
 * @spec openspec/changes/board-log-table-plain-cells/specs/board-log-table-plain-cells/spec.md
 */
import { mount, shallowMount } from '@vue/test-utils'
import CnCellRenderer from '../../src/components/CnCellRenderer/CnCellRenderer.vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import { registerTranslations } from '../../src/l10n/index.js'

const thisYear = new Date().getFullYear()

beforeAll(() => {
	globalThis._nc_l10n_language = 'nl'
	globalThis._nc_l10n_locale = 'en_US'
	registerTranslations()
})

afterAll(() => {
	globalThis._nc_l10n_language = 'en'
	globalThis._nc_l10n_locale = 'en'
	registerTranslations()
})

describe('date widget: widgetProps.short', () => {
	const at = new Date(thisYear, 9, 5, 9, 15).toISOString()

	it('writes the short date with the time after a comma', () => {
		const text = mount(CnCellRenderer, { propsData: { value: at, widget: 'date', widgetProps: { short: true, showTime: true } } }).find('time').text()
		expect(text).toBe('5 okt, 09:15')
	})

	it('writes the short date alone without showTime, in any look', () => {
		expect(mount(CnCellRenderer, { propsData: { value: at, widget: 'date', widgetProps: { short: true } } }).find('time').text()).toBe('5 okt')
	})

	it('adds the year outside the current year', () => {
		const old = new Date(2024, 1, 14, 9, 0).toISOString()
		expect(mount(CnCellRenderer, { propsData: { value: old, widget: 'date', widgetProps: { short: true, showTime: true } } }).find('time').text()).toBe('14 feb 2024, 09:00')
	})
})

describe('iconLabel widget: widgetProps.icons', () => {
	const property = { type: 'string', enum: ['email', 'phone'], enumLabels: { email: 'E-mail', phone: 'Telefoon' } }

	it('draws the icon the value maps to before its label', () => {
		const w = mount(CnCellRenderer, {
			propsData: { value: 'email', property, widget: 'iconLabel', widgetProps: { icons: { email: 'EmailOutline', phone: 'Phone' }, icon: 'MessageOutline' } },
			stubs: { CnIcon: { props: ['name'], template: '<i class="icon-stub" :data-name="name" />' } },
		})
		expect(w.find('.icon-stub').attributes('data-name')).toBe('EmailOutline')
		expect(w.text()).toContain('E-mail')
	})

	it('falls back to widgetProps.icon for a value without an entry', () => {
		const w = mount(CnCellRenderer, {
			propsData: { value: 'phone', property, widget: 'iconLabel', widgetProps: { icons: { email: 'EmailOutline' }, icon: 'MessageOutline' } },
			stubs: { CnIcon: { props: ['name'], template: '<i class="icon-stub" :data-name="name" />' } },
		})
		expect(w.find('.icon-stub').attributes('data-name')).toBe('MessageOutline')
	})
})

describe('CnObjectListWidget: content.rowTitle', () => {
	function mountList(content) {
		return shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'r', schema: 'contactmoment', columns: [{ key: 'startTime' }], ...content } },
			stubs: { CnFormDialog: true },
			mocks: { t: (_app, s) => s },
		})
	}

	it('hands rowTitle to the table, link by default', async () => {
		const w = mountList({ rowTitle: 'text' })
		w.vm.rows = [{ id: '1', startTime: '2026-10-05T09:15:00Z' }]
		await w.vm.$nextTick()
		expect(w.findComponent({ name: 'CnDataTable' }).props('rowTitle')).toBe('text')

		const d = mountList({})
		d.vm.rows = [{ id: '1', startTime: '2026-10-05T09:15:00Z' }]
		await d.vm.$nextTick()
		expect(d.findComponent({ name: 'CnDataTable' }).props('rowTitle')).toBe('link')
	})
})
