/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A case widget that draws its own card (CnConversationWidget,
 * CnDocumentReviewWidget) takes the board card in the board look, joins the
 * open tab as the first card of a stack, and titles a conversation as a
 * board card (DqZaakContact "Gesprek met de inwoner"). Read from the
 * stylesheet text.
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
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-detail.css: a case widget card', () => {
	it('takes the board card radius and padding, outranking the scoped rule', () => {
		const rule = rulesFor('.cn-look-board .cn-case-widget-card.cn-case-widget-card')
		expect(rule).toContain('border-radius: var(--cn-board-card-radius)')
		expect(rule).toContain('padding: var(--cn-board-card-padding)')
	})

	it('joins the open tab as the first card of a stack', () => {
		expect(rulesFor('.cn-look-board .cn-tabs--board .cn-tabs-widget__stack-first .cn-case-widget-card.cn-case-widget-card'))
			.toContain('border-radius: 0 var(--cn-board-card-radius) var(--cn-board-card-radius) var(--cn-board-card-radius)')
	})

	it('titles a conversation at the board heading size', () => {
		const rule = rulesFor('.cn-look-board .cn-conversation-thread__title.cn-conversation-thread__title')
		expect(rule).toContain('font-size: var(--cn-board-heading-size)')
		expect(rule).toContain('line-height: 1.2')
	})
})
