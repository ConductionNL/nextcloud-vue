/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectDataWidget's collapsed field set: by default it keeps the
 * whole rows that fit its cell, `collapsedFields` pins a count, and
 * "Show all N fields" renders the rest.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const SCHEMA = { properties: Object.fromEntries(KEYS.map((k) => [k, { type: 'string' }])) }
const DATA = Object.fromEntries(KEYS.map((k, i) => [k, String(i)]))

function mountWidget(props = {}) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema: SCHEMA, objectData: DATA, editable: false, ...props },
		stubs: {
			CnWidgetWrapper: { template: '<div><div class="cn-widget-wrapper__content"><slot /></div></div>' },
			CnFormDialog: true,
			CnObjectMetadataModal: true,
		},
		mocks: { t: (_app, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

const cellCount = (w) => w.findAll('.cn-object-data-widget__cell').length

/**
 * Lay the widget out as a two-column grid of 50px rows in a cell of the given
 * height, so fitFields has real numbers to work with.
 *
 * @param {object} w The mounted wrapper.
 * @param {number} cellHeight The content node's height in px.
 */
function layOut(w, cellHeight) {
	const content = w.find('.cn-widget-wrapper__content').element
	const rows = Math.ceil(KEYS.length / 2)
	Object.defineProperty(content, 'clientHeight', { configurable: true, value: cellHeight })
	Object.defineProperty(content, 'scrollHeight', { configurable: true, value: rows * 50 })
	content.getBoundingClientRect = () => ({ top: 0, bottom: cellHeight })
	const proto = window.HTMLElement.prototype
	const original = proto.getBoundingClientRect
	proto.getBoundingClientRect = function() {
		if (!this.classList.contains('cn-object-data-widget__cell')) {
			return original.call(this)
		}
		const index = Array.from(this.parentNode.children).indexOf(this)
		const top = Math.floor(index / 2) * 50
		return { top, bottom: top + 50 }
	}
	return () => { proto.getBoundingClientRect = original }
}

describe('CnObjectDataWidget — collapsed field set', () => {
	it('shows every field without a toggle when the cell has room', async () => {
		const w = mountWidget({ columns: 2 })
		const restore = layOut(w, 400)
		await w.vm.fitFields()
		restore()
		expect(cellCount(w)).toBe(8)
		expect(w.find('.cn-object-data-widget__toggle').exists()).toBe(false)
	})

	it('keeps the whole rows that fit an overflowing cell', async () => {
		// 150px minus the toggle's 44px leaves two 50px rows.
		const w = mountWidget({ columns: 2 })
		const restore = layOut(w, 150)
		await w.vm.fitFields()
		restore()
		await w.vm.$nextTick()
		expect(cellCount(w)).toBe(4)
		expect(w.find('.cn-object-data-widget__toggle').text()).toBe('Show all 8 fields')
	})

	it('shows every field once expanded', async () => {
		const w = mountWidget({ columns: 2 })
		const restore = layOut(w, 150)
		await w.vm.fitFields()
		restore()
		w.vm.toggleExpanded()
		await w.vm.$nextTick()
		expect(cellCount(w)).toBe(8)
		expect(w.find('.cn-object-data-widget__toggle').text()).toBe('Show less')
	})

	it('shows the pinned count when collapsedFields is set', async () => {
		const w = mountWidget({ columns: 2, collapsedFields: 2 })
		expect(cellCount(w)).toBe(2)
		w.vm.toggleExpanded()
		await w.vm.$nextTick()
		expect(cellCount(w)).toBe(8)
		w.vm.toggleExpanded()
		await w.vm.$nextTick()
		expect(cellCount(w)).toBe(2)
	})

	it('renders no toggle when every field fits the pinned count', () => {
		const w = mountWidget({ collapsedFields: 8 })
		expect(cellCount(w)).toBe(8)
		expect(w.find('.cn-object-data-widget__toggle').exists()).toBe(false)
	})
})
