/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A selectable record card heads with its checkbox on the left and its pill
 * on the right, on one row (DqZakenSorteren).
 *
 * @spec openspec/changes/board-record-card-select-in-head/specs/board-record-card-select-in-head/spec.md#requirement-a-selectable-board-record-card-heads-with-its-checkbox-and-its-pill-on-one-row
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnObjectCard from '../../src/components/CnObjectCard/CnObjectCard.vue'

const schema = { title: 'Case', configuration: { objectNameField: 'title' }, properties: { title: {}, status: {} } }
const object = { id: 'c1', title: 'Parkeervergunningen binnenstad', status: 'waiting' }
const layout = { headPill: { field: 'status', labels: { waiting: 'Wacht op inwoner' } }, title: 'title' }

/**
 * @param {object} props Extra props.
 * @param {string} look The look.
 * @return {object} The wrapper.
 */
function mountCard(props, look = 'board') {
	return mount(CnObjectCard, {
		props: { object, schema, layout, ...props },
		global: { provide: { cnLook: look, cnFormatters: {}, cnTranslate: (s) => s } },
	})
}

describe('CnObjectCard checkbox in the record head', () => {
	it('draws the checkbox at the start of the head row, before the pill', () => {
		const card = mountCard({ selectable: true })
		const head = card.find('.cn-object-card__record-head')
		expect(head.find('.cn-object-card__checkbox').exists()).toBe(true)
		expect(head.element.firstElementChild.classList.contains('cn-object-card__checkbox')).toBe(true)
		expect(card.findAll('.cn-object-card__checkbox')).toHaveLength(1)
	})

	it('keeps the checkbox outside a card without a record layout', () => {
		const card = mountCard({ selectable: true, layout: null })
		expect(card.find('.cn-object-card__checkbox').exists()).toBe(true)
		expect(card.find('.cn-object-card__record-head').exists()).toBe(false)
	})

	it('pushes the pill to the end of the head row after the checkbox', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8')
		expect(css).toMatch(/\.cn-object-card__record-head > \.cn-object-card__checkbox ~ \.cn-object-card__record-pill \{[^}]*margin-inline-start: auto;/)
	})
})
