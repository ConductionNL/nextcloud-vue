/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatsBlockWidget must fill its host cell, asserted as a contract.
 *
 * The widget root is a flex ITEM of `.cn-widget-wrapper__content`, which is
 * `display: flex`. With no sizing rule it defaults to `flex: 0 1 auto` and
 * sizes to content — and its content is `.cn-kpi-card { width: 100% }`, which
 * resolves against the root, which is resolving against its content. The
 * card's body carries `min-width: 0` on purpose, so a long number shrinks
 * rather than overflowing, and that lets the cycle settle with the body at
 * ZERO. What survives is the icon.
 *
 * Measured live on pipelinq's lead page: a 282px `.cn-widget-wrapper__content`
 * held a 20px widget, a 20px `.cn-kpi-card` and a 0px `.cn-kpi-card__body`,
 * and "45,000 EUR" rendered as a sliver of one glyph. Adding the three
 * declarations below took the widget to 250px and the body to 230px.
 *
 * WHY A STYLESHEET TEST. jsdom implements no layout: every width it reports is
 * zero, so a mounted-component test cannot tell this bug from a correct
 * render. It cannot even fail. Reading the source is what can — the bug is an
 * absent declaration, and an absent declaration is checkable.
 *
 * The live verification was deliberately re-run WITHOUT `!important` before
 * this was written. tests/css/kpiCardCascade.spec.js records why: an
 * `!important` preview hides ordering bugs, and it had already hidden one.
 */

const fs = require('fs')
const path = require('path')

const SFC = fs.readFileSync(
	path.join(
		__dirname,
		'..',
		'..',
		'src',
		'components',
		'CnStatsBlockWidget',
		'CnStatsBlockWidget.vue',
	),
	'utf8',
)

/**
 * The declaration block for one selector, or null when the selector is absent.
 *
 * Matches the FIRST occurrence, which is the rule, not the comment above it:
 * the search starts at the selector followed by ` {`.
 *
 * @param {string} selector The exact selector text.
 * @return {string|null} The block body, or null.
 */
function blockFor(selector) {
	const start = SFC.indexOf(`${selector} {`)
	if (start === -1) {
		return null
	}
	const open = SFC.indexOf('{', start)
	const close = SFC.indexOf('}', open)
	return SFC.slice(open + 1, close)
}

describe('CnStatsBlockWidget — fills its host cell', () => {
	it('declares the sizing rule on the BASE class', () => {
		// Not on `--multi`: both the single-source and multi-entry modes render
		// this same root, so a rule scoped to `--multi` would leave the
		// single-entry widget — the one the bug was found on — still collapsing.
		expect(blockFor('.cn-stats-block-widget')).not.toBeNull()
	})

	it('grows to fill the flex row instead of sizing to content', () => {
		const block = blockFor('.cn-stats-block-widget')
		// `flex: 0 1 auto` (the default) is precisely the broken state.
		expect(block).toMatch(/flex:\s*1\s+1\s+auto/)
	})

	it('gives the card a definite width to resolve `width: 100%` against', () => {
		const block = blockFor('.cn-stats-block-widget')
		expect(block).toMatch(/width:\s*100%/)
	})

	it('keeps the shrink behaviour the card body was written for', () => {
		const block = blockFor('.cn-stats-block-widget')
		// Without this the row refuses to shrink past its longest word, which is
		// the overflow the body's own `min-width: 0` exists to prevent.
		expect(block).toMatch(/min-width:\s*0/)
	})

	it('does not reach for !important', () => {
		const block = blockFor('.cn-stats-block-widget')
		// The rule wins on its own; `!important` here would mask any future
		// ordering regression rather than surface it.
		expect(block).not.toContain('!important')
	})
})
