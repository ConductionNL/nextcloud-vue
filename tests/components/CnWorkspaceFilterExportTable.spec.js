/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A workspace filter input can carry the export of the table it loads
 * (`exportTable: { exportId, label }`): DqTermijnen draws "CSV exporteren"
 * beside "Rapport laden", above the table. The button asks the table with
 * that `exportId` for its rows as CSV (`cn:widget:export`), the same request
 * a page header Download makes.
 *
 * @spec openspec/changes/workspace-filter-export-table/specs/workspace-filter-export-table/spec.md#requirement-a-workspace-filter-input-can-export-the-table-it-loads
 */

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => p) }))
jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

import { emit } from '@nextcloud/event-bus'
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import { reactive } from 'vue'
import CnWorkspaceFilterWidget from '../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'

const QUARTER = { style: 'input', inputType: 'quarter', writes: '@workspace.quarter', label: 'Quarter (YYYY-Qn)', submitLabel: 'Load report' }

/**
 * Mount the widget on a workspace bag.
 *
 * @param {object} content The content.
 * @return {object} The wrapper.
 */
function mountInput(content) {
	return mount(CnWorkspaceFilterWidget, {
		props: { content },
		global: { provide: { cnWorkspaceContext: reactive({}), cnTranslate: (key) => `T(${key})` } },
	})
}

describe('CnWorkspaceFilterWidget input with a table export', () => {
	it('draws no export button without exportTable', () => {
		const w = mountInput(QUARTER)

		expect(w.find('[data-testid="cn-workspace-filter-export"]').exists()).toBe(false)
	})

	it('draws the export beside the load button and asks the named table for its CSV', async () => {
		const w = mountInput({ ...QUARTER, exportTable: { exportId: 'deadline-report', label: 'Export CSV' } })

		const button = w.find('[data-testid="cn-workspace-filter-export"]')
		expect(button.exists()).toBe(true)
		expect(button.attributes('type')).toBe('button')
		expect(button.text()).toBe('T(Export CSV)')
		expect(w.find('form').element.contains(button.element)).toBe(true)

		await button.trigger('click')

		expect(emit).toHaveBeenCalledWith('cn:widget:export', { exportId: 'deadline-report' })
	})

	it('falls back to the library label', () => {
		const w = mountInput({ ...QUARTER, exportTable: { exportId: 'deadline-report' } })

		expect(w.find('[data-testid="cn-workspace-filter-export"]').text()).toBe('Export CSV')
	})
})

describe('look-board.css: workspace filter export', () => {
	it('draws the export as the 40px control, 14px in', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8')
		expect(css).toMatch(/\.cn-look-board \.cn-workspace-filter-widget__form:not\(\.cn-look-nextcloud \*\) \.button-vue\.cn-workspace-filter-widget__export \{\s*--button-size: var\(--cn-board-control-height\);\s*--button-padding: 14px;\s*\}/)
		expect(css).toMatch(/\.cn-look-board \.cn-workspace-filter-widget__form:not\(\.cn-look-nextcloud \*\) \.button-vue\.cn-workspace-filter-widget__export \.button-vue__text \{\s*padding-inline: 0;\s*\}/)
	})
})
