/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw the texts of a detail page's side cards (Termijn, Aanvrager,
 * Gekoppeld, Werkinstructie, Status) at the font's normal line height. With
 * Nextcloud's 1.5 leading each card stood 2 to 48px taller and every card
 * under it moved down (DqZaak: Status +21.6). Read from the stylesheet text.
 *
 * @spec openspec/changes/side-card-text-normal-leading/specs/side-card-text-normal-leading/spec.md#requirement-a-side-cards-texts-read-at-normal-leading
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const TEXTS = [
	'cn-countdown-widget__sub',
	'cn-facts-widget__link',
	'cn-facts-widget__link-note',
	'cn-linked-widget__empty',
	'cn-status-explainer__muted',
	'cn-status-explainer__dwell',
	'cn-attention-flag__heading',
	'cn-attention-flag__hint',
]

/**
 * The body of the first rule whose selector list holds the given selector.
 *
 * @param {string} selector One selector of the list.
 * @return {string} The rule body, or ''.
 */
function ruleHolding(selector) {
	const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]')
	const m = re.exec(css)
	if (!m) {
		return ''
	}
	const open = css.indexOf('{', m.index)
	return css.slice(open, css.indexOf('}', open))
}

describe('look-board-detail.css: side card texts at normal leading', () => {
	it.each(TEXTS)('sets .%s in a side card at the normal line height', (cls) => {
		expect(ruleHolding('.cn-look-board .cn-detail-page__side .' + cls)).toMatch(/line-height: normal;/)
	})
})
