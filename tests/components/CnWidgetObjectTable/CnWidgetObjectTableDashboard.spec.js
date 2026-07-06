/**
 * Tests for the `object-table` dashboard registration (issue #89 —
 * dashboard reachability of the built-in v2 widgets):
 *
 * - `object-table` is registered in dashboardWidgetRegistry with a form +
 *   defaultContent so CnDashboardPage's `config.widgets[].type` dispatch and
 *   the Add-widget picker reach it
 * - the registered renderer mounts CnWidgetObjectTable content-only
 *   (`hideWrapper: true`) — double-chrome regression guard
 * - the stored content blob (flat form shape AND v2 `source` shape) is
 *   normalised onto the widget's declarative props
 * - `@workspace.*` tokens resolve through the same cnWorkspaceContext inject
 *   on the dashboard surface
 * - `stats-block` is registered too (rendered by CnDashboardPage's own
 *   isStatsBlock branch; the entry powers the picker + cog form)
 */

import { mount, shallowMount } from '@vue/test-utils'

jest.mock('../../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(() => ({ objectTypeRegistry: {}, errors: {}, registerObjectType: jest.fn() })),
}))

// The aggregator self-registers the whole catalog (incl. object-table + stats-block).
require('../../../src/components/CnWidgetGrid/registerDashboardWidgets.js')
const { getWidgetTypeEntry, getDefaultContent } = require('../../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
const { objectTableContentToProps } = require('../../../src/components/CnWidgetObjectTable/dashboardRegistration.js')
const CnWidgetObjectTable = require('../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue').default

beforeEach(() => {
	window.OC = { currentUser: 'alice' }
})

describe('object-table dashboard registration (issue #89)', () => {
	it('registers object-table with renderer, form, and defaultContent', () => {
		const entry = getWidgetTypeEntry('object-table')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeDefined()
		expect(entry.form).toBeDefined()
		expect(entry.displayName).toBe('Object table')
		const content = getDefaultContent('object-table')
		expect(content.register).toBe('')
		expect(content.schema).toBe('')
		expect(Array.isArray(content.columns)).toBe(true)
	})

	it('the registered renderer mounts CnWidgetObjectTable with hideWrapper (no double chrome)', () => {
		const entry = getWidgetTypeEntry('object-table')
		const content = { register: 'pipelinq', schema: 'case', columns: [{ key: 'title', label: 'Title' }] }
		// Mirror CnDashboardPage's registry branch: :content + v-bind="content".
		const Host = {
			components: { Renderer: entry.renderer },
			template: '<Renderer :content="content" v-bind="content" />',
			data: () => ({ content }),
		}
		const wrapper = mount(Host)
		const widget = wrapper.findComponent(CnWidgetObjectTable)
		expect(widget.exists()).toBe(true)
		expect(widget.props('hideWrapper')).toBe(true)
		// Double-chrome regression: the widget's own CnWidgetWrapper must NOT render.
		expect(wrapper.findComponent({ name: 'CnWidgetWrapper' }).exists()).toBe(false)
		expect(wrapper.find('.cn-widget-object-table__host').exists()).toBe(true)
	})

	it('hideWrapper defaults to false — standalone v2 mounts keep their own chrome', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: { rows: [{ id: '1', title: 'A' }], columns: ['title'] },
		})
		expect(wrapper.findComponent({ name: 'CnWidgetWrapper' }).exists()).toBe(true)
	})

	it('normalises the flat form-shape content onto the declarative source', () => {
		const props = objectTableContentToProps({
			register: 'pipelinq',
			schema: 'case',
			filter: { status: 'open' },
			sort: { field: 'dueDate', dir: 'desc' },
			limit: 3,
			columns: [{ key: 'title', label: 'Case' }],
		})
		expect(props.source).toEqual({
			register: 'pipelinq',
			schema: 'case',
			filter: { status: 'open' },
			order: { dueDate: 'desc' },
			limit: 3,
		})
		expect(props.columns).toEqual([{ key: 'title', label: 'Case' }])
	})

	it('passes a v2-shaped content (explicit source) through unchanged', () => {
		const content = {
			source: { register: 'r', schema: 's', filter: { assignee: '@me' }, limit: 5 },
			columns: ['title'],
			hideHeader: true,
			actions: [{ id: 'x', label: 'X', type: 'object-op', op: 'delete' }],
		}
		const props = objectTableContentToProps(content)
		expect(props.source).toEqual(content.source)
		expect(props.hideHeader).toBe(true)
		expect(props.actions).toEqual(content.actions)
	})

	it('resolves @workspace tokens via cnWorkspaceContext on the dashboard surface', () => {
		const entry = getWidgetTypeEntry('object-table')
		const content = {
			register: 'pipelinq',
			schema: 'case',
			filter: { client: '@workspace.selectedClient' },
			columns: [{ key: 'title', label: 'Title' }],
		}
		const Host = {
			components: { Renderer: entry.renderer },
			template: '<Renderer :content="content" v-bind="content" />',
			data: () => ({ content }),
		}
		const wrapper = mount(Host, {
			provide: { cnWorkspaceContext: { value: { selectedClient: 'client-7' } } },
		})
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		expect(table.props('fetchParams').client).toBe('client-7')
	})

	it('stats-block stays registered (renderer + form for the picker/cog)', () => {
		const entry = getWidgetTypeEntry('stats-block')
		expect(entry).not.toBeNull()
		expect(entry.renderer && entry.renderer.name).toBe('CnStatsBlockWidget')
		expect(entry.form).toBeDefined()
		expect(getDefaultContent('stats-block').dataSource).toBeDefined()
	})
})
