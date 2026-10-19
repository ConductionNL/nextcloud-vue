/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board look: the board marks itself as selecting once a card is selected, so
 * the idle checkboxes (hidden until a card is hovered or focused) show on
 * every card. The CSS that hides them is tested in the browser
 * (e2e/l15-board-card-quiet.e2e.js); jsdom lays nothing out.
 *
 * @spec openspec/changes/board-card-quiet/specs/board-view/spec.md#requirement-a-board-card-reads-as-the-board-draws-it
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

const { mount } = require('@vue/test-utils')
const CnKanbanView = require('../../src/components/CnKanbanView/CnKanbanView.vue').default

const FIELD = { enum: ['open', 'doing'], enumLabels: { open: 'Open', doing: 'Doing' } }
const ROWS = [
	{ id: 1, status: 'open', title: 'Een' },
	{ id: 2, status: 'doing', title: 'Twee' },
]

/**
 * @param {Array<number>} selectedIds The selection.
 * @return {object} The wrapper.
 */
function mountBoard(selectedIds) {
	return mount(CnKanbanView, {
		props: { rows: ROWS, statusFieldSchema: FIELD, statusField: 'status', selectable: true, selectedIds },
		global: { provide: { cnLook: 'board' } },
	})
}

describe('CnKanbanView board look: quiet selection', () => {
	it('is not selecting while nothing is selected', () => {
		const root = mountBoard([]).find('[data-testid="cn-kanban-view"]')
		expect(root.classes()).toContain('cn-kanban-view--board')
		expect(root.classes()).not.toContain('cn-kanban-view--selecting')
	})

	it('is selecting once a card is selected, and every card keeps its checkbox', () => {
		const wrapper = mountBoard([2])
		expect(wrapper.find('[data-testid="cn-kanban-view"]').classes()).toContain('cn-kanban-view--selecting')
		expect(wrapper.findAll('[data-testid="cn-kanban-card-select"]')).toHaveLength(2)
	})
})
