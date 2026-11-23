/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A joined side paragraph is 14px on a 1.45 line, an icon row's value is
 * regular, and a list's empty sentence is 14px muted on the normal line.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/facts-line-joins-previous/specs/facts-widget/spec.md#requirement-a-line-can-join-the-line-before-it
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: joined line, icon value, empty sentence', () => {
	it('sets a joined side paragraph at 14px on a 1.45 line', () => {
		const body = rule('.cn-look-board .cn-detail-page__side .cn-facts-widget__line--joined:not(.cn-look-nextcloud *)')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('line-height: 1.45;')
	})

	it('reads an icon row\'s value in the regular weight', () => {
		expect(rule('.cn-look-board .cn-detail-page__side .cn-facts-widget__label--icon:not(.cn-look-nextcloud *) + .cn-facts-widget__value')).toContain('font-weight: 400;')
	})

	/** @spec openspec/changes/facts-line-joins-previous/specs/facts-widget/spec.md#requirement-a-board-lists-empty-sentence-is-14px-muted */
	it('writes a list\'s empty sentence 14px muted on the normal line', () => {
		const body = rule('.cn-look-board .cn-detail-page .cn-record-list__empty:not(.cn-look-nextcloud *)')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('line-height: normal;')
	})
})
