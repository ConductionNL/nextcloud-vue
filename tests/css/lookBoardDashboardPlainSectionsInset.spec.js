/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a dashboard card that holds a plain sections widget
 * insets its body like any dashboard card. The card is flush, because a
 * sections widget usually draws its own cards; the plain one draws none, so
 * its text touched the card's edge (COMPDIFF r22 DqTermijnen "Jaarlijkse
 * dwangsomaudit": first line 1px in, the board 23). Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-plain-sections-inset/specs/board-dashboard-plain-sections-inset/spec.md#requirement-a-board-dashboard-card-insets-a-plain-sections-body
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: a dashboard card with a plain sections widget', () => {
	it('insets the body by the dashboard card inset, 20px at the bottom', () => {
		const selector = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper__content:has(> .cn-sections-widget--plain) {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding: 0 var(--cn-board-dashboard-card-inset) 20px;')
	})
})
