/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page's sibling-page tabs (DqContracten) are the board's folder
 * tabs in the main ink, not links. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-index-page-tabs/specs/board-index-page-tabs/spec.md#requirement-board-index-page-tabs-are-folder-tabs-in-the-main-ink
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

const strip = '.cn-look-board .cn-index-page__page-tabs:not(.cn-look-nextcloud *)'

describe('look-board-index.css: page tabs', () => {
	it('draws no line under the strip', () => {
		expect(rulesFor(strip)).toContain('border-bottom: 0')
	})

	it('sets a tab in the main ink at 14px without an underline', () => {
		const tab = rulesFor(`${strip} .cn-index-page__page-tab`)
		expect(tab).toContain('color: var(--color-main-text)')
		expect(tab).toContain('--nldesign-component-link-color: var(--color-main-text)')
		expect(tab).toContain('text-decoration: none !important')
		expect(tab).toContain('font-size: 14px')
		expect(tab).toContain('line-height: normal')
	})

	it('sets the open tab at 700 on a white bottom edge', () => {
		const open = rulesFor(`${strip} .cn-index-page__page-tab--active`)
		expect(open).toContain('font-weight: 700')
		expect(open).toContain('border-bottom: 1px solid var(--color-main-background)')
	})
})
