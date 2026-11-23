/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A modal opened from an index page's header knows what the list shows: it
 * gets the active filters (the pipeline a board is narrowed to).
 *
 * @spec openspec/changes/pl4-board-card-actions/specs/pl4-board-card-actions/spec.md#requirement-a-header-modal-knows-the-lists-filters
 */

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

describe('index header modal filters', () => {
	it('hands an open-modal header action the active filters, its own props winning', () => {
		const ctx = {
			headerActions: [
				{ id: 'settings', label: 'Pipeline settings', type: 'open-modal', target: 'PipelineSettingsModal', props: { mode: 'edit' } },
				{ id: 'new', label: 'New', type: 'open-form' },
				{ id: 'refresh', label: 'Refresh', type: 'open-modal', target: 'x' },
			],
			effectiveActiveFilters: { pipeline: ['p1'] },
		}
		const actions = CnIndexPage.computed.dialogHeaderActions.call(ctx)
		expect(actions.map((a) => a.id)).toEqual(['settings', 'new'])
		expect(actions[0].props).toEqual({ activeFilters: { pipeline: ['p1'] }, mode: 'edit' })
		expect(actions[1].props).toBeUndefined()
	})
})
