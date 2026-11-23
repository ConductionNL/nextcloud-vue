/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A chart in a framed section of a dashboard sections card takes none of the
 * card's own inset: its content starts 17px in, as the section's title
 * (DqDoorlooptijd "Naleving"). Read from the stylesheet.
 *
 * @spec openspec/changes/board-sections-chart-single-inset/specs/board-sections-chart-single-inset/spec.md#requirement-a-chart-inside-a-dashboard-sections-card-is-inset-once
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const PREFIX = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--borderless) .cn-sections-widget__section'

describe('look-board: a chart in a sections card section is inset once', () => {
	it('takes no padding of its own in a section', () => {
		const re = /([^{}]+)\{([^{}]*)\}/g
		const zeroed = []
		let m
		while ((m = re.exec(css))) {
			if (/padding:\s*0;/.test(m[2])) {
				zeroed.push(...m[1].split(/,(?![^(]*\))/).map((s) => s.trim()))
			}
		}
		for (const part of ['.cn-chart-widget__html', '.cn-chart-widget__canvas', '.cn-chart-widget > .cn-chart-widget__footnote']) {
			expect(zeroed).toContain(`${PREFIX} ${part}`)
		}
	})
})
