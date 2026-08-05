/**
 * Tests for CnObjectCard's body-click behaviour. When the card is
 * `selectable`, clicking anywhere on the card body toggles selection
 * (emits `select`); when not selectable it emits `click` for navigation.
 * The checkbox and actions areas carry `@click.stop` and are excluded.
 */

const { shallowMount } = require('@vue/test-utils')
const CnObjectCard = require('../../src/components/CnObjectCard/CnObjectCard.vue').default

const object = { id: 'org-1', title: 'Conduction' }
const schema = { title: 'Organisation', properties: {} }

function mountCard(propsData) {
	return shallowMount(CnObjectCard, { propsData: { object, schema, ...propsData } })
}

describe('CnObjectCard — body click', () => {
	it('emits select (not click) when selectable', async () => {
		const wrapper = mountCard({ selectable: true })
		await wrapper.find('.cn-object-card').trigger('click')
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(wrapper.emitted('select')[0]).toEqual([object])
		expect(wrapper.emitted('click')).toBeFalsy()
	})

	it('also emits click (deprecated) when selectable and a click listener is attached', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = shallowMount(CnObjectCard, {
			propsData: { object, schema, selectable: true },
			listeners: { click: () => {} },
		})
		await wrapper.find('.cn-object-card').trigger('click')
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(wrapper.emitted('click')).toBeTruthy()
		expect(wrapper.emitted('click')[0]).toEqual([object])
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('does NOT emit click when selectable and no click listener is attached', async () => {
		const wrapper = mountCard({ selectable: true })
		await wrapper.find('.cn-object-card').trigger('click')
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(wrapper.emitted('click')).toBeFalsy()
	})

	it('does NOT emit select when the click ends a text-selection drag', async () => {
		const wrapper = mountCard({ selectable: true })
		const card = wrapper.find('.cn-object-card')
		await card.trigger('mousedown', { clientX: 10, clientY: 10 })
		await card.trigger('click', { clientX: 120, clientY: 40 })
		expect(wrapper.emitted('select')).toBeFalsy()
	})

	it('emits select on a deliberate click (pointer barely moves)', async () => {
		const wrapper = mountCard({ selectable: true })
		const card = wrapper.find('.cn-object-card')
		await card.trigger('mousedown', { clientX: 10, clientY: 10 })
		await card.trigger('click', { clientX: 12, clientY: 11 })
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(wrapper.emitted('select')[0]).toEqual([object])
	})

	it('emits click (not select) when not selectable', async () => {
		const wrapper = mountCard({ selectable: false })
		await wrapper.find('.cn-object-card').trigger('click')
		expect(wrapper.emitted('click')).toBeTruthy()
		expect(wrapper.emitted('click')[0]).toEqual([object])
		expect(wrapper.emitted('select')).toBeFalsy()
	})
})
