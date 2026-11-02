import { mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard grid can weigh its column groups (PqWerkplekKlant in a call:
 * 332 / 415 / 332 for three groups of four columns) instead of twelve equal
 * shares.
 *
 * @spec openspec/changes/dashboard-column-weights/specs/dashboard-column-weights/spec.md
 */
import fs from 'fs'
import path from 'path'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const LAYOUT = [
	{ id: 'actions', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 },
	{ id: 'who', gridX: 0, gridY: 2, gridWidth: 4, gridHeight: 5 },
	{ id: 'form', gridX: 4, gridY: 2, gridWidth: 4, gridHeight: 6 },
	{ id: 'knowledge', gridX: 8, gridY: 2, gridWidth: 4, gridHeight: 5 },
]
const WEIGHTS = [{ span: 4, weight: 352 }, { span: 4, weight: 435 }, { span: 4, weight: 352 }]

/**
 * The left and width fractions an item hands its CSS.
 *
 * @param {object} wrapper the mounted grid
 * @param {string} id the item id
 * @return {{left: number, width: number}|null} the fractions, or null without them
 */
function fractions(wrapper, id) {
	const style = wrapper.find(`[gs-id="${id}"]`).attributes('style') || ''
	const left = style.match(/--cn-weight-left:\s*([0-9.]+)/)
	const width = style.match(/--cn-weight-width:\s*([0-9.]+)/)
	return left && width ? { left: Number(left[1]), width: Number(width[1]) } : null
}

describe('CnDashboardGrid: column weights', () => {
	it('places each item by the weights of the column groups it spans', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, columnWeights: WEIGHTS } })
		expect(wrapper.find('.cn-dashboard-grid').classes()).toContain('cn-dashboard-grid--weighted')
		const who = fractions(wrapper, 'who')
		const form = fractions(wrapper, 'form')
		const knowledge = fractions(wrapper, 'knowledge')
		expect(who.left).toBeCloseTo(0, 5)
		expect(who.width).toBeCloseTo(352 / 1139, 5)
		expect(form.left).toBeCloseTo(352 / 1139, 5)
		expect(form.width).toBeCloseTo(435 / 1139, 5)
		expect(knowledge.left).toBeCloseTo(787 / 1139, 5)
		expect(knowledge.width).toBeCloseTo(352 / 1139, 5)
		const actions = fractions(wrapper, 'actions')
		expect(actions.left).toBeCloseTo(0, 5)
		expect(actions.width).toBeCloseTo(1, 5)
	})

	it('splits a group\'s weight evenly over its columns', () => {
		const wrapper = mount(CnDashboardGrid, {
			propsData: { layout: [{ id: 'half', gridX: 2, gridY: 0, gridWidth: 4, gridHeight: 2 }], columnWeights: [{ span: 4, weight: 1 }, { span: 8, weight: 3 }] },
		})
		const half = fractions(wrapper, 'half')
		expect(half.left).toBeCloseTo(0.125, 5)
		expect(half.width).toBeCloseTo(0.125 + 2 * (0.75 / 8), 5)
	})

	it('keeps the twelve shares without weights, while editing, and for groups that do not cover twelve columns', () => {
		const cases = [
			{},
			{ columnWeights: WEIGHTS, editable: true },
			{ columnWeights: [{ span: 4, weight: 1 }, { span: 4, weight: 1 }] },
			{ columnWeights: [{ span: 4, weight: 0 }, { span: 8, weight: 1 }] },
			{ columnWeights: 'wide' },
		]
		for (const props of cases) {
			const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT, ...props } })
			expect(wrapper.find('.cn-dashboard-grid').classes()).not.toContain('cn-dashboard-grid--weighted')
			expect(fractions(wrapper, 'who')).toBeNull()
		}
	})

	it('leaves an item on a side-column track to the side column', () => {
		const layout = [{ id: 'side', gridX: 8, gridY: 0, gridWidth: 4, gridHeight: 2, track: 'side' }]
		const wrapper = mount(CnDashboardGrid, { propsData: { layout, columnWeights: WEIGHTS, sideColumn: { width: 320 } } })
		expect(fractions(wrapper, 'side')).toBeNull()
	})

	it('places the items by their fractions on the full twelve-column grid only', () => {
		const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'), 'utf8')
		const rule = source.slice(source.indexOf('.cn-dashboard-grid--weighted >'))
		expect(rule).toMatch(/\.cn-dashboard-grid--weighted > \.grid-stack\.gs-12:not\(\.grid-stack-rtl\) > \.grid-stack-item\[data-cn-weighted\]/)
		expect(rule).toContain('left: calc(var(--cn-weight-left) * 100%) !important')
		expect(rule).toContain('width: calc(var(--cn-weight-width) * 100%) !important')
	})
})
