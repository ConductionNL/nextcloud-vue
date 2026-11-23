/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A case header sets its pills and breadcrumb 22px under the title row, as
 * every Dq case board draws it (r32: row 2 at 142 against 158, so the case
 * page and its tabs stood 16px high on DqZaak and the five tab boards).
 *
 * @spec openspec/changes/board-follow-row/specs/board-follow-row/spec.md#requirement-the-board-follow-control-sits-under-the-breadcrumb
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('board case header meta gap', () => {
	it('puts row 2 16px past the header\'s 6px row gap, on a case header only', () => {
		expect(rule('.cn-look-board .cn-detail-page__header--with-widget .cn-detail-page__header-row2')).toContain('margin-top: 16px')
	})
})
