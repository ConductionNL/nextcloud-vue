/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaak: a history card with stacked rows opens on its first row's hairline
 * 6px under the title. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-history-card-ruled-start/specs/board-history-card-ruled-start/spec.md#requirement-a-board-history-card-with-stacked-rows-opens-on-its-first-rule
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const selector = '.cn-look-board .cn-detail-card .cn-detail-card__content:has(> .cn-audit-card__list > .cn-audit-card__row--stacked:first-child):not(.cn-look-nextcloud *)'

describe('look-board-detail.css: history card start', () => {
	it('opens a stacked history list 6px under the title', () => {
		const at = css.indexOf('\n' + selector + ' {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding-top: 6px;')
	})
})
