/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget-reported card header action ("Document genereren" on the case's
 * Besluiten tab) is drawn by CnDetailWidgetHeaderItems, so its style lives in
 * that component's scoped block: a scoped rule in another component never
 * reaches it. In the board look a header action in the main column is a
 * neutral 40px control, as the boards draw it. jsdom draws no layout, so the
 * rules are read from the source text.
 *
 * @spec openspec/changes/board-widget-header-action-neutral/specs/board-widget-header-action-neutral/spec.md#requirement-a-widget-header-action-is-styled-where-it-is-rendered
 * @spec openspec/changes/board-widget-header-action-neutral/specs/board-widget-header-action-neutral/spec.md#requirement-a-board-widget-header-action-in-the-main-column-is-a-neutral-40px-control
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8')

/**
 * The scoped style block of a single-file component, comments removed.
 *
 * @param {string} file The component path under src.
 * @return {string} The style text.
 */
function styleOf(file) {
	const m = read(file).match(/<style[^>]*>([\s\S]*?)<\/style>/)
	return m ? m[1].replace(/\/\*[\s\S]*?\*\//g, '') : ''
}

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('a widget card header action', () => {
	it('is styled by the component that renders it', () => {
		expect(read('components/CnDetailWidgetHost/CnDetailWidgetHeaderItems.vue')).toContain('class="cn-detail-page__catalog-action"')
		const own = ruleFor(styleOf('components/CnDetailWidgetHost/CnDetailWidgetHeaderItems.vue'), '.cn-detail-page__catalog-action')
		expect(own).not.toBeNull()
		expect(own).toContain('background: var(--color-primary-element-light);')
		expect(ruleFor(styleOf('components/CnDetailWidgetHost/CnDetailWidgetHost.vue'), '.cn-detail-page__catalog-action')).toBeNull()
	})

	it('is a neutral 40px control in the board look outside the side column', () => {
		const css = read('css/look-board-detail.css').replace(/\/\*[\s\S]*?\*\//g, '')
		const body = ruleFor(css, '.cn-look-board .cn-detail-page__catalog-action:not(.cn-detail-page__side *):not(.cn-look-nextcloud *)')
		expect(body).not.toBeNull()
		expect(body).toContain('height: var(--cn-board-control-height);')
		expect(body).toContain('min-height: var(--cn-board-control-height);')
		expect(body).toContain('padding: 0 14px;')
		expect(body).toContain('border: 1px solid var(--cn-board-control-border);')
		expect(body).toContain('border-radius: var(--cn-board-control-radius);')
		expect(body).toContain('background: var(--color-main-background);')
		expect(body).toContain('color: var(--color-main-text);')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('font-weight: 600;')
	})
})
