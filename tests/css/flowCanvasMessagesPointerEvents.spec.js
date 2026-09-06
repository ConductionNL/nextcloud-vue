/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The canvas message area must not swallow canvas clicks.
 *
 * It is an absolutely positioned box pinned over the graph. Between its cards,
 * and along its full declared width, there is empty space that belongs to the
 * canvas underneath — panning, node selection, drag-to-connect. Without
 * `pointer-events: none` on the container that empty space eats every one of
 * them, and the failure is invisible: nothing errors, the canvas just stops
 * responding in a rectangle nobody can see.
 *
 * jsdom computes no layout and applies no scoped stylesheet, so a mounted
 * component cannot see this. The stylesheet can, and a real browser can:
 * `e2e/flow-messages.e2e.js` clicks THROUGH the area onto a node. This file is
 * the cheap half that fails the moment the declaration is deleted.
 */

const fs = require('fs')
const path = require('path')

const SFC = fs.readFileSync(
	path.join(__dirname, '..', '..', 'src', 'components', 'CnFlowDetail', 'CnFlowCanvasMessages.vue'),
	'utf8',
)

const STYLE = SFC.slice(SFC.indexOf('<style'))

describe('CnFlowCanvasMessages — pointer events', () => {
	it('makes the container transparent to the pointer', () => {
		const container = STYLE.slice(STYLE.indexOf('.cn-flow-canvas-messages {'))
			.slice(0, STYLE.slice(STYLE.indexOf('.cn-flow-canvas-messages {')).indexOf('}'))

		expect(container).toContain('pointer-events: none')
	})

	it('gives the pointer back to the parts a user must actually click', () => {
		// A card carries a dismiss button and sometimes "Create draft version".
		// The container's `none` inherits, so each card has to opt back in.
		const item = STYLE.slice(STYLE.indexOf('.cn-flow-canvas-messages__item {'))
			.slice(0, STYLE.slice(STYLE.indexOf('.cn-flow-canvas-messages__item {')).indexOf('}'))

		expect(item).toContain('pointer-events: auto')
	})

	it('stands its animation down for prefers-reduced-motion', () => {
		expect(STYLE).toContain('prefers-reduced-motion: reduce')
	})

	it('takes every colour from a token, so both themes work', () => {
		// A hardcoded hex is legible in exactly one theme. Hex literals are
		// counted rather than eyeballed: one slips in per refactor otherwise.
		//
		// Comments are stripped first. One of them QUOTES the hex that caused
		// the contrast bug this file's sibling assertion guards, and a check
		// that forbids naming the offending value in the comment explaining it
		// is a check that punishes writing the explanation down.
		const declarations = STYLE.replace(/\/\*[\s\S]*?\*\//g, '')

		const hexes = declarations.match(/#[0-9a-fA-F]{3,8}\b/g) || []
		expect(hexes).toEqual([])
	})
})
