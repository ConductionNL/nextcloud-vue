/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Two cells boards draw as words: an enum's label as plain text where a list
 * does not want a pill (`widget: "label"`, DqZaaktypeStatussen Archiefactie
 * "Bewaren"), and a boolean as words with one value as a pill
 * (`widgetProps: { trueLabel, falseLabel, pill }`, Eindstatus "Nee" / "Eind").
 *
 * @spec openspec/changes/cell-label-widget-and-boolean-words/specs/cell-renderer/spec.md#requirement-a-cell-can-read-as-words
 */

import { mount } from '@vue/test-utils'
import CnCellRenderer from '@/components/CnCellRenderer/CnCellRenderer.vue'
import CnObjectListWidget from '@/components/CnObjectListWidget/CnObjectListWidget.vue'

const cnTranslate = (key) => ({ keep: 'Bewaren', End: 'Eind', No: 'Nee' })[key] ?? key

describe('CnCellRenderer label widget', () => {
	it('draws an enum value as its translated label in plain text, no pill', () => {
		const property = { type: 'string', enum: ['keep', 'destroy'] }
		const w = mount(CnCellRenderer, { propsData: { value: 'keep', property, widget: 'label' }, provide: { cnTranslate } })
		expect(w.text()).toBe('Bewaren')
		expect(w.find('.cn-status-badge').exists()).toBe(false)
	})

	it('draws an empty value as the dash', () => {
		const w = mount(CnCellRenderer, { propsData: { value: '', property: { type: 'string', enum: ['keep'] }, widget: 'label' } })
		expect(w.find('.cn-cell-renderer__dash').exists()).toBe(true)
	})
})

describe('CnCellRenderer boolean words', () => {
	const property = { type: 'boolean' }
	const props = { property, widgetProps: { trueLabel: 'End', falseLabel: 'No', pill: true } }

	it('writes false as its word', () => {
		const w = mount(CnCellRenderer, { propsData: { ...props, value: false }, provide: { cnTranslate } })
		expect(w.text()).toBe('Nee')
		expect(w.find('.cn-status-badge').exists()).toBe(false)
	})

	it('draws the value named by pill as a pill', () => {
		const w = mount(CnCellRenderer, { propsData: { ...props, value: true }, provide: { cnTranslate } })
		expect(w.find('.cn-status-badge').text()).toBe('Eind')
	})

	it('keeps the check icon without words', () => {
		const w = mount(CnCellRenderer, { propsData: { property, value: true } })
		expect(w.find('.cn-cell-renderer__icon--success').exists()).toBe(true)
	})
})

describe('CnObjectListWidget label column', () => {
	it('hands a label column the schema\'s enum and labels, so it writes the label', () => {
		const ctx = {
			content: { columns: [{ key: 'archivalAction', widget: 'label' }] },
			rows: [],
			createSchema: { properties: { archivalAction: { type: 'string', title: 'Archival action', enum: ['keep'], enumLabels: { keep: 'Keep' } } } },
		}
		const [column] = CnObjectListWidget.computed.resolvedColumns.call(ctx)
		expect(column).toMatchObject({ widget: 'label', enum: ['keep'], enumLabels: { keep: 'Keep' } })
	})
})
