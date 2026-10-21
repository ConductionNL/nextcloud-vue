/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget in the body can show its own cards in the page's side column, in
 * place of the generic ones, while something is selected in it: DqDocumentenBeheer
 * draws "Wie mag dit zien: <file>" and "Controlegetal" there while files are
 * ticked. The page offers the slot and the claim as `cnDetailSideColumn`.
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const store = {
	objects: { 'reg-case': { 'id-1': { name: 'Case' } } },
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
}

const stubs = {
	CnDashboardGrid: { template: '<div />' },
	CnDetailWidgetHost: { props: ['widget'], template: '<div class="host">{{ widget.title }}</div>' },
}

function mountPage(props = {}) {
	return mount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: store,
			widgets: [{ id: 'w-deadline', type: 'stat', title: 'Deadline' }, { id: 'w-requester', type: 'text', title: 'Requester' }],
			sideColumn: ['w-deadline', 'w-requester'],
			...props,
		},
		global: { stubs },
	})
}

const sideIds = (w) => w.findAll('.cn-detail-page__side-item').map((el) => el.attributes('data-testid').replace('cn-detail-page-side-', ''))
const sideOf = (w) => w.vm.$.provides.cnDetailSideColumn

describe('CnDetailPage: a body widget takes the side column', () => {
	it('offers a slot at the top of the side column and says the column is there', () => {
		const w = mountPage()
		const side = sideOf(w)
		expect(side.available).toBe(true)
		const slot = w.find(`[data-testid="cn-detail-page-side"] ${side.target}`)
		expect(slot.exists()).toBe(true)
		expect(slot.element.parentElement.firstElementChild).toBe(slot.element)
	})

	it('puts the generic cards aside while a widget claims, and back when it lets go', async () => {
		const w = mountPage()
		expect(sideIds(w)).toEqual(['w-deadline', 'w-requester'])
		sideOf(w).claim('files-1', true)
		await w.vm.$nextTick()
		expect(sideIds(w)).toEqual([])
		sideOf(w).claim('files-1', false)
		await w.vm.$nextTick()
		expect(sideIds(w)).toEqual(['w-deadline', 'w-requester'])
	})

	it('keeps them aside until every claimer lets go', async () => {
		const w = mountPage()
		sideOf(w).claim('a', true)
		sideOf(w).claim('b', true)
		sideOf(w).claim('a', false)
		await w.vm.$nextTick()
		expect(sideIds(w)).toEqual([])
	})

	it('gives every page its own slot', () => {
		expect(sideOf(mountPage()).target).not.toBe(sideOf(mountPage()).target)
	})

	it('says there is no column on a page without one', () => {
		expect(sideOf(mountPage({ sideColumn: [] })).available).toBe(false)
	})
})
