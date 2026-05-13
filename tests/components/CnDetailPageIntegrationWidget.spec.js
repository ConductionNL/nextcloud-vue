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
const RegistryTab = { name: 'RegistryTab', render() { return h('div') } }

const layout = [{ id: 1, widgetId: 'files-w', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 }]
const widgets = [{ id: 'files-w', title: 'Files', type: 'integration', integrationId: 'files' }]

describe('CnDetailPage — integration widget grid slot fallback', () => {
	afterEach(() => integrations.__resetForTests())

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
		wrapper.destroy()
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
		wrapper.destroy()
	})

	it('renders nothing extra when the integration is not registered', () => {
		const wrapper = mount(CnDetailPage, {
			propsData: { layout, widgets, objectId: 'obj-7' },
		})
		expect(wrapper.find('.integration-widget').exists()).toBe(false)
		wrapper.destroy()
	})

	it('a consumer-supplied #widget-<id> slot overrides the integration fallback', () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: IntegrationWidget })
		const wrapper = mount(CnDetailPage, {
			propsData: { layout, widgets, objectId: 'obj-7' },
			scopedSlots: { 'widget-files-w': '<div class="slot-override">mine</div>' },
		})
		expect(wrapper.find('.slot-override').exists()).toBe(true)
		expect(wrapper.find('.integration-widget').exists()).toBe(false)
		wrapper.destroy()
	})
})
