/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The next-step card under the board look takes a board modifier; the kicker
 * colour, the success-tinted done marker and the 44px button are its
 * look-board-detail.css rules.
 *
 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-the-next-step-card-takes-the-board-anatomy
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnNextStepCard from '../../src/components/CnNextStepCard/CnNextStepCard.vue'

const items = [
	{ label: 'Receipt confirmed', done: true },
	{ label: 'Review the open documents' },
	{ label: 'Draft the decision' },
]

function mountCard(look) {
	return mount(CnNextStepCard, {
		props: { title: 'What now?', items, actionLabel: 'Continue', after: 'Then: step 3' },
		global: { provide: look ? { cnLook: look } : {} },
	})
}

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8')
function rule(selector) {
	const at = css.indexOf(`${selector} {`)
	expect(at).toBeGreaterThanOrEqual(0)
	return css.slice(at, css.indexOf('}', at))
}

describe('CnNextStepCard in the board look', () => {
	it('carries the board modifier and still marks the done and current items', () => {
		const w = mountCard('board')
		expect(w.get('[data-testid="cn-next-step-card"]').classes()).toContain('cn-next-step-card--board')
		const rows = w.findAll('[data-testid="cn-next-step-item"]')
		expect(rows[0].classes()).toContain('cn-next-step-card__item--done')
		expect(rows[1].classes()).toContain('cn-next-step-card__item--current')
		expect(rows[2].classes()).not.toContain('cn-next-step-card__item--current')
	})

	it('keeps the card, its button and its after line', () => {
		const w = mountCard('board')
		expect(w.get('[data-testid="cn-next-step-action"]').text()).toBe('Continue')
		expect(w.get('.cn-next-step-card__after').text()).toBe('Then: step 3')
	})

	it('has no board modifier without the look', () => {
		expect(mountCard(null).get('[data-testid="cn-next-step-card"]').classes()).not.toContain('cn-next-step-card--board')
	})

	it('styles the board anatomy from tokens, scoped under the look', () => {
		expect(rule('.cn-look-board .cn-next-step-card--board')).toMatch(/border-radius: 12px[\s\S]*padding: 20px 24px 20px 28px/)
		expect(rule('.cn-look-board .cn-next-step-card--board .cn-next-step-card__title.cn-next-step-card__title')).toMatch(/var\(--color-primary-element-light-text\)[\s\S]*font-size: 13px[\s\S]*letter-spacing: 0\.06em/)
		expect(rule('.cn-look-board .cn-next-step-card--board .cn-next-step-card__item--done .cn-next-step-card__marker')).toMatch(/var\(--cn-board-success-tint\)[\s\S]*var\(--color-success-text\)/)
		expect(rule('.cn-look-board .cn-next-step-card--board .cn-next-step-card__side .button-vue')).toMatch(/block-size: 44px[\s\S]*font-size: 15px[\s\S]*padding: 0 20px/)
	})
})
