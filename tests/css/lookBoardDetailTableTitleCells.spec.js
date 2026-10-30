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
		const at = css.indexOf('.cn-look-board .cn-detail-page .cn-object-list-widget td.cn-table-col--title:not(.cn-look-nextcloud *):not(.cn-table-container--title-text *),')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(css.indexOf('{', at), css.indexOf('}', at))
		expect(body).toContain('font-size: 14px')
		expect(body).toContain('color: var(--color-primary-element)')
	})

	it('leave a plain log\'s first column in the body ink (rowTitle text, DqZaakAssistent AI log)', () => {
		expect(css).not.toContain('.cn-look-board .cn-detail-page .cn-object-list-widget td.cn-table-col--title:not(.cn-look-nextcloud *),')
		expect(css).toContain('td.cn-table-col--title .cn-cell-renderer:not(.cn-look-nextcloud *):not(.cn-table-container--title-text *)')
	})
})

describe('look-board-detail.css: a detail card table with rowTitle strong', () => {
	const selector = '.cn-look-board .cn-detail-page .cn-object-list-widget .cn-table-container--title-strong td.cn-table-col--title:not(.cn-look-nextcloud *),'

	it('names each row at 14px weight 600 in the main ink, not the link colour (PqOfferte "Regels")', () => {
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(css.indexOf('{', at), css.indexOf('}', at))
		expect(body).toContain('color: var(--color-main-text)')
		expect(body).toContain('font-size: 14px')
		expect(body).toContain('font-weight: 600')
	})

	it('comes after the link-colour rule, which has the same weight', () => {
		const link = css.indexOf('.cn-look-board .cn-detail-page .cn-object-list-widget td.cn-table-col--title:not(.cn-look-nextcloud *):not(.cn-table-container--title-text *),')
		expect(css.indexOf(selector)).toBeGreaterThan(link)
	})
})
