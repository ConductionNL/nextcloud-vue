/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page header on its own (a custom view, PqForecast) takes the boards'
 * title in the board look. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-standalone-page-header/specs/board-standalone-page-header/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const STANDALONE = '.cn-look-board .cn-page-header:not(.cn-look-nextcloud *):not(.cn-index-page *):not(.cn-settings-page *):not(.cn-chat-page *):not(.cn-files-page *):not(.cn-form-page *):not(.cn-logs-page *):not(.cn-map-page *):not(.cn-store-page--board *)'

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: a standalone page header', () => {
	it('draws the title 28px/700 on a 1.2 line', () => {
		const body = rule(STANDALONE + ' .cn-page-header__title')
		expect(body).toContain('font-size: 28px')
		expect(body).toContain('font-weight: 700')
		expect(body).toContain('line-height: 1.2')
	})

	it('leaves the page primitives their own header', () => {
		for (const page of ['cn-index-page', 'cn-settings-page', 'cn-chat-page', 'cn-files-page', 'cn-form-page', 'cn-logs-page', 'cn-map-page', 'cn-store-page--board']) {
			expect(STANDALONE).toContain(`:not(.${page} *)`)
		}
	})

	it('puts the line under it 15px, 9px below the title margin', () => {
		const body = rule(STANDALONE + ' .cn-page-header__description')
		expect(body).toContain('margin-top: 9px')
		expect(body).toContain('font-size: 15px')
	})
})
