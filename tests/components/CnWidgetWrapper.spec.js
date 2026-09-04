/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnWidgetWrapper — the dashboard widget shell. The built-in
 * overflow Actions menu (Refresh + Documentation + Request a feature) is
 * delegated to the shared CnActionsMenu; these tests verify the wrapper
 * wires it correctly end-to-end: effective visibility, default handlers
 * (event-bus emit + auto-mounted feature modal), the Documentation link,
 * spin state forwarding, and host preventDefault suppression. Spec
 * capabilities:
 *
 * - widget-wrapper / "header actions slot" (MODIFIED): show/hide flags,
 *   menu hidden when both opted out, Documentation link
 * - widget-wrapper-actions / "default Request-a-feature handler",
 *   "default Refresh handler emits on cn:widget:refresh event-bus channel"
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

import { emit as emitOnBus } from '@nextcloud/event-bus'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

// Stub the NC overflow-menu components so we can drive clicks against
// stable testids without pulling the real popper/transition machinery.
const NcActionButtonStub = {
	name: 'NcActionButton',
	inheritAttrs: false,
	template: '<button :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\', $event)"><slot /></button>',
}
const NcActionsStub = {
	name: 'NcActions',
	template: '<div class="nc-actions-stub" data-testid="cn-widget-wrapper-actions"><slot /></div>',
}
const NcActionLinkStub = {
	name: 'NcActionLink',
	inheritAttrs: false,
	props: ['href', 'target', 'rel'],
	template: '<a :data-testid="$attrs[\'data-testid\']" :href="href" :target="target" :rel="rel"><slot /></a>',
}

const baseStubs = {
	NcActions: NcActionsStub,
	NcActionButton: NcActionButtonStub,
	NcActionLink: NcActionLinkStub,
	DotsHorizontal: true,
	Refresh: true,
	LightbulbOutline: true,
	BookOpenVariant: true,
}

const mountWrapper = (propsData = {}, opts = {}) => mount(CnWidgetWrapper, {
	propsData: { title: 'Outgoing calls', showTitle: true, ...propsData },
	stubs: baseStubs,
	mocks: { $route: { name: 'Dashboard' } },
	provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: 'ConductionNL/pipelinq', ...(opts.provide || {}) },
	...opts,
})

describe('CnWidgetWrapper — chrome variant', () => {
	it('defaults to the library chrome (no nc-dashboard class)', () => {
		const wrapper = mountWrapper()
		expect(wrapper.classes()).not.toContain('cn-widget-wrapper--nc-dashboard')
	})

	it('applies the nc-dashboard chrome class when chrome="nc-dashboard"', () => {
		const wrapper = mountWrapper({ chrome: 'nc-dashboard' })
		expect(wrapper.classes()).toContain('cn-widget-wrapper--nc-dashboard')
	})
})

describe('CnWidgetWrapper — Actions menu visibility (widget-wrapper)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('auto: hides Refresh by default (no @refresh listener), shows Request a feature', () => {
		const wrapper = mountWrapper()
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').exists()).toBe(true)
	})

	it('auto: shows Refresh when a host attaches an @refresh listener', () => {
		const wrapper = mountWrapper({}, { listeners: { refresh: () => {} } })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').exists()).toBe(true)
	})

	it('explicit :show-refresh="true" shows Refresh even without a listener', () => {
		const wrapper = mountWrapper({ showRefresh: true })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').exists()).toBe(true)
	})

	it('hides Refresh when :show-refresh="false" (even with a listener)', () => {
		const wrapper = mountWrapper({ showRefresh: false }, { listeners: { refresh: () => {} } })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').exists()).toBe(true)
	})

	it('hides Request a feature when :show-request-feature="false"', () => {
		const wrapper = mountWrapper({ showRequestFeature: false, showRefresh: true })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').exists()).toBe(false)
	})

	// Request-a-feature / Report-a-bug / Documentation are now unconditional,
	// so emptying the menu means opting out of all four items — not two.
	it('hides the entire overflow menu when every item is opted out and no action-items slot', () => {
		const wrapper = mountWrapper({ showRefresh: false, showRequestFeature: false, showReportBug: false, showDocumentation: false })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-actions"]').exists()).toBe(false)
	})

	it('the legacy hide-* aliases still opt out of their own items (back-compat)', () => {
		const wrapper = mountWrapper({ hideRefresh: true, hideRequestFeature: true, showReportBug: false, showDocumentation: false })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-actions"]').exists()).toBe(false)
	})

	it('renders the actions menu by default (showActions defaults true)', () => {
		const wrapper = mountWrapper()
		expect(wrapper.find('[data-testid="cn-widget-wrapper-actions"]').exists()).toBe(true)
	})

	it('hides the whole actions area when :show-actions="false" (compact KPI tile)', () => {
		const wrapper = mountWrapper({ showActions: false })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-actions"]').exists()).toBe(false)
		// Header + title still render — only the overflow menu is suppressed.
		expect(wrapper.find('.cn-widget-wrapper__title').text()).toBe('Outgoing calls')
	})
})

