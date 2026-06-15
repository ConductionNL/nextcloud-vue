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
	CnSuggestFeatureModal: { name: 'CnSuggestFeatureModal', props: ['repo', 'specRef', 'app', 'page', 'surface', 'conductionSubmitEnabled'], template: '<div class="suggest-modal-stub" />' },
}

const mountWrapper = (propsData = {}, opts = {}) => mount(CnWidgetWrapper, {
	propsData: { title: 'Outgoing calls', showTitle: true, ...propsData },
	stubs: baseStubs,
	mocks: { $route: { name: 'Dashboard' } },
	provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: 'ConductionNL/pipelinq', ...(opts.provide || {}) },
	...opts,
})

describe('CnWidgetWrapper — Actions menu visibility (widget-wrapper)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('renders both built-ins by default', () => {
		const wrapper = mountWrapper()
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').exists()).toBe(true)
	})

	it('hides Refresh when :show-refresh="false"', () => {
		const wrapper = mountWrapper({ showRefresh: false })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').exists()).toBe(true)
	})

	it('hides Request a feature when :show-request-feature="false"', () => {
		const wrapper = mountWrapper({ showRequestFeature: false })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-refresh"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').exists()).toBe(false)
	})

	it('hides the entire overflow menu when both opted out and no action-items slot', () => {
		const wrapper = mountWrapper({ showRefresh: false, showRequestFeature: false })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-actions"]').exists()).toBe(false)
	})

	it('the legacy hide-* aliases still opt out (back-compat)', () => {
		const wrapper = mountWrapper({ hideRefresh: true, hideRequestFeature: true })
		expect(wrapper.find('[data-testid="cn-widget-wrapper-actions"]').exists()).toBe(false)
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
		const wrapper = mountWrapper({ widgetId: 'outgoing-calls-daily' })
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
		const wrapper = mountWrapper({ title: 'Outgoing calls — daily' })
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

	it('mounts CnSuggestFeatureModal with the expected auto-filled props', async () => {
		const wrapper = mountWrapper({ widgetId: 'outgoing-calls-daily', specRef: 'call-logs' })
		await wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').trigger('click')
		// Modal mounted lazily after click
		const modal = wrapper.findComponent({ name: 'CnSuggestFeatureModal' })
		expect(modal.exists()).toBe(true)
		expect(modal.props()).toMatchObject({
			repo: 'ConductionNL/pipelinq',
			specRef: 'call-logs',
			app: 'pipelinq',
			page: 'Dashboard',
			surface: 'widget:outgoing-calls-daily',
			conductionSubmitEnabled: false,
		})
	})

	it('host preventDefault suppresses the modal', async () => {
		const onRequest = jest.fn((_payload, event) => event.preventDefault())
		const wrapper = mountWrapper({ widgetId: 'outgoing-calls-daily' }, { listeners: { 'request-feature': onRequest } })
		await wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').trigger('click')
		expect(onRequest).toHaveBeenCalled()
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
	})

	it('warns and does not mount the modal when no cnFeatureRequestRepo inject', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountWrapper(
			{ widgetId: 'outgoing-calls-daily' },
			{ provide: { cnAppId: 'pipelinq', cnFeatureRequestRepo: '' } },
		)
		await wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').trigger('click')
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot open feature request modal'))
	})

	it('closes the modal when CnSuggestFeatureModal emits @close', async () => {
		const wrapper = mountWrapper({ widgetId: 'outgoing-calls-daily' })
		await wrapper.find('[data-testid="cn-widget-wrapper-action-request-feature"]').trigger('click')
		const modal = wrapper.findComponent({ name: 'CnSuggestFeatureModal' })
		modal.vm.$emit('close')
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnSuggestFeatureModal' }).exists()).toBe(false)
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
		const wrapper = mountWrapper({ widgetId: 'w1' })
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

	it('hides the Documentation item when no documentationUrl is set', () => {
		const wrapper = mountWrapper()
		expect(wrapper.find('[data-testid="cn-widget-wrapper-action-documentation"]').exists()).toBe(false)
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
