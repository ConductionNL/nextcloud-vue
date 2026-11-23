/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/screens-empty-state-parity/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnCardGrid from '../../src/components/CnCardGrid/CnCardGrid.vue'
import CnEmptyContent from '../../src/components/CnEmptyContent/CnEmptyContent.vue'
import CnObjectList from '../../src/components/CnObjectList/CnObjectList.vue'

const stubs = { NcEmptyContent: { props: ['name', 'description'], template: '<div class="nc-empty">{{ name }}<slot name="icon" /></div>' } }

describe('CnEmptyContent', () => {
	it('keeps NcEmptyContent in the Nextcloud look', () => {
		const w = mount(CnEmptyContent, { propsData: { name: 'Nothing' }, stubs })
		expect(w.find('.nc-empty').exists()).toBe(true)
		expect(w.find('.cn-widget-empty-state').exists()).toBe(false)
	})

	it('draws the card-size CnWidgetEmptyState in the board look', () => {
		const w = mount(CnEmptyContent, { propsData: { name: 'Nothing' }, provide: { cnLook: 'board' }, stubs })
		expect(w.find('.cn-widget-empty-state--card').exists()).toBe(true)
		expect(w.find('.nc-empty').exists()).toBe(false)
	})

	it('uses the error colour for the error variant', () => {
		const w = mount(CnEmptyContent, { propsData: { name: 'Oops', error: true }, provide: { cnLook: 'board' }, stubs })
		expect(w.find('.cn-widget-empty-state__icon').attributes('style')).toContain('--color-error')
	})

	it('renders the icon slot', () => {
		const w = mount(CnEmptyContent, {
			propsData: { name: 'Nothing' },
			provide: { cnLook: 'board' },
			stubs,
			slots: { icon: '<i class="my-icon" />' },
		})
		expect(w.find('.my-icon').exists()).toBe(true)
	})
})

describe('library empty states follow the look', () => {
	it('CnCardGrid with no objects draws the board block, and its empty slot still wins', () => {
		const board = mount(CnCardGrid, { propsData: { objects: [] }, provide: { cnLook: 'board' }, stubs })
		expect(board.find('.cn-widget-empty-state--card').exists()).toBe(true)
		const slotted = mount(CnCardGrid, {
			propsData: { objects: [] },
			provide: { cnLook: 'board' },
			stubs,
			slots: { empty: '<p class="mine">mine</p>' },
		})
		expect(slotted.find('.mine').exists()).toBe(true)
		expect(slotted.find('.cn-widget-empty-state').exists()).toBe(false)
	})

	it('CnObjectList keeps NcEmptyContent in the Nextcloud look', () => {
		const w = mount(CnObjectList, { propsData: { objects: [] }, stubs })
		expect(w.find('.cn-widget-empty-state').exists()).toBe(false)
	})
})
