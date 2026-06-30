/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnObjectMetadataWidget — read-only @self metadata display.
 * Focus: metadataSource must not throw when objectData is momentarily
 * undefined/null during async loads (defensive guard).
 */

import { mount } from '@vue/test-utils'
import CnObjectMetadataWidget from '../../src/components/CnObjectMetadataWidget/CnObjectMetadataWidget.vue'

const stubs = {
	CnDetailCard: {
		props: ['title', 'icon', 'collapsible'],
		template: '<div class="card-stub"><slot /></div>',
	},
	CnDetailGrid: {
		props: ['items', 'layout'],
		template: '<div class="grid-stub" :data-count="items.length" />',
	},
}

const mountWidget = (props = {}) => mount(CnObjectMetadataWidget, {
	propsData: props,
	stubs,
})

describe('CnObjectMetadataWidget', () => {
	it('renders @self + top-level fields without throwing', () => {
		const wrapper = mountWidget({ objectData: { id: '42', '@self': { schema: 'lead', uuid: 'u-1' } } })
		expect(wrapper.find('.grid-stub').exists()).toBe(true)
		// @self.uuid + id surface as metadata items.
		expect(Number(wrapper.find('.grid-stub').attributes('data-count'))).toBeGreaterThan(0)
	})

	it('does not throw when objectData is undefined (async-load guard)', () => {
		expect(() => mountWidget({ objectData: undefined })).not.toThrow()
		const wrapper = mountWidget({ objectData: undefined })
		expect(wrapper.find('.grid-stub').exists()).toBe(true)
		expect(wrapper.find('.grid-stub').attributes('data-count')).toBe('0')
	})

	it('does not throw when objectData is null', () => {
		expect(() => mountWidget({ objectData: null })).not.toThrow()
	})
})
