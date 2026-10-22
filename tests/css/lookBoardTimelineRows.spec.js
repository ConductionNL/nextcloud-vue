/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look draws a managed timeline entry (DqZaakHistorie "Historie van
 * de zaak") as a rail row: a 34px circle on a 2px line, the message first at
 * 15px weight 600, the kind, author and moment under it at 13px muted, 6px
 * above and 16px below. The entry actions stay, shown on hover and focus.
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule whose selector list is exactly `selector`.
 *
 * @param {string} selector The selector text before the opening brace.
 * @return {string} The rule body, or '' when the rule is missing.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: managed timeline rows', () => {
	it('pads an entry 6px above, 16px below and 48px in for the rail, with no rule under it', () => {
		const body = rule('.cn-look-board .cn-timeline-manage__entry:not(.cn-look-nextcloud *)')
		expect(body).toContain('padding: 6px 0 16px 48px')
		expect(body).toContain('border-block-end: none')
	})

	it('draws a 34px circle at the start of the entry', () => {
		const body = rule('.cn-look-board .cn-timeline-manage__entry:not(.cn-look-nextcloud *)::before')
		expect(body).toContain('width: 34px')
		expect(body).toContain('height: 34px')
		expect(body).toContain('border-radius: 50%')
	})

	it('joins the circles with a 2px line, ending at the last entry', () => {
		const body = rule('.cn-look-board .cn-timeline-manage__entry:not(:last-child):not(.cn-look-nextcloud *)::after')
		expect(body).toContain('width: 2px')
		expect(body).toContain('inset-block: 34px 0')
	})

	it('puts the message first at 15px weight 600, also under a theme', () => {
		const body = rule('.cn-look-board .cn-timeline-manage__message:not(.cn-look-nextcloud *)')
		expect(body).toContain('order: -1')
		expect(body).toContain('font-size: 15px')
		expect(body).toContain('font-weight: 600')
		expect(body).toContain('--nldesign-component-paragraph-font-size: 15px')
		expect(body).toContain('--nldesign-component-paragraph-font-weight: 600')
	})

	it('sets the kind, author and moment as one 13px muted line', () => {
		expect(rule('.cn-look-board .cn-timeline-manage__head:not(.cn-look-nextcloud *)')).toContain('font-size: 13px')
		expect(rule('.cn-look-board .cn-timeline-manage__kind:not(.cn-look-nextcloud *)')).toContain('font-weight: inherit')
	})

	it('keeps the entry actions, shown on hover and focus', () => {
		expect(rule('.cn-look-board .cn-timeline-manage__actions:not(.cn-look-nextcloud *)')).toContain('opacity: 0')
		expect(rule('.cn-look-board .cn-timeline-manage__entry:hover .cn-timeline-manage__actions:not(.cn-look-nextcloud *),\n.cn-look-board .cn-timeline-manage__entry:focus-within .cn-timeline-manage__actions:not(.cn-look-nextcloud *)')).toContain('opacity: 1')
	})
})