describe('CnWidgetWrapper — headerless floating title-meta (flush KPI date chip)', () => {
	it('floats title-meta over the content when the header is hidden', () => {
		const wrapper = mount(CnWidgetWrapper, {
			propsData: { title: 'Turnover', showTitle: false },
			stubs: baseStubs,
			mocks: { $route: { name: 'Dashboard' } },
			provide: { cnAppId: 'shillinq', cnFeatureRequestRepo: 'ConductionNL/shillinq' },
			slots: { 'title-meta': '<span class="my-chip">12m</span>' },
		})
		const floating = wrapper.find('.cn-widget-wrapper__floating-meta')
		expect(floating.exists()).toBe(true)
		expect(floating.find('.my-chip').text()).toBe('12m')
		// No header is rendered in headerless mode.
		expect(wrapper.find('.cn-widget-wrapper__header').exists()).toBe(false)
	})

	it('keeps title-meta in the header (not floating) when the header is shown', () => {
		const wrapper = mount(CnWidgetWrapper, {
			propsData: { title: 'Turnover', showTitle: true },
			stubs: baseStubs,
			mocks: { $route: { name: 'Dashboard' } },
			provide: { cnAppId: 'shillinq', cnFeatureRequestRepo: 'ConductionNL/shillinq' },
			slots: { 'title-meta': '<span class="my-chip">12m</span>' },
		})
		expect(wrapper.find('.cn-widget-wrapper__floating-meta').exists()).toBe(false)
		expect(wrapper.find('.cn-widget-wrapper__title-meta .my-chip').exists()).toBe(true)
	})
})

describe('CnWidgetWrapper — default Refresh handler (widget-wrapper-actions)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('emits on cn:widget:refresh event-bus when no host listener', async () => {
		// Explicit show-refresh keeps the action visible without a listener
		// (the bus-driven pattern used by CnRelatedObjectsWidget/CnChartWidget).
		const wrapper = mountWrapper({ widgetId: 'outgoing-calls-daily', showRefresh: true })
		await wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').trigger('click')
		expect(emitOnBus).toHaveBeenCalledWith('cn:widget:refresh', {
			widgetId: 'outgoing-calls-daily',
			title: 'Outgoing calls',
		})
	})

	it('host @refresh listener fires before the default', async () => {
		const onRefresh = jest.fn()
		const wrapper = mountWrapper({ widgetId: 'outgoing-calls-daily' }, { listeners: { refresh: onRefresh } })
		await wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').trigger('click')
		expect(onRefresh).toHaveBeenCalled()
		expect(emitOnBus).toHaveBeenCalled() // default still fires
	})

	it('host listener can suppress the default via event.preventDefault()', async () => {
		const onRefresh = jest.fn((_payload, event) => event.preventDefault())
		const wrapper = mountWrapper({ widgetId: 'outgoing-calls-daily' }, { listeners: { refresh: onRefresh } })
		await wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').trigger('click')
		expect(onRefresh).toHaveBeenCalled()
		expect(emitOnBus).not.toHaveBeenCalled()
	})

	it('falls back to slugified title when no widgetId is set', async () => {
		const wrapper = mountWrapper({ title: 'Outgoing calls — daily', showRefresh: true })
		await wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').trigger('click')
		const payload = emitOnBus.mock.calls[0][1]
		expect(payload.widgetId).toBe('outgoing-calls-daily')
	})
})

