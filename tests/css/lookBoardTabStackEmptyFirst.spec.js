/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tab stack whose first widget renders nothing (DqZaakEmail) starts with
 * the next card, joined to the open tab. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-tab-stack-empty-first/specs/board-tab-stack-empty-first/spec.md#requirement-a-board-tab-stack-skips-a-first-widget-that-renders-nothing
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

const emptyFirst = '.cn-look-board .cn-tabs--board .cn-tabs__content .cn-tab .cn-tabs-widget__stack-first:not(:has(> * > *))'

describe('look-board-detail.css: a tab stack with an empty first widget', () => {
	it('gives the empty first slot no room', () => {
		expect(rulesFor(emptyFirst)).toContain('display: none')
	})

	it.each(['.cn-widget-wrapper', '.cn-detail-card'])('joins the next %s to the open tab', (card) => {
		const rule = rulesFor(`${emptyFirst} + .cn-tabs-widget__stack-item ${card}`)
		expect(rule).toContain('border-top: 1px solid var(--color-border)')
		expect(rule).toContain('border-radius: 0 var(--cn-board-card-radius) var(--cn-board-card-radius) var(--cn-board-card-radius)')
	})
})
