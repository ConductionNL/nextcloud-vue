/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A ruled feed in a page card ends 8px under its last row, as DqContact,
 * DqOrganisatie, PqKlant and PqOrganisatie draw "Laatste contactmomenten".
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-feed-card-bottom-8/specs/board-feed-card-bottom-8/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list ends with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const feedCard = '.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-record-list--feed.cn-record-list--rule-above):not(.cn-detail-page__side *)'

describe('look-board-detail.css: a ruled feed card ends 8px under its last row', () => {
	it('sets the feed card content 12px from the title and 8px from the bottom edge', () => {
		const body = rule(feedCard)
		expect(body).toContain('padding-top: 12px;')
		expect(body).toContain('padding-bottom: 8px;')
	})

	it('keeps the 20px bottom of every other page card', () => {
		expect(rule('.cn-look-board .cn-detail-page .cn-widget-wrapper__content')).toContain('var(--cn-board-card-inline-padding) 20px;')
	})

	it('only applies in the board look, never inside the Nextcloud look', () => {
		expect(feedCard.startsWith('.cn-look-board ')).toBe(true)
		expect(css).not.toMatch(/\.cn-look-nextcloud[^{]*cn-record-list--feed\.cn-record-list--rule-above[^{]*\{[^}]*padding-bottom: 8px/)
	})
})
