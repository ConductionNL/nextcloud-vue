/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Nextcloud's server.css draws every dt as a 130px right-aligned inline block
 * and pads dt and dd 12px. The archiving card's facts are a label over its
 * value (DqZaakArchivering): the widget resets both. In the board look its
 * section titles are 15px/600, not the inner heading's 1.4em.
 */
import fs from 'fs'
import path from 'path'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnRetentionWidget/CnRetentionWidget.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const detail = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(css, selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('CnRetentionWidget facts and sections', () => {
	it('draws a fact as a label over its value, without the server\'s dt and dd box', () => {
		const both = rule(sfc, '.cn-retention__fact dt,\n.cn-retention__fact dd')
		expect(both).toContain('display: block')
		expect(both).toContain('width: auto')
		expect(both).toContain('text-align: start')
		expect(rule(sfc, '\n\n.cn-retention__fact dt')).toContain('padding: 0')
		expect(rule(sfc, '\n\n.cn-retention__fact dd')).toContain('padding: 0')
	})

	it('sets the board\'s section titles at 15px/600', () => {
		const heading = rule(detail, '.cn-look-board .cn-retention .cn-retention__section > .cn-inner-heading,\n.cn-look-board .cn-retention .cn-retention__outcome > .cn-inner-heading')
		expect(heading).toContain('font-size: 15px')
		expect(heading).toContain('font-weight: 600')
	})
})
