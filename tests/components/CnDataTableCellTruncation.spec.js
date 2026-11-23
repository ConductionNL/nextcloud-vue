/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * One line per cell, cut with an ellipsis where it does not fit.
 *
 * Under `table-layout: auto` a cell is free to paint past its own box, so on
 * dossiq's supplier-users table the Email column's content rendered over
 * Supplier reference. Clipping ends that.
 *
 * It does NOT decide who gets the surplus width, and these tests do not claim
 * it does: `auto` shares spare width content-blind, and single-line cells give
 * it no signal, so a column with little to say can still be handed more room
 * than one that was truncated. Measuring the columns in JS was tried and
 * reverted. A column that must be a given width declares one.
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

const CELLS = '.cn-data-table th,\n.cn-data-table td'

describe('CnDataTable cell truncation', () => {
	it('keeps a cell to one line and cuts what does not fit', () => {
		const rule = ruleFor('table.css', CELLS)

		// All three together: `text-overflow` does nothing without `nowrap`,
		// and nothing is clipped without `overflow: hidden`.
		expect(rule).toMatch(/overflow:\s*hidden/)
		expect(rule).toMatch(/text-overflow:\s*ellipsis/)
		expect(rule).toMatch(/white-space:\s*nowrap/)
	})

	it('caps through a variable, so a consumer can widen or lift it', () => {
		expect(ruleFor('table.css', CELLS)).toMatch(/max-width:\s*var\(--cn-table-cell-max-width,\s*[^)]+\)/)
	})

	it('leaves the control columns alone, so an icon or checkbox is not clipped', () => {
		const rule = ruleFor(
			'table.css',
			'.cn-data-table .cn-table-col--checkbox,\n.cn-data-table .cn-table-col--icon,\n.cn-data-table .cn-table-col--actions',
		)

		expect(rule).toMatch(/max-width:\s*none/)
		expect(rule).toMatch(/overflow:\s*visible/)
		expect(rule).toMatch(/white-space:\s*normal/)
	})

	it('offers a way back to wrapping for a column holding prose', () => {
		const rule = ruleFor('table.css', '.cn-data-table th.cn-cell--wrap,\n.cn-data-table td.cn-cell--wrap')

		expect(rule).toMatch(/white-space:\s*normal/)
		expect(rule).toMatch(/overflow:\s*visible/)
		// Prose that wraps still must not run into the next column.
		expect(rule).toMatch(/overflow-wrap:\s*anywhere/)
	})
})
