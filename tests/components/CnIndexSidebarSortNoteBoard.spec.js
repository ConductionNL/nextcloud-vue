/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Board DqZakenSorteren writes the order under the direction as "Nu: op
 * termijn, oplopend. De sortering bewaart u mee in een weergave." The
 * Nextcloud look keeps "Current order: Deadline, ascending".
 *
 * @spec openspec/changes/board-sort-note-reads-as-board/specs/index-sidebar/spec.md#requirement-the-board-look-writes-the-current-order-as-the-board-does
 */

import { mount } from '@vue/test-utils'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'

const options = [
	{ value: 'deadline', label: 'Deadline', keys: [{ key: 'deadline', order: 'asc' }] },
	{ value: 'urgency', label: 'Urgency', keys: [], fixed: true },
]

/**
 * @param {object} props Extra props.
 * @param {string} look The provided look.
 * @return {object} The wrapper.
 */
function mountSidebar(props, look) {
	return mount(CnIndexSidebar, {
		props: { open: true, sortOptions: options, ...props },
		global: {
			provide: { cnLook: look },
			stubs: {
				NcAppSidebar: { template: '<div><slot /></div>' },
				NcAppSidebarTab: { template: '<div><slot /></div>' },
				NcSelect: true,
				NcCheckboxRadioSwitch: true,
			},
		},
	})
}

const note = (w) => w.find('[data-testid="cn-index-sidebar-sort-current"]').text()

describe('the current order under the sort direction', () => {
	it('reads "Now: by deadline, ascending." and that a view keeps it, in the board look', () => {
		const w = mountSidebar({ currentSort: [{ key: 'deadline', order: 'asc' }] }, 'board')
		expect(note(w)).toBe('Now: by deadline, ascending. You save the order along with a view.')
	})

	it('names an order of its own the same way', () => {
		const w = mountSidebar({ currentSortValue: 'urgency', currentSort: [] }, 'board')
		expect(note(w)).toBe('Now: by urgency. You save the order along with a view.')
	})

	it('keeps the Nextcloud look\'s sentence', () => {
		const w = mountSidebar({ currentSort: [{ key: 'deadline', order: 'asc' }] }, 'nextcloud')
		expect(note(w)).toBe('Current order: Deadline, ascending')
	})
})
