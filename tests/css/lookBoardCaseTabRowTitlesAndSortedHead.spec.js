/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The case boards set an incident's description in bold (DqZaakTaken
 * "Incidenten", a record list with `strongTitle: true`), and keep a detail
 * card table's sorted column label in the head's muted ink
 * (DqZaakGerelateerd Deelzaken "Termijn", Objecten "Identificatie").
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule whose selector list is exactly `selector`.
 *
 * @param {string} css The stylesheet.
 * @param {string} selector The selector text before the opening brace.
 * @return {string} The rule body, or '' when the rule is missing.
 */
function rule(css, selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('board look: case tab row titles and the sorted head', () => {
	it('sets a strong-titled list row title at 600', () => {
		expect(rule(read('look-board.css'), '.cn-look-board .cn-record-list--rows.cn-record-list--strong-title:not(.cn-dashboard-page *):not(.cn-look-nextcloud *) .cn-record-list__title'))
			.toContain('font-weight: 600')
	})

	it('sets the task menu 4px after the row button', () => {
		expect(rule(read('look-board-detail.css'), '.cn-look-board .cn-detail-page .cn-widget-wrapper__content > .cn-tasks-widget .cn-tasks-widget__table .cn-tasks-widget__cell-actions > * + *'))
			.toContain('margin-inline-start: 4px')
	})

	it('mutes a done task\'s status tag', () => {
		expect(rule(read('look-board-detail.css'), '.cn-look-board .cn-tasks-widget__table-row--done .cn-status-badge--default:not(.cn-look-nextcloud *)'))
			.toContain('--cn-status-badge-ink: var(--color-text-maxcontrast)')
	})

	it('keeps a detail card table\'s sorted label in the head ink', () => {
		expect(rule(read('look-board-detail.css'), '.cn-look-board .cn-detail-page .cn-object-list-widget .cn-data-table th[aria-sort] .cn-table-header__sort:not(.cn-look-nextcloud *)'))
			.toContain('color: inherit')
	})
})
