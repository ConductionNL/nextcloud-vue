/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dashboard description that is a line of text sits at normal leading
 * and ends the header 8px under it (r32 DqMijnTeam header 72.5 vs 76); one
 * that holds the filters keeps its height. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const selector = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-dashboard-page__description:not(:has(.v-select, .cn-segmented-control))'

describe('look-board.css: a text description under the board title', () => {
	it('pads 8px under it at the normal line height, only without filter controls', () => {
		const at = css.indexOf(selector + ' {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('padding-bottom: 8px;')
		expect(body).toContain('line-height: normal;')
	})
})
