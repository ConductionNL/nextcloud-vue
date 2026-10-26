/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A ruled list under a card title with a subtitle starts 8px below the
 * subtitle, for a record list with ruleAbove and for a custom widget whose
 * root carries cn-rule-above (DqZaakBesluiten Adviezen, DqZaakArchivering
 * Bewaring).
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('a ruled list under a subtitle', () => {
	it('pads the card content 8px for a ruleAbove list or a cn-rule-above widget', () => {
		const selector = '> .cn-widget-wrapper__content:has(> .cn-record-list--rows.cn-record-list--rule-above, > .cn-rule-above) {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(css.lastIndexOf('\n', at), at)).toContain('.cn-widget-wrapper__subtitle)')
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding-top: 8px')
	})
})
