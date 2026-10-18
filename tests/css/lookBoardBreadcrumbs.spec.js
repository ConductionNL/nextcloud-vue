/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnBreadcrumbs in the board look is a line of 14px text, 8px apart: the
 * crumbs that lead somewhere are underlined links in the primary colour, the
 * current one plain muted text (DqZaak "Alle zaken / 2026-0082"), wherever
 * the trail sits, not only in a detail header. Read from the stylesheet text.
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

const guard = ':not(.cn-look-nextcloud *)'
const crumb = `.cn-look-board .cn-breadcrumbs .vue-crumb .button-vue.button-vue${guard}`

describe('look-board.css: CnBreadcrumbs', () => {
	it('draws the trail as a 14px line, crumbs 8px apart', () => {
		expect(rulesFor(`.cn-look-board .cn-breadcrumbs.cn-breadcrumbs${guard}`)).toContain('font-size: 14px')
		expect(rulesFor(`.cn-look-board .cn-breadcrumbs.cn-breadcrumbs${guard}`)).toContain('line-height: normal')
		expect(rulesFor(crumb)).toContain('line-height: inherit')
		expect(rulesFor(`.cn-look-board .cn-breadcrumbs .breadcrumb__crumbs${guard}`)).toContain('gap: 8px')
	})

	it('draws a crumb as text, not a button: no padding, border or ground, weight 400', () => {
		const rule = rulesFor(crumb)
		expect(rule).toContain('padding: 0')
		expect(rule).toContain('border: 0')
		expect(rule).toContain('background: transparent')
		expect(rule).toContain('font-weight: 400')
	})

	it('draws a crumb that leads somewhere as an underlined link in the primary colour', () => {
		expect(rulesFor(crumb)).toContain('color: var(--color-primary-element)')
		expect(rulesFor(crumb)).toContain('--nldesign-color-on-surface: var(--color-primary-element)')
		expect(rulesFor(`${crumb} .button-vue__text`)).toContain('text-decoration: underline')
	})

	it('draws the current crumb as plain muted text', () => {
		const current = `.cn-look-board .cn-breadcrumbs .vue-crumb .button-vue.button-vue[aria-current='page']${guard}`
		expect(rulesFor(current)).toContain('color: var(--color-text-maxcontrast)')
		expect(rulesFor(`${current} .button-vue__text`)).toContain('text-decoration: none')
	})
})
