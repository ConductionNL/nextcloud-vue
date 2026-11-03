/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The dossiq card residuals of r45: a ruled feed starts 12px under its title,
 * a side card of running text reads as one paragraph, the reply box's head and
 * a card's footnote and foot link are set on the normal line, a note row is as
 * tall as its two lines and a linked mail's sender line wraps on the case
 * card. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dq-card-rhythm-r46/specs/board-dq-card-rhythm-r46/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list ends with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const NOT_NC = ':not(.cn-look-nextcloud *)'
const side = '.cn-look-board .cn-detail-page__side'
const notes = '.cn-look-board .cn-detail-widget-host .cn-notes-tab__thread'

describe('look-board-detail.css: dossiq card rhythm r46', () => {
	it('starts a ruled feed in a page card 12px under its title', () => {
		expect(rule('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-record-list--feed.cn-record-list--rule-above):not(.cn-detail-page__side *)')).toContain('padding-top: 12px;')
	})

	it('sets a side card of running text alone as one 14px paragraph, 10px under its title', () => {
		const only = ':has(> .cn-facts-widget__text:first-child):not(:has(> :not(.cn-facts-widget__text)))'
		expect(rule(`${side} .cn-widget-wrapper__header + .cn-widget-wrapper__content:has(> .cn-facts-widget > .cn-facts-widget__text:first-child):not(:has(> .cn-facts-widget > :not(.cn-facts-widget__text)))${NOT_NC}`)).toContain('padding-top: 10px;')
		expect(rule(`${side} .cn-facts-widget${only}${NOT_NC}`)).toContain('gap: 0;')
		const text = rule(`${side} .cn-facts-widget${only}${NOT_NC} > .cn-facts-widget__text`)
		expect(text).toContain('font-size: 14px;')
		expect(text).toContain('line-height: 1.5;')
	})

	it('sets the reply box head on the normal line, its label at 14px', () => {
		expect(rule(`.cn-look-board .cn-conversation-thread__reply-head${NOT_NC}`)).toContain('line-height: normal;')
		expect(rule(`.cn-look-board .cn-conversation-thread__reply-label${NOT_NC}`)).toContain('font-size: 14px;')
	})

	it('sets a data or history footnote and the calendar link on the normal line', () => {
		expect(css).toContain(`.cn-look-board .cn-object-data-widget__footnote${NOT_NC},\n.cn-look-board .cn-audit-card__footnote${NOT_NC} {\n\tline-height: normal;`)
		expect(rule(`.cn-look-board .cn-calendar-card__open${NOT_NC}`)).toContain('line-height: normal;')
	})

	it('keeps a note row as tall as its two lines, the meta line 13px and 2px under the note', () => {
		const item = rule(`${notes} .list-item__anchor${NOT_NC}`)
		expect(item).toContain('min-height: 0;')
		expect(item).toContain('height: auto;')
		const subname = rule(`${notes} .list-item-content__subname${NOT_NC}`)
		expect(subname).toContain('font-size: 13px;')
		expect(subname).toContain('margin-top: 2px;')
		expect(rule(`.cn-look-board .cn-detail-widget-host .cn-notes-tab__avatar:not(.cn-notes-tab__avatar--own)${NOT_NC}`)).toContain('color: var(--cn-board-text-soft);')
	})

	it('lets a linked mail sender line wrap on the case card', () => {
		expect(rule(`.cn-look-board .cn-mail-tab__linked .cn-email-tab__sender${NOT_NC}`)).toContain('white-space: normal;')
	})
})
