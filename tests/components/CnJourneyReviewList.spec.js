/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/journey-repeating-item-review/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'
import CnJourneyReviewList from '../../src/components/CnJourneyReviewList/CnJourneyReviewList.vue'
import { findRepeatingWrite, journeyItemTargets } from '../../src/utils/journeyRepeatingWrite.js'

const columns = [
	{ key: 'product', label: 'Product' },
	{ key: 'kenteken', label: 'Kenteken' },
	{ key: 'inhoud', label: 'Inhoud' },
]
const items = [
	{ product: 'parkeervergunning', kenteken: 'AB-123-C' },
	{ product: 'afvalcontainer', inhoud: '240 liter' },
]
const headingOptions = [{ value: 'parkeervergunning', label: 'Parkeervergunning' }, { value: 'afvalcontainer', label: 'Afvalcontainer' }]
const write = { targetBy: 'product', targets: { parkeervergunning: { typeValue: 'PV' }, afvalcontainer: { typeValue: 'AC' } } }
const stubs = { NcButton: { template: '<button class="nc" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' } }

const mountList = (props = {}) => mount(CnJourneyReviewList, { props: { items, columns, headingOptions, ...props }, global: { stubs } })

describe('CnJourneyReviewList', () => {
	it('shows the count and one block per item with option labels and labelled details', () => {
		const w = mountList({ write })
		expect(w.get('[data-testid="cn-journey-review-count"]').text()).toBe('2 products')
		const blocks = w.findAll('li')
		expect(blocks).toHaveLength(2)
		expect(blocks[0].find('h3').text()).toBe('Parkeervergunning')
		expect(blocks[0].text()).toContain('Kenteken')
		expect(blocks[0].text()).toContain('AB-123-C')
		expect(blocks[1].find('h3').text()).toBe('Afvalcontainer')
		expect(blocks[1].text()).toContain('240 liter')
	})

	it('says Nothing chosen. for an empty list', () => {
		expect(mountList({ items: [] }).text()).toBe('Nothing chosen.')
	})

	it('emits the item index on Change, with the item named for assistive tech', async () => {
		const w = mountList()
		const buttons = w.findAll('button.nc')
		expect(buttons[1].attributes('aria-label')).toBe('Change Afvalcontainer')
		await buttons[1].trigger('click')
		expect(w.emitted('change')[0][0]).toEqual({ index: 1, item: items[1] })
	})

	it('falls back to the first column for the heading and to item keys for details', () => {
		const w = mountList({ columns: [], headingOptions: [] })
		expect(w.find('li h3').text()).toBe('parkeervergunning')
	})

	it('shows the sentence and Filed as per item when a write repeats over the list', () => {
		const w = mountList({ write })
		expect(w.get('[data-testid="cn-journey-review-sentence"]').text()).toBe('Each product becomes its own request.')
		const text = w.findAll('li').map((li) => li.text())
		expect(text[0]).toContain('Filed as PV')
		expect(text[1]).toContain('Filed as AC')
		expect(w.emitted('unfileable').at(-1)[0]).toEqual([])
	})

	it('shows no target text without a repeating write', () => {
		const w = mountList()
		expect(w.find('[data-testid="cn-journey-review-sentence"]').exists()).toBe(false)
		expect(w.text()).not.toContain('Filed as')
		expect(w.text()).not.toContain('cannot be filed')
	})

	it('marks an unmapped item and reports it so Submit can be disabled', () => {
		const partial = { targetBy: 'product', targets: { parkeervergunning: { typeValue: 'PV' } } }
		const w = mountList({ write: partial })
		expect(w.findAll('li')[1].text()).toContain('This product cannot be filed.')
		expect(w.emitted('unfileable').at(-1)[0]).toEqual([1])
	})
})

describe('journeyRepeatingWrite', () => {
	const steps = [
		{ id: 'a', writes: [{ register: 'r', schema: 's', mapping: {} }] },
		{ id: 'b', writes: [{ forEach: 'producten', ...write }] },
	]
	it('finds only a write whose forEach names the answer', () => {
		expect(findRepeatingWrite(steps, 'producten')).toEqual(write)
		expect(findRepeatingWrite(steps, 'other')).toBeNull()
	})
	it('ignores a write that matches on targets alone (no forEach)', () => {
		expect(findRepeatingWrite([{ writes: [write] }], 'producten')).toBeNull()
	})
	it('maps items to their target type value', () => {
		expect(journeyItemTargets([{ product: 'afvalcontainer' }, { product: 'x' }], write)).toEqual([
			{ value: 'afvalcontainer', typeValue: 'AC', fileable: true },
			{ value: 'x', typeValue: null, fileable: false },
		])
		expect(journeyItemTargets(items, null)).toEqual([])
	})
})
