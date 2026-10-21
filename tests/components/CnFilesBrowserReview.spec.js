/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The files leaf as DqZaakDocumenten draws it: the host's own button in the
 * bar ("Vraag een bestand aan een partij"), one visible button per file row
 * ("Beoordelen", primary while the file is still to review), and a review
 * summary above the list ("4 van 7 beoordeeld", a bar and a legend).
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'
import CnFilesTab from '../../src/components/CnObjectSidebar/CnFilesTab.vue'
import { reviewSummary } from '../../src/components/CnFilesBrowser/filesReview.js'

const ROOT = '/files/admin/Open Registers/Cases/abc'

/**
 * A listing: the folder, a subfolder and four files.
 *
 * @return {Array<object>} The DAV entries.
 */
function listing() {
	return [
		{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
		{ filename: `${ROOT}/Scans`, basename: 'Scans', type: 'directory', props: { fileid: 11 } },
		...[21, 22, 23, 24].map((id) => ({ filename: `${ROOT}/${id}.pdf`, basename: `${id}.pdf`, type: 'file', mime: 'application/pdf', size: 1, lastmod: '2026-09-01T10:00:00Z', props: { fileid: id } })),
	]
}

const ROW_DATA = { 21: { review: 'Openbaar' }, 22: { review: 'Deels openbaar' }, 23: { review: 'Nog beoordelen' } }
const SUMMARY = {
	key: 'review',
	open: 'Nog beoordelen',
	values: [
		{ value: 'Openbaar', tone: 'success' },
		{ value: 'Deels openbaar', tone: 'warning' },
		{ value: 'Niet openbaar', tone: 'error' },
		{ value: 'Nog beoordelen', tone: 'default' },
	],
}
const STUBS = { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' }, CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } }

/**
 * Mount the browser with the given props.
 *
 * @param {object} propsData Props.
 * @param {Array<object>} dispatched Collects dispatched actions.
 * @return {object} The wrapper.
 */
function mountBrowser(propsData = {}, dispatched = []) {
	return mount(CnFilesBrowser, {
		propsData: { rootPath: '/Open Registers/Cases/abc', rowData: ROW_DATA, ...propsData },
		global: { stubs: STUBS, provide: { cnDispatchAction: (action) => dispatched.push(action) } },
	})
}

describe('reviewSummary', () => {
	const nodes = [{ fileid: 21 }, { fileid: 22 }, { fileid: 23 }, { fileid: 24 }]

	it('counts each value, an unlisted or empty one as open', () => {
		const summary = reviewSummary(SUMMARY, nodes, ROW_DATA)
		expect(summary).toMatchObject({ total: 4, done: 2, open: 2 })
		expect(summary.segments.map((s) => [s.value, s.count, s.share])).toEqual([
			['Openbaar', 1, 25],
			['Deels openbaar', 1, 25],
			['Niet openbaar', 0, 0],
			['Nog beoordelen', 1, 25],
		])
	})

	it('compares without case and draws an unknown tone as default', () => {
		const summary = reviewSummary({ key: 'review', values: [{ value: 'openbaar', tone: 'pink' }] }, nodes, ROW_DATA)
		expect(summary.segments[0]).toMatchObject({ count: 1, tone: 'default' })
	})

	it('is null without a key or values', () => {
		expect(reviewSummary({ values: [] }, nodes, ROW_DATA)).toBeNull()
		expect(reviewSummary(null, nodes, ROW_DATA)).toBeNull()
	})
})

describe('CnFilesBrowser review surfaces', () => {
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

	it('draws none of it when the host asks for none', async () => {
		const wrapper = mountBrowser()
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-files-browser-review"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-files-browser-row-button"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('draws the review summary with its counts, a bar and a legend', async () => {
		const wrapper = mountBrowser({ reviewSummary: SUMMARY })
		await flushPromises()
		const review = wrapper.find('[data-testid="cn-files-browser-review"]')
		expect(review.text()).toContain('2 of 4 reviewed')
		expect(review.text()).toContain('2 still to review')
		expect(review.find('[role="img"]').attributes('aria-label')).toBe('2 of 4 reviewed')
		expect(wrapper.findAll('[data-testid="cn-files-browser-review-entry"]').map((li) => li.text().replace(/\s+/g, ' '))).toEqual(['Openbaar 1', 'Deels openbaar 1', 'Niet openbaar 0', 'Nog beoordelen 1'])
		wrapper.unmount()
	})

	it('fills the host\'s own title template', async () => {
		const wrapper = mountBrowser({ reviewSummary: { ...SUMMARY, title: '{done} van {total} beoordeeld', subtitle: 'Nog {open} te gaan voor het besluit' } })
		await flushPromises()
		expect(wrapper.find('.cn-files-browser__review-title').text()).toBe('2 van 4 beoordeeld')
		expect(wrapper.find('.cn-files-browser__review-sub').text()).toBe('Nog 2 te gaan voor het besluit')
		wrapper.unmount()
	})

	it('puts the row button on every file, primary while the file is open, and dispatches it with the file', async () => {
		const dispatched = []
		const rowButton = { id: 'review', label: 'Beoordelen', type: 'open-modal', target: 'ReviewDialog', primaryWhen: { key: 'review', values: ['Nog beoordelen'] } }
		const wrapper = mountBrowser({ rowButton }, dispatched)
		await flushPromises()
		const buttons = wrapper.findAll('[data-testid="cn-files-browser-row-button"]')
		expect(buttons).toHaveLength(4)
		expect(wrapper.vm.rowButtonPrimary({ fileid: 23 })).toBe(true)
		expect(wrapper.vm.rowButtonPrimary({ fileid: 21 })).toBe(false)
		expect(wrapper.vm.rowButtonPrimary({ fileid: 24 })).toBe(false)
		await buttons[0].trigger('click')
		expect(dispatched[0]).toMatchObject({ id: 'review', target: 'ReviewDialog', props: { fileId: 21, fileName: '21.pdf' } })
		wrapper.unmount()
	})

	it('draws the host\'s bar buttons and dispatches them with the folder', async () => {
		const dispatched = []
		const wrapper = mountBrowser({ headerActions: [{ id: 'request', label: 'Vraag een bestand aan een partij', type: 'open-modal', target: 'FileRequestDialog' }] }, dispatched)
		await flushPromises()
		const button = wrapper.find('[data-testid="cn-files-browser-header-action-request"]')
		expect(button.text()).toContain('Vraag een bestand aan een partij')
		await button.trigger('click')
		expect(dispatched[0]).toMatchObject({ id: 'request', props: { path: expect.any(String) } })
		wrapper.unmount()
	})

	it('draws the host\'s footnote under the list, apart from the drop hint', async () => {
		const wrapper = mountBrowser({ footnote: 'Elk bestand wordt bij het uploaden op virussen gescand.' })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-files-browser-footnote"]').text()).toBe('Elk bestand wordt bij het uploaden op virussen gescand.')
		expect(wrapper.find('[data-testid="cn-files-browser-drop-hint"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('draws a second line under each file\'s name from its row data, and none where a value is empty', async () => {
		const wrapper = mountBrowser({ rowData: { 21: { review: 'Openbaar', uploadedBy: 'Inwoner' }, 22: { review: 'Openbaar' } }, nameSecondary: '{uploadedBy} · {name}' })
		await flushPromises()
		const lines = wrapper.findAll('[data-testid="cn-files-browser-name-secondary"]')
		expect(lines.map((line) => line.text())).toEqual(['Inwoner · 21.pdf'])
		wrapper.unmount()
	})

	it('is forwarded by the files tab', () => {
		for (const prop of ['headerActions', 'rowButton', 'reviewSummary', 'footnote', 'nameSecondary']) {
			expect(CnFilesTab.props[prop]).toBeDefined()
		}
	})
})
