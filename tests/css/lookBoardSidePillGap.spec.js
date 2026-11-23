/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqOrganisatie: a side row's pill and its date stand 8px apart. Read from
 * the stylesheet text.
 *
 * @spec openspec/changes/record-list-pill-variant-when/specs/record-list/spec.md#requirement-a-side-rows-pill-and-date-stand-8px-apart
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: side pill gap', () => {
	it('sets the pill and its date 8px apart in a side card', () => {
		const selector = '.cn-look-board .cn-detail-page__side .cn-record-list__aside:not(.cn-look-nextcloud *) {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('gap: 8px;')
	})
})
