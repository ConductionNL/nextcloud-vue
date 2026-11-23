/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The status accent of CnObjectCard: a colored start border and icon, handed
 * down per object through CnCardGrid `accentOf` and CnIndexPage `cardAccent`.
 */
import { mount, shallowMount } from '@vue/test-utils'
import CnCardGrid from '../../src/components/CnCardGrid/CnCardGrid.vue'
import CnObjectCard from '../../src/components/CnObjectCard/CnObjectCard.vue'

const object = { id: 'pub-1', title: 'Jaarverslag' }
const schema = { title: 'Publication', properties: {} }

function mountCard(accent) {
	return shallowMount(CnObjectCard, { props: { object, schema, accent } })
}

describe('CnObjectCard — accent', () => {
	it('draws the variant border and a labelled icon before the title', () => {
		const wrapper = mountCard({ variant: 'success', icon: 'ListBoxOutline', label: 'Published' })
		expect(wrapper.classes()).toEqual(expect.arrayContaining(['cn-object-card--accent', 'cn-object-card--accent-success']))
		const icon = wrapper.find('[data-testid="cn-object-card-accent-icon"]')
		expect(icon.exists()).toBe(true)
		expect(icon.attributes('role')).toBe('img')
		expect(icon.attributes('aria-label')).toBe('Published')
		expect(icon.findComponent({ name: 'CnIcon' }).props('name')).toBe('ListBoxOutline')
	})

	it('hides an unlabelled icon from screen readers', () => {
		const icon = mountCard({ variant: 'warning', icon: 'Pencil' }).find('[data-testid="cn-object-card-accent-icon"]')
		expect(icon.attributes('aria-hidden')).toBe('true')
		expect(icon.attributes('role')).toBeUndefined()
	})

	it('draws only the border without an icon', () => {
		const wrapper = mountCard({ variant: 'error' })
		expect(wrapper.classes()).toContain('cn-object-card--accent-error')
		expect(wrapper.find('[data-testid="cn-object-card-accent-icon"]').exists()).toBe(false)
	})

	it('ignores a missing or unknown variant', () => {
		for (const accent of [null, { variant: 'purple', icon: 'Pencil' }]) {
			const wrapper = mountCard(accent)
			expect(wrapper.classes()).not.toContain('cn-object-card--accent')
			expect(wrapper.find('[data-testid="cn-object-card-accent-icon"]').exists()).toBe(false)
		}
	})
})

describe('CnCardGrid — accentOf', () => {
	it('hands each card its own accent', () => {
		const objects = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }]
		const wrapper = mount(CnCardGrid, {
			props: { objects, schema, accentOf: (o) => (o.id === 1 ? { variant: 'success' } : null) },
			global: { stubs: { CnObjectCard: { props: ['accent'], template: '<div class="card" :data-accent="JSON.stringify(accent)" />' } } },
		})
		const cards = wrapper.findAll('.card')
		expect(cards[0].attributes('data-accent')).toBe('{"variant":"success"}')
		expect(cards[1].attributes('data-accent')).toBe('null')
	})
})
