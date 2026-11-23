/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tab's `visibleWhen` reads the records the detail page's
 * `visibilityContext` names (`@context.caseType`), the same as a grid widget does.
 *
 * @spec openspec/changes/detail-widgets-visible-when/specs/detail-widgets-visible-when/spec.md#requirement-a-detail-page-can-load-records-a-condition-names
 */
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-data', type: 'object-list', title: 'Data', content: {} },
	{ id: 'w-review', type: 'object-list', title: 'Review', content: {} },
]

const TABS = [
	{ widgetId: 'w-data' },
	{ widgetId: 'w-review', visibleWhen: { field: '@context.caseType.documentReview.enabled', op: 'eq', value: true } },
]

function mountWidget(holder) {
	return mount(CnTabsWidget, {
		props: { content: { tabs: TABS }, availableWidgets: WIDGETS, objectId: 'case-1', objectData: { id: 'case-1' }, register: 'dossiq', schema: 'case' },
		global: {
			stubs: { CnDetailWidgetHost: true },
			mocks: { $route: { hash: '' }, $router: { replace: jest.fn() } },
			provide: holder === undefined ? {} : { cnDetailVisibilityRows: holder },
		},
	})
}

const labels = (w) => w.findAll('[role="tab"]').map((t) => t.text())

describe('CnTabsWidget: a tab condition reads the page\'s named records', () => {
	it('hides the tab for a case type that does not enable it, shows it for one that does', async () => {
		const state = reactive({ rows: { caseType: { documentReview: { enabled: false } } } })
		const holder = {
			get value() {
				return state.rows
			},
		}
		const w = mountWidget(holder)
		await flushPromises()
		expect(labels(w).join('|')).not.toContain('Review')
		state.rows = { caseType: { documentReview: { enabled: true } } }
		await flushPromises()
		expect(labels(w).join('|')).toContain('Review')
		w.unmount()
	})

	it('reads the record alone on a page that names no records', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(labels(w)).toEqual(['Data'])
		w.unmount()
	})
})
