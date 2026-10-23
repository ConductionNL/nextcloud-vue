/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board follow pill (DqZaak "Volgen") draws its label in the main text.
 * The control is a tertiary NcButton, and a theme may point --color-main-text
 * at its button ink on a tertiary itself (thematiq: the zuiddrecht primary),
 * so the wrapper hands the theme's button ink the main text. jsdom draws no
 * layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-follow-pill-ink/specs/board-follow-pill-ink/spec.md#requirement-the-follow-pill-label-is-the-main-text-under-a-theme
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-detail.css: follow pill ink', () => {
	it('hands the theme button ink the main text on the wrapper', () => {
		expect(bodiesOf('.cn-look-board .cn-detail-page .cn-follow-toggle')).toContain('--nldesign-component-button-color: var(--color-main-text);')
	})
})
