/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.tableFrame: true` draws an object list's table in a frame inside
 * its card (boards PqKassabon "Regels", PqKassadienst "Afstortingen", PqLead
 * products): a 1px frame with an 8px radius, a white head with a rule under
 * it, 18px outer insets and a rule under every row but the last.
 *
 * @spec openspec/changes/object-list-table-frame/specs/object-list-table-frame/spec.md#requirement-an-object-list-can-frame-its-table-in-its-card
 */
const { shallowMount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const FRAMED = '.cn-look-board .cn-detail-page .cn-widget-wrapper__content .cn-object-list-widget--framed .cn-table-container'

/**
 * The declarations of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The block, or '' when there is none.
 */
function block(selector) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const match = css.match(new RegExp('(^|\\})\\s*' + escaped + '\\s*\\{([^}]*)\\}'))
	return match ? match[2] : ''
}

/**
 * @param {object} content The widget content.
 * @return {object} The wrapper.
 */
function mountList(content) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'pipelinq', schema: 'posTransactionLine', columns: [{ key: 'description', label: 'Description' }], ...content } },
		stubs: { CnDataTable: true },
	})
}

describe('CnObjectListWidget tableFrame', () => {
	it('marks the widget when the manifest asks for a framed table', () => {
		expect(mountList({ tableFrame: true }).classes()).toContain('cn-object-list-widget--framed')
	})

	it('leaves the table as it was without the key, or with anything but true', () => {
		expect(mountList({}).classes()).not.toContain('cn-object-list-widget--framed')
		expect(mountList({ tableFrame: 'yes' }).classes()).not.toContain('cn-object-list-widget--framed')
	})

	it('frames the table 1px with an 8px radius and a white head', () => {
		const frame = block(FRAMED)
		expect(frame).toMatch(/border: 1px solid var\(--color-border\);/)
		expect(frame).toMatch(/border-radius: 8px;/)
		expect(frame).toMatch(/--cn-board-table-head-bg: var\(--color-main-background\);/)
	})

	it('rules the head and every row but the last', () => {
		expect(block(FRAMED + ' .cn-data-table th')).toMatch(/border-bottom: 1px solid var\(--cn-board-hairline\);/)
		const td = block(FRAMED + ' .cn-data-table td')
		expect(td).toMatch(/border-top: 0;/)
		expect(td).toMatch(/border-bottom: 1px solid var\(--cn-board-hairline\);/)
		expect(td).toMatch(/padding-block: 12px;/)
		expect(block(FRAMED + ' .cn-data-table tbody tr:last-child td')).toMatch(/border-bottom: 0;/)
	})

	it('pads the outer cells 18px', () => {
		expect(block(FRAMED + ' .cn-data-table :is(th, td):first-child')).toMatch(/padding-inline-start: 18px;/)
		expect(block(FRAMED + ' .cn-data-table :is(th, td):last-child')).toMatch(/padding-inline-end: 18px;/)
	})
})
