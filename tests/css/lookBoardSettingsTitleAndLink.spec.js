/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board settings card without a subtitle centres its title on the
 * title-row buttons, and its "show the explanations" toggle is a text link
 * flush with the card edge. jsdom draws no layout, so the rules are read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-settings-title-centred-and-link-flush/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: a settings card head', () => {
	it('centres a title without subtitle on the buttons', () => {
		expect(css).toMatch(/:has\(> \.cn-settings-section__actions\):not\(:has\(> \.settings-section__desc\)\) > \.settings-section__name \{\s*align-self: center;\s*\}/)
	})

	it('draws the explanations toggle without padding', () => {
		expect(css).toMatch(/\.cn-settings-fields__hints-toggle:not\(\.cn-look-nextcloud \*\) \.button-vue \{[^}]*--button-padding: 0px;[^}]*padding-inline: 0;/)
	})
})
