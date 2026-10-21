/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A workspace filter as an input with a load button (`style: "input"`),
 * the board's in-card report form (DqTermijnen "Kwartaal (JJJJ-Qn)" with
 * "Rapport laden", "Jaar" with "Audit laden"): the value is written to the
 * workspace only when the reader loads it, and only when it is valid.
 *
 * @spec openspec/changes/workspace-filter-input/specs/workspace-filter-input/spec.md#requirement-a-workspace-filter-can-be-an-input-loaded-by-a-button
 */

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => p) }))

import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnWorkspaceFilterWidget from '../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'
import { quarterKey } from '../../src/utils/periodOptions.js'

/**
 * Mount the widget on a workspace bag.
 *
 * @param {object} content The content.
 * @param {object} workspace The workspace bag.
 * @return {object} The wrapper.
 */
function mountInput(content, workspace) {
	return mount(CnWorkspaceFilterWidget, {
		props: { content },
		global: { provide: { cnWorkspaceContext: workspace, cnTranslate: (key) => `T(${key})` } },
	})
}

const QUARTER = { style: 'input', inputType: 'quarter', writes: '@workspace.quarter', label: 'Quarter (YYYY-Qn)', submitLabel: 'Load report' }

describe('CnWorkspaceFilterWidget as an input with a load button', () => {
	it('seeds the current quarter into the field and the workspace', () => {
		const workspace = reactive({})
		const w = mountInput(QUARTER, workspace)
		expect(w.find('input').element.value).toBe(quarterKey(new Date()))
		expect(workspace.quarter).toBe(quarterKey(new Date()))
		expect(w.find('label').text()).toContain('T(Quarter (YYYY-Qn))')
		expect(w.find('[data-testid="cn-workspace-filter-submit"]').text()).toBe('T(Load report)')
	})

	it('keeps a value the workspace already holds', () => {
		const workspace = reactive({ quarter: '2026-Q2' })
		const w = mountInput(QUARTER, workspace)
		expect(w.find('input').element.value).toBe('2026-Q2')
		expect(workspace.quarter).toBe('2026-Q2')
	})

	it('writes only when the reader loads', async () => {
		const workspace = reactive({ quarter: '2026-Q2' })
		const w = mountInput(QUARTER, workspace)
		await w.find('input').setValue('2025-Q4')
		expect(workspace.quarter).toBe('2026-Q2')
		await w.find('form').trigger('submit')
		expect(workspace.quarter).toBe('2025-Q4')
		expect(w.emitted('change').at(-1)[0]).toEqual({ key: 'quarter', value: '2025-Q4' })
	})

	it('refuses a value in the wrong form and says so', async () => {
		const workspace = reactive({ quarter: '2026-Q2' })
		const w = mountInput(QUARTER, workspace)
		await w.find('input').setValue('2026-5')
		await w.find('form').trigger('submit')
		expect(workspace.quarter).toBe('2026-Q2')
		expect(w.find('input').attributes('aria-invalid')).toBe('true')
		expect(w.find('[data-testid="cn-workspace-filter-input-error"]').exists()).toBe(true)
	})

	it('reads a year as four digits, seeded with this year', async () => {
		const workspace = reactive({})
		const w = mountInput({ style: 'input', inputType: 'year', writes: 'year', label: 'Year', submitLabel: 'Load audit' }, workspace)
		expect(workspace.year).toBe(String(new Date().getFullYear()))
		await w.find('input').setValue('2025')
		await w.find('form').trigger('submit')
		expect(workspace.year).toBe('2025')
		await w.find('input').setValue('25')
		await w.find('form').trigger('submit')
		expect(workspace.year).toBe('2025')
	})
})
