/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectListWidget's error + empty-state copy (ADR-062):
 * a failed fetch shows one quiet line WITHOUT the raw axios status text, and
 * the master-detail prompt copy is not the default on a detail-page context.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

function mountWidget(propsData = {}, provide = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData,
		provide,
		stubs: { CnDataTable: true, CnFormDialog: true },
		mocks: { t: (_app, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

describe('CnObjectListWidget — error + empty copy', () => {
	it('renders a status-code-free error line, not the raw axios message', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 's' } })
		w.vm.error = 'Request failed with status code 404'
		w.vm.rows = []
		w.vm.loading = false
		await w.vm.$nextTick()
		const errEl = w.find('.cn-object-list-widget__error')
		expect(errEl.exists()).toBe(true)
		expect(errEl.text()).not.toContain('404')
		expect(errEl.text()).not.toContain('status code')
		expect(errEl.text()).toBe('Could not load these records')
		// The empty state must NOT also render alongside the error.
		expect(w.find('.cn-object-list-widget__empty').exists()).toBe(false)
	})

	it('defaults to "Nothing here yet" on a detail-page object context', () => {
		const w = mountWidget(
			{ content: { register: 'r', schema: 's', filter: { case: '@workspace.selected' } } },
			{ cnObjectContext: { objectId: 'id-1', object: {} } },
		)
		expect(w.vm.promptText).toBe('Nothing here yet')
	})

	it('keeps the master-detail prompt on a dashboard (no object context)', () => {
		const w = mountWidget(
			{ content: { register: 'r', schema: 's', filter: { case: '@workspace.selected' } } },
		)
		expect(w.vm.promptText).toBe('Select an item to see related records')
	})
})
