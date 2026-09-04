/**
 * Tests for CnDetailPage's built-in header Actions menu — the page-level
 * Refresh / Documentation / Request-a-feature trio delegated to the shared
 * CnActionsMenu. On by default; Documentation opt-in via documentationUrl;
 * the page re-emits @refresh / @request-feature to the host.
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

import { emit as emitOnBus } from '@nextcloud/event-bus'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

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
	NcButton: true,
	NcEmptyContent: true,
	NcLoadingIcon: true,
	CnIcon: true,
	CnLockedBanner: true,
	AlertCircleOutline: true,
	InformationOutline: true,
	Refresh: true,
	DotsHorizontal: true,
	LightbulbOutline: true,
	BookOpenVariant: true,
}

const mountPage = (propsData = {}, opts = {}) => mount(CnDetailPage, {
	propsData: { title: 'Case 42', ...propsData },
	stubs,
	mocks: { $route: { name: 'cases-detail' } },
	provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: 'ConductionNL/pipelinq', ...(opts.provide || {}) },
	...opts,
})

describe('CnDetailPage — header Actions menu', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	// Documentation and Report-a-bug are unconditional now — the shared menu
	// resolves their targets itself, so a page that configures neither still
	// carries both. Only Refresh is still auto-detected from a listener.
	it('auto: hides Refresh by default (legacy mode, no @refresh listener), shows the mandatory trio', () => {
		const wrapper = mountPage()
		expect(wrapper.find('[data-testid="cn-detail-page-action-refresh"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-detail-page-action-request-feature"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-detail-page-action-report-bug"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-detail-page-action-documentation"]').exists()).toBe(true)
	})

	it('auto: shows Refresh when the host attaches an @refresh listener', () => {
		const wrapper = mountPage({}, { listeners: { refresh: () => {} } })
		expect(wrapper.find('[data-testid="cn-detail-page-action-refresh"]').exists()).toBe(true)
	})

	it('renders the Documentation link when documentationUrl is set', () => {
		const wrapper = mountPage({ documentationUrl: 'https://docs.example.test/cases' })
		const link = wrapper.find('[data-testid="cn-detail-page-action-documentation"]')
		expect(link.exists()).toBe(true)
		expect(link.attributes('target')).toBe('_blank')
	})

	it('re-emits @refresh and fires the cn:page:refresh bus when shown', async () => {
		const wrapper = mountPage({ pageId: 'cases', showRefresh: true })
		await wrapper.find('[data-testid="cn-detail-page-action-refresh"]').trigger('click')
		expect(wrapper.emitted('refresh')).toBeTruthy()
		expect(emitOnBus).toHaveBeenCalledWith('cn:page:refresh', { widgetId: 'cases', title: 'Case 42' })
	})

	it('re-fetches the object on refresh in schema-driven (manifest) mode', async () => {
		const store = {
			registerObjectType: jest.fn(),
			fetchObject: jest.fn().mockResolvedValue({}),
			fetchSchema: jest.fn().mockResolvedValue({}),
			objects: {},
			loading: {},
			errors: {},
		}
		const wrapper = mountPage({
			register: 'pipelinq',
			schema: 'lead',
			objectId: 'abc-123',
			objectStore: store,
			subscribe: false,
		})
		store.fetchObject.mockClear()
		await wrapper.find('[data-testid="cn-detail-page-action-refresh"]').trigger('click')
		expect(store.fetchObject).toHaveBeenCalledWith('pipelinq-lead', 'abc-123')
	})

	// The in-product modal is gone (team decision 2026-09-04): the surface
	// slug now travels as the English headline of the forge issue-form link.
	it('forwards the detail surface into the feature-request link', async () => {
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
		const wrapper = mountPage({ pageId: 'cases' })
		await wrapper.find('[data-testid="cn-detail-page-action-request-feature"]').trigger('click')
		expect(openSpy).toHaveBeenCalledTimes(1)
		const u = new URL(openSpy.mock.calls[0][0])
		expect(u.searchParams.get('template')).toBe('feature-request.yml')
		expect(u.searchParams.get('title')).toBe('[FEATURE] detail:cases')
		openSpy.mockRestore()
	})

	it('can opt out of every built-in', () => {
		const wrapper = mountPage({ showRefresh: false, showRequestFeature: false, showReportBug: false, showDocumentation: false })
		expect(wrapper.find('[data-testid="cn-detail-page-actions"]').exists()).toBe(false)
	})
})
