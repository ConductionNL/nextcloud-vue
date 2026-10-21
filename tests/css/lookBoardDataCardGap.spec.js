/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a detail page's data card starts its body 14px below its
 * title (DqZaak "Zaakgegevens", DqContact "Contact"), other body cards 12px.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-data-card-gap/specs/board-data-card-gap/spec.md#requirement-a-board-data-cards-body-starts-14px-below-its-title
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const DATA = '.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-object-data-widget__grid-wrap):not(.cn-detail-page__side *)'

describe('look-board-detail.css: a data card\'s body', () => {
	it('starts 14px below the title, less the first line\'s leading', () => {
		expect(bodyOf(DATA)).toContain('padding-top: calc(14px - var(--cn-board-first-line-leading));')
	})

	it('leaves the other body cards at 12px', () => {
		expect(bodyOf('.cn-look-board .cn-detail-page .cn-widget-wrapper__content')).toContain('padding: calc(12px - var(--cn-board-first-line-leading)) 22px 20px;')
	})

	it('leaves a side card at 10px', () => {
		expect(bodyOf('.cn-look-board .cn-detail-page__side .cn-widget-wrapper__content')).toContain('padding: calc(10px - var(--cn-board-first-line-leading)) 22px 20px;')
	})
})
