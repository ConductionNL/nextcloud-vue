/**
 * Tests for the declared columns of CnFilesBrowser (files-browser-columns).
 *
 * The host declares which columns the browser has. A user can hide any of
 * them and can never add one, and a stored choice cannot bring back a column
 * the host has since removed.
 */

import {
	attributePropertiesFor,
	DEFAULT_FILE_COLUMNS,
	fileColumnValue,
	isBuiltInFileColumn,
	normaliseFileColumns,
	sortNodesByColumn,
	visibleFileColumns,
} from '../../src/components/CnFilesBrowser/filesBrowserColumns.js'

const DECLARED = normaliseFileColumns([
	'name',
	{ key: 'sender', label: 'Sender', source: 'row' },
	{ key: 'scan', label: 'Scan', source: 'attribute', attribute: '{http://owncloud.org/ns}av-status' },
	'modified',
])

describe('normaliseFileColumns', () => {
	it('renders today\'s three columns when the host declares none', () => {
		expect(normaliseFileColumns([]).map((c) => c.key)).toEqual(DEFAULT_FILE_COLUMNS)
		expect(normaliseFileColumns(null).map((c) => c.key)).toEqual(DEFAULT_FILE_COLUMNS)
	})

	it('resolves a built-in name to the node property it reads', () => {
		const [name] = normaliseFileColumns(['name'])
		expect(name).toMatchObject({ key: 'name', source: 'node', nodeKey: 'basename', sortKey: 'basename' })
	})

	it('replaces the defaults with the declared set, in the declared order', () => {
		expect(DECLARED.map((c) => c.key)).toEqual(['name', 'sender', 'scan', 'modified'])
	})

	it('drops a string that names no built-in', () => {
		expect(normaliseFileColumns(['name', 'colour']).map((c) => c.key)).toEqual(['name'])
	})

	it('lets a host relabel a built-in without redeclaring what it reads', () => {
		const [owner] = normaliseFileColumns([{ key: 'owner', label: 'Uploaded by' }])
		expect(owner).toMatchObject({ key: 'owner', nodeKey: 'owner', label: 'Uploaded by' })
	})

	it('knows which names are built in', () => {
		expect(isBuiltInFileColumn('modified')).toBe(true)
		expect(isBuiltInFileColumn('sender')).toBe(false)
	})
})

describe('visibleFileColumns', () => {
	it('shows everything the host declared when the user has chosen nothing', () => {
		expect(visibleFileColumns(DECLARED, null).map((c) => c.key)).toEqual(['name', 'sender', 'scan', 'modified'])
	})

	it('hides what the user unticked, keeping the host order', () => {
		expect(visibleFileColumns(DECLARED, ['modified', 'name']).map((c) => c.key)).toEqual(['name', 'modified'])
	})

	it('honours a user who hid everything', () => {
		expect(visibleFileColumns(DECLARED, [])).toEqual([])
	})

	it('a stored choice cannot bring back a column the host removed', () => {
		// The user's stored preference still lists "sender" from when the host
		// declared it. The host does not declare it any more, so it does not
		// render and the chooser does not list it.
		const hostNow = normaliseFileColumns(['name', 'modified'])
		expect(visibleFileColumns(hostNow, ['name', 'sender', 'modified']).map((c) => c.key)).toEqual(['name', 'modified'])
	})

	it('a stored choice cannot add a column the host never declared', () => {
		expect(visibleFileColumns(DECLARED, ['name', 'salary']).map((c) => c.key)).toEqual(['name'])
	})
})

describe('attributePropertiesFor', () => {
	it('names every DAV property a declared attribute column reads, once', () => {
		const columns = normaliseFileColumns([
			{ key: 'scan', source: 'attribute', attribute: '{http://owncloud.org/ns}av-status' },
			{ key: 'scan2', source: 'attribute', attribute: '{http://owncloud.org/ns}av-status' },
			{ key: 'sender', source: 'row' },
		])
		expect(attributePropertiesFor(columns)).toEqual(['{http://owncloud.org/ns}av-status'])
	})

	it('asks for nothing when no column reads a DAV property', () => {
		expect(attributePropertiesFor(normaliseFileColumns(['name', 'size']))).toEqual([])
	})
})

