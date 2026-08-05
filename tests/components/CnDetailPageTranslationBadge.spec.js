/**
 * Tests for CnDetailPage's translation-aware header surface
 * (cn-detail-translation-aware-surfacing REQ-CDTAS-3).
 *
 * The page renders a `CnTranslatedBadge` between the title and
 * description when the resolved object's
 * `_translationMeta.translatedFrom` is set. Consumers can override
 * via the `#translation-badge` scoped slot.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'

import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

/**
 * Build a minimal fake store cache that mimics the Pinia object-store
 * shape the page reads via `effectiveObjectStore.objects[type][id]`.
 */
function makeStore({ type, id, obj }) {
	return {
		objects: { [type]: { [id]: obj } },
		schemas: {},
		registers: {},
		loading: { [type]: false },
		errors: { [type]: null },
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => obj),
		fetchSchema: jest.fn(async () => null),
		fetchRegister: jest.fn(async () => null),
	}
}

describe('CnDetailPage — translation badge surface', () => {
	it('renders the badge in the header when the resolved object carries translatedFrom', () => {
		const translated = {
			id: 'obj-1',
			_translationMeta: { translatedFrom: 'nl', translatedAt: '2026-06-01T10:00:00Z' },
		}
		const store = makeStore({ type: 'case', id: 'obj-1', obj: translated })
		const wrapper = mount(CnDetailPage, {
			propsData: {
				title: 'Case 1',
				objectType: 'case',
				objectId: 'obj-1',
				objectStore: store,
				subscribe: false,
			},
		})

		expect(wrapper.find('.cn-detail-page__header-text').exists()).toBe(true)
		expect(wrapper.find('.cn-translated-badge').exists()).toBe(true)
		wrapper.destroy()
	})

	it('renders no badge when the resolved object is the source row', () => {
		const source = {
			id: 'obj-2',
			_translationMeta: { translatedFrom: null, translatedAt: null },
		}
		const store = makeStore({ type: 'case', id: 'obj-2', obj: source })
		const wrapper = mount(CnDetailPage, {
			propsData: {
				title: 'Case 2',
				objectType: 'case',
				objectId: 'obj-2',
				objectStore: store,
				subscribe: false,
			},
		})

		expect(wrapper.find('.cn-translated-badge').exists()).toBe(false)
		wrapper.destroy()
	})

	it('renders no badge when objectType is unset (resolvedObject is null)', () => {
		const wrapper = mount(CnDetailPage, {
			propsData: {
				title: 'Bare',
				// No objectType / objectId.
			},
		})
		expect(wrapper.find('.cn-translated-badge').exists()).toBe(false)
		wrapper.destroy()
	})

	it('lets a consumer #translation-badge slot override the default', () => {
		const translated = {
			id: 'obj-3',
			_translationMeta: { translatedFrom: 'nl' },
		}
		const store = makeStore({ type: 'case', id: 'obj-3', obj: translated })
		const wrapper = mount(CnDetailPage, {
			propsData: {
				title: 'Case 3',
				objectType: 'case',
				objectId: 'obj-3',
				objectStore: store,
				subscribe: false,
			},
			scopedSlots: {
				'translation-badge': (props) => h('div', { class: 'custom-badge' }, props.object?.id || ''),
			},
		})

		// Custom slot wins; default badge MUST NOT render.
		expect(wrapper.find('.custom-badge').exists()).toBe(true)
		expect(wrapper.find('.custom-badge').text()).toBe('obj-3')
		expect(wrapper.find('.cn-translated-badge').exists()).toBe(false)
		wrapper.destroy()
	})
})
