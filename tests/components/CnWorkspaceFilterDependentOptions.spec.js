/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A workspace-filter whose options source reads another workspace key
 * (`@workspace.kind`) reloads its options when that key changes, and drops a
 * pick the new options no longer hold (a kind switch, then a picker of that
 * kind).
 *
 * @spec openspec/changes/workspace-filter-dependent-options/specs/workspace-filter/spec.md#requirement-a-filter-reloads-its-options-when-a-workspace-key-it-reads-changes
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))
jest.mock('../../src/composables/useEndpointSource.js', () => ({
	__esModule: true,
	fetchEndpointSource: jest.fn(),
}))

import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnWorkspaceFilterWidget from '../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'
import { fetchEndpointSource } from '../../src/composables/useEndpointSource.js'

/**
 * Let the reads settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const OPTIONS = {
	cohort: [{ id: 'c1', label: '1A' }, { id: 'c2', label: '1B' }],
	teacher: [{ id: 'jan', label: 'Jan' }],
}

const CONTENT = {
	label: 'Group, teacher or room',
	style: 'select',
	writes: '@workspace.id',
	endpointSource: { url: '/apps/school/api/timetable/of/options', params: { kind: '@workspace.kind' }, responsePath: 'options' },
}

describe('CnWorkspaceFilterWidget dependent options', () => {
	beforeEach(() => {
		fetchEndpointSource.mockReset()
		fetchEndpointSource.mockImplementation((source, ctx) => Promise.resolve(OPTIONS[ctx.workspace.kind] || []))
	})

	it('reloads its options and drops a stale pick when the key it reads changes', async () => {
		const workspace = ref({ kind: 'cohort' })
		mount(CnWorkspaceFilterWidget, { props: { content: CONTENT }, global: { provide: { cnWorkspaceContext: workspace } } })
		await flush()
		expect(fetchEndpointSource).toHaveBeenCalledTimes(1)
		expect(workspace.value.id).toBe('c1')

		workspace.value = { ...workspace.value, kind: 'teacher' }
		await nextTick()
		await flush()
		expect(fetchEndpointSource).toHaveBeenCalledTimes(2)
		expect(fetchEndpointSource.mock.calls[1][1].workspace.kind).toBe('teacher')
		expect(workspace.value.id).toBe('jan')
	})

	it('does not reload when only its own key changes', async () => {
		const workspace = ref({ kind: 'cohort' })
		mount(CnWorkspaceFilterWidget, { props: { content: CONTENT }, global: { provide: { cnWorkspaceContext: workspace } } })
		await flush()
		workspace.value = { ...workspace.value, id: 'c2' }
		await nextTick()
		await flush()
		expect(fetchEndpointSource).toHaveBeenCalledTimes(1)
		expect(workspace.value.id).toBe('c2')
	})
})