describe('CnWidgetWrapper — default Request-a-feature handler (widget-wrapper-actions)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => {
		jest.restoreAllMocks()
	})

	// The in-product modal is gone (team decision 2026-09-04): the default
	// opens the forge's feature-request issue FORM, exactly like Report a
	// bug, with the widget surface as the English headline.
	it('opens the feature-request issue form with the widget surface headline', async () => {
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
		const wrapper = mountWrapper({ widgetId: 'outgoing-calls-daily', specRef: 'call-logs' })
		await wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').trigger('click')

		expect(openSpy).toHaveBeenCalledTimes(1)
		const u = new URL(openSpy.mock.calls[0][0])
		expect(u.origin + u.pathname).toBe('https://github.com/ConductionNL/pipelinq/issues/new')
		expect(u.searchParams.get('template')).toBe('feature-request.yml')
		expect(u.searchParams.get('title')).toBe('[FEATURE] widget:outgoing-calls-daily')
	})

	it('host preventDefault suppresses the built-in navigation', async () => {
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
		const onRequest = jest.fn((_payload, event) => event.preventDefault())
		const wrapper = mountWrapper({ widgetId: 'outgoing-calls-daily' }, { listeners: { 'request-feature': onRequest } })
		await wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').trigger('click')
		expect(onRequest).toHaveBeenCalled()
		expect(openSpy).not.toHaveBeenCalled()
	})

	it('warns and opens nothing when no cnFeatureRequestRepo inject', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
		const wrapper = mountWrapper(
			{ widgetId: 'outgoing-calls-daily' },
			{ provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: '' } },
		)
		await wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').trigger('click')
		expect(openSpy).not.toHaveBeenCalled()
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot open the feature-request form'))
	})
})

describe('CnWidgetWrapper — refresh spinner', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => jest.restoreAllMocks())

	// The spinner state lives on the delegated CnActionsMenu child, driven
	// solely by the `:refreshing` prop the wrapper forwards. Read the child's
	// forwarded prop to assert the wiring end-to-end. The render mechanics
	// (disabled + loading icon) are covered in CnActionsMenu.spec.js.
	const menu = (wrapper) => wrapper.findComponent({ name: 'CnActionsMenu' })

	it('forwards :refreshing to the delegated CnActionsMenu (host-driven)', async () => {
		const wrapper = mountWrapper({ widgetId: 'w1', refreshing: true })
		expect(menu(wrapper).props('refreshing')).toBe(true)
		await wrapper.setProps({ refreshing: false })
		expect(menu(wrapper).props('refreshing')).toBe(false)
	})

	it('does not spin on click alone — refreshing stays false until the host sets it', async () => {
		const wrapper = mountWrapper({ widgetId: 'w1', showRefresh: true })
		await wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').trigger('click')
		expect(menu(wrapper).props('refreshing')).toBe(false)
	})
})

describe('CnWidgetWrapper — Documentation action', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => {
		jest.restoreAllMocks()
	})

	// Inverted deliberately. A widget with no documentationUrl used to render
	// no Documentation item at all — which is how OpenRegister's widget menus
	// shipped without one. The shared menu now resolves a target itself, so
	// the item is present whether or not the host configured anything.
	it('still renders the Documentation item when no documentationUrl is set', () => {
		const wrapper = mountWrapper()
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-documentation"]').exists()).toBe(true)
	})

	it('renders Report a bug alongside it, unconfigured', () => {
		const wrapper = mountWrapper()
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-report-bug"]').exists()).toBe(true)
	})

	it('renders a Documentation link that opens in a new tab when documentationUrl is set', () => {
		const wrapper = mountWrapper({ documentationUrl: 'https://docs.example.test/widget' })
		const link = wrapper.find('[data-testid="cn-widget-wrapper-action-documentation"]')
		expect(link.exists()).toBe(true)
		expect(link.attributes('href')).toBe('https://docs.example.test/widget')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
	})

	it('shows the overflow menu for documentation alone even when both built-ins are opted out', () => {
		const wrapper = mountWrapper({
			showRefresh: false,
			showRequestFeature: false,
			documentationUrl: 'https://docs.example.test/widget',
		})
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-documentation"]').exists()).toBe(true)
	})
})
