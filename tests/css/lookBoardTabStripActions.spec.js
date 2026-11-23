/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The Actions button at the end of a detail page's tab strip is 34px, as the
 * boards draw it (DqZaak, DqContact, DqOrganisatie, DqTaak, DqTenant and the
 * other case tabs: "Acties", min-height 34px). The rule that makes a labelled
 * menu button 40px everywhere else (a page or card header) outranked the
 * strip's own 34px and drew it 40px (COMPDIFF r24, 22 items). The 40px rule
 * now leaves the strip's end alone. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-tab-strip-actions-34/specs/board-tab-strip-actions-34/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const detail = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('a labelled menu button in the board look', () => {
	it('is 40px except at the end of a tab strip', () => {
		const at = css.indexOf('.cn-look-board .action-item__menutoggle.button-vue:has(> .button-vue__wrapper > .button-vue__text:not(:empty))')
		expect(at).toBeGreaterThan(-1)
		const selector = css.slice(at, css.indexOf('{', at))
		expect(selector).toContain(':not(.cn-tabs__nav-end *)')
		expect(css.slice(at, css.indexOf('}', at))).toContain('min-height: var(--cn-board-control-height);')
	})

	it('keeps the tab strip\'s Actions button at 34px', () => {
		const at = detail.indexOf('.cn-look-board .cn-tabs--board .cn-tabs__nav-end .button-vue {')
		expect(detail.slice(at, detail.indexOf('}', at))).toContain('min-height: 34px;')
	})
})
