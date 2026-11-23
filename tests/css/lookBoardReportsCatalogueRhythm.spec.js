/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The reports catalogue (board PqReports) sets its description, section
 * titles, card categories, aside titles and category rows at the font's normal
 * line height, and draws the category rows and the cards' Open link in the
 * main ink, also under a theme that forces every link into the link colour.
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/reports-catalogue-rhythm/specs/reports-catalogue-rhythm/spec.md#requirement-the-reports-catalogue-sets-its-text-as-the-board-does
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-reports.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	let body = ''
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			body += m[2]
		}
	}
	return body
}

const scope = '.cn-look-board .cn-reports-page--catalogue:not(.cn-look-nextcloud *)'

describe('look-board-reports.css: the catalogue rhythm', () => {
	it.each([
		'__description',
		'__section-title',
		'__card-category',
		'__aside-title',
		'__index-link',
	])('sets .cn-reports-page%s at the normal line height', (element) => {
		expect(bodyOf(`${scope} .cn-reports-page${element}`)).toContain('line-height: normal;')
	})

	it.each([
		'__index-link',
		'__card-open',
	])('draws .cn-reports-page%s in the main ink under a theme that forces the link colour', (element) => {
		const body = bodyOf(`${scope} .cn-reports-page${element}`)
		expect(body).toContain('--nldesign-color-on-surface: var(--color-main-text);')
		expect(body).toContain('color: var(--color-main-text);')
	})
})
