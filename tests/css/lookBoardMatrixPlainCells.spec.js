/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board matrix cell without a tone ("geen" on DqProcesanalyse "Dagen per
 * fase") sits on the page ground in the muted ink. Read from the stylesheet
 * text.
 *
 * @spec openspec/changes/board-matrix-plain-cells/specs/board-matrix-plain-cells/spec.md#requirement-a-board-matrix-cell-without-a-tone-sits-on-the-ground-in-the-muted-ink
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const matrix = '.cn-look-board .cn-chart-widget__matrix:not(.cn-look-nextcloud *)'

describe('look-board.css: a matrix cell without a tone', () => {
	it.each([
		`${matrix} .cn-chart-widget__matrix-cell--tone:not([style*="background"])`,
		`${matrix} .cn-chart-widget__matrix-cell--0`,
	])('%s takes the content surface and the muted ink', (selector) => {
		const rule = rulesFor(selector)
		expect(rule).toContain('background: var(--nldesign-component-content-surface-background-color, var(--color-background-hover))')
		expect(rule).toContain('color: var(--color-text-maxcontrast)')
		expect(rule).toContain('--nldesign-color-on-surface: var(--color-text-maxcontrast)')
	})
})
