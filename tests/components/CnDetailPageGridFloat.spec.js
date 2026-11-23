/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDetailPage: `gridFloat` (manifest `config.gridFloat`) reaches the body
 * grid, so a detail page can pack its widgets upward and a size-to-content
 * widget ends at its content (DqHandhaving). Without it the grid floats.
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
	CnDashboardGrid: { props: ['float'], template: '<div class="grid-stub" />' },
	CnDetailWidgetHost: { props: ['widget'], template: '<div />' },
}

function floatOf(props = {}) {
	const wrapper = mount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: store,
			widgets: [{ id: 'w-a', type: 'text', title: 'A' }],
			layout: [{ id: '1', widgetId: 'w-a', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, sizeToContent: true }],
			...props,
		},
		global: { stubs },
	})
	return wrapper.findComponent({ name: 'CnDashboardGrid' }).props('float')
}

describe('CnDetailPage body grid float', () => {
	it('floats by default', () => {
		expect(floatOf()).toBe(true)
	})

	it('packs upward when the page asks for it', () => {
		expect(floatOf({ gridFloat: false })).toBe(false)
	})
})
