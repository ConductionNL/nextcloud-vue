/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A colour swatch cell sits on its line (vertical-align top), so a row with a
 * swatch is as tall as one without (DqZaaktypeStatussen 42.2 against 40).
 */
const fs = require('fs')
const path = require('path')

describe('CnCellRenderer swatch alignment', () => {
	it('top-aligns the swatch wrapper', () => {
		const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnCellRenderer/CnCellRenderer.vue'), 'utf8')
		const style = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')
		expect(style).toMatch(/\.cn-cell-renderer__swatch-wrap\s*\{[^}]*vertical-align: top;/)
	})
})
