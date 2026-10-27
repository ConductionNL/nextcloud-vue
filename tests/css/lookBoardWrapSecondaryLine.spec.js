/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A wrapping column other than the title (DqTaken Onderwerp) draws its
 * secondary line ("2026-4853") 14px and muted, 2px under the value, at a
 * normal line height. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-main-contact-lines/specs/parties/spec.md#requirement-a-wrapping-columns-secondary-line-is-14px-2px-under-its-value-in-the-board-look
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: a wrapping column\'s secondary line', () => {
	it('is 14px, 2px under the value, at a normal line height', () => {
		const selector = '.cn-look-board .cn-table-container--board .cn-data-table td.cn-cell--wrap:not(.cn-table-col--title) .cn-table-cell__secondary {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('margin-top: 2px')
		expect(body).toContain('font-size: 14px')
		expect(body).toContain('line-height: normal')
	})
})
