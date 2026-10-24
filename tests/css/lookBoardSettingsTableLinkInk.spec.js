/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A linked cell in a table on an admin settings card reads in the text ink, as
 * the index tables do, not in the settings page's link blue (DqInstellingen:
 * a connection's name opens its settings card). jsdom draws no layout, so the
 * rule is read from the stylesheet text.
 *
 * @spec openspec/changes/settings-table-link-ink/specs/settings-board-look/spec.md#requirement-a-linked-cell-in-a-settings-table-reads-in-the-text-ink
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: a linked cell in a settings table', () => {
	it('reads in the text ink', () => {
		const rule = /\.cn-look-board \.settings-section \.cn-data-table a\.cn-cell-renderer__link:not\(\.cn-look-nextcloud \*\)\s*\{([^}]*)\}/.exec(css)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('color: var(--color-main-text);')
	})
})
