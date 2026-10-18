/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's disabled and read-only rows. DqVolgendeStap draws an option the
 * record does not allow on a grey ground in the muted ink, its reason upright;
 * DqBesluit shows a recorded outcome read-only, at full contrast with one
 * option selected. The description is regular weight under a theme that sets
 * every label bold.
 */
const { mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnChoiceCards = require('../../src/components/CnChoiceCards/CnChoiceCards.vue').default

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnChoiceCards/CnChoiceCards.vue'), 'utf8')
const css = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

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

const OPTIONS = [
	{ value: 'open', label: 'Openbaar gemaakt', description: 'Alle documenten worden openbaar' },
	{ value: 'part', label: 'Deels openbaar gemaakt' },
	{ value: 'reopen', label: 'Heropenen', disabled: true, disabledReason: 'Alleen bij een afgeronde zaak.' },
]
const stubs = { CnIcon: true, NcLoadingIcon: true, NcNoteCard: true }

describe('CnChoiceCards board states', () => {
	it('draws a disabled row on the grey ground in the muted ink, not faded', () => {
		const rule = rulesFor('.cn-choice-cards__row--disabled')
		expect(rule).toContain('background: var(--color-background-hover)')
		expect(rule).toContain('color: var(--color-text-maxcontrast)')
		expect(rule).not.toContain('opacity')
		expect(rulesFor('.cn-choice-cards__row--disabled .cn-choice-cards__row-title')).toContain('color: var(--color-text-maxcontrast)')
	})

	it('sets the reason upright and the description regular, both muted', () => {
		const text = rulesFor('.cn-choice-cards__reason')
		expect(text).not.toContain('italic')
		expect(text).toContain('font-weight: 400')
		expect(rulesFor('.cn-choice-cards__row-description')).toContain('font-weight: 400')
	})

	it('read-only: keeps the selection, marks no option disabled, and emits nothing', async () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options: OPTIONS.slice(0, 2), layout: 'rows', modelValue: 'part', readonly: true }, stubs })
		const rows = wrapper.findAll('.cn-choice-cards__row')
		expect(rows[1].classes()).toContain('cn-choice-cards__row--selected')
		for (const row of rows) {
			expect(row.classes()).toContain('cn-choice-cards__row--readonly')
			expect(row.classes()).not.toContain('cn-choice-cards__row--disabled')
			expect(row.find('input').attributes('disabled')).toBeDefined()
		}
		await rows[0].find('input').trigger('change')
		expect(wrapper.emitted('update:modelValue')).toBeUndefined()
	})

	it('read-only cards keep full contrast; only a disabled card fades', () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options: OPTIONS, modelValue: 'part', readonly: true }, stubs: { ...stubs, CnCard: true } })
		const cards = wrapper.findAll('.cn-choice-cards__option')
		expect(cards[0].classes()).not.toContain('cn-choice-cards__option--disabled')
		expect(cards[2].classes()).toContain('cn-choice-cards__option--disabled')
		expect(rulesFor('.cn-choice-cards__option--disabled .cn-choice-cards__input + :deep(.cn-card)')).toContain('opacity: 0.6')
	})
})
