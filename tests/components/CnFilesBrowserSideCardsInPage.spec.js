/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * With `sideCardsPlacement: 'page-side'` the cards about the selected file
 * stand in the detail page's side column, in place of its generic cards, as
 * DqDocumentenBeheer draws "Wie mag dit zien: <file>" and "Controlegetal"
 * there. Without a page side column they stay beside the list.
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'

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
 * @param {object|null} side What the detail page provides as `cnDetailSideColumn`.
 * @return {object} The wrapper.
 */
function mountBrowser(propsData = {}, side = null) {
	return mount(CnFilesBrowser, {
		propsData: { rootPath: '/Open Registers/Cases/abc', columns: COLUMNS, rowData: ROW_DATA, sideCards: SIDE_CARDS, bulkActions: [{ id: 'merge', label: 'Merge into a PDF', handler: 'merge' }], ...propsData },
		global: { stubs: STUBS, provide: { cnDispatchAction: () => {}, cnTranslate: (key) => key, cnDetailSideColumn: side } },
		attachTo: document.body,
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

describe('CnFilesBrowser side cards in the page side column', () => {
	let slot

	beforeEach(() => {
		global.__cnDavContents = listing()
		global.__cnFileActions = []
		global.__cnNewMenuEntries = []
		slot = document.createElement('div')
		slot.id = 'page-side-slot'
		document.body.appendChild(slot)
	})

	afterEach(() => {
		delete global.__cnDavContents
		delete global.__cnFileActions
		delete global.__cnNewMenuEntries
		document.body.innerHTML = ''
	})

	const pageSide = () => ({ available: true, target: '#page-side-slot', claim: jest.fn() })

	it('puts the cards in the page side column and claims it while a file is selected', async () => {
		const side = pageSide()
		const wrapper = mountBrowser({ sideCardsPlacement: 'page-side' }, side)
		await flushPromises()
		expect(side.claim).toHaveBeenLastCalledWith(expect.anything(), false)
		await select(wrapper, 'quote.pdf')
		await flushPromises()
		expect(slot.querySelector('[data-testid="cn-files-browser-side-card-visibility"]').textContent).toContain('quote.pdf')
		expect(slot.querySelector('[data-testid="cn-files-browser-side-card-checksum"]')).not.toBeNull()
		expect(wrapper.find('.cn-files-browser__body--with-side').exists()).toBe(false)
		expect(side.claim).toHaveBeenLastCalledWith(expect.anything(), true)
		wrapper.unmount()
		expect(side.claim).toHaveBeenLastCalledWith(expect.anything(), false)
	})

	it('keeps the cards beside the list without the option, or without a page side column', async () => {
		for (const [props, side] of [[{}, pageSide()], [{ sideCardsPlacement: 'page-side' }, null], [{ sideCardsPlacement: 'page-side' }, { ...pageSide(), available: false }]]) {
			const wrapper = mountBrowser(props, side)
			await flushPromises()
			await select(wrapper, 'quote.pdf')
			await flushPromises()
			expect(slot.querySelector('[data-testid="cn-files-browser-side"]')).toBeNull()
			expect(wrapper.find('.cn-files-browser__body--with-side [data-testid="cn-files-browser-side"]').exists()).toBe(true)
			if (side) {
				expect(side.claim).not.toHaveBeenCalledWith(expect.anything(), true)
			}
			wrapper.unmount()
		}
	})
})
