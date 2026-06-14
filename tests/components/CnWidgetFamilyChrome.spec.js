/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Guards the two-family model: "Widget"-family components render on the
 * CnWidgetWrapper chrome (and therefore carry the shared Actions menu),
 * while "Card"-family components render on the plain CnDetailCard with no
 * menu. Regression guard so a future refactor doesn't silently swap a
 * widget back onto a bare card (dropping its Actions menu).
 */

import { shallowMount } from '@vue/test-utils'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'
import CnObjectMetadataWidget from '../../src/components/CnObjectMetadataWidget/CnObjectMetadataWidget.vue'

describe('Widget vs Card chrome', () => {
	it('CnObjectDataWidget (Widget) renders on the CnWidgetWrapper chrome', () => {
		const wrapper = shallowMount(CnObjectDataWidget, {
			propsData: {
				schema: { properties: { name: { type: 'string' } } },
				objectData: { name: 'Alpha' },
			},
		})
		expect(wrapper.findComponent({ name: 'CnWidgetWrapper' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnDetailCard' }).exists()).toBe(false)
	})

	it('CnObjectMetadataWidget (Card) stays on the CnDetailCard with no widget chrome', () => {
		const wrapper = shallowMount(CnObjectMetadataWidget, {
			propsData: { objectData: { id: '1', '@self': { schema: 'lead' } } },
		})
		expect(wrapper.findComponent({ name: 'CnDetailCard' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnWidgetWrapper' }).exists()).toBe(false)
	})
})
