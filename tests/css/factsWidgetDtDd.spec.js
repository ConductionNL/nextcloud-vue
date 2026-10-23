/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The facts widget's label (`dt`) and value (`dd`) reset Nextcloud core's
 * `dt`/`dd` styling (text-align end, 12px padding): the label is start-aligned
 * and the value too, with no padding. The class is doubled so the reset outranks
 * a core rule. jsdom draws no layout, so the values are read from the style
 * block of the component.
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFactsWidget/CnFactsWidget.vue'), 'utf8')
const css = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/** The declarations of the rule whose selector is exactly `selector`. */
function rule(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe.each([
	['label', '.cn-facts-widget__label.cn-facts-widget__label'],
	['value', '.cn-facts-widget__value.cn-facts-widget__value'],
])('facts widget %s', (_name, selector) => {
	it('is start-aligned with no padding and no margin, whatever core says for dt and dd', () => {
		const body = rule(selector)
		expect(body).toMatch(/text-align:\s*start/)
		expect(body).toMatch(/padding:\s*0\s*;/)
		expect(body).toMatch(/margin:\s*0\s*;/)
	})
})
