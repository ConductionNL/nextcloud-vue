/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board row icon tile can take the warning tone (PtMededelingenActies: a
 * warning notice). Read from the stylesheet text.
 *
 * @spec openspec/changes/notice-list-in-a-tab/specs/data-table/spec.md#requirement-a-row-icon-can-follow-a-field-of-the-row
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: warning row icon tile', () => {
	it('draws the warning tile in the warning pill colours', () => {
		const at = css.lastIndexOf('\n.cn-look-board .cn-data-table td.cn-table-col--icon-warning .material-design-icon {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('background: var(--cn-status-warning-bg')
		expect(body).toContain('color: var(--cn-status-warning-text')
	})
})
