/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a dashboard card's record list pads each row 12px above
 * and below, as the Dq dashboards draw it (DqDashboard, DqMijnTeam,
 * DqMijnWerk: `padding: 12px 0`, title 600). Dq wins where it and the
 * pipelinq board (14px) differ. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-list-density/specs/board-dashboard-list-density/spec.md#requirement-a-board-dashboard-list-row-is-padded-12px
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: a dashboard list row', () => {
	it('is padded 12px above and below, the title at 600', () => {
		const row = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list__row {'
		const at = css.indexOf(row)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding: 12px 0;')
		const title = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list__title {'
		const t = css.indexOf(title)
		expect(css.slice(t, css.indexOf('}', t))).toContain('font-weight: 600;')
	})
})
