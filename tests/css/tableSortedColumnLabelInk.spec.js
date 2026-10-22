/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The sorted column's header label is at full text colour, like its direction
 * chevron; the other headers keep the secondary text colour (boards DqZaken,
 * DqContacten, DqOrganisaties, DqFilterInMenu). Read from the stylesheet text.
 *
 * @spec openspec/changes/table-sorted-column-label-ink/specs/table-sorted-column-label-ink/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/table.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('table.css: the sorted column header', () => {
	it.each(['ascending', 'descending'])('draws the label at full text colour when aria-sort is %s', (dir) => {
		expect(rulesFor(`.cn-data-table th[aria-sort='${dir}'] .cn-table-header__sort`)).toMatch(/color:\s*var\(--color-main-text\)/)
	})

	it('leaves an unsorted header label inheriting the header colour', () => {
		expect(rulesFor('.cn-data-table th .cn-table-header__sort')).toMatch(/color:\s*inherit/)
	})
})
