/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dashboard's record-list row keeps its link text in the row's ink,
 * but a status pill and a due text inside it keep their own tone
 * (DqProcesanalyse "Knelpunt" in red, "Let op" in amber). The row's
 * `color: inherit` reached every descendant and turned the pill ink to the
 * main text. jsdom draws no layout, so the rule is read from the stylesheet.
 *
 * @spec openspec/changes/board-dashboard-row-pill-ink/specs/board-dashboard-row-pill-ink/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const PREFIX = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list__row'

/**
 * Every selector of every rule that sets `color: inherit` for a dashboard row.
 *
 * @return {Array<string>} The selectors.
 */
function inheritingSelectors() {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (/color:\s*inherit/.test(m[2])) {
			out.push(...m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).filter((s) => s.startsWith(PREFIX)))
		}
	}
	return out
}

describe('look-board: a dashboard row keeps its pills in their own ink', () => {
	it('still hands the row link and its text the row ink', () => {
		const selectors = inheritingSelectors()
		expect(selectors).toContain(PREFIX)
		expect(selectors.some((s) => s.startsWith(`${PREFIX} *`))).toBe(true)
	})

	it('leaves a status pill and a due text out of the inherited ink', () => {
		for (const selector of inheritingSelectors().filter((s) => s.startsWith(`${PREFIX} *`))) {
			// Inside :where, so the exemption adds no specificity and the rest of
			// the row still inherits as before.
			expect(selector).toContain(':where(:not(.cn-status-badge, .cn-status-badge *, .cn-record-list__due))')
		}
	})
})
