/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Source ORDER inside kpi-card.css, asserted as a contract.
 *
 * A container query carries no extra specificity. `.cn-kpi-card__value` inside
 * `@container` and the base `.cn-kpi-card__value` are equal, so whichever comes
 * later in the file wins. The container block was originally written directly
 * beneath `.cn-kpi-card` — ABOVE the base rule — and therefore never applied:
 * measured live on pipelinq, a 173px tile still rendered its value at 1.75rem
 * and "€224,070" was clipped by the card's `overflow: hidden`.
 *
 * jsdom does not implement container queries, so a mounted-component test
 * cannot see this. Reading the stylesheet is what can: the bug is a byte
 * offset, and a byte offset is checkable.
 *
 * The first verification missed it entirely because it injected the rule with
 * `!important`, which hides exactly this class of ordering bug — so this file
 * also stands as the check that does not depend on how a preview was applied.
 */

const fs = require('fs')
const path = require('path')

const CSS = fs.readFileSync(
	path.join(__dirname, '..', '..', 'src', 'css', 'kpi-card.css'),
	'utf8',
)

describe('kpi-card.css — cascade order', () => {
	it('puts the narrow-tile container query AFTER the base value rule', () => {
		const baseValueRule = CSS.indexOf('.cn-kpi-card__value {')
		const containerBlock = CSS.indexOf('@container cn-kpi')

		expect(baseValueRule).toBeGreaterThan(-1)
		expect(containerBlock).toBeGreaterThan(-1)
		// Equal specificity ⇒ later wins. Anything else and the step-down is dead.
		expect(containerBlock).toBeGreaterThan(baseValueRule)
	})

	it('steps the value down inside that query', () => {
		const block = CSS.slice(CSS.indexOf('@container cn-kpi'))
		expect(block).toContain('.cn-kpi-card__value')
		expect(block).toContain('--cn-kpi-value-size-compact')
	})

	it('declares the card as the size container the query names', () => {
		// Without both of these on .cn-kpi-card, the query matches nothing and
		// fails silently — no error, just a full-size number in a narrow tile.
		expect(CSS).toContain('container-type: inline-size')
		expect(CSS).toContain('container-name: cn-kpi')
	})

	it('keeps the title on a single-line ellipsis, not a -webkit-box clamp', () => {
		// The title element is ALSO CnStatWidget's flex row for the range select,
		// so `display: -webkit-box` loses to the scoped `display: flex` and the
		// clamp silently does nothing. Single-line + a `title` attribute is the
		// shape that actually holds.
		//
		// Comments are stripped first: this file explains WHY the clamp was
		// removed, and prose naming it is not a declaration applying it.
		const declarations = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
		const from = declarations.indexOf('.cn-kpi-card__title {')
		const titleRule = declarations.slice(from, declarations.indexOf('}', from))

		expect(titleRule).toContain('text-overflow: ellipsis')
		expect(titleRule).not.toContain('-webkit-line-clamp')
	})
})
