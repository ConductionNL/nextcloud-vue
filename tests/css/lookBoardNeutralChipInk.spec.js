/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqContacten: the grey person chip's initials take the boards' soft ink
 * (#3d4047) on the normal line height. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-r31-chip-ink-notes-date/specs/board-r31-chip-ink-notes-date/spec.md#requirement-the-grey-person-chip-uses-the-soft-ink
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: grey person chip', () => {
	it('writes the initials in the soft ink on the normal line height', () => {
		const selector = '.cn-look-board .cn-table-container--board .cn-data-table .cn-cell-renderer__avatar-initials--neutral {'
		const at = css.indexOf(selector)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('color: var(--cn-board-text-soft);')
		expect(body).toContain('line-height: normal;')
	})

	it('sets a compact grey chip at 12px (PqLeads owner, 28px)', () => {
		const selector = '.cn-look-board .cn-table-container--board .cn-data-table .cn-cell-renderer__avatar-initials--neutral.cn-cell-renderer__avatar-initials--compact {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('font-size: 12px;')
	})
})
