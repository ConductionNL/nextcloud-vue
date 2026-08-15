/**
 * Tests for CnTranslatedBadge — cn-detail-translation-aware-surfacing
 * REQ-CDTAS-1.
 *
 * The badge surfaces OR's `_translationMeta.translatedFrom` block on
 * detail surfaces. It auto-hides on missing meta, null translatedFrom,
 * or no object at all — so it composes safely with default-rendered
 * mounts in `CnDetailGrid` and `CnDetailPage`.
 */

import { mount } from '@vue/test-utils'

import CnTranslatedBadge from '../CnTranslatedBadge.vue'

describe('CnTranslatedBadge', () => {
	it('renders nothing when object is null', () => {
		const wrapper = mount(CnTranslatedBadge, {
			propsData: { object: null },
		})
		expect(wrapper.find('.cn-translated-badge').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-translated-badge"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('renders nothing when object has no _translationMeta', () => {
		const wrapper = mount(CnTranslatedBadge, {
			propsData: { object: { id: 'x', title: 'Y' } },
		})
		expect(wrapper.find('.cn-translated-badge').exists()).toBe(false)
		wrapper.unmount()
	})

	it('renders nothing when _translationMeta.translatedFrom is null', () => {
		const wrapper = mount(CnTranslatedBadge, {
			propsData: {
				object: {
					id: 'x',
					_translationMeta: { translatedFrom: null, translatedAt: null },
				},
			},
		})
		expect(wrapper.find('.cn-translated-badge').exists()).toBe(false)
		wrapper.unmount()
	})

	it('renders nothing when _translationMeta.translatedFrom is empty string', () => {
		const wrapper = mount(CnTranslatedBadge, {
			propsData: {
				object: {
					_translationMeta: { translatedFrom: '', translatedAt: null },
				},
			},
		})
		expect(wrapper.find('.cn-translated-badge').exists()).toBe(false)
		wrapper.unmount()
	})

	it('renders the badge when _translationMeta.translatedFrom is set', () => {
		const wrapper = mount(CnTranslatedBadge, {
			propsData: {
				object: {
					_translationMeta: {
						translatedFrom: 'nl',
						translatedAt: '2026-06-01T10:00:00Z',
					},
				},
			},
		})
		const badge = wrapper.find('.cn-translated-badge')
		expect(badge.exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-translated-badge"]').exists()).toBe(true)
		// The rendered label MUST contain a token for the source language.
		// In jsdom Intl.DisplayNames may return either the raw code or a
		// localised name — both are acceptable per spec, but at minimum
		// the BCP-47 string itself surfaces via the fallback chain.
		const text = badge.text()
		const hasSourceToken = text.includes('nl') || /dutch|nederlands|niederländisch/i.test(text)
		expect(hasSourceToken).toBe(true)
		wrapper.unmount()
	})

	it('honours `localeNameFormatter` for the source-language label', () => {
		const wrapper = mount(CnTranslatedBadge, {
			propsData: {
				object: {
					_translationMeta: { translatedFrom: 'nl', translatedAt: null },
				},
				localeNameFormatter: (bcp47) => (bcp47 === 'nl' ? 'Dutch' : bcp47),
			},
		})
		const badge = wrapper.find('.cn-translated-badge')
		expect(badge.exists()).toBe(true)
		expect(badge.text()).toMatch(/Dutch/)
		wrapper.unmount()
	})

	it('exposes translatedAt via the title attribute', () => {
		const wrapper = mount(CnTranslatedBadge, {
			propsData: {
				object: {
					_translationMeta: {
						translatedFrom: 'nl',
						translatedAt: '2026-06-01T10:00:00Z',
					},
				},
			},
		})
		const badge = wrapper.find('.cn-translated-badge')
		expect(badge.exists()).toBe(true)
		const title = badge.attributes('title') || ''
		// Either the locale-formatted date OR the raw ISO string is
		// acceptable per spec; either includes "2026".
		expect(title).toMatch(/2026/)
		wrapper.unmount()
	})

	it('falls back to raw BCP-47 when localeNameFormatter throws', () => {
		const wrapper = mount(CnTranslatedBadge, {
			propsData: {
				object: {
					_translationMeta: { translatedFrom: 'nl', translatedAt: null },
				},
				localeNameFormatter: () => { throw new Error('boom') },
			},
		})
		const badge = wrapper.find('.cn-translated-badge')
		expect(badge.exists()).toBe(true)
		// Should still render, falling through to Intl or raw.
		const text = badge.text()
		const hasSomeLabel = text.includes('nl') || /dutch|nederlands/i.test(text)
		expect(hasSomeLabel).toBe(true)
		wrapper.unmount()
	})
})
