/**
 * Tests for CnDetailGrid's translation-aware surfacing
 * (cn-detail-translation-aware-surfacing REQ-CDTAS-2).
 *
 * Wires the bound object's `_translationMeta` to the auto-rendered
 * `CnTranslatedBadge` in the grid's header block.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'

import CnDetailGrid from '../../src/components/CnDetailGrid/CnDetailGrid.vue'

describe('CnDetailGrid — translation-aware surfacing', () => {
	it('renders the badge when object._translationMeta.translatedFrom is set', () => {
		const wrapper = mount(CnDetailGrid, {
			propsData: {
				items: [{ label: 'ID', value: '42' }],
				object: {
					id: '42',
					_translationMeta: {
						translatedFrom: 'nl',
						translatedAt: '2026-06-01T10:00:00Z',
					},
				},
			},
		})

		expect(wrapper.find('.cn-detail-grid__translation-header').exists()).toBe(true)
		expect(wrapper.find('.cn-translated-badge').exists()).toBe(true)
		wrapper.destroy()
	})

	it('renders the header block but no visible badge when translatedFrom is null', () => {
		const wrapper = mount(CnDetailGrid, {
			propsData: {
				items: [{ label: 'ID', value: '42' }],
				object: {
					id: '42',
					_translationMeta: { translatedFrom: null, translatedAt: null },
				},
			},
		})

		// The header block stays in the DOM (object prop is non-null)
		// but the badge's own v-if hides the chip.
		expect(wrapper.find('.cn-translated-badge').exists()).toBe(false)
		wrapper.destroy()
	})

	it('omits the header block entirely when no object prop is passed', () => {
		const wrapper = mount(CnDetailGrid, {
			propsData: {
				items: [{ label: 'ID', value: '42' }],
			},
		})

		expect(wrapper.find('.cn-detail-grid__translation-header').exists()).toBe(false)
		expect(wrapper.find('.cn-translated-badge').exists()).toBe(false)
		wrapper.destroy()
	})

	it('lets a consumer `#header` slot override the default header block', () => {
		const wrapper = mount(CnDetailGrid, {
			propsData: {
				items: [{ label: 'ID', value: '42' }],
				object: {
					_translationMeta: { translatedFrom: 'nl' },
				},
			},
			scopedSlots: {
				header: () => h('div', { class: 'custom-header' }, 'CUSTOM'),
			},
		})

		// Default block MUST NOT render when a #header slot is present
		expect(wrapper.find('.cn-detail-grid__translation-header').exists()).toBe(false)
		expect(wrapper.find('.custom-header').exists()).toBe(true)
		wrapper.destroy()
	})
})
