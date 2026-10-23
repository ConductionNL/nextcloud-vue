/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A vertical Nextcloud dashboard widget on a board dashboard card draws its
 * items as the board's activity rows (DqMijnWerk "Recente activiteit"). Read
 * from the stylesheet text.
 *
 * @spec openspec/changes/board-nc-widget-activity-rows/specs/board-nc-widget-activity-rows/spec.md#requirement-a-board-dashboard-nc-widget-draws-its-items-as-activity-rows
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
const item = `${page} .cn-nc-widget-widget__item--vertical`

describe('look-board.css: a dashboard NC widget as activity rows', () => {
	it('insets the vertical body at the card inset, 2px under the header', () => {
		const body = rulesFor(`${page} .cn-widget-wrapper:not(.cn-widget-wrapper--borderless) .cn-nc-widget-widget__body--vertical`)
		expect(body).toContain('padding: 2px var(--cn-board-dashboard-card-inset) 10px')
		expect(body).toContain('gap: 0')
	})

	it('draws each item as a hairline row, 12px above and below its text', () => {
		const row = rulesFor(`${page} .cn-nc-widget-widget__body--vertical a.cn-nc-widget-widget__item--vertical`)
		expect(row).toContain('border-top: 1px solid var(--cn-board-hairline)')
		expect(row).toContain('padding: 12px 0')
		expect(row).toContain('gap: 12px')
		expect(row).toContain('text-decoration: none !important')
	})

	it('turns the icon slot into the 10px primary dot', () => {
		const dot = rulesFor(`${item} .cn-nc-widget-widget__item-icon-wrap`)
		expect(dot).toContain('width: 10px')
		expect(dot).toContain('height: 10px')
		expect(dot).toContain('background: var(--color-primary-element)')
		expect(rulesFor(`${item} .cn-nc-widget-widget__item-icon-wrap img`)).toContain('display: none')
	})

	it('sets the title 14px regular in the main ink and lets it wrap', () => {
		const title = rulesFor(`${item} .cn-nc-widget-widget__item-title`)
		expect(title).toContain('font-size: 14px')
		expect(title).toContain('font-weight: 400')
		expect(title).toContain('color: var(--color-main-text)')
		expect(title).toContain('white-space: normal')
		expect(rulesFor(`${item} .cn-nc-widget-widget__item-subtitle`)).toContain('font-size: 13px')
	})
})
