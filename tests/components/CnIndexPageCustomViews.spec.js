/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page's own views (`customViews`): each is a segment of the view switch
 * after the built-in ones, opens with `?_view=<id>`, and draws the whole
 * filtered list with the component the app names.
 *
 * @spec openspec/changes/index-page-custom-views/specs/index-page-custom-views/spec.md#requirement-a-page-can-add-its-own-view-of-the-whole-filtered-list
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const ROWS = [
	{ id: 'c-1', title: 'API', type: 'api' },
	{ id: 'c-2', title: 'File', type: 'file' },
]

const Diagram = {
	name: 'Diagram',
	props: {
		rows: { type: Array, default: () => [] },
		schema: { type: Object, default: null },
		loading: { type: Boolean, default: false },
		rowKey: { type: String, default: 'id' },
	},
	emits: ['rowClick'],
	template: '<div class="test-diagram"><button v-for="row in rows" :key="row.id" class="test-node" @click="$emit(\'rowClick\', row)">{{ row.title }}</button></div>',
}

const VIEWS = [{ id: 'diagram', label: 'Diagram', icon: 'Graph', component: 'ConnectionsDiagram' }]

/**
 * Mount the page with its own views.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountPage(props = {}) {
	return mount(CnIndexPage, {
		props: {
			title: 'Connections',
			schema: { title: 'Connection', properties: {} },
			objects: ROWS,
			customComponents: { ConnectionsDiagram: Diagram },
			customViews: VIEWS,
			...props,
		},
		global: {
			stubs: { CnDataTable: true, CnPagination: true, CnContextMenu: true, CnIndexSidebar: true },
			mocks: {
				$router: { push: jest.fn(() => Promise.resolve()), replace: jest.fn(() => Promise.resolve()), resolve: jest.fn(() => ({ href: '#' })) },
				$route: { query: {} },
			},
		},
	})
}

describe('CnIndexPage customViews', () => {
	let warnSpy
	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => {
		warnSpy.mockRestore()
	})

	it('offers the view as a segment after the built-in ones, with its label and icon', () => {
		const wrapper = mountPage()
		expect(wrapper.vm.effectiveToggleModes.slice(-1)).toEqual(['diagram'])
		expect(wrapper.vm.customViewSegments).toEqual([{ mode: 'diagram', label: 'Diagram', icon: 'Graph' }])
		expect(wrapper.vm.routeViewModes).toContain('diagram')
	})

	it('draws the filtered rows with the named component and opens a row from it', async () => {
		const wrapper = mountPage({ viewMode: 'diagram', selectable: false })
		const diagram = wrapper.findComponent(Diagram)
		expect(diagram.exists()).toBe(true)
		expect(diagram.props('rows').map((row) => row.id)).toEqual(['c-1', 'c-2'])
		expect(wrapper.find('[data-testid="cn-index-custom-view-diagram"]').exists()).toBe(true)

		await wrapper.findAll('.test-node')[0].trigger('click')
		expect(wrapper.emitted('row-click')?.[0]?.[0]?.id).toBe('c-1')
	})

	it('leaves out a view whose id is a built-in mode or whose component does not resolve', () => {
		const wrapper = mountPage({
			customViews: [
				{ id: 'table', label: 'Mine', component: 'ConnectionsDiagram' },
				{ id: 'graph', label: 'Graph', component: 'Missing' },
				{ id: 'Bad id', label: 'Bad', component: 'ConnectionsDiagram' },
			],
		})
		expect(wrapper.vm.customViewEntries).toEqual([])
		expect(wrapper.vm.effectiveToggleModes).not.toContain('graph')
	})

	it('changes nothing for a page without its own views', () => {
		const wrapper = mountPage({ customViews: null, viewMode: 'table' })
		expect(wrapper.vm.customViewEntries).toEqual([])
		expect(wrapper.findComponent(Diagram).exists()).toBe(false)
	})
})

describe('CnActionsBar customViewSegments', () => {
	it('draws a page view as a segment with its label', () => {
		const wrapper = mount(CnActionsBar, {
			props: {
				viewMode: 'diagram',
				availableViewModes: ['table', 'cards', 'diagram'],
				customViewSegments: [{ mode: 'diagram', label: 'Diagram', icon: '' }],
			},
			global: { stubs: { NcButton: true, NcActions: true, CnBuildiqEditButton: true } },
		})
		expect(wrapper.vm.viewSegments.map((segment) => [segment.mode, segment.label])).toEqual([
			['table', 'Table'],
			['cards', 'Cards'],
			['diagram', 'Diagram'],
		])
	})

	it('drops an unknown mode without a segment definition, as before', () => {
		const wrapper = mount(CnActionsBar, {
			props: { viewMode: 'table', availableViewModes: ['table', 'diagram'] },
			global: { stubs: { NcButton: true, NcActions: true, CnBuildiqEditButton: true } },
		})
		expect(wrapper.vm.viewSegments.map((segment) => segment.mode)).toEqual(['table'])
	})
})
