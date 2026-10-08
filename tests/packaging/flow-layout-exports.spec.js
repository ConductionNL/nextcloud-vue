/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The flow layout helpers are part of the package root and the composables
 * barrel, so consumers (stackiq, hermiq, buildiq) never need a deep source path.
 */
const root = require('../../src/index.js')
const barrel = require('../../src/composables/index.js')

const FUNCTIONS = ['layoutFlowNodes', 'needsFullLayout', 'placeLooseNodes', 'readNodePoint']
const NUMBERS = ['FLOW_LAYOUT_COLUMN_WIDTH', 'FLOW_LAYOUT_ROW_HEIGHT', 'FLOW_LAYOUT_MARGIN', 'FLOW_LAYOUT_TOP']

describe('flow layout helpers are exported', () => {
	for (const [label, mod] of [['package root', root], ['composables barrel', barrel]]) {
		it.each(FUNCTIONS)(`${label} exports %s as a function`, (name) => {
			expect(typeof mod[name]).toBe('function')
		})
		it.each(NUMBERS)(`${label} exports %s as a number`, (name) => {
			expect(typeof mod[name]).toBe('number')
		})
	}

	it('lays out a position-less graph through the root export', () => {
		const nodes = [{ id: 'a' }, { id: 'b' }]
		expect(root.needsFullLayout(nodes)).toBe(true)
		const laid = root.layoutFlowNodes(nodes, [{ source: 'a', target: 'b' }], ['a'])
		expect(laid[1].x).toBeGreaterThan(laid[0].x)
	})
})
