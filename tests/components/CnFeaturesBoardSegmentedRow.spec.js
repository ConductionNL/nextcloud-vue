/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The segmented status filter is a grey track across the whole content row
 * (DqFunctionaliteiten: "Alles Stabiel Beta Gepland" with the options at the
 * start), not a pill around its options. The chips filter keeps its width.
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue'), 'utf8')
const style = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the scoped rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
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

describe('CnFeaturesBoard segmented filter', () => {
	it('spans the content row', () => {
		const body = rule('.cn-features-board__filter--segmented')
		expect(body).toMatch(/align-self:\s*stretch/)
		expect(body).not.toMatch(/display:\s*inline-flex/)
	})

	it('keeps its options at the start of the track', () => {
		expect(rule('.cn-features-board__filter--segmented')).toMatch(/justify-content:\s*flex-start/)
	})
})
