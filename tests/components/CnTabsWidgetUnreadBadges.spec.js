/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/record-unread-markers/tasks.md#task-3
 */
import { resolveTabCount } from '../../src/utils/detailActionModel.js'

const object = (unreadCounts) => ({ '@self': { unreadCounts } })

describe('resolveTabCount from @self.unreadCounts', () => {
	it('takes the count of the tab id', () => {
		expect(resolveTabCount({ id: 'files', widgetId: 'w-files' }, object({ files: 2 }))).toBe(2)
	})

	it('maps a tab with unreadKey', () => {
		expect(resolveTabCount({ id: 'documents', unreadKey: 'files' }, object({ files: 1 }))).toBe(1)
	})

	it('falls back to the widget id when the tab has no id', () => {
		expect(resolveTabCount({ widgetId: 'notes' }, object({ notes: 4 }))).toBe(4)
	})

	it('shows nothing for 0 or an absent key', () => {
		expect(resolveTabCount({ id: 'notes' }, object({ notes: 0 }))).toBeNull()
		expect(resolveTabCount({ id: 'tasks' }, object({ notes: 3 }))).toBeNull()
		expect(resolveTabCount({ id: 'notes' }, { '@self': {} })).toBeNull()
		expect(resolveTabCount({ id: 'notes' }, null)).toBeNull()
	})

	it('lets a tab keep its own count', () => {
		expect(resolveTabCount({ id: 'files', count: 7 }, object({ files: 2 }))).toBe(7)
		expect(resolveTabCount({ id: 'files', countField: 'attachments' }, { attachments: [1, 2, 3], ...object({ files: 2 }) })).toBe(3)
		expect(resolveTabCount({ id: 'files', countField: 'attachments' }, { ...object({ files: 2 }) })).toBe(0)
	})
})
