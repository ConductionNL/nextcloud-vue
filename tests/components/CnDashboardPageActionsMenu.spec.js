/**
 * Tests for CnDashboardPage's page-level header Actions menu — the
 * Refresh / Documentation / Request-a-feature trio delegated to the shared
 * CnActionsMenu, distinct from the per-widget menus. On by default; the
 * page re-emits @refresh / @request-feature (not @widget-refresh).
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

import { emit as emitOnBus } from '@nextcloud/event-bus'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

const NcActionButtonStub = {
	name: 'NcActionButton',
	inheritAttrs: false,
	template: '<button :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\', $event)"><slot /></button>',
}
const NcActionLinkStub = {
	name: 'NcActionLink',
	inheritAttrs: false,
	props: ['href', 'target', 'rel'],
	template: '<a :data-testid="$attrs[\'data-testid\']" :href="href" :target="target" :rel="rel"><slot /></a>',
}
const NcActionsStub = {
	name: 'NcActions',
	inheritAttrs: false,
	template: '<div class="nc-actions-stub" :data-testid="$attrs[\'data-testid\']"><slot /></div>',
}

const stubs = {
	NcActions: NcActionsStub,
	NcActionButton: NcActionButtonStub,
	NcActionLink: NcActionLinkStub,
	NcActionInput: true,
	NcActionSeparator: true,
	NcButton: true,
	NcEmptyContent: true,
	NcLoadingIcon: true,
	Pencil: true,
	Check: true,
	CalendarRange: true,
	ViewDashboardOutline: true,
	DotsHorizontal: true,
	Refresh: true,
	LightbulbOutline: true,
	BookOpenVariant: true,
	CnDashboardGrid: true,
	CnWidgetWrapper: true,
	CnWidgetRenderer: true,
	CnTileWidget: true,
	CnChartWidget: true,
	CnStatsBlockWidget: true,
	CnWidgetRefItem: true,
	CnDateRangePicker: true,
	CnSuggestFeatureModal: { name: 'CnSuggestFeatureModal', props: ['repo', 'specRef', 'app', 'page', 'surface', 'conductionSubmitEnabled'], template: '<div class="suggest-modal-stub" />' },
}

const mountPage = (propsData = {}, opts = {}) => mount(CnDashboardPage, {
	propsData: { title: 'Overview', widgets: [], layout: [], ...propsData },
	stubs,
	mocks: { $route: { name: 'dashboard' } },
	provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: 'ConductionNL/pipelinq', ...(opts.provide || {}) },
	...opts,
})

describe('CnDashboardPage — page-level Actions menu', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	it('shows Refresh + Request a feature in the page header by default', () => {
		const wrapper = mountPage()
		expect(wrapper.find('[data-testid="cn-dashboard-page-action-refresh"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-dashboard-page-action-request-feature"]').exists()).toBe(true)
	})

	it('renders the Documentation link when documentationUrl is set', () => {
		const wrapper = mountPage({ documentationUrl: 'https://docs.example.test/dashboard' })
		expect(wrapper.find('[data-testid="cn-dashboard-page-action-documentation"]').attributes('target')).toBe('_blank')
	})

	it('re-emits @refresh (page-level, not @widget-refresh) on the dashboard surface', async () => {
		const wrapper = mountPage({ pageId: 'overview' })
		await wrapper.find('[data-testid="cn-dashboard-page-action-refresh"]').trigger('click')
		expect(wrapper.emitted('refresh')).toBeTruthy()
		expect(wrapper.emitted('widget-refresh')).toBeFalsy()
		expect(emitOnBus).toHaveBeenCalledWith('cn:page:refresh', { widgetId: 'overview', title: 'Overview' })
	})

	it('forwards the dashboard surface to the feature modal', async () => {
		const wrapper = mountPage({ pageId: 'overview' })
		await wrapper.find('[data-testid="cn-dashboard-page-action-request-feature"]').trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).props('surface')).toBe('dashboard:overview')
	})
})

describe('CnDashboardPage — per-widget Refresh visibility', () => {
	// Stub that exposes the props it received so we can assert what
	// CnDashboardPage forwards to each per-widget wrapper.
	const WidgetWrapperProbe = {
		name: 'CnWidgetWrapper',
		props: ['title', 'showTitle', 'showRefresh', 'borderless', 'flush', 'buttons', 'styleConfig'],
		template: '<div class="widget-wrapper-probe"><slot /></div>',
	}
	// Grid stub that renders the #widget slot for each layout item so the
	// per-widget CnWidgetWrapper is actually mounted (the real grid relies
	// on GridStack, which doesn't run under jsdom).
	const GridProbe = {
		name: 'CnDashboardGrid',
		props: ['layout'],
		template: '<div><template v-for="item in layout"><slot name="widget" :item="item" /></template></div>',
	}

	const mountWithWidget = (propsData = {}, opts = {}) => mount(CnDashboardPage, {
		propsData: {
			title: 'Overview',
			widgets: [{ id: 'leads', title: 'Leads over time', type: 'custom' }],
			layout: [{ id: 'l1', widgetId: 'leads', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4 }],
			...propsData,
		},
		stubs: { ...stubs, CnWidgetWrapper: WidgetWrapperProbe, CnDashboardGrid: GridProbe },
		scopedSlots: { 'widget-leads': '<div class="leads-body" />' },
		mocks: { $route: { name: 'dashboard' } },
		provide: { cnAppId: 'pipelinq' },
		...opts,
	})

	it('hides the custom-widget Refresh by default (no @widget-refresh listener)', () => {
		const wrapper = mountWithWidget()
		expect(wrapper.findComponent(WidgetWrapperProbe).props('showRefresh')).toBe(false)
	})

	it('shows the custom-widget Refresh when the app wires @widget-refresh', () => {
		const wrapper = mountWithWidget({}, { listeners: { 'widget-refresh': () => {} } })
		expect(wrapper.findComponent(WidgetWrapperProbe).props('showRefresh')).toBe(true)
	})

	it('explicit widgetShowRefresh=true forces it on even without a listener', () => {
		const wrapper = mountWithWidget({ widgetShowRefresh: true })
		expect(wrapper.findComponent(WidgetWrapperProbe).props('showRefresh')).toBe(true)
	})

	it('explicit widgetShowRefresh=false forces it off even with a listener', () => {
		const wrapper = mountWithWidget({ widgetShowRefresh: false }, { listeners: { 'widget-refresh': () => {} } })
		expect(wrapper.findComponent(WidgetWrapperProbe).props('showRefresh')).toBe(false)
	})
})
