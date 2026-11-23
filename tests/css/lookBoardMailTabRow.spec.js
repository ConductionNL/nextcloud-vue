/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the mail tab's template row stands 14px 16px apart
 * (DqZaakEmail; COMPDIFF r25 gap 8 vs 16). Read from the stylesheet text.
 *
 * @spec openspec/changes/mail-tab-blank-draft-beside-compose/specs/mail-tab/spec.md#requirement-the-empty-draft-can-stay-in-the-row-beside-the-compose-action
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: the mail tab template row', () => {
	it('sets its parts 14px 16px apart', () => {
		const at = css.indexOf('.cn-look-board .cn-mail-tab__template-row:not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('gap: 14px 16px;')
	})
})
