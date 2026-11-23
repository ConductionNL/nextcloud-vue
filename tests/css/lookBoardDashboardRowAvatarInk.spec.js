/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard row's initials keep the boards' soft ink (PqMijnWerk "JP",
 * "FK" rgb 61, 64, 71): the row rule that makes every child inherit the row's
 * colour leaves the avatar out, as it does the status pill and the due text.
 * Live drew them in the main text. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-row-pill-ink/specs/board-dashboard-row-pill-ink/spec.md#requirement-a-dashboard-rows-pill-keeps-its-tone
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: dashboard row initials', () => {
	it('leaves the avatar out of the row\'s inherited colour', () => {
		const rule = css.match(/\.cn-dashboard-page:not\(\.cn-look-nextcloud \*\) \.cn-record-list__row \*:where\(:not\(([^)]*)\)\) \{\s*color: inherit;/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('.cn-record-list__avatar')
	})
})
