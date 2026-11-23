/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget's card header can carry a subtitle and a primary action from the
 * widget itself (the task table's "1 open, 3 done" and "New task"), and the
 * board look draws the archiving card and the task row button as the boards
 * do. jsdom draws no layout, so the board rules are read from the stylesheet.
 *
 * @spec openspec/changes/record-task-table/specs/record-task-table/spec.md#requirement-a-records-tasks-show-as-a-table-with-their-summary-and-new-task-in-the-header
 * @spec openspec/changes/board-retention-card/specs/board-retention-card/spec.md#requirement-the-archiving-card-is-drawn-as-the-board-draws-it
 */
import { mount } from '@vue/test-utils'
const fs = require('fs')
const path = require('path')
import CnDetailWidgetHeaderItems from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHeaderItems.vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('a widget-reported card header', () => {
	it('keeps the subtitle the widget reports', () => {
		const ctx = { rendererHeader: null }
		CnDetailWidgetHost.methods.onRendererHeader.call(ctx, { subtitle: '1 open, 3 done', action: { label: 'New task', run: () => {} } })
		expect(ctx.rendererHeader.subtitle).toBe('1 open, 3 done')
		expect(ctx.rendererHeader.actions).toHaveLength(1)
	})

	it('draws a primary action as a filled button, the others as header links', async () => {
		const run = jest.fn()
		const w = mount(CnDetailWidgetHeaderItems, { props: { header: { actions: [{ label: 'New task', icon: 'Plus', variant: 'primary', run }, { label: 'All', run: () => {} }] } } })
		const primary = w.find('.cn-detail-widget-header-items__primary')
		expect(primary.exists()).toBe(true)
		expect(w.findAll('.cn-detail-page__catalog-action')).toHaveLength(1)
	})
})

describe('look-board-detail.css', () => {
	it('titles the archiving card 17px over a 14px line, facts at 15px/500 above a hairline', () => {
		expect(bodyOf('.cn-look-board .cn-retention .cn-retention__title')).toContain('font-size: var(--cn-board-heading-size, 17px);')
		expect(bodyOf('.cn-look-board .cn-retention .cn-retention__head-text .cn-retention__muted')).toContain('font-size: 14px;')
		expect(bodyOf('.cn-look-board .cn-retention .cn-retention__fact')).toContain('border-bottom: 1px solid var(--color-border);')
		expect(bodyOf('.cn-look-board .cn-retention .cn-retention__fact dd')).toContain('font-weight: 500;')
	})

	it('draws the task row button 14px in at 13px', () => {
		const button = bodyOf('.cn-look-board .cn-tasks-widget .cn-tasks-widget__cell-actions .button-vue.button-vue')
		expect(button).toContain('--button-padding: 14px;')
		expect(button).toContain('font-size: 13px;')
	})
})
