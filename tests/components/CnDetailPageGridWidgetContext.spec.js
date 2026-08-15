// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * Tests that CnDetailPage's grid-mode catalog-widget fallback forwards the
 * current object's context (objectId / register / schema / objectData /
 * objectType / store) to the rendered renderer — the same shape CnWidgetGrid
 * merges on the v2 widgets[] path. Without this, object-aware catalog widgets
 * (e.g. the `files` widget binding to the object's folder) never receive the
 * object identity and fall back to their placement/dashboard behaviour.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { registerDashboardWidget } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

const Probe = {
	name: 'ProbeWidget',
	props: ['objectId', 'register', 'schema', 'objectData', 'objectType', 'content'],
	render() {
		return h('div', { class: 'probe' })
	},
}

beforeAll(() => {
	registerDashboardWidget('probe', {
		renderer: Probe,
		form: null,
		defaultContent: {},
		displayName: 'Probe',
		icon: 'Cog',
	})
})

function storeWithObject() {
	return {
		objects: { 'r-s': { 'o-1': { id: 'o-1', name: 'Rex' } } },
		schemas: { 'r-s': { properties: { name: { type: 'string' } } } },
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

describe('CnDetailPage — grid catalog widget object context', () => {
	it('forwards objectId/register/schema/objectData/objectType/store to a catalog widget', async () => {
		const wrapper = mount(CnDetailPage, {
			propsData: {
				register: 'r',
				schema: 's',
				objectId: 'o-1',
				objectStore: storeWithObject(),
				layout: [{ id: 1, widgetId: 'p1', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }],
				widgets: [{ id: 'p1', widgetId: 'p1', type: 'probe', title: 'P', content: { foo: 'bar' } }],
			},
		})
		await wrapper.vm.$nextTick()

		const probe = wrapper.findComponent(Probe)
		expect(probe.exists()).toBe(true)
		expect(probe.props('objectId')).toBe('o-1')
		expect(probe.props('register')).toBe('r')
		expect(probe.props('schema')).toBe('s')
		expect(probe.props('objectType')).toBe('r-s')
		expect(probe.props('objectData')).toEqual({ id: 'o-1', name: 'Rex' })
		// The widget's own content is still spread in (explicit config wins).
		expect(probe.props('content')).toEqual({ foo: 'bar' })
	})
})
