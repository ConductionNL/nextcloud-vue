/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The files browser as a documents list with more around the selection: the
 * bulk bar names what is selected ("2 documents selected"), cards beside the
 * list describe the last selected file, and a `source: 'row'` column can draw
 * its values in tones (a badge per scan verdict, a restricted level in the
 * warning colour).
 *
 * @spec openspec/changes/files-browser-side-cards/specs/files-browser/spec.md#requirement-the-bulk-bar-names-what-is-selected
 * @spec openspec/changes/files-browser-side-cards/specs/files-browser/spec.md#requirement-cards-beside-the-list-describe-the-selected-file
 * @spec openspec/changes/files-browser-side-cards/specs/files-browser/spec.md#requirement-a-row-column-can-draw-its-values-in-tones
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'
import CnFilesTab from '../../src/components/CnObjectSidebar/CnFilesTab.vue'

const ROOT = '/files/admin/Open Registers/Cases/abc'

/** A listing: the folder and three files. */
function listing() {
	return [
		{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
		{ filename: `${ROOT}/request.pdf`, basename: 'request.pdf', type: 'file', mime: 'application/pdf', size: 1, lastmod: '2026-09-01T10:00:00Z', props: { fileid: 21 } },
		{ filename: `${ROOT}/quote.pdf`, basename: 'quote.pdf', type: 'file', mime: 'application/pdf', size: 2, lastmod: '2026-09-02T10:00:00Z', props: { fileid: 22 } },
		{ filename: `${ROOT}/photo.zip`, basename: 'photo.zip', type: 'file', mime: 'application/zip', size: 3, lastmod: '2026-09-03T10:00:00Z', props: { fileid: 23 } },
	]
}

const ROW_DATA = {
	21: { scan: 'clean', visibleTo: 'Everyone on the case', level: 'default', checksum: 'SHA-256 9f2c…a41e' },
	22: { scan: 'clean', visibleTo: 'Only the Woo team', level: 'restricted', reason: 'Commercially sensitive prices', checksum: '' },
	23: { scan: 'infected', visibleTo: 'Nobody, in quarantine', level: 'quarantine' },
}

const COLUMNS = [
	'name',
	{ key: 'scan', label: 'Scan', source: 'row', widget: 'badge', colorMap: { clean: 'success', infected: 'error' } },
	{ key: 'visibleTo', label: 'Visible to', source: 'row', colorKey: 'level', colorMap: { restricted: 'warning' } },
]

const SIDE_CARDS = [
	{
		id: 'visibility',
		title: 'Who can see this: {name}',
		fields: [{ key: 'visibleTo', label: 'Visible to', colorKey: 'level', colorMap: { restricted: 'warning' } }, { key: 'reason', label: 'Reason' }],
		actions: [{ id: 'change', label: 'Change exception', type: 'open-modal', target: 'VisibilityModal' }],
	},
	{ id: 'checksum', title: 'Checksum', fields: [{ key: 'checksum', label: 'Checksum' }, { key: 'basename', label: 'File', source: 'node' }] },
]

const STUBS = {
	NcDateTime: { template: '<time />' },
	NcIconSvgWrapper: { template: '<i />' },
	CnIcon: { template: '<i />' },
	CnCellRenderer: { props: ['value', 'widget', 'widgetProps'], template: '<span class="cell" :data-widget="widget" :data-variant="widgetProps && widgetProps.variant">{{ value }}</span>' },
}

/**
 * @param {object} propsData Extra props.
 * @param {Array} dispatched Collects dispatched actions.
 * @return {object} The wrapper.
 */
function mountBrowser(propsData = {}, dispatched = []) {
	return mount(CnFilesBrowser, {
		propsData: { rootPath: '/Open Registers/Cases/abc', columns: COLUMNS, rowData: ROW_DATA, bulkActions: [{ id: 'merge', label: 'Merge into a PDF', handler: 'merge' }], ...propsData },
		global: { stubs: STUBS, provide: { cnDispatchAction: (action) => dispatched.push(action), cnTranslate: (key) => key } },
	})
}

/**
 * Tick a file's checkbox.
 *
 * @param {object} wrapper The wrapper.
 * @param {string} name The file name.
 * @return {Promise<void>}
 */
async function select(wrapper, name) {
	await wrapper.find(`[data-testid="cn-files-browser-row"][data-name="${name}"] [data-testid="cn-files-browser-select"]`).setValue(true)
}

/**
 * A cell of a row.
 *
 * @param {object} wrapper The wrapper.
 * @param {string} name The file name.
 * @param {string} key The column key.
 * @return {object}
 */
function cell(wrapper, name, key) {
	return wrapper.find(`[data-testid="cn-files-browser-row"][data-name="${name}"] [data-testid="cn-files-browser-cell-${key}"] .cell`)
}

describe('CnFilesBrowser selection label, side cards and tones', () => {
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

	it('names the selection with the host\'s words, singular for one, and can leave out Clear selection', async () => {
		const wrapper = mountBrowser({ selectionLabel: '{count} documents selected', selectionLabelOne: '{count} document selected', showClearSelection: false })
		await flushPromises()
		await select(wrapper, 'request.pdf')
		expect(wrapper.find('[data-testid="cn-files-browser-bulk-count"]').text()).toBe('1 document selected')
		await select(wrapper, 'quote.pdf')
		expect(wrapper.find('[data-testid="cn-files-browser-bulk-count"]').text()).toBe('2 documents selected')
		expect(wrapper.find('[data-testid="cn-files-browser-bulk-clear"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('keeps "{count} selected" and Clear selection by default', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		await select(wrapper, 'request.pdf')
		expect(wrapper.find('[data-testid="cn-files-browser-bulk-count"]').text()).toBe('1 selected')
		expect(wrapper.find('[data-testid="cn-files-browser-bulk-clear"]').exists()).toBe(true)
		wrapper.unmount()
	})

	it('draws no side column while nothing is selected', async () => {
		const wrapper = mountBrowser({ sideCards: SIDE_CARDS })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-files-browser-side"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('describes the last selected file in the side cards, leaving out empty fields', async () => {
		const wrapper = mountBrowser({ sideCards: SIDE_CARDS })
		await flushPromises()
		await select(wrapper, 'request.pdf')
		await select(wrapper, 'quote.pdf')
		const visibility = wrapper.find('[data-testid="cn-files-browser-side-card-visibility"]')
		expect(visibility.find('h3').text()).toBe('Who can see this: quote.pdf')
		expect(visibility.findAll('dt').map((dt) => dt.text())).toEqual(['Visible to', 'Reason'])
		expect(visibility.findAll('dd')[0].classes()).toContain('cn-files-browser__tone--warning')
		const checksum = wrapper.find('[data-testid="cn-files-browser-side-card-checksum"]')
		expect(checksum.findAll('dt').map((dt) => dt.text())).toEqual(['File'])
		expect(checksum.find('dd').text()).toBe('quote.pdf')
		wrapper.unmount()
	})

	it('runs a side card action on that file', async () => {
		const dispatched = []
		const wrapper = mountBrowser({ sideCards: SIDE_CARDS }, dispatched)
		await flushPromises()
		await select(wrapper, 'quote.pdf')
		await wrapper.find('[data-testid="cn-files-browser-side-action-change"]').trigger('click')
		expect(dispatched).toHaveLength(1)
		expect(dispatched[0].props).toMatchObject({ fileId: 22, fileName: 'quote.pdf' })
		wrapper.unmount()
	})

	it('draws a badge column in the tone its colorMap gives the value', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		expect(cell(wrapper, 'request.pdf', 'scan').attributes('data-variant')).toBe('success')
		expect(cell(wrapper, 'photo.zip', 'scan').attributes('data-variant')).toBe('error')
		wrapper.unmount()
	})

	it('draws a text column in a tone read from another row field', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		expect(cell(wrapper, 'quote.pdf', 'visibleTo').classes()).toContain('cn-files-browser__tone--warning')
		expect(cell(wrapper, 'request.pdf', 'visibleTo').classes()).not.toContain('cn-files-browser__tone')
		wrapper.unmount()
	})

	it('is forwarded by CnFilesTab', () => {
		const props = CnFilesTab.props
		for (const key of ['selectionLabel', 'selectionLabelOne', 'showClearSelection', 'sideCards']) {
			expect(props[key]).toBeDefined()
		}
	})
})
