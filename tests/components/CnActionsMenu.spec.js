/**
 * Tests for CnActionsMenu — the shared "…" overflow Actions menu that
 * renders the built-in trio (Refresh / Documentation / Request a feature)
 * and auto-mounts the CnSuggestFeatureModal. Used by CnWidgetWrapper and
 * the page-level headers of CnDetailPage / CnDashboardPage.
 *
 * Covers: item visibility + the testidBase prefix, the Documentation
 * new-tab link, default Refresh handler (event-bus emit on the configured
 * channel) with preventDefault suppression, default Request-a-feature
 * handler (modal mount / repo-missing warn), and the refresh spinner
 * (disabled + loading icon driven solely by `:refreshing`).
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

import { emit as emitOnBus } from '@nextcloud/event-bus'
import CnActionsMenu from '../../src/components/CnActionsMenu/CnActionsMenu.vue'

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
	// Forward an `data-testid` from attrs so we can assert the container
	// testid honours the configurable testidBase prop.
	inheritAttrs: false,
	template: '<div class="nc-actions-stub" :data-testid="$attrs[\'data-testid\']"><slot /></div>',
}

const baseStubs = {
	NcActions: NcActionsStub,
	NcActionButton: NcActionButtonStub,
	NcActionLink: NcActionLinkStub,
	DotsHorizontal: true,
	Refresh: true,
	LightbulbOutline: true,
	BookOpenVariant: true,
	CnSuggestFeatureModal: { name: 'CnSuggestFeatureModal', props: ['repo', 'specRef', 'app', 'page', 'surface', 'conductionSubmitEnabled'], template: '<div class="suggest-modal-stub" />' },
}

const mountMenu = (propsData = {}, opts = {}) => mount(CnActionsMenu, {
	propsData: { widgetId: 'w1', title: 'My widget', surface: 'widget:w1', ...propsData },
	stubs: baseStubs,
	mocks: { $route: { name: 'Dashboard' } },
	provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: 'ConductionNL/pipelinq', ...(opts.provide || {}) },
	...opts,
})

describe('CnActionsMenu — visibility & testidBase', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	it('renders Refresh + Request a feature by default, Documentation hidden', () => {
		const wrapper = mountMenu()
		expect(wrapper.find('[data-testid="cn-actions-menu-action-refresh"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-actions-menu-action-request-feature"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-actions-menu-action-documentation"]').exists()).toBe(false)
	})

	it('honours testidBase on the container and items', () => {
		const wrapper = mountMenu({ testidBase: 'cn-detail-page' })
		expect(wrapper.find('[data-testid="cn-detail-page-actions"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-detail-page-action-refresh"]').exists()).toBe(true)
	})

	it('hides the whole menu when everything is opted out and no action-items slot', () => {
		const wrapper = mountMenu({ showRefresh: false, showRequestFeature: false })
		expect(wrapper.find('[data-testid="cn-actions-menu-actions"]').exists()).toBe(false)
	})

	it('renders the menu when only an action-items slot is provided', () => {
		const wrapper = mountMenu(
			{ showRefresh: false, showRequestFeature: false },
			{ slots: { 'action-items': '<button data-testid="custom-item">X</button>' } },
		)
		expect(wrapper.find('[data-testid="cn-actions-menu-actions"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="custom-item"]').exists()).toBe(true)
	})
})

describe('CnActionsMenu — Documentation link', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	it('renders a new-tab link when documentationUrl is set', () => {
		const wrapper = mountMenu({ documentationUrl: 'https://docs.example.test' })
		const link = wrapper.find('[data-testid="cn-actions-menu-action-documentation"]')
		expect(link.exists()).toBe(true)
		expect(link.attributes('href')).toBe('https://docs.example.test')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
	})

	it('uses the documentationLabel prop for the link text', () => {
		const wrapper = mountMenu({ documentationUrl: 'https://docs.example.test', documentationLabel: 'Guide' })
		expect(wrapper.find('[data-testid="cn-actions-menu-action-documentation"]').text()).toContain('Guide')
	})
})

describe('CnActionsMenu — default Refresh handler', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	it('emits on the configured refreshChannel when no host suppresses it', async () => {
		const wrapper = mountMenu({ widgetId: 'w1', title: 'My widget', refreshChannel: 'cn:page:refresh' })
		await wrapper.find('[data-testid="cn-actions-menu-action-refresh"]').trigger('click')
		expect(emitOnBus).toHaveBeenCalledWith('cn:page:refresh', { widgetId: 'w1', title: 'My widget' })
	})

	it('host listener can suppress the default via event.preventDefault()', async () => {
		const onRefresh = jest.fn((_p, ev) => ev.preventDefault())
		const wrapper = mountMenu({}, { listeners: { refresh: onRefresh } })
		await wrapper.find('[data-testid="cn-actions-menu-action-refresh"]').trigger('click')
		expect(onRefresh).toHaveBeenCalled()
		expect(emitOnBus).not.toHaveBeenCalled()
	})
})

describe('CnActionsMenu — default Request-a-feature handler', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	it('mounts CnSuggestFeatureModal with the forwarded surface + context', async () => {
		const wrapper = mountMenu({ surface: 'detail:cases', specRef: 'cases' })
		await wrapper.find('[data-testid="cn-actions-menu-action-request-feature"]').trigger('click')
		const modal = wrapper.findComponent({ name: 'CnSuggestFeatureModal' })
		expect(modal.exists()).toBe(true)
		expect(modal.props()).toMatchObject({
			repo: 'ConductionNL/pipelinq',
			specRef: 'cases',
			app: 'pipelinq',
			page: 'Dashboard',
			surface: 'detail:cases',
		})
	})

	it('warns and does not mount the modal when no repo inject', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountMenu({}, { provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: '' } })
		await wrapper.find('[data-testid="cn-actions-menu-action-request-feature"]').trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot open feature request modal'))
	})

	it('host preventDefault suppresses the modal', async () => {
		const onRequest = jest.fn((_p, ev) => ev.preventDefault())
		const wrapper = mountMenu({}, { listeners: { 'request-feature': onRequest } })
		await wrapper.find('[data-testid="cn-actions-menu-action-request-feature"]').trigger('click')
		expect(onRequest).toHaveBeenCalled()
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
	})
})

describe('CnActionsMenu — refresh spinner', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	// Stubs that render the #icon slot and expose `disabled`, so we can
	// assert the icon swap + disabled state the host can't see otherwise.
	const iconStubs = () => {
		const ActionButtonIconStub = {
			name: 'NcActionButton',
			inheritAttrs: false,
			props: ['disabled'],
			template: '<button :data-testid="$attrs[\'data-testid\']" :disabled="disabled" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
		}
		return { ...baseStubs, NcActionButton: ActionButtonIconStub, Refresh: { name: 'Refresh', template: '<span class="refresh-icon-stub" />' }, NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading-icon-stub" />' } }
	}
	const mountWithIcons = (propsData = {}) => mount(CnActionsMenu, {
		propsData: { widgetId: 'w1', title: 'My widget', surface: 'widget:w1', ...propsData },
		stubs: iconStubs(),
		mocks: { $route: { name: 'Dashboard' } },
		provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: 'ConductionNL/pipelinq' },
	})

	it('does NOT spin or disable on click alone — the spinner only follows :refreshing', async () => {
		const wrapper = mountWithIcons()
		const refreshBtn = wrapper.find('[data-testid="cn-actions-menu-action-refresh"]')
		await refreshBtn.trigger('click')
		expect(refreshBtn.attributes('disabled')).toBeFalsy()
		expect(wrapper.findComponent({ name: 'NcLoadingIcon' }).exists()).toBe(false)
		expect(wrapper.findComponent({ name: 'Refresh' }).exists()).toBe(true)
	})

	it('while :refreshing the Refresh item is disabled and shows the loading spinner (not the static icon)', async () => {
		const wrapper = mountWithIcons({ refreshing: true })
		const refreshBtn = wrapper.find('[data-testid="cn-actions-menu-action-refresh"]')
		expect(refreshBtn.attributes('disabled')).toBeTruthy()
		expect(wrapper.findComponent({ name: 'NcLoadingIcon' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'Refresh' }).exists()).toBe(false)

		await wrapper.setProps({ refreshing: false })
		expect(refreshBtn.attributes('disabled')).toBeFalsy()
		expect(wrapper.findComponent({ name: 'NcLoadingIcon' }).exists()).toBe(false)
		expect(wrapper.findComponent({ name: 'Refresh' }).exists()).toBe(true)
	})
})
