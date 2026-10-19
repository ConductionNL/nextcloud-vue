/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An underline tab (DqInstellingen) drops the core button margin, so tabs sit
 * 4px apart on the strip's top, and hands its weight, corner and 3px
 * underline to the nldesign button tokens, which the theme reads with
 * `!important`. Read from the component's style block.
 *
 * @spec openspec/changes/board-underline-tabs/specs/board-underline-tabs/spec.md#requirement-underline-tabs-keep-their-gap-weight-and-underline-under-a-theme
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnTabs/CnTabs.vue'), 'utf8')
const css = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('CnTabs underline variant under a theme', () => {
	const tab = bodyOf('.cn-tabs--underline .cn-tabs__nav-item')

	it('drops the core button margin', () => {
		expect(tab).toContain('margin: 0;')
	})

	it('hands its weight, corner and underline to the theme tokens', () => {
		expect(tab).toContain('--nldesign-component-button-font-weight: 500;')
		expect(tab).toContain('--nldesign-component-button-border-radius: 0;')
		expect(tab).toContain('--nldesign-component-button-border-width: 0 0 3px;')
	})

	it('hands the open tab\'s bold weight to the theme token', () => {
		expect(bodyOf('.cn-tabs--underline .cn-tabs__nav-item--active')).toContain('--nldesign-component-button-font-weight: 700;')
	})
})
