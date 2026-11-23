/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The admin settings header keeps its buttons on one row: the button group
 * does not shrink when the title block holds a long path note, so the buildiq
 * square sits beside "Documentatie" as the boards draw it (DqBeheerGeavanceerd).
 * jsdom draws no layout, so the rule is read from the source.
 *
 * @spec openspec/changes/admin-header-buttons-keep-their-width/specs/admin-header-buttons-keep-their-width/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8')

describe('CnAdminSettingsShell header buttons', () => {
	it('does not shrink the button group under the board look', () => {
		expect(css).toMatch(/\.cn-look-board \.cn-admin-settings-shell__header-buttons:not\(\.cn-look-nextcloud \*\) \{[^}]*flex: none;/)
	})
})
