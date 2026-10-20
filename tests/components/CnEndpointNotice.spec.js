/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnEndpointNotice says why an endpoint widget holds no data, or that its
 * data is short, and says nothing when the read answered in full.
 */

import { mount } from '@vue/test-utils'
import CnEndpointNotice from '../../src/components/CnEndpointNotice/CnEndpointNotice.vue'

describe('CnEndpointNotice', () => {
	it('renders nothing for a full answer', () => {
		const wrapper = mount(CnEndpointNotice)
		expect(wrapper.find('.cn-endpoint-notice').exists()).toBe(false)
	})

	it('shows a refusal sentence as a warning', () => {
		const wrapper = mount(CnEndpointNotice, { propsData: { error: 'Only for controllers.', refused: true } })
		const note = wrapper.find('[data-testid="cn-endpoint-notice-refused"]')
		expect(note.text()).toBe('Only for controllers.')
		expect(note.attributes('type')).toBe('warning')
	})

	it('shows a failure as an error, replacing a bare transport word', () => {
		const wrapper = mount(CnEndpointNotice, { propsData: { error: 'error' } })
		expect(wrapper.find('[data-testid="cn-endpoint-notice-error"]').text()).toBe('Could not load these records')
		expect(wrapper.find('[data-testid="cn-endpoint-notice-error"]').attributes('type')).toBe('error')
	})

	it('says a short answer is short, in its own words when given', () => {
		const plain = mount(CnEndpointNotice, { propsData: { truncated: true } })
		expect(plain.find('[data-testid="cn-endpoint-notice-truncated"]').text())
			.toBe('Not every record could be read, so these figures may be incomplete.')

		const own = mount(CnEndpointNotice, { propsData: { truncated: true, truncatedText: 'Only the first 2000 cases.' } })
		expect(own.find('[data-testid="cn-endpoint-notice-truncated"]').text()).toBe('Only the first 2000 cases.')
	})

	it('offers a request button that emits request, labelled Show by default', async () => {
		const wrapper = mount(CnEndpointNotice, { propsData: { awaitingRequest: true, requestHint: 'Every read is recorded.' } })
		const button = wrapper.find('[data-testid="cn-endpoint-request"]')
		expect(button.text()).toBe('Show')
		expect(wrapper.text()).toContain('Every read is recorded.')
		await button.trigger('click')
		expect(wrapper.emitted('request')).toHaveLength(1)

		const own = mount(CnEndpointNotice, { propsData: { awaitingRequest: true, requestLabel: 'Load report' } })
		expect(own.find('[data-testid="cn-endpoint-request"]').text()).toBe('Load report')
	})

	it('puts the refusal before the truncation note', () => {
		const wrapper = mount(CnEndpointNotice, { propsData: { error: 'No.', refused: true, truncated: true } })
		expect(wrapper.find('[data-testid="cn-endpoint-notice-truncated"]').exists()).toBe(false)
	})
})
