/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Late marking on board cards: `dueRule: { field, soonDays }` on CnBoardView
 * and CnObjectKanban, and the hand-off from a manifest `board` block.
 */
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnBoardView from '../../src/components/CnBoardView/CnBoardView.vue'
import CnObjectKanban from '../../src/components/CnObjectKanban/CnObjectKanban.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

/**
 * A bare local date `days` from today, the shape a register stores.
 *
 * @param {number} days Days from today; negative for the past.
 * @return {string} `YYYY-MM-DD`.
 */
function day(days) {
	const d = new Date()
	d.setDate(d.getDate() + days)
	const pad = (n) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const rows = [
	{ id: 1, status: 'open', title: 'Parking permits', deadline: day(-1) },
	{ id: 2, status: 'open', title: 'Youth care tender', deadline: day(2) },
	{ id: 3, status: 'doing', title: 'Street lighting', deadline: day(30) },
	{ id: 4, status: 'doing', title: 'No date at all' },
]

describe('CnBoardView late marking', () => {
	const baseProps = {
		rows,
		statusFieldSchema: { enum: ['open', 'doing'] },
		statusField: 'status',
		cardFields: ['title'],
	}
	const card = (wrapper, id) => wrapper.find(`[data-testid="cn-board-card"][data-card-id="${id}"]`)

	it('marks nothing without a rule, so an existing board is unchanged', () => {
		const wrapper = mount(CnBoardView, { propsData: baseProps })
		expect(wrapper.findAll('[data-testid="cn-board-due"]')).toHaveLength(0)
		expect(wrapper.html()).not.toContain('cn-board-view__card--')
	})

	it('gives an overdue card the error edge and says "Overdue" in text', () => {
		const wrapper = mount(CnBoardView, { propsData: { ...baseProps, dueRule: { field: 'deadline' } } })
		expect(card(wrapper, 1).classes()).toContain('cn-board-view__card--overdue')
		const label = card(wrapper, 1).find('[data-testid="cn-board-due"]')
		expect(label.text()).toBe('Overdue')
		expect(label.classes()).toContain('cn-board-view__due--overdue')
	})

	it('says "Due soon" on a card inside the soon window', () => {
		const wrapper = mount(CnBoardView, { propsData: { ...baseProps, dueRule: { field: 'deadline' } } })
		expect(card(wrapper, 2).find('[data-testid="cn-board-due"]').text()).toBe('Due soon')
		expect(card(wrapper, 2).classes()).toContain('cn-board-view__card--soon')
		expect(card(wrapper, 2).classes()).not.toContain('cn-board-view__card--overdue')
	})

	it('leaves a card that is fine, or has no date, without a label', () => {
		const wrapper = mount(CnBoardView, { propsData: { ...baseProps, dueRule: { field: 'deadline' } } })
		expect(card(wrapper, 3).find('[data-testid="cn-board-due"]').exists()).toBe(false)
		expect(card(wrapper, 4).find('[data-testid="cn-board-due"]').exists()).toBe(false)
		expect(card(wrapper, 4).classes()).toEqual(['cn-board-view__card'])
	})

	it('honours soonDays', () => {
		const wide = mount(CnBoardView, { propsData: { ...baseProps, dueRule: { field: 'deadline', soonDays: 45 } } })
		expect(card(wide, 3).find('[data-testid="cn-board-due"]').text()).toBe('Due soon')
		const narrow = mount(CnBoardView, { propsData: { ...baseProps, dueRule: { field: 'deadline', soonDays: 0 } } })
		expect(card(narrow, 2).find('[data-testid="cn-board-due"]').exists()).toBe(false)
	})

	it('keeps the card a list item with its open button', () => {
		const wrapper = mount(CnBoardView, { propsData: { ...baseProps, dueRule: { field: 'deadline' } } })
		expect(card(wrapper, 1).attributes('role')).toBe('listitem')
		expect(card(wrapper, 1).find('[data-testid="cn-board-card-open"]').exists()).toBe(true)
	})
})

describe('CnObjectKanban late marking', () => {
	const DraggableStub = {
		name: 'draggable',
		props: ['list', 'modelValue', 'group', 'itemKey', 'tag'],
		computed: {
			items() {
				return this.modelValue || this.list || []
			},
		},
		template: '<div><template v-for="(element, index) in items" :key="index"><slot name="item" :element="element" :index="index" /></template></div>',
	}
	const mountKanban = (propsData, options = {}) => mount(CnObjectKanban, {
		propsData: { objects: rows, groupByField: 'status', ...propsData },
		stubs: { draggable: DraggableStub },
		...options,
	})

	it('marks nothing without a rule', () => {
		const wrapper = mountKanban()
		expect(wrapper.findAll('[data-testid="cn-kanban-due"]')).toHaveLength(0)
		expect(wrapper.find('.cn-object-kanban__card--overdue').exists()).toBe(false)
	})

	it('labels overdue and soon cards and edges the overdue one', () => {
		const wrapper = mountKanban({ dueRule: { field: 'deadline' } })
		const labels = wrapper.findAll('[data-testid="cn-kanban-due"]').map((node) => node.text())
		expect(labels.sort()).toEqual(['Due soon', 'Overdue'])
		expect(wrapper.findAll('.cn-object-kanban__card--overdue')).toHaveLength(1)
		expect(wrapper.find('.cn-object-kanban__card--overdue').text()).toContain('Parking permits')
	})

	it('hands the due state to a custom card slot', () => {
		const wrapper = mountKanban({ dueRule: { field: 'deadline' } }, {
			slots: { card: ({ object, dueState }) => h('i', { class: 'own', 'data-due': String(dueState) }, object.title) },
		})
		const states = Object.fromEntries(wrapper.findAll('.own').map((node) => [node.text(), node.attributes('data-due')]))
		expect(states).toEqual({
			'Parking permits': 'overdue',
			'Youth care tender': 'soon',
			'Street lighting': 'ok',
			'No date at all': 'null',
		})
	})
})

describe('manifest board.dueRule', () => {
	const manifest = (board) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.0.0',
		menu: [],
		pages: [{
			id: 'cases',
			route: '/cases',
			type: 'index',
			title: 'Cases',
			board,
			config: { register: 'r', schema: 'case', viewModes: ['table', 'board'] },
		}],
	})

	it('accepts a rule with a field and soonDays', () => {
		const result = validateManifestV2(manifest({ statusField: 'status', dueRule: { field: 'deadline', soonDays: 5 } }))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('refuses a rule without a field, and one with an unknown key', () => {
		expect(validateManifestV2(manifest({ statusField: 'status', dueRule: { soonDays: 5 } })).valid).toBe(false)
		expect(validateManifestV2(manifest({ statusField: 'status', dueRule: { field: 'deadline', lateDays: 1 } })).valid).toBe(false)
	})
})
