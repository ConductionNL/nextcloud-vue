/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a detail page stacks its body cards 20px apart, as every
 * board draws them: the grid keeps 12px above each card and 8px under it.
 * Without the look the grid keeps its 12px on every side.
 *
 * @spec openspec/changes/board-detail-cards-20-apart/specs/detail-page-board-look/spec.md#requirement-board-detail-cards-stand-20px-apart
 */
import { mount } from '@vue/test-utils'
import { GridStack } from 'gridstack'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'
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
	CnDashboardGrid: { props: ['marginBottom'], template: '<div class="grid-stub" />' },
	CnDetailWidgetHost: { props: ['widget'], template: '<div />' },
}

function marginBottomOf(look) {
	const wrapper = mount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: store,
			widgets: [{ id: 'w-a', type: 'text', title: 'A' }],
			layout: [{ id: '1', widgetId: 'w-a', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, sizeToContent: true }],
		},
		global: { stubs, provide: look ? { cnLook: look } : {} },
	})
	return wrapper.findComponent({ name: 'CnDashboardGrid' }).props('marginBottom')
}

describe('CnDetailPage: board detail cards 20px apart', () => {
	it('asks the body grid for 8px under each card in the board look', () => {
		expect(marginBottomOf('board')).toBe(8)
	})

	it('leaves the grid margins alone without the look', () => {
		expect(marginBottomOf(null)).toBeNull()
	})
})

describe('CnDashboardGrid: marginBottom', () => {
	const item = { id: 'a', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }

	it('builds the grid with that bottom margin', () => {
		mount(CnDashboardGrid, { propsData: { layout: [item], marginBottom: 8 } })
		const opts = GridStack.init.mock.calls.at(-1)[0]
		expect(opts.margin).toBe(12)
		expect(opts.marginBottom).toBe(8)
	})

	it('keeps one margin on every side without it', () => {
		mount(CnDashboardGrid, { propsData: { layout: [item] } })
		expect('marginBottom' in GridStack.init.mock.calls.at(-1)[0]).toBe(false)
	})
})
