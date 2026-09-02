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

/**
 * Card-fit tiles: the hover affordance belongs on the WRAPPER, not the card.
 *
 * A stat / gauge / delta tile renders `flush` and then gets its padding back
 * from the card-fit rule (`padding: 8px 14px`, CnDashboardPage), so the KPI
 * sits INSET inside the wrapper while the wrapper draws the border, radius and
 * background the user reads as "the card". The base `--clickable:hover` rule
 * then paints a second rounded box with its own shadow 8-14px inside the
 * first: a card inside a card.
 *
 * Measured live on dossiq before the fix, while genuinely hovered: the inner
 * card carried a 2px rgb(0,103,158) border and its own drop shadow, inset 9px
 * from the wrapper's top and 15px from its left. A non-card-fit stats block
 * (decidiq) sits at 1px, so its border lands on the wrapper's own edge and
 * reads as one card. That inset is the entire difference.
 *
 * jsdom applies no `:hover` and computes no cascade across files, so a mounted
 * test cannot see this either. The contract is again a property of the
 * stylesheet text, so that is what is asserted.
 */
describe('kpi-card.css — card-fit hover moves to the wrapper', () => {
	const suppress = CSS.indexOf('.cn-dashboard-page__card-fit .cn-kpi-card--clickable:hover')
	const wrapperRule = CSS.indexOf('.cn-dashboard-page__card-fit:has(.cn-kpi-card--clickable:hover)')

	it('suppresses the inner border and shadow on a card-fit tile', () => {
		expect(suppress).toBeGreaterThan(-1)
		const block = CSS.slice(suppress, suppress + 260)
		expect(block).toContain('border-color: transparent')
		expect(block).toContain('box-shadow: none')
	})

	it('gives the affordance to the wrapper instead', () => {
		expect(wrapperRule).toBeGreaterThan(-1)
		const block = CSS.slice(wrapperRule, wrapperRule + 320)
		expect(block).toContain('border-color: var(--color-primary-element)')
		expect(block).toContain('box-shadow: 0 2px 8px var(--color-box-shadow)')
	})

	it('covers detail pages as well as dashboards', () => {
		// Both hosts add the same padding back, so both produce the nested box.
		expect(CSS).toContain('.cn-detail-page__card-fit .cn-kpi-card--clickable:hover')
		expect(CSS).toContain('.cn-detail-page__card-fit:has(.cn-kpi-card--clickable:hover)')
	})

	it('orders the override AFTER the base clickable hover rule', () => {
		// The override is more specific, so order is not what makes it win — but
		// a future edit that flattens the selector would silently re-break the
		// tile, and reading top-to-bottom should show the exception after the
		// rule it excepts.
		const base = CSS.indexOf('.cn-kpi-card--clickable:hover')
		expect(base).toBeGreaterThan(-1)
		expect(suppress).toBeGreaterThan(base)
	})

	it('leaves a standalone clickable card its own border', () => {
		// Only card-fit hosts are excepted. A KPI card used outside a wrapper is
		// itself the card, and must keep the hover border it has always had.
		const base = CSS.indexOf('.cn-kpi-card--clickable:hover')
		const block = CSS.slice(base, base + 160)
		expect(block).toContain('border-color: var(--color-primary-element)')
	})
})