describe('fileColumnValue', () => {
	const node = {
		fileid: 42,
		basename: 'Brief.pdf',
		size: 1024,
		attributes: { '{http://owncloud.org/ns}av-status': 'clean' },
	}

	it('reads a node property', () => {
		expect(fileColumnValue(DECLARED[0], node)).toBe('Brief.pdf')
	})

	it('reads a DAV property off the node the PROPFIND already carried', () => {
		expect(fileColumnValue(DECLARED[2], node)).toBe('clean')
	})

	it('reads the host\'s per-file data by file id', () => {
		expect(fileColumnValue(DECLARED[1], node, { 42: { sender: 'Jansen' } })).toBe('Jansen')
		expect(fileColumnValue(DECLARED[1], node, { 42: { sender: 'Jansen' } })).toBe('Jansen')
	})

	it('reads it by a string file id too, because JSON keys are strings', () => {
		expect(fileColumnValue(DECLARED[1], node, { 42: { sender: 'Jansen' } })).toBe('Jansen')
	})

	it('renders empty and throws nothing when there is no row data', () => {
		expect(fileColumnValue(DECLARED[1], node)).toBeUndefined()
		expect(fileColumnValue(DECLARED[1], node, null)).toBeUndefined()
	})
})

describe('sortNodesByColumn', () => {
	const isFolder = (n) => n.folder === true
	const nodes = [
		{ fileid: 1, basename: 'b', folder: false },
		{ fileid: 2, basename: 'a', folder: false },
		{ fileid: 3, basename: 'c', folder: false },
	]
	const column = normaliseFileColumns([{ key: 'direction', source: 'row', sortable: true }])[0]
	const rowData = { 1: { direction: 'outbound' }, 2: { direction: 'inbound' }, 3: {} }

	it('sorts on the resolved value of a row column', () => {
		const asc = sortNodesByColumn(nodes, column, true, rowData, isFolder)
		expect(asc.map((n) => n.fileid)).toEqual([2, 1, 3])
	})

	it('sorts a case with no value last in both directions', () => {
		const desc = sortNodesByColumn(nodes, column, false, rowData, isFolder)
		expect(desc.map((n) => n.fileid)).toEqual([1, 2, 3])
	})

	it('keeps folders first, the way the Files app lists them', () => {
		const withFolder = [...nodes, { fileid: 9, basename: 'zz', folder: true }]
		const sorted = sortNodesByColumn(withFolder, column, true, rowData, isFolder)
		expect(sorted[0].fileid).toBe(9)
	})

	it('does not mutate the array it was given', () => {
		const original = [...nodes]
		sortNodesByColumn(nodes, column, true, rowData, isFolder)
		expect(nodes).toEqual(original)
	})
})

// ── The browser itself ───────────────────────────────────────────────────

const { flushPromises, mount } = require('@vue/test-utils')
const CnFilesBrowser = require('../../src/components/CnFilesBrowser/CnFilesBrowser.vue').default

const ROOT = '/files/admin/Open Registers/Cases/abc'

