/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The files browser as a host's documents list: select files and run the
 * host's bulk actions on them, group the files on a declared column, and
 * narrow them with a filter on the values in use.
 *
 * Each of these is off unless the host asks, so the plain browser every
 * other page uses renders exactly as before; the first test pins that.
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'
import CnFilesTab from '../../src/components/CnObjectSidebar/CnFilesTab.vue'
import { facetCounts, groupNodes, nodeMatchesFacets } from '../../src/components/CnFilesBrowser/filesBrowserColumns.js'

const ROOT = '/files/admin/Open Registers/Cases/abc'

/** A listing: the folder, a subfolder and three files. */
function listing() {
	return [
		{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
		{ filename: `${ROOT}/Scans`, basename: 'Scans', type: 'directory', props: { fileid: 11 } },
		{ filename: `${ROOT}/a.pdf`, basename: 'a.pdf', type: 'file', mime: 'application/pdf', size: 1, lastmod: '2026-09-01T10:00:00Z', props: { fileid: 21 } },
		{ filename: `${ROOT}/b.pdf`, basename: 'b.pdf', type: 'file', mime: 'application/pdf', size: 2, lastmod: '2026-09-02T10:00:00Z', props: { fileid: 22 } },
		{ filename: `${ROOT}/c.pdf`, basename: 'c.pdf', type: 'file', mime: 'application/pdf', size: 3, lastmod: '2026-09-03T10:00:00Z', props: { fileid: 23 } },
	]
}

/** The host's records per file: a type and keywords. */
const ROW_DATA = {
	21: { type: 'Besluit', keywords: ['bezwaar'] },
	22: { type: 'Brief', keywords: ['bezwaar', 'advies'] },
	23: { type: 'Besluit', keywords: [] },
}

const COLUMNS = ['name', { key: 'type', label: 'Type', source: 'row' }, { key: 'keywords', label: 'Keywords', source: 'row' }]

const STUBS = { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' }, CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } }

/**
 * Mount a browser over the listing.
 *
 * @param {object} propsData Extra props.
 * @param {Array} dispatched Collects dispatched actions.
 * @return {object} The wrapper.
 */
function mountBrowser(propsData = {}, dispatched = []) {
	return mount(CnFilesBrowser, {
		propsData: { rootPath: '/Open Registers/Cases/abc', ...propsData },
		global: { stubs: STUBS, provide: { cnDispatchAction: (action) => dispatched.push(action) } },
	})
}

/**
 * The names of the file rows, in order.
 *
 * @param {object} wrapper The wrapper.
 * @return {string[]} Row names.
 */
function rowNames(wrapper) {
	return wrapper.findAll('[data-testid="cn-files-browser-row"]').map((row) => row.attributes('data-name'))
}

describe('files browser column helpers', () => {
	const typeColumn = { key: 'type', source: 'row' }
	const keywordsColumn = { key: 'keywords', source: 'row' }
	const nodes = [{ fileid: 21, basename: 'a' }, { fileid: 22, basename: 'b' }, { fileid: 23, basename: 'c' }, { fileid: 24, basename: 'd' }]

	it('groups nodes by a column value in first-seen order, nothing-filled last', () => {
		const groups = groupNodes(nodes, typeColumn, ROW_DATA)
		expect(groups.map((group) => [group.value, group.nodes.map((node) => node.basename)])).toEqual([
			['Besluit', ['a', 'c']],
			['Brief', ['b']],
			[null, ['d']],
		])
	})

	it('counts the values in use, a list counting per entry, most used first', () => {
		expect(facetCounts(nodes, keywordsColumn, ROW_DATA)).toEqual([
			{ value: 'bezwaar', count: 2 },
			{ value: 'advies', count: 1 },
		])
	})

	it('keeps a node matching any chosen value of a facet, and every facet that has a choice', () => {
		const columns = { type: typeColumn, keywords: keywordsColumn }
		expect(nodeMatchesFacets(nodes[0], {}, columns, ROW_DATA)).toBe(true)
		expect(nodeMatchesFacets(nodes[0], { keywords: ['advies', 'bezwaar'] }, columns, ROW_DATA)).toBe(true)
		expect(nodeMatchesFacets(nodes[2], { keywords: ['advies'] }, columns, ROW_DATA)).toBe(false)
		expect(nodeMatchesFacets(nodes[1], { keywords: ['advies'], type: ['Besluit'] }, columns, ROW_DATA)).toBe(false)
		expect(nodeMatchesFacets(nodes[0], { keywords: [] }, columns, ROW_DATA)).toBe(true)
	})
})

describe('CnFilesBrowser as a documents list', () => {
	beforeEach(() => {
		global.__cnDavContents = listing()
		global.__cnFileActions = []
		global.__cnNewMenuEntries = []
	})

	afterEach(() => {
		delete global.__cnDavContents
		delete global.__cnFileActions
		delete global.__cnNewMenuEntries
	})

	it('renders as before when the host asks for none of it', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-files-browser-select-all"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-files-browser-select"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-files-browser-facets"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-files-browser-group"]').exists()).toBe(false)
		expect(rowNames(wrapper)).toEqual(['Scans', 'a.pdf', 'b.pdf', 'c.pdf'])
		wrapper.unmount()
	})

	describe('selection and bulk actions', () => {
		const BULK = [
			{ id: 'mark-final', label: 'Mark as final', type: 'open-modal', target: 'BulkDialog', props: { mode: 'mark-final' } },
			{ id: 'stamp', label: 'Stamp', type: 'handler', handler: 'stamp', args: ['x'] },
		]

		it('puts a named checkbox on every file and none on a folder', async () => {
			const wrapper = mountBrowser({ bulkActions: BULK })
			await flushPromises()
			const rows = wrapper.findAll('[data-testid="cn-files-browser-row"]')
			const folder = rows.find((row) => row.attributes('data-name') === 'Scans')
			const file = rows.find((row) => row.attributes('data-name') === 'a.pdf')
			expect(folder.find('[data-testid="cn-files-browser-select"]').exists()).toBe(false)
			expect(file.find('[data-testid="cn-files-browser-select"]').attributes('aria-label')).toBe('Select a.pdf')
			// No bar until something is selected.
			expect(wrapper.find('[data-testid="cn-files-browser-bulk-bar"]').exists()).toBe(false)
			wrapper.unmount()
		})

		it('opens a bulk modal with every selected file, then clears the selection', async () => {
			const dispatched = []
			const wrapper = mountBrowser({ bulkActions: BULK }, dispatched)
			await flushPromises()
			const rows = wrapper.findAll('[data-testid="cn-files-browser-row"]')
			await rows.find((row) => row.attributes('data-name') === 'a.pdf').find('[data-testid="cn-files-browser-select"]').setValue(true)
			await rows.find((row) => row.attributes('data-name') === 'c.pdf').find('[data-testid="cn-files-browser-select"]').setValue(true)
			const bar = wrapper.find('[data-testid="cn-files-browser-bulk-bar"]')
			expect(bar.text()).toContain('2 selected')
			await bar.find('[data-testid="cn-files-browser-bulk-action-mark-final"]').trigger('click')
			expect(dispatched).toHaveLength(1)
			expect(dispatched[0].target).toBe('BulkDialog')
			expect(dispatched[0].props.mode).toBe('mark-final')
			expect(dispatched[0].props.fileIds).toEqual([21, 23])
			expect(dispatched[0].props.files.map((file) => file.fileName)).toEqual(['a.pdf', 'c.pdf'])
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.selectedIds).toEqual([])
			expect(wrapper.find('[data-testid="cn-files-browser-bulk-bar"]').exists()).toBe(false)
			wrapper.unmount()
		})

		it('hands a handler the selected nodes, and select all takes every file and no folder', async () => {
			const dispatched = []
			const wrapper = mountBrowser({ bulkActions: BULK }, dispatched)
			await flushPromises()
			await wrapper.find('[data-testid="cn-files-browser-select-all"]').setValue(true)
			expect(wrapper.vm.selectedIds).toEqual(['21', '22', '23'])
			await wrapper.find('[data-testid="cn-files-browser-bulk-action-stamp"]').trigger('click')
			expect(dispatched[0].args[0]).toBe('x')
			expect(dispatched[0].args[1].map((node) => node.basename)).toEqual(['a.pdf', 'b.pdf', 'c.pdf'])
			wrapper.unmount()
		})

		it('clears the selection with Clear selection and when another folder opens', async () => {
			const wrapper = mountBrowser({ bulkActions: BULK })
			await flushPromises()
			await wrapper.find('[data-testid="cn-files-browser-select-all"]').setValue(true)
			await wrapper.find('[data-testid="cn-files-browser-bulk-clear"]').trigger('click')
			expect(wrapper.vm.selectedIds).toEqual([])
			await wrapper.find('[data-testid="cn-files-browser-select-all"]').setValue(true)
			wrapper.vm.currentPath = '/Open Registers/Cases/abc/Scans'
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.selectedIds).toEqual([])
			wrapper.unmount()
		})
	})

	it('groups the files under a heading per value with its count, folders above', async () => {
		const wrapper = mountBrowser({ columns: COLUMNS, rowData: ROW_DATA, groupBy: 'type' })
		await flushPromises()
		const body = wrapper.find('[data-testid="cn-files-browser-table"] tbody')
		const order = body.findAll('tr').map((tr) => (tr.attributes('data-testid') === 'cn-files-browser-group' ? `# ${tr.text().replace(/\s+/g, ' ').trim()}` : tr.attributes('data-name')))
		expect(order).toEqual(['Scans', '# Besluit 2', 'a.pdf', 'c.pdf', '# Brief 1', 'b.pdf'])
		wrapper.unmount()
	})

	it('narrows the files with a chip per value in use, and says so when nothing matches', async () => {
		const wrapper = mountBrowser({ columns: COLUMNS, rowData: ROW_DATA, facets: ['keywords', 'type'] })
		await flushPromises()
		const chips = wrapper.findAll('[data-testid="cn-files-browser-facet-chip"]')
		expect(chips.map((chip) => chip.text().replace(/\s+/g, ' ').trim())).toEqual(['bezwaar 2', 'advies 1', 'Besluit 2', 'Brief 1'])
		const advies = chips.find((chip) => chip.text().startsWith('advies'))
		await advies.trigger('click')
		expect(advies.attributes('aria-pressed')).toBe('true')
		expect(rowNames(wrapper)).toEqual(['Scans', 'b.pdf'])
		await chips.find((chip) => chip.text().startsWith('Besluit')).trigger('click')
		expect(rowNames(wrapper)).toEqual(['Scans'])
		expect(wrapper.find('[data-testid="cn-files-browser-no-match"]').text()).toBe('No files match the filter.')
		await wrapper.find('[data-testid="cn-files-browser-facets-clear"]').trigger('click')
		expect(rowNames(wrapper)).toEqual(['Scans', 'a.pdf', 'b.pdf', 'c.pdf'])
		wrapper.unmount()
	})
})

describe('CnFilesTab forwards the documents list props', () => {
	it('declares bulkActions, groupBy and facets, off by default, and hands them on', async () => {
		expect(CnFilesTab.props.bulkActions.default()).toEqual([])
		expect(CnFilesTab.props.groupBy.default).toBe('')
		expect(CnFilesTab.props.facets.default()).toEqual([])
		const bulkActions = [{ id: 'x', label: 'X', type: 'open-modal', target: 'X' }]
		const wrapper = mount(CnFilesTab, {
			propsData: { objectId: 'obj-1', register: 'r', schema: 's', bulkActions, groupBy: 'type', facets: ['keywords'] },
		})
		await flushPromises()
		wrapper.vm.browserRoot = '/Open Registers/Cases/obj-1'
		await wrapper.vm.$nextTick()
		const browser = wrapper.findComponent(CnFilesBrowser)
		expect(browser.props('bulkActions')).toEqual(bulkActions)
		expect(browser.props('groupBy')).toBe('type')
		expect(browser.props('facets')).toEqual(['keywords'])
		wrapper.unmount()
	})
})
