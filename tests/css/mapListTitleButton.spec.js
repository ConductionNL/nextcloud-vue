/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A map list row's title is a button drawn as text. Nextcloud's global
 * `button:not(.button-vue, ...)` rule (specificity 0,2,1) must not outrank
 * it. jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/map-list-title-button/specs/map-list-title-button/spec.md#requirement-a-map-list-title-reads-as-text-not-as-a-button
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/index-page.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

/**
 * A selector's specificity as [ids, classes, types], for selectors made of classes, pseudo-classes and types.
 *
 * @param {string} selector The selector.
 * @return {number[]} The specificity.
 */
function specificity(selector) {
	const classes = (selector.match(/\.[\w-]+|:(?!not)[\w-]+/g) || []).length
	const types = (selector.match(/(^|\s)[a-z]+/g) || []).length
	return [0, classes, types]
}

const TITLE = '.cn-index-page__map-list .cn-index-page__map-item .cn-index-page__map-title'

describe('index-page.css: a map list title reads as text', () => {
	it('outranks Nextcloud\'s button rule (0,2,1)', () => {
		const [, classes] = specificity(TITLE)
		expect(classes).toBeGreaterThanOrEqual(3)
	})

	it.each([
		['min-height: 0;'],
		['height: auto;'],
		['margin: 0;'],
		['padding: 0;'],
		['border: 0;'],
		['border-radius: 0;'],
		['background: none;'],
		['color: var(--color-main-text);'],
		['font-weight: 600;'],
	])('sets %s', (declaration) => {
		expect(bodyOf(TITLE)).toContain(declaration)
	})

	it('stays text on hover and focus', () => {
		for (const state of [':hover', ':focus']) {
			expect(bodyOf(TITLE + state)).toContain('background: none;')
		}
	})
})
