/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The stages bars in the board look, against DqZaak "Voortgang": flush with
 * the content edge, label and date at the normal line height, open steps
 * muted and the done and current ones in the main text, each ink handed to
 * --nldesign-color-on-surface for a theme that forces the body ink. Read from
 * the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const guard = ':not(.cn-look-nextcloud *)'

describe('look-board-detail.css: the stages bars', () => {
	it('drops the widget pad around the bars', () => {
		expect(rulesFor(`.cn-look-board .cn-stages-widget:has(> .cn-stages-widget__bars)${guard}`)).toContain('padding: 0')
	})

	it('sets label and date at the normal line height', () => {
		expect(rulesFor(`.cn-look-board .cn-stages-widget__bars .cn-stages-widget__bar-label${guard}`)).toContain('line-height: normal')
		expect(rulesFor(`.cn-look-board .cn-stages-widget__bars .cn-stages-widget__bar-date${guard}`)).toContain('line-height: normal')
	})

	it('hands each label and date its ink: muted when open, main text when done or current', () => {
		expect(rulesFor(`.cn-look-board .cn-stages-widget__bars .cn-stages-widget__bar-label${guard}`)).toContain('--nldesign-color-on-surface: var(--color-text-maxcontrast)')
		expect(rulesFor(`.cn-look-board .cn-stages-widget__bars .cn-stages-widget__bar-step--done .cn-stages-widget__bar-label${guard}`)).toContain('--nldesign-color-on-surface: var(--color-main-text)')
		expect(rulesFor(`.cn-look-board .cn-stages-widget__bars .cn-stages-widget__bar-step--current .cn-stages-widget__bar-label${guard}`)).toContain('--nldesign-color-on-surface: var(--color-main-text)')
		expect(rulesFor(`.cn-look-board .cn-stages-widget__bars .cn-stages-widget__bar-date${guard}`)).toContain('--nldesign-color-on-surface: var(--color-text-maxcontrast)')
	})
})
