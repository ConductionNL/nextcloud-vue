/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/a-saved-view-drives-a-widget/tasks.md#task-1.2
 */
import { shallowMount } from '@vue/test-utils'
import CnSavedViewWidget from '../../src/components/CnSavedViewWidget/CnSavedViewWidget.vue'
import CnSavedViewWidgetForm from '../../src/components/CnSavedViewWidgetForm/CnSavedViewWidgetForm.vue'
import { listUserAddableWidgetTypes, listWidgetTypes } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

function view(filters) {
	return {
		id: 7,
		name: 'My cases',
		query: { filters, search: '', sort: [{ key: 'due', order: 'desc' }], registers: ['zaken'], schemas: ['case'] },
	}
}
function flush() {
	return new Promise((resolve) => setTimeout(resolve, 0))
}
function mountWidget(fetchViews, content = { viewId: '7', limit: 5 }) {
	return shallowMount(CnSavedViewWidget, {
		propsData: { content, api: { fetchViews } },
	})
}

describe('saved-view registration', () => {
	it('is listed and user-addable', () => {
		expect(listWidgetTypes()).toContain('saved-view')
		expect(listUserAddableWidgetTypes()).toContain('saved-view')
	})
})

describe('CnSavedViewWidget', () => {
	it('takes register, schema, filter and order from the view, only the limit from its config', async () => {
		const w = mountWidget(async () => [view({ district: 'north' })], { viewId: '7', limit: 5, filter: { district: 'WRONG' } })
		await flush()
		expect(w.vm.listContent).toEqual({
			register: 'zaken',
			schema: 'case',
			filter: { district: 'north' },
			sort: { field: 'due', dir: 'desc' },
			limit: 5,
			columns: [],
		})
	})

	it('follows an edited view on the next load', async () => {
		let current = view({ district: 'north' })
		const w = mountWidget(async () => [current])
		await flush()
		expect(w.vm.listContent.filter).toEqual({ district: 'north' })
		current = view({ district: 'south' })
		await w.vm.load()
		expect(w.vm.listContent.filter).toEqual({ district: 'south' })
	})

	it('renders a refusal when the view is gone', async () => {
		const w = mountWidget(async () => [])
		await flush()
		expect(w.vm.refusal.name).toBe('This saved view is no longer available')
		expect(w.vm.listContent).toBeNull()
	})

	it.each([403, 404])('renders a refusal for a %s', async (status) => {
		const w = mountWidget(async () => {
			throw Object.assign(new Error('x'), { response: { status } })
		})
		await flush()
		expect(w.vm.refusal.name).toBe('This saved view is no longer available')
	})

	it('keeps the empty state (no refusal) for a readable view with no rows', async () => {
		const w = mountWidget(async () => [view({})])
		await flush()
		expect(w.vm.refusal).toBeNull()
		expect(w.vm.listContent).not.toBeNull()
	})
})

describe('CnSavedViewWidgetForm', () => {
	it('shows the empty state, not a select, when the reader has no views', async () => {
		const w = shallowMount(CnSavedViewWidgetForm, { propsData: { api: { fetchViews: async () => [] } } })
		await flush()
		expect(w.findComponent({ name: 'CnWidgetEmptyState' }).exists()).toBe(true)
		expect(w.findComponent({ name: 'NcSelect' }).exists()).toBe(false)
	})

	it('stores only the view id and the limit', async () => {
		const w = shallowMount(CnSavedViewWidgetForm, { propsData: { api: { fetchViews: async () => [view({})] } } })
		await flush()
		expect(w.vm.validate()).toHaveLength(1)
		w.vm.onSelect({ id: '7', label: 'My cases' })
		expect(w.emitted('update:content')[0][0]).toEqual({ viewId: '7', limit: 10 })
		expect(w.vm.validate()).toEqual([])
	})
})
