/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The facts widget's reveal button ("BSN tonen", DqContact) is labelled in
 * the main text colour. Without a colour of its own it took Nextcloud's plain
 * button ink, the deep primary. Read from the component's stylesheet.
 *
 * @spec openspec/changes/facts-reveal-button-ink/specs/facts-reveal-button-ink/spec.md
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFactsWidget/CnFactsWidget.vue'), 'utf8')
const style = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(style))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('CnFactsWidget reveal button', () => {
	it('labels the button in the main text colour', () => {
		expect(rulesFor('.cn-facts-widget__inline-button')).toMatch(/(^|[;\s])color:\s*var\(--color-main-text\)/)
	})
})