function listing() {
	return [
		{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
		{ filename: `${ROOT}/report.pdf`, basename: 'report.pdf', type: 'file', mime: 'application/pdf', size: 2048, lastmod: '2026-09-01T10:00:00Z', props: { fileid: 12, '{http://owncloud.org/ns}av-status': 'clean' } },
		{ filename: `${ROOT}/photo.png`, basename: 'photo.png', type: 'file', mime: 'image/png', size: 4096, lastmod: '2026-09-02T10:00:00Z', props: { fileid: 13 } },
	]
}

function mountBrowser(propsData = {}) {
	return mount(CnFilesBrowser, {
		propsData: { rootPath: '/Open Registers/Cases/abc', ...propsData },
		global: { stubs: { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' } } },
	})
}

describe('CnFilesBrowser — declared columns', () => {
	beforeEach(() => {
		global.__cnDavContents = listing()
		global.__cnFileActions = []
		global.__cnNewMenuEntries = []
	})

	afterEach(() => {
		delete global.__cnDavContents
		delete global.__cnFileActions
		delete global.__cnNewMenuEntries
		delete window.OCA
	})

	it('renders name, size and modified when the host declares no columns', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		expect(wrapper.vm.renderedColumns.map((c) => c.key)).toEqual(['name', 'size', 'modified'])
		expect(wrapper.find('[data-testid="cn-files-browser-header-size"]').exists()).toBe(true)
		wrapper.unmount()
	})

	it('a declared set replaces the defaults, and the size column is gone', async () => {
		const wrapper = mountBrowser({ columns: ['name', { key: 'sender', label: 'Sender', source: 'row' }, 'modified'] })
		await flushPromises()
		expect(wrapper.vm.renderedColumns.map((c) => c.key)).toEqual(['name', 'sender', 'modified'])
		expect(wrapper.find('[data-testid="cn-files-browser-header-sender"]').text()).toContain('Sender')
		expect(wrapper.find('[data-testid="cn-files-browser-header-size"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('asks for a declared DAV property in the PROPFIND and reads it off the node', async () => {
		const wrapper = mountBrowser({
			columns: ['name', { key: 'scan', label: 'Scan', source: 'attribute', attribute: '{http://owncloud.org/ns}av-status' }],
		})
		await flushPromises()
		const body = wrapper.vm.propfindBody()
		expect(body).toContain('av-status')
		expect(body).toContain('http://owncloud.org/ns')
		expect(body.match(/<\/d:prop>/g)).toHaveLength(1)
		const node = wrapper.vm.sorted.find((n) => n.basename === 'report.pdf')
		expect(wrapper.vm.cellValue(wrapper.vm.renderedColumns[1], node)).toBe('clean')
		wrapper.unmount()
	})

	it('calls a rowData function once for the whole listing', async () => {
		const calls = []
		const wrapper = mountBrowser({
			columns: ['name', { key: 'sender', label: 'Sender', source: 'row' }],
			rowData: (nodes) => {
				calls.push(nodes.length)
				return { 12: { sender: 'Jansen' } }
			},
		})
		await flushPromises()
		expect(calls).toHaveLength(1)
		const node = wrapper.vm.sorted.find((n) => n.basename === 'report.pdf')
		expect(wrapper.vm.cellValue(wrapper.vm.renderedColumns[1], node)).toBe('Jansen')
		wrapper.unmount()
	})

	it('renders an empty cell and throws nothing when there is no row data', async () => {
		const wrapper = mountBrowser({ columns: ['name', { key: 'sender', label: 'Sender', source: 'row' }] })
		await flushPromises()
		const node = wrapper.vm.sorted[0]
		expect(wrapper.vm.cellValue(wrapper.vm.renderedColumns[1], node)).toBeUndefined()
		// The cell carries no value, so CnCellRenderer draws its own
		// empty-value placeholder rather than a blank the reader cannot tell
		// from a column that failed to load.
		expect(wrapper.find('[data-testid="cn-files-browser-cell-sender"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-files-browser-cell-sender"]').text()).not.toContain('undefined')
		wrapper.unmount()
	})

	it('offers no chooser until the host says where to store the answer', async () => {
		const wrapper = mountBrowser({ columns: ['name', 'size'] })
		await flushPromises()
		expect(wrapper.vm.columnsChooserEnabled).toBe(false)
		wrapper.unmount()
	})

	it('hides a column the user unticked and keeps it in the chooser', async () => {
		const wrapper = mountBrowser({ columns: ['name', 'size', 'modified'], preferenceApp: 'dossiq' })
		await flushPromises()
		wrapper.vm.toggleColumn(wrapper.vm.declaredColumns[1])
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.renderedColumns.map((c) => c.key)).toEqual(['name', 'modified'])
		expect(wrapper.vm.declaredColumns.map((c) => c.key)).toEqual(['name', 'size', 'modified'])
		wrapper.unmount()
	})

	it('a stored choice cannot bring back a column the host removed', async () => {
		// The preference was written while the host still declared "sender".
		const wrapper = mountBrowser({ columns: ['name', 'modified'], preferenceApp: 'dossiq' })
		await flushPromises()
		wrapper.vm.visibleColumnKeys = ['name', 'sender', 'modified']
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.renderedColumns.map((c) => c.key)).toEqual(['name', 'modified'])
		expect(wrapper.find('[data-testid="cn-files-browser-header-sender"]').exists()).toBe(false)
		// And a toggle rebuilds the stored value from the declaration, so the
		// stale key does not survive the next tick either.
		wrapper.vm.toggleColumn(wrapper.vm.declaredColumns[1])
		expect(wrapper.vm.visibleColumnKeys).toEqual(['name'])
		wrapper.unmount()
	})

	it('sorts on a declared row column, within the folder', async () => {
		const wrapper = mountBrowser({
			columns: ['name', { key: 'direction', label: 'Direction', source: 'row', sortable: true }],
			rowData: () => ({ 12: { direction: 'outbound' }, 13: { direction: 'inbound' } }),
		})
		await flushPromises()
		wrapper.vm.sortBy('direction')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.sorted.map((n) => n.basename)).toEqual(['photo.png', 'report.pdf'])
		expect(wrapper.vm.ariaSort('direction')).toBe('ascending')
		wrapper.vm.sortBy('direction')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.sorted.map((n) => n.basename)).toEqual(['report.pdf', 'photo.png'])
		expect(wrapper.vm.ariaSort('direction')).toBe('descending')
		wrapper.unmount()
	})
})
