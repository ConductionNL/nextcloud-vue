/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Guards CnIndexPage's table-view scroll contract, which has regressed once
 * already.
 *
 * In `table` view the index page — not the page column — owns scrolling, so
 * that (a) the column headers pin while rows scroll and (b) the horizontal
 * scrollbar sits at the visible bottom edge rather than below the fold.
 *
 * Both guarantees hinge on ONE element being the scrollport: CnDataTable's
 * `.cn-data-table__scroll` wrapper. That wrapper exists because a dashboard
 * widget-card's sticky footer needs horizontal overflow off `.cn-table-container`
 * (see table.css) — and when it was introduced it silently took over as the
 * nearest scrollport while having no height constraint, so the sticky header
 * pinned to a box that never scrolled and the h-scrollbar dropped to the bottom
 * of the full table. These assertions fail if that split returns.
 *
 * CSS is asserted by reading the stylesheet: these are global (unscoped) rules
 * in an external file, which jsdom never applies, so a mounted-component
 * assertion could not see them.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const CSS_DIR = join(__dirname, '../../src/css')

/**
 * Parse a stylesheet into `{ selector, body }` pairs, comments stripped.
 *
 * @param {string} file Filename under src/css.
 * @return {Array<{selector: string, body: string}>} Flat rule list.
 */
function rules(file) {
	return readFileSync(join(CSS_DIR, file), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.split('}')
		.map((chunk) => {
			const [selector, body] = chunk.split('{')
			return { selector: (selector || '').trim(), body: (body || '').trim() }
		})
		.filter((r) => r.selector && r.body)
}

/**
 * The declaration block for an exact selector.
 *
 * @param {string} file Filename under src/css.
 * @param {string} selector Exact selector text.
 * @return {string} The rule body (empty string when absent).
 */
function ruleFor(file, selector) {
	const match = rules(file).find((r) => r.selector === selector)
	return match ? match.body : ''
}

const TABLE_VIEW = '.cn-index-page__main--table'
const SCROLL_WRAPPER = `${TABLE_VIEW} .cn-data-table__scroll`
const CONTAINER = `${TABLE_VIEW} > .cn-table-container`

describe('CnIndexPage table view — the scroll contract', () => {
	it('makes the scroll wrapper the height-constrained scrollport', () => {
		const body = ruleFor('index-page.css', SCROLL_WRAPPER)
		expect(body).toBeTruthy()
		// Both axes on ONE element — the whole point.
		expect(body).toMatch(/overflow:\s*auto/)
		// Without a height constraint the wrapper grows to fit its content and
		// never scrolls, which is exactly how this broke before.
		expect(body).toMatch(/flex:\s*1/)
		expect(body).toMatch(/min-height:\s*0/)
	})

	it('leaves the table container clipping, not scrolling', () => {
		const body = ruleFor('index-page.css', CONTAINER)
		expect(body).toBeTruthy()
		expect(body).toMatch(/overflow:\s*hidden/)
		// A flex column so the wrapper above can claim the leftover height.
		expect(body).toMatch(/flex-direction:\s*column/)
		// Two scrollports would split the axes again.
		expect(body).not.toMatch(/overflow:\s*auto/)
		expect(body).not.toMatch(/overflow-y:\s*auto/)
	})

	it('pins the column headers to that scrollport', () => {
		const body = ruleFor('index-page.css', `${TABLE_VIEW} .cn-data-table thead th`)
		expect(body).toMatch(/position:\s*sticky/)
		expect(body).toMatch(/top:\s*0/)
		// The collapsed bottom border stays behind when the cell pins, so it is
		// redrawn as an inset shadow that travels with it.
		expect(body).toMatch(/box-shadow:\s*inset/)
	})

	it('keeps the view a clipping flex column so the pagination stays pinned', () => {
		const body = ruleFor('index-page.css', TABLE_VIEW)
		expect(body).toMatch(/overflow:\s*hidden/)
		expect(body).toMatch(/flex-direction:\s*column/)
		expect(ruleFor('index-page.css', `${TABLE_VIEW} > .cn-index-page__pagination`))
			.toMatch(/flex:\s*0\s+0\s+auto/)
	})

	it('still keeps horizontal overflow off .cn-table-container globally', () => {
		// The dashboard widget-card sticky footer depends on this; the table-view
		// rules above must fix the index page WITHOUT undoing it.
		expect(ruleFor('table.css', '.cn-data-table__scroll')).toMatch(/overflow-x:\s*auto/)
		const container = ruleFor('table.css', '.cn-table-container')
		expect(container).not.toMatch(/overflow/)
	})

	it('applies the table-view class only in table mode', () => {
		const sfc = readFileSync(
			join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'),
			'utf8',
		)
		expect(sfc).toMatch(/'cn-index-page__main--table':\s*currentViewMode === 'table'/)
	})
})
