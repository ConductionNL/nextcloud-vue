/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A text card on a board dashboard (DqDagAfsluiten "Hoe dit werkt") sits at
 * the card inset, just under its title, at the widget's font size. Read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-text-card/specs/board-dashboard-text-card/spec.md#requirement-a-board-dashboard-text-card-sits-at-the-card-inset-under-its-title
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

const page = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *)'

describe('look-board.css: a dashboard text card', () => {
	it('pads the widget at the card inset over its inline 16px', () => {
		const rule = rulesFor(`${page} .cn-widget-wrapper:not(.cn-widget-wrapper--borderless) .cn-text-widget`)
		expect(rule).toContain('padding: 0 var(--cn-board-dashboard-card-inset) 20px !important')
		expect(rule).toContain('margin-top: -2px')
	})

	it('sets the blocks at the widget size and a 1.5 line height', () => {
		const rule = rulesFor(`${page} .cn-text-widget__content > *`)
		expect(rule).toContain('font-size: inherit !important')
		expect(rule).toContain('line-height: 1.5 !important')
		expect(rulesFor(`${page} .cn-text-widget__content > :first-child`)).toContain('margin-top: 0')
		expect(rulesFor(`${page} .cn-text-widget__content > :last-child`)).toContain('margin-bottom: 0')
	})
})
