/**
 * Tests for CnDetailPage's integration-widget slot fallback.
 *
 * When a grid-layout widget def has `type: 'integration'` and an
 * `integrationId`, CnDetailPage renders the registered widget on the
 * `detail-page` surface (AD-19) as the `#widget-<id>` slot's default
 * content. A consumer-supplied slot still overrides it.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const { integrations } = require('../../src/integrations/registry.js')

const IntegrationWidget = {
	name: 'IntegrationWidget',
	props: ['surface', 'register', 'schema', 'objectId'],
	render() {
		return h('div', { class: 'integration-widget' }, `${this.surface}|${this.register}|${this.schema}|${this.objectId}`)
	},
}

// Mirrors CnIntegrationCard's own title resolution — `this.title ||
// this.integrationId` — which is the fallback that made the defect below
// invisible: with no title forwarded, the card silently rendered the raw id.
const TitledWidget = {
	name: 'TitledWidget',
	props: { title: { type: String, default: '' }, integrationId: { type: String, default: 'talk' } },
	render() {
		return h('div', { class: 'titled-widget' }, this.title || this.integrationId)
	},
}
const RegistryTab = { name: 'RegistryTab', render() { return h('div') } }

const layout = [{ id: 1, widgetId: 'files-w', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 }]
const widgets = [{ id: 'files-w', title: 'Files', type: 'integration', integrationId: 'files' }]

describe('CnDetailPage — integration widget grid slot fallback', () => {
	afterEach(() => integrations.__resetForTests())

	// ADR-062 rule 5 — "every body widget has card chrome and its manifest
	// title". An integration widget draws its OWN chrome (CnIntegrationCard
	// renders a CnDetailCard), so unlike the content-only catalog widgets it is
	// correctly not wrapped in CnWidgetWrapper — but its manifest title was
	// never forwarded either, and CnIntegrationCard falls back to the raw
	// integrationId. Measured on learniq: widgets the manifest calls "Class
	// space" / "Join call" / "Session materials" all rendered as their ids.
	it('forwards the manifest title so the card is not titled by its raw id', () => {
		integrations.register({ id: 'talk', label: 'Chat', tab: RegistryTab, widget: TitledWidget })
		const wrapper = mount(CnDetailPage, {
			propsData: {
				layout: [{ id: 1, widgetId: 'cohort-talk', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 }],
				widgets: [{ id: 'cohort-talk', title: 'Class space', type: 'integration', integrationId: 'talk' }],
				objectId: 'obj-7',
				sidebarProps: { register: 'reg-a', schema: 'sch-b' },
			},
		})
		expect(wrapper.find('.titled-widget').text()).toBe('Class space')
		wrapper.unmount()
	})

	// Negative control: with no manifest title the widget keeps its own
	// fallback, so this fix cannot mask a genuinely untitled widget.
	it('forwards an empty title when the manifest declares none', () => {
		integrations.register({ id: 'talk', label: 'Chat', tab: RegistryTab, widget: TitledWidget })
		const wrapper = mount(CnDetailPage, {
			propsData: {
				layout: [{ id: 1, widgetId: 'bare-talk', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 }],
				widgets: [{ id: 'bare-talk', type: 'integration', integrationId: 'talk' }],
				objectId: 'obj-7',
				sidebarProps: { register: 'reg-a', schema: 'sch-b' },
			},
		})
		expect(wrapper.find('.titled-widget').text()).toBe('talk')
		wrapper.unmount()
	})

	it('renders the registered widget on the detail-page surface', () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: IntegrationWidget })
		const wrapper = mount(CnDetailPage, {
			propsData: {
				layout,
				widgets,
				objectId: 'obj-7',
				sidebarProps: { register: 'reg-a', schema: 'sch-b' },
			},
		})
		const w = wrapper.find('.integration-widget')
		expect(w.exists()).toBe(true)
		expect(w.text()).toBe('detail-page|reg-a|sch-b|obj-7')
		wrapper.unmount()
	})

	it('honours an explicit integrationContext prop over the derived one', () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: IntegrationWidget })
		const wrapper = mount(CnDetailPage, {
			propsData: {
				layout,
				widgets,
				objectId: 'obj-7',
				sidebarProps: { register: 'reg-a', schema: 'sch-b' },
				integrationContext: { register: 'override-r', schema: 'override-s', objectId: 'override-o' },
			},
		})
		expect(wrapper.find('.integration-widget').text()).toBe('detail-page|override-r|override-s|override-o')
		wrapper.unmount()
	})

	it('renders nothing extra when the integration is not registered', () => {
		const wrapper = mount(CnDetailPage, {
			propsData: { layout, widgets, objectId: 'obj-7' },
		})
		expect(wrapper.find('.integration-widget').exists()).toBe(false)
		wrapper.unmount()
	})

	it('a consumer-supplied #widget-<id> slot overrides the integration fallback', () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: IntegrationWidget })
		const wrapper = mount(CnDetailPage, {
			propsData: { layout, widgets, objectId: 'obj-7' },
			scopedSlots: { 'widget-files-w': '<div class="slot-override">mine</div>' },
		})
		expect(wrapper.find('.slot-override').exists()).toBe(true)
		expect(wrapper.find('.integration-widget').exists()).toBe(false)
		wrapper.unmount()
	})
})
