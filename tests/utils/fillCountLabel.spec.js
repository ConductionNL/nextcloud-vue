/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The count grammar a list's header texts share: `{total}` is the list's
 * total, `{count:<field>=<value>}` the loaded rows whose field reads that value.
 *
 * @spec openspec/changes/widget-header-subtitle-counts/specs/widget-header-subtitle-counts/spec.md#requirement-a-list-can-say-its-counts-under-its-card-title
 */
import { fillCountLabel } from '../../src/utils/fillCountLabel.js'

const ROWS = [{ status: 'done' }, { status: 'done' }, { status: 'open' }, { meta: { done: true } }]

describe('fillCountLabel', () => {
	it('fills the total and the per-value counts', () => {
		expect(fillCountLabel('{count:status=done} van {total} klaar, {count:meta.done=true} afgevinkt', 4, ROWS)).toBe('2 van 4 klaar, 1 afgevinkt')
	})

	it('leaves other placeholders alone', () => {
		expect(fillCountLabel('{total} in {where}', 3, [])).toBe('3 in {where}')
	})
})
