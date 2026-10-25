/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list page's note after the breadcrumb is 14px, as all 37 Dq list boards
 * draw it (DqContracten, DqAfdelingen r26a: live 15px).
 *
 * @spec openspec/changes/board-index-header-meta-14/specs/index-page/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: the list page header note', () => {
	it('is 14px', () => {
		expect(css).toMatch(/\.cn-look-board \.cn-index-page \.cn-page-header \.cn-header-trail \.cn-detail-page__header-meta \{\s*font-size: 14px;\s*\}/)
	})
})
