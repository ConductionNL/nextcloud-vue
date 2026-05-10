/**
 * Tests for CnIndexPage's `cardComponent` prop — bespoke card-grid
 * row dispatch via the customComponents registry.
 *
 * Covers the `manifest-card-index-component` spec:
 *   - Renders the registry-resolved component when set.
 *   - Logs console.warn + falls back to default when name is unknown.
 *   - `#card` scoped slot wins over `cardComponent`.
 *   - `customComponents` prop overrides the injected `cnCustomComponents`.
 *   - Forwards { item, object, schema, register, selected } props.
 *   - Forwards `click` and `select` events.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnObjectCard from '../../src/components/CnObjectCard/CnObjectCard.vue'

const baseProps = {
	title: 'Organisations',
	schema: { title: 'Organisation', properties: {} },
	register: 'softwarecatalog',
	objects: [
		{ id: 'org-1', title: 'Conduction' },
		{ id: 'org-2', title: 'VNG' },
	],
	viewMode: 'cards',
}

const TestCard = {
	name: 'TestCard',
	props: {
		item: { type: Object, default: null },
		object: { type: Object, default: null },
		schema: { type: Object, default: null },
		register: { type: String, default: '' },
		selected: { type: Boolean, default: false },
	},
	template: `
		<div
			class="test-card"
			:data-id="item.id"
			:data-register="register"
			:data-selected="selected"
			@click="$emit('click', item)">
			<button class="test-select" @click.stop="$emit('select', item)">select</button>
			{{ item.title }}
		</div>
	`,
}

function mountIndexPage(extraProps = {}, mountOptions = {}) {
	return mount(CnIndexPage, {
		propsData: { ...baseProps, ...extraProps },
		stubs: {
			CnDataTable: true,
			CnPagination: true,
			CnActionsBar: true,
			CnContextMenu: true,
			CnIndexSidebar: true,
		},
		...mountOptions,
	})
}

describe('CnIndexPage — cardComponent prop', () => {
	let warnSpy
	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => {
		warnSpy.mockRestore()
	})

	describe('default (cardComponent unset)', () => {
		it('renders CnObjectCard for each row when no cardComponent is set', () => {
			const wrapper = mountIndexPage()
			expect(wrapper.findAllComponents(CnObjectCard).length).toBe(2)
			expect(wrapper.findAllComponents(TestCard).length).toBe(0)
		})

		it('exposes resolvedCardComponent === null', () => {
			const wrapper = mountIndexPage()
			expect(wrapper.vm.resolvedCardComponent).toBe(null)
		})
	})

	describe('cardComponent set with matching registry entry (prop)', () => {
		it('renders the resolved component for each row', () => {
			const wrapper = mountIndexPage({
				cardComponent: 'OrganisatieCard',
				customComponents: { OrganisatieCard: TestCard },
			})
			expect(wrapper.findAllComponents(TestCard).length).toBe(2)
			expect(wrapper.findAllComponents(CnObjectCard).length).toBe(0)
		})

		it('forwards item, object, schema, register, selected props', () => {
			const wrapper = mountIndexPage({
				cardComponent: 'OrganisatieCard',
				customComponents: { OrganisatieCard: TestCard },
				selectedIds: ['org-1'],
			})
			const cards = wrapper.findAllComponents(TestCard)
			expect(cards.at(0).props('item')).toEqual(baseProps.objects[0])
			expect(cards.at(0).props('object')).toEqual(baseProps.objects[0])
			expect(cards.at(0).props('schema')).toBe(baseProps.schema)
			expect(cards.at(0).props('register')).toBe('softwarecatalog')
			expect(cards.at(0).props('selected')).toBe(true)
			expect(cards.at(1).props('selected')).toBe(false)
		})

		it('forwards click event as row-click on the page', async () => {
			const wrapper = mountIndexPage({
				cardComponent: 'OrganisatieCard',
				customComponents: { OrganisatieCard: TestCard },
			})
			const card = wrapper.findAllComponents(TestCard).at(0)
			card.vm.$emit('click', baseProps.objects[0])
			await wrapper.vm.$nextTick()
			expect(wrapper.emitted('row-click')).toBeTruthy()
			expect(wrapper.emitted('row-click')[0]).toEqual([baseProps.objects[0]])
		})

		it('forwards select event as select on the page', async () => {
			const wrapper = mountIndexPage({
				cardComponent: 'OrganisatieCard',
				customComponents: { OrganisatieCard: TestCard },
			})
			const card = wrapper.findAllComponents(TestCard).at(0)
			card.vm.$emit('select', baseProps.objects[0])
			await wrapper.vm.$nextTick()
			expect(wrapper.emitted('select')).toBeTruthy()
			expect(wrapper.emitted('select')[0][0]).toContain('org-1')
		})
	})

	describe('cardComponent set with no matching registry entry', () => {
		it('logs console.warn and falls back to CnObjectCard', () => {
			const wrapper = mountIndexPage({
				cardComponent: 'Missing',
				customComponents: {},
			})
			expect(warnSpy).toHaveBeenCalledTimes(1)
			expect(warnSpy.mock.calls[0][0]).toContain('cardComponent "Missing"')
			expect(warnSpy.mock.calls[0][0]).toContain('not found')
			expect(wrapper.findAllComponents(CnObjectCard).length).toBe(2)
			expect(wrapper.findAllComponents(TestCard).length).toBe(0)
		})

		it('exposes resolvedCardComponent === null', () => {
			const wrapper = mountIndexPage({
				cardComponent: 'Missing',
				customComponents: {},
			})
			expect(wrapper.vm.resolvedCardComponent).toBe(null)
		})
	})

	describe('#card scoped slot precedence', () => {
		it('wins over cardComponent when both are provided', () => {
			const wrapper = mount(CnIndexPage, {
				propsData: {
					...baseProps,
					cardComponent: 'OrganisatieCard',
					customComponents: { OrganisatieCard: TestCard },
				},
				stubs: {
					CnDataTable: true,
					CnPagination: true,
					CnActionsBar: true,
					CnContextMenu: true,
					CnIndexSidebar: true,
				},
				scopedSlots: {
					card: '<div class="slot-card" :data-id="props.object.id">SLOT-{{ props.object.title }}</div>',
				},
			})
			// Slot wins — TestCard MUST NOT render.
			expect(wrapper.findAllComponents(TestCard).length).toBe(0)
			// Slot content rendered for each row.
			const slotCards = wrapper.findAll('.slot-card')
			expect(slotCards.length).toBe(2)
			expect(slotCards.at(0).attributes('data-id')).toBe('org-1')
			expect(slotCards.at(0).text()).toBe('SLOT-Conduction')
		})
	})

	describe('customComponents resolution priority', () => {
		it('explicit customComponents prop wins over injected cnCustomComponents', () => {
			const PropCard = { ...TestCard, name: 'PropCard' }
			const InjectedCard = { ...TestCard, name: 'InjectedCard' }
			const wrapper = mount(CnIndexPage, {
				propsData: {
					...baseProps,
					cardComponent: 'TheCard',
					customComponents: { TheCard: PropCard },
				},
				stubs: {
					CnDataTable: true,
					CnPagination: true,
					CnActionsBar: true,
					CnContextMenu: true,
					CnIndexSidebar: true,
				},
				provide: {
					cnCustomComponents: { TheCard: InjectedCard },
				},
			})
			// Vue 2 internal name lookup — match by component options identity
			const matched = wrapper.findAllComponents(PropCard)
			expect(matched.length).toBe(2)
			expect(wrapper.findAllComponents(InjectedCard).length).toBe(0)
		})

		it('falls back to injected cnCustomComponents when no prop is set', () => {
			const InjectedCard = { ...TestCard, name: 'InjectedCard' }
			const wrapper = mount(CnIndexPage, {
				propsData: {
					...baseProps,
					cardComponent: 'TheCard',
				},
				stubs: {
					CnDataTable: true,
					CnPagination: true,
					CnActionsBar: true,
					CnContextMenu: true,
					CnIndexSidebar: true,
				},
				provide: {
					cnCustomComponents: { TheCard: InjectedCard },
				},
			})
			expect(wrapper.findAllComponents(InjectedCard).length).toBe(2)
		})
	})
})
