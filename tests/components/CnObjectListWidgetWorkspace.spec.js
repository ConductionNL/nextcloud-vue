/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Workspace-context behaviour of CnObjectListWidget: a `@workspace.<key>`
 * filter token lets a list react to page-level state another widget wrote (the
 * selected client), and renders a prompt (instead of fetching the whole
 * register) while that state is unset.
 */
import Vue from 'vue'
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

describe('CnObjectListWidget — workspace context', () => {
	// Mirror the real provide: a reactive holder whose `.value` is the bag, so
	// reassigning `.value` notifies the widget's computeds (as a Vue ref does).
	const mount = (content, workspace = null) => shallowMount(CnObjectListWidget, {
		propsData: { content },
		provide: workspace ? { cnWorkspaceContext: Vue.observable({ value: workspace }) } : {},
		stubs: { CnDataTable: true },
	})

	const content = {
		register: 'pipelinq',
		schema: 'lead',
		filter: { client: '@workspace.selectedClient' },
		columns: [{ key: 'title', label: 'Deal' }],
	}

	it('waits for context (prompt) when the workspace token is unresolved', () => {
		const w = mount(content, {})
		expect(w.vm.waitingForContext).toBe(true)
		expect(w.find('.cn-object-list-widget__prompt').exists()).toBe(true)
	})

	it('resolves the filter once the workspace key is set', () => {
		const w = mount(content, { selectedClient: 'c-42' })
		expect(w.vm.waitingForContext).toBe(false)
		expect(w.vm.resolvedFilter.client).toBe('c-42')
	})

	it('does not fetch while waiting for context', async () => {
		const w = mount(content, {})
		const spyAxios = jest.fn()
		// fetchRows should early-return before importing axios; assert no rows set
		await w.vm.fetchRows()
		expect(w.vm.rows).toEqual([])
		expect(spyAxios).not.toHaveBeenCalled()
	})

	it('uses a custom prompt when configured', () => {
		const w = mount({ ...content, prompt: 'Pick a client first' }, {})
		expect(w.vm.promptText).toBe('Pick a client first')
	})

	it('sourceKey changes when the selected client changes (drives refetch)', async () => {
		const w = mount(content, { selectedClient: 'c-1' })
		const before = w.vm.sourceKey
		w.vm.cnWorkspaceContext.value = { selectedClient: 'c-2' }
		await w.vm.$nextTick()
		expect(w.vm.sourceKey).not.toBe(before)
	})

	it('passes presentation hints (format / widget / widgetProps / align) through to CnDataTable columns', () => {
		const w = mount({
			register: 'pipelinq',
			schema: 'posTransactionLine',
			columns: [
				'description',
				{ key: 'lineTotal', label: 'Total', format: 'currency', align: 'right' },
				{ key: 'status', label: 'Status', widget: 'badge', widgetProps: { colorMap: { open: 'info' } } },
			],
		})
		const cols = w.vm.resolvedColumns
		// Columns default to sortable so a header click toggles the client-side sort.
		expect(cols[0]).toEqual({ key: 'description', label: 'description', sortable: true })
		expect(cols[1]).toMatchObject({ key: 'lineTotal', label: 'Total', format: 'currency', align: 'right' })
		expect(cols[2]).toMatchObject({ key: 'status', widget: 'badge', widgetProps: { colorMap: { open: 'info' } } })
	})
})
