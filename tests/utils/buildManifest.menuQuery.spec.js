/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An entry that already exists (a profile's `{ id, label, order }`) takes its
 * route from the merged declaration WITH that route's `query` and `params`, so
 * a menu entry that opens a pre-filtered list, or a list in its board view,
 * keeps doing so (screens-board-reference-columns).
 *
 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-the-address-can-open-a-list-in-a-view-mode
 */

import { mergeMenuItems } from '../../src/utils/buildManifest.js'

describe('mergeMenuItems keeps a route\'s query and params', () => {
	it('copies query and params onto an existing entry that has none', () => {
		const target = [{ id: 'Board', label: 'Board', order: 24 }]
		mergeMenuItems(target, [{ id: 'Board', label: 'Workflow board', route: 'Cases', query: { _view: 'board' }, params: { tab: 'all' } }])
		expect(target[0]).toEqual({ id: 'Board', label: 'Board', order: 24, route: 'Cases', query: { _view: 'board' }, params: { tab: 'all' } })
	})

	it('keeps the existing entry\'s own query', () => {
		const target = [{ id: 'Board', route: 'Cases', query: { caseType: 'woo' } }]
		mergeMenuItems(target, [{ id: 'Board', route: 'Cases', query: { _view: 'board' } }])
		expect(target[0].query).toEqual({ caseType: 'woo' })
	})
})
