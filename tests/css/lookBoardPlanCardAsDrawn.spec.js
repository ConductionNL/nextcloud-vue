/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaak "Zaakplan": the board draws the plan rows 12px under the title (the
 * rows carry their own 10px, so no half-leading comes off), the Doelen footer
 * row 4px under the plan, and the header note muted at 14px. Live stood 5.3px
 * taller (r44), which moved Termijn en betaling, Flows and Uren registreren.
 * The note's style sat in CnDetailWidgetHost's scoped block while
 * CnDetailWidgetHeaderItems renders it, so it never applied.
 *
 * @spec openspec/changes/board-plan-card-as-drawn/specs/plan/spec.md
 */
const fs = require('fs')
const path = require('path')

const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const css = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8'))
const items = fs.readFileSync(path.join(__dirname, '../../src/components/CnDetailWidgetHost/CnDetailWidgetHeaderItems.vue'), 'utf8')
const itemsStyle = strip(items.slice(items.indexOf('<style')))

/**
 * The body of the first rule whose selector list holds the given selector.
 *
 * @param {string} source Stylesheet text without comments.
 * @param {string} selector One selector of the list.
 * @return {string} The rule body, or ''.
 */
function rule(source, selector) {
	const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]')
	const m = re.exec(source)
	if (!m) {
		return ''
	}
	const open = source.indexOf('{', m.index)
	return source.slice(open, source.indexOf('}', open))
}

describe('the board plan card', () => {
	it('starts the plan rows 12px under the title', () => {
		expect(rule(css, '.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-plan:first-child):not(.cn-look-nextcloud *)')).toContain('padding-top: 12px')
	})

	it('starts a map card\'s map 12px under the title', () => {
		expect(rule(css, '.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-map-widget:first-child):not(.cn-look-nextcloud *)')).toContain('padding-top: 12px')
	})

	it('puts a bare record list footer row 4px under the plan', () => {
		expect(rule(css, '.cn-look-board .cn-detail-page .cn-plan + .cn-detail-widget-host--bare > .cn-record-list--rows > .cn-record-list__footer--row:first-child:not(.cn-look-nextcloud *)')).toContain('margin-top: 4px')
	})

	it('styles the header note in the component that renders it', () => {
		const note = rule(itemsStyle, '.cn-detail-page__catalog-note')
		expect(note).toContain('font-size: 14px')
		expect(note).toContain('color: var(--color-text-maxcontrast)')
	})
})
