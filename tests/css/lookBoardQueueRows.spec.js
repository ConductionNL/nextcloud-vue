/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board DqTeamwachtrij draws the list view's rows 12px 18px with 14px between
 * the cells, the title (15px) and its meta line (13px) at their normal leading
 * and wrapping inside the title column instead of ending in an ellipsis
 * (75px rows; live drew 59px rows with both lines cut off). The "Team today"
 * card draws each person's name and availability at their normal leading
 * (58px a person; live 66, so the card below it stood 48px low).
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-queue-rows-as-drawn/specs/board-queue-rows-as-drawn/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function bodiesOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const row = '.cn-look-board .cn-index-page__main--list .cn-object-row:not(.cn-look-nextcloud *)'

describe('look-board-index.css: list view rows (DqTeamwachtrij)', () => {
	it('pads a row 12px 18px with 14px between its cells', () => {
		const body = bodiesOf(row)
		expect(body).toContain('gap: 14px;')
		expect(body).toContain('padding: 12px 18px 12px 12px;')
	})

	it('stacks the title and meta 2px apart', () => {
		expect(bodiesOf(`${row} .cn-object-row__main`)).toContain('gap: 2px;')
	})

	it('draws the title 15px and lets title and meta wrap at their normal leading', () => {
		const title = bodiesOf(`${row} .cn-object-row__title`)
		expect(title).toContain('font-size: 15px;')
		for (const part of ['__title', '__subtitle']) {
			const body = bodiesOf(`${row} .cn-object-row${part}`)
			expect(body).toContain('white-space: normal;')
			expect(body).toContain('line-height: normal;')
		}
	})
})

describe('look-board-index.css: team today (DqTeamwachtrij)', () => {
	it('sets the name and the availability line at their normal leading', () => {
		expect(bodiesOf('.cn-look-board .cn-team-workload__name:not(.cn-look-nextcloud *)')).toContain('line-height: normal;')
		expect(bodiesOf('.cn-look-board .cn-team-workload__state:not(.cn-look-nextcloud *)')).toContain('line-height: normal;')
	})
})
