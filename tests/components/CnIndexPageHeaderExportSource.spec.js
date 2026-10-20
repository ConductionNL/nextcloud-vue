/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header Export on a page whose rows are not OpenRegister objects (a named
 * or endpoint source) used to open the export dialog and emit `mass-export`
 * to nobody. It is drawn only when it can export: a `run` naming one of the
 * page's header actions, a `@mass-export` listener (DqTeamwachtrij), or,
 * without either, a CSV of the rows the source holds (DqTaken, DqPostvak).
 *
 * @spec openspec/changes/index-header-export-source/specs/index-page/spec.md#requirement-a-header-export-is-drawn-only-when-it-can-export
 * @spec openspec/changes/index-named-source-export/specs/index-named-source-export/spec.md#requirement-a-named-source-list-downloads-its-rows
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => p, generateOcsUrl: (p) => p }))

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const EXPORT = { label: 'Export', action: 'export' }

/**
 * Mount an index page.
 *
 * @param {object} props Props.
 * @param {object} [attrs] Listeners.
 * @return {import('@vue/test-utils').VueWrapper} The page.
 */
function mountPage(props, attrs = {}) {
	return mount(CnIndexPage, {
		props: { title: 'Team queue', showTitle: true, columns: [{ key: 'title', label: 'Title' }], ...props },
		attrs,
		global: {
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Queue' } },
			stubs: { CnActionsBar: true, CnSavedViewsControl: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnBuildiqEditButton: true },
		},
	})
}

const endpoint = { entitySource: 'endpoint', sourceConfig: { url: '/apps/dossiq/api/queue' } }
const keys = (w) => w.vm.resolvedHeaderButtons.map((b) => b.action)

describe('CnIndexPage header Export on a non-OpenRegister source', () => {
	it('is drawn without a run or a listener, and downloads the source\'s rows as CSV', async () => {
		const w = mountPage({ ...endpoint, headerButtons: [EXPORT, { action: 'add', variant: 'primary' }] })
		expect(keys(w)).toEqual(['export', 'add'])
		w.vm.namedRows.splice(0, w.vm.namedRows.length, { title: 'Dakkapel, Kerkstraat 12' }, { title: '=1+1' })
		const blobs = []
		global.URL.createObjectURL = jest.fn((blob) => {
			blobs.push(blob)
			return 'blob:x'
		})
		global.URL.revokeObjectURL = jest.fn()
		const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
		w.vm.onHeaderButton(w.vm.resolvedHeaderButtons.find((b) => b.action === 'export'))
		expect(click).toHaveBeenCalled()
		expect(w.vm.showExportDialog).toBe(false)
		const text = await new Promise((resolve) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result)
			reader.readAsText(blobs[0])
		})
		// FileReader drops the byte order mark that lets a spreadsheet read UTF-8.
		expect(text).toBe('Title\r\n"Dakkapel, Kerkstraat 12"\r\n\'=1+1\r\n')
		expect(blobs[0].type).toBe('text/csv;charset=utf-8')
		click.mockRestore()
	})

	it('runs the header action its run names', () => {
		const handler = jest.fn()
		const w = mountPage({
			...endpoint,
			headerButtons: [{ ...EXPORT, run: 'export-queue' }],
			headerActions: [{ id: 'export-queue', label: 'Export queue', handler }],
		})
		const button = w.vm.resolvedHeaderButtons.find((b) => b.action === 'export')
		expect(button).toBeTruthy()
		w.vm.onHeaderButton(button)
		expect(handler).toHaveBeenCalled()
		expect(w.vm.showExportDialog).toBe(false)
	})

	it('is drawn when the page listens for mass-export', () => {
		const w = mountPage({ ...endpoint, headerButtons: [EXPORT] }, { onMassExport: jest.fn() })
		expect(keys(w)).toEqual(['export'])
	})

	it('stays on a page that lists objects', () => {
		const w = mountPage({ objects: [], headerButtons: [EXPORT] })
		expect(keys(w)).toEqual(['export'])
	})
})
