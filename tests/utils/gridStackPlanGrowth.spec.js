/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * planGrowth: the items under a growing size-to-content cell move down by the
 * growth, in order, and the items beside it stay. The layout is pipelinq's
 * simple dashboard, where the full-width "client in focus" card landed below
 * the lists when the banner grew.
 *
 * @spec openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it
 */
import { planGrowth } from '../../src/utils/gridStack.js'

const n = (id, x, y, w, h) => ({ id, x, y, w, h })

describe('planGrowth', () => {
	const layout = () => [
		n('greeting', 0, 0, 9, 2),
		n('availability', 9, 0, 3, 2),
		n('banner', 0, 2, 12, 2),
		n('new', 0, 4, 3, 3),
		n('waiting', 3, 4, 3, 3),
		n('callbacks', 6, 4, 3, 3),
		n('customer', 9, 4, 3, 3),
		n('focus', 0, 7, 12, 2),
		n('list', 0, 9, 8, 5),
		n('callback-list', 8, 9, 4, 5),
		n('per-channel', 0, 14, 8, 3),
		n('latest', 8, 14, 4, 4),
	]

	it('moves every card under a growing full-width banner down by one row, bottom first', () => {
		const nodes = layout()
		const banner = nodes.find((x) => x.id === 'banner')
		const plan = planGrowth(nodes, banner, 3)
		const moved = Object.fromEntries(plan.map((p) => [p.node.id, p.y]))
		expect(moved).toEqual({ new: 5, waiting: 5, callbacks: 5, customer: 5, focus: 8, list: 10, 'callback-list': 10, 'per-channel': 15, latest: 15 })
		expect(plan.map((p) => p.y)).toEqual([...plan.map((p) => p.y)].sort((a, b) => b - a))
		expect(moved.focus).toBeLessThan(moved.list)
	})

	it('leaves the cards beside a growing cell, and those its growth does not reach', () => {
		const nodes = [n('fit', 0, 0, 6, 2), n('side', 6, 0, 6, 4), n('under', 0, 2, 6, 2), n('far', 6, 4, 6, 2)]
		const plan = planGrowth(nodes, nodes[0], 3)
		expect(plan.map((p) => [p.node.id, p.y])).toEqual([['under', 3]])
	})

	it('plans nothing for a cell that keeps or loses height', () => {
		const nodes = layout()
		const banner = nodes.find((x) => x.id === 'banner')
		expect(planGrowth(nodes, banner, 2)).toEqual([])
		expect(planGrowth(nodes, banner, 1)).toEqual([])
	})
})
