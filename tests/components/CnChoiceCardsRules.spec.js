/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChoiceCards `rules` and `clashEndpoint`: live notes on a multiple choice
 * (at least, at most, must go together, only one of), the notices an
 * endpoint answers for the picked values, and a note when every rule holds.
 *
 * @spec openspec/changes/choice-cards-rules/specs/choice-cards/spec.md#requirement-a-multiple-choice-shows-its-rules-live
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnChoiceCards from '../../src/components/CnChoiceCards/CnChoiceCards.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))

/**
 * Let the reads settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const OPTIONS = [
	{ value: 'bio', label: 'Biology' },
	{ value: 'che', label: 'Chemistry' },
	{ value: 'eco', label: 'Economics' },
	{ value: 'art', label: 'Art' },
]
const RULES = { min: 2, max: 3, together: [['bio', 'che']], exclusive: [['eco', 'art']] }

const stubs = {
	CnCard: { props: ['title'], template: '<div class="card">{{ title }}</div>' },
	NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
}

/**
 * The rule notes drawn.
 *
 * @param {object} wrapper The mounted cards.
 * @return {string[]}
 */
function notes(wrapper) {
	return wrapper.findAll('[data-testid="cn-choice-cards-rule"]').map((n) => n.text())
}

describe('CnChoiceCards rules', () => {
	beforeEach(() => axios.get.mockReset())

	it('names every rule the selection breaks', () => {
		const w = mount(CnChoiceCards, { props: { options: OPTIONS, multiple: true, rules: RULES, modelValue: ['bio', 'eco', 'art'] }, global: { stubs } })
		expect(notes(w)).toEqual([
			'Choose Biology and Chemistry together.',
			'Choose only one of Economics and Art.',
		])
		const few = mount(CnChoiceCards, { props: { options: OPTIONS, multiple: true, rules: RULES, modelValue: ['eco'] }, global: { stubs } })
		expect(notes(few)).toEqual(['Choose at least 2 (now 1).'])
		const many = mount(CnChoiceCards, { props: { options: OPTIONS, multiple: true, rules: RULES, modelValue: ['bio', 'che', 'eco', 'art'] }, global: { stubs } })
		expect(notes(many)[0]).toBe('Choose at most 3 (now 4).')
	})

	it('says so when every rule holds', () => {
		const w = mount(CnChoiceCards, { props: { options: OPTIONS, multiple: true, rules: RULES, rulesMetText: 'Your choice meets every rule.', modelValue: ['bio', 'che'] }, global: { stubs } })
		expect(notes(w)).toEqual([])
		expect(w.find('[data-testid="cn-choice-cards-rules-met"]').text()).toBe('Your choice meets every rule.')
	})

	it('shows the notices the clash endpoint answers for the picked values', async () => {
		axios.get.mockResolvedValue({ data: { messages: ['Biology and Chemistry meet at the same time: Monday 09:00–10:00.'] } })
		const w = mount(CnChoiceCards, {
			props: { options: OPTIONS, multiple: true, modelValue: ['bio', 'che'], clashEndpoint: { url: '/apps/school/api/clashes', params: { courseIds: '@selected', learnerId: 'l1' }, responsePath: 'messages' } },
			global: { stubs },
		})
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/school/api/clashes', { params: { courseIds: 'bio,che', learnerId: 'l1' } })
		expect(w.find('[data-testid="cn-choice-cards-clash"]').text()).toContain('meet at the same time')

		await w.setProps({ modelValue: [] })
		await flush()
		expect(w.find('[data-testid="cn-choice-cards-clash"]').exists()).toBe(false)
		expect(axios.get).toHaveBeenCalledTimes(1)
	})
})
