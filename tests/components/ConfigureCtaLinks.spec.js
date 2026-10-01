/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The "configure the source" CTAs of the integration dialogs are real links
 * (NcButton href + target), so they can be middle-clicked and copied.
 * @nextcloud/vue is auto-stubbed; the stub spreads href/target onto its div.
 */
import { mount } from '@vue/test-utils'
import CnFlowOperationPicker from '../../src/components/CnFlowOperationPicker/CnFlowOperationPicker.vue'
import CnOpenProjectCreate from '../../src/components/CnOpenProjectCreate/CnOpenProjectCreate.vue'
import CnOpenProjectPicker from '../../src/components/CnOpenProjectPicker/CnOpenProjectPicker.vue'
import CnXwikiPageCreate from '../../src/components/CnXwikiPageCreate/CnXwikiPageCreate.vue'
import CnXwikiPagePicker from '../../src/components/CnXwikiPagePicker/CnXwikiPagePicker.vue'

/**
 * The CTA button, found by its target URL.
 *
 * @param {object} wrapper The mounted dialog.
 * @param {string} href The expected href.
 * @return {object} The button wrapper.
 */
function ctaFor(wrapper, href) {
	return wrapper.find(`.stub.NcButton[href="${href}"]`)
}

describe('configure-source CTAs render as links', () => {
	const originalFetch = global.fetch

	beforeEach(() => {
		// Keep the mount-time fetches pending; each test sets the state itself.
		global.fetch = jest.fn(() => new Promise(() => {}))
	})

	afterEach(() => {
		global.fetch = originalFetch
	})

	it('CnFlowOperationPicker links the empty state to Workflow settings', async () => {
		const wrapper = mount(CnFlowOperationPicker, { propsData: { flowSettingsUrl: '/wf' } })
		await wrapper.setData({ loading: false, adminOnly: false, operations: [] })
		const cta = ctaFor(wrapper, '/wf')
		expect(cta.exists()).toBe(true)
		expect(cta.attributes('target')).toBe('_blank')
	})

	it('CnOpenProjectCreate links the unconfigured state to the source admin', async () => {
		const wrapper = mount(CnOpenProjectCreate, { propsData: { openconnectorUrl: '/oc' } })
		await wrapper.setData({ unconfigured: true })
		expect(ctaFor(wrapper, '/oc').attributes('target')).toBe('_blank')
	})

	it('CnOpenProjectPicker links the unconfigured state to the source admin', async () => {
		const wrapper = mount(CnOpenProjectPicker, { propsData: { openconnectorUrl: '/oc' } })
		await wrapper.setData({ unconfigured: true })
		expect(ctaFor(wrapper, '/oc').attributes('target')).toBe('_blank')
	})

	it('CnXwikiPageCreate links the unavailable state to the sources admin', () => {
		const wrapper = mount(CnXwikiPageCreate, { propsData: { unavailable: true, openConnectorSourcesUrl: '/src' } })
		expect(ctaFor(wrapper, '/src').attributes('target')).toBe('_blank')
	})

	it('CnXwikiPagePicker links the degraded state to the sources admin', async () => {
		const wrapper = mount(CnXwikiPagePicker, { propsData: { openConnectorSourcesUrl: '/src' } })
		await wrapper.setData({ degradedCause: 'unconfigured' })
		expect(ctaFor(wrapper, '/src').attributes('target')).toBe('_blank')
	})
})
