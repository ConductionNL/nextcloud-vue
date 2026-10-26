/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The contacts tab's rows in the board look, as DqZaakBetrokkenen "Partijen"
 * draws them: the role heading 15px bold ink in sentence case, rows 12px
 * high-padded under a hairline, the details and the period 13px muted.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-contacts-rows/specs/contacts/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const TAB = '.cn-look-board .cn-contacts-tab'

describe('look-board-detail.css: contacts rows', () => {
	it('heads a role group 15px bold ink, in sentence case', () => {
		const body = rule(TAB + ' .cn-contacts-tab__group-title')
		expect(body).toContain('font-size: 15px')
		expect(body).toContain('font-weight: 700')
		expect(body).toContain('text-transform: none')
		expect(body).toContain('color: var(--color-main-text)')
	})

	it('rules each row with a hairline and pads it 12px', () => {
		const body = rule(TAB + ' .cn-contacts-tab__item')
		expect(body).toContain('padding: 12px 0')
		expect(body).toContain('border-top: 1px solid var(--cn-board-hairline)')
		expect(body).toContain('align-items: center')
	})

	it('sets the details and the period 13px muted', () => {
		const body = rule(TAB + ' .cn-contacts-tab__meta,\n' + TAB + ' .cn-contacts-tab__period')
		expect(body).toContain('font-size: 13px')
		expect(body).toContain('color: var(--color-text-maxcontrast)')
	})

	it('draws every initials avatar on the grey ground in the soft ink, 12px bold (r31: hashed tint, white-ish ink, 14px)', () => {
		expect(rule(TAB + ' .cn-contacts-tab__avatar .avatardiv__initials-wrapper')).toContain('background-color: var(--color-background-hover) !important')
		const initials = rule(TAB + ' .cn-contacts-tab__avatar .avatardiv__initials')
		expect(initials).toContain('color: var(--cn-board-text-soft) !important')
		expect(initials).toContain('font-size: 12px')
		expect(initials).toContain('font-weight: 700')
	})
})
