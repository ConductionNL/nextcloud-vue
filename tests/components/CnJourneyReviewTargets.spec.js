/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/journey-repeating-item-review/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnJourney from '../../src/components/CnJourney/CnJourney.vue'
import { currentTitle, fakeRunApi, fillAndNext, flush, stubs } from '../support/journeyHarness.js'

jest.mock('../../src/utils/cnFetch.js', () => ({
	cnFetchJson: (...args) => global.__runApi(...args),
}))

const items = {
	properties: {
		product: { title: 'Product', options: [{ value: 'pv', label: 'Parkeervergunning' }, { value: 'ac', label: 'Afvalcontainer' }] },
		kenteken: { title: 'Kenteken' },
	},
}
function make(writes) {
	return {
		id: 'multi',
		steps: [
			{ id: 'list', type: 'form', title: 'Products', form: { fields: [{ key: 'producten', type: 'json', label: 'Products', items }] } },
			{ id: 'check', type: 'review', title: 'Check', writes },
		],
	}
}
const repeating = [{ forEach: 'producten', targetBy: 'product', targets: { pv: { typeValue: 'PV' }, ac: { typeValue: 'AC' } } }]

async function reach(journey, list) {
	const w = mount(CnJourney, { props: { journey }, global: { stubs: { ...stubs, CnJsonViewer: { template: '<pre />', props: ['value', 'label'] } } } })
	await flush()
	await flush()
	await fillAndNext(w, { producten: list })
	return w
}

let server
beforeEach(() => {
	server = fakeRunApi()
	global.__runApi = server.api
})

describe('CnJourney review of a repeating write', () => {
	const two = [{ product: 'pv', kenteken: 'AB-1' }, { product: 'ac' }]

	it('shows both items with the sentence and Filed as', async () => {
		const w = await reach(make(repeating), two)
		expect(currentTitle(w)).toBe('Check')
		const text = w.get('[data-testid="cn-journey-review"]').text()
		expect(text).toContain('2 products')
		expect(text).toContain('Parkeervergunning')
		expect(text).toContain('Afvalcontainer')
		expect(text).toContain('Each product becomes its own request.')
		expect(text).toContain('PV')
		expect(text).toContain('AC')
	})

	it('shows no target text without a repeating write', async () => {
		const w = await reach(make([{ register: 'r', schema: 's' }]), two)
		const text = w.get('[data-testid="cn-journey-review"]').text()
		expect(text).toContain('2 products')
		expect(text).not.toContain('becomes its own request')
		expect(text).not.toContain('Filed as')
	})

	it('a write that is not for this answer does not count', async () => {
		const w = await reach(make([{ forEach: 'andere', targetBy: 'product', targets: { pv: { typeValue: 'PV' } } }]), two)
		expect(w.get('[data-testid="cn-journey-review"]').text()).not.toContain('Filed as')
	})

	it('an unmapped value is marked and disables Submit with the reason', async () => {
		const w = await reach(make(repeating), [{ product: 'pv' }, { product: 'onbekend' }])
		const text = w.get('[data-testid="cn-journey-review"]').text()
		expect(text).toContain('cannot be filed')
		const submit = w.get('[data-testid="cn-journey-submit"]')
		expect(submit.attributes('disabled')).toBeDefined()
		expect(submit.attributes('aria-describedby')).toBe('cn-journey-blocked')
		expect(w.get('#cn-journey-blocked').text()).toContain('cannot be filed')
	})

	it('Change returns to the list step with the values kept', async () => {
		const w = await reach(make(repeating), two)
		await w.get('.cn-journey-review-list__block button, [data-testid="cn-journey-review"] li button').trigger('click')
		await flush()
		expect(currentTitle(w)).toBe('Products')
		expect(w.findComponent({ name: 'CnFormPage' }).vm.formData.producten).toEqual(two)
	})
})
