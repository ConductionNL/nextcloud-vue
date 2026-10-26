/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A table in a detail page card names each row in the link colour at 14px
 * (DqZaakGerelateerd "Deelzaken", "Objecten"; r31 drew 15px in the body ink).
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-detail-table-title-cells/specs/board-tables/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: a detail card table\'s row names', () => {
	it('are 14px in the link colour', () => {
		const at = css.indexOf('.cn-look-board .cn-detail-page .cn-object-list-widget td.cn-table-col--title:not(.cn-look-nextcloud *),')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(css.indexOf('{', at), css.indexOf('}', at))
		expect(body).toContain('font-size: 14px')
		expect(body).toContain('color: var(--color-primary-element)')
	})
})
