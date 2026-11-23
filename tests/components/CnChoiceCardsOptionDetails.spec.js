/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqVolgendeStap draws the chosen option's fields (Opschorten: reason, days,
 * return date) inside the selected row's frame, under its text. The
 * `option-details` slot renders there, for the selected option only and
 * outside the radio's label; `option-actions` still renders below.
 */
const { mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const { h } = require('vue')
const CnChoiceCards = require('../../src/components/CnChoiceCards/CnChoiceCards.vue').default

const OPTIONS = [
	{ value: 'suspend', label: 'Opschorten', description: 'De termijn staat stil tot het antwoord er is.' },
	{ value: 'abort', label: 'Afbreken' },
]
const stubs = { CnIcon: true, NcLoadingIcon: true, NcNoteCard: true }

/**
 * Mount the rows with a details slot.
 *
 * @param {string} modelValue The chosen value.
 * @return {object} The wrapper.
 */
function mountRows(modelValue) {
	return mount(CnChoiceCards, {
		props: { options: OPTIONS, layout: 'rows', modelValue },
		slots: { 'option-details': ({ option }) => h('input', { class: 'reason', 'data-for': option.value }) },
		global: { stubs },
	})
}

describe('CnChoiceCards option details', () => {
	it('draws the chosen option\'s fields inside its frame, not in its label', () => {
		const w = mountRows('suspend')
		const cells = w.findAll('.cn-choice-cards__cell')
		expect(cells[0].classes()).toContain('cn-choice-cards__cell--with-details')
		const details = cells[0].find('[data-testid="cn-choice-cards-details-suspend"]')
		expect(details.exists()).toBe(true)
		expect(details.find('.reason').attributes('data-for')).toBe('suspend')
		expect(cells[0].find('label').find('.reason').exists()).toBe(false)
	})

	it('draws no fields for an option that is not chosen, and none at all without a choice', () => {
		const w = mountRows('suspend')
		expect(w.findAll('.cn-choice-cards__cell')[1].find('.cn-choice-cards__details').exists()).toBe(false)
		expect(w.findAll('.cn-choice-cards__cell')[1].classes()).not.toContain('cn-choice-cards__cell--with-details')
		expect(mountRows('').find('.cn-choice-cards__details').exists()).toBe(false)
	})

	it('moves the frame to the cell, so row and fields read as one card', () => {
		const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnChoiceCards/CnChoiceCards.vue'), 'utf8')
		const css = sfc.slice(sfc.indexOf('<style'))
		expect(css).toMatch(/\.cn-choice-cards__cell--with-details \{[^}]*border: 1px solid var\(--color-primary-element\)/)
		expect(css).toMatch(/\.cn-choice-cards__cell--with-details \.cn-choice-cards__row,[^{]*\{[^}]*border-color: transparent/)
	})
})
