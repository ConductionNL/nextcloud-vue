/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqOrganisatie: a stacked side list starts 10px under the title with no
 * hairline or row padding, a main contact 12px under it at normal line
 * height. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-side-lead-gaps/specs/board-side-lead-gaps/spec.md#requirement-a-board-side-card-starts-a-stacked-list-or-main-contact-as-drawn
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

const side = '.cn-look-board .cn-detail-page__side'

describe('look-board-detail.css: side card leads', () => {
	it('starts a stacked side list 10px down, unruled and unpadded', () => {
		expect(rule(`${side} .cn-widget-wrapper__content:has(> .cn-record-list--stacked)`)).toContain('padding-top: 10px;')
		expect(rule(`${side} .cn-record-list--stacked.cn-record-list--rows:not(.cn-look-nextcloud *) .cn-record-list__item`)).toContain('border-top: 0;')
		expect(rule(`${side} .cn-record-list--stacked.cn-record-list--rows:not(.cn-look-nextcloud *) .cn-record-list__row`)).toContain('padding: 0;')
	})

	it('starts a main contact 12px down at normal line height', () => {
		expect(rule(`${side} .cn-widget-wrapper__content:has(> .cn-object-parties > .cn-object-parties__main-card)`)).toContain('padding-top: 12px;')
		expect(rule(`${side} .cn-object-parties__main-text`)).toContain('line-height: normal;')
	})
})
