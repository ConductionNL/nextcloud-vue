/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The roadmap's meta line stays 14px and muted under a theme that sets every
 * <p> through the paragraph tokens with !important (thematiq): the line sets
 * those tokens on itself (DqFunctionaliteiten measured 15px in the main ink).
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue'), 'utf8')
const style = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body.
 */
function rule(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(style))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('CnFeaturesBoard subtitle under a theme', () => {
	it('sets the paragraph tokens the theme reads to 14px and the muted ink', () => {
		const body = rule('.cn-features-board__subtitle')
		expect(body).toMatch(/--nldesign-component-paragraph-font-size:\s*14px/)
		expect(body).toMatch(/--nldesign-component-paragraph-color:\s*var\(--color-text-maxcontrast\)/)
	})
})
