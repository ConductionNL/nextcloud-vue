/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The share dialog's audience rows in the board look (DqFilterDelen, r30):
 * radius 8 on the page's own ground (#f5f6f8, --cn-board-sunken-ground),
 * where live drew them with Nextcloud's 12px radius on the hover grey.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-share-rows-ground/specs/board-share-rows-ground/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: share dialog audience rows', () => {
	it('draws a row at radius 8 on the sunken ground', () => {
		const at = css.indexOf('.cn-look-board .cn-saved-view-share__mode:not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toMatch(/border-radius: 8px;/)
		expect(body).toMatch(/background: var\(--cn-board-sunken-ground\);/)
	})
})
