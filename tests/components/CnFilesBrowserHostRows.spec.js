/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A host's documents list on the files browser: its own row data reaches
 * the declared columns from a manifest, and a row action can say which
 * files it is for.
 *
 * Both were dark in a manifest before this: `columns` was declared by an
 * app and dropped by CnFilesTab, which never forwarded it, and `rowData`
 * is a function, which a JSON manifest cannot hold. A row action showed on
 * every file, so an act that only means something for a saved mail was
 * offered on a PDF and had to answer with a sentence.
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'
import CnFilesTab from '../../src/components/CnObjectSidebar/CnFilesTab.vue'
import { hostActionApplies, indexRowData } from '../../src/components/CnFilesBrowser/filesBrowser.js'

const ROOT = '/files/admin/Open Registers/Cases/abc'

/** A listing: the folder, a subfolder, a PDF and a saved mail. */
function listing() {
	return [
		{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
		{ filename: `${ROOT}/Scans`, basename: 'Scans', type: 'directory', props: { fileid: 11 } },
		{ filename: `${ROOT}/report.pdf`, basename: 'report.pdf', type: 'file', mime: 'application/pdf', size: 2048, lastmod: '2026-09-01T10:00:00Z', props: { fileid: 12 } },
		{ filename: `${ROOT}/Reply.EML`, basename: 'Reply.EML', type: 'file', mime: 'message/rfc822', size: 512, lastmod: '2026-09-02T10:00:00Z', props: { fileid: 13 } },
	]
}

const STUBS = { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' } }

describe('indexRowData', () => {
	it('indexes a list of records by the key field, as strings', () => {
		const rows = [{ fileId: 12, senderName: 'A' }, { fileId: '13', senderName: 'B' }, { fileId: null, senderName: 'C' }, { senderName: 'D' }, 'junk']
		expect(indexRowData(rows)).toEqual({ 12: rows[0], 13: rows[1] })
	})

	it('reads the list at a dotted path, or under items or results', () => {
		expect(indexRowData({ data: { rows: [{ fileId: 1 }] } }, { path: 'data.rows' })).toEqual({ 1: { fileId: 1 } })
		expect(indexRowData({ items: [{ fileId: 2 }] })).toEqual({ 2: { fileId: 2 } })
		expect(indexRowData({ results: [{ fileId: 3 }] })).toEqual({ 3: { fileId: 3 } })
	})

	it('takes another key field when the host names one', () => {
		expect(indexRowData([{ nodeId: 7, x: 1 }], { key: 'nodeId' })).toEqual({ 7: { nodeId: 7, x: 1 } })
	})

	it('passes an object already keyed by file id through, and answers nothing usable as empty', () => {
		expect(indexRowData({ 12: { senderName: 'A' } })).toEqual({ 12: { senderName: 'A' } })
		expect(indexRowData(null)).toEqual({})
		expect(indexRowData('nope')).toEqual({})
		expect(indexRowData({ data: 'x' }, { path: 'data' })).toEqual({})
	})
})

describe('hostActionApplies', () => {
	const pdf = { basename: 'report.pdf', mime: 'application/pdf' }
	const mail = { basename: 'Reply.EML', mime: 'message/rfc822' }
	const photo = { basename: 'photo.png', mime: 'image/png' }

	it('applies everywhere without a condition, as it always did', () => {
		expect(hostActionApplies({ id: 'a' }, pdf)).toBe(true)
		expect(hostActionApplies({ id: 'a', visibleIf: null }, pdf)).toBe(true)
	})

	it('matches extensions without regard to case or a leading dot', () => {
		const action = { id: 'read', visibleIf: { extension: ['eml', '.msg'] } }
		expect(hostActionApplies(action, mail)).toBe(true)
		expect(hostActionApplies(action, { basename: 'x.msg' })).toBe(true)
		expect(hostActionApplies(action, pdf)).toBe(false)
		expect(hostActionApplies(action, { basename: 'README' })).toBe(false)
	})

	it('matches a mime type exactly, or a family by a trailing slash or star', () => {
		expect(hostActionApplies({ visibleIf: { mime: ['application/pdf'] } }, pdf)).toBe(true)
		expect(hostActionApplies({ visibleIf: { mime: ['image/'] } }, photo)).toBe(true)
		expect(hostActionApplies({ visibleIf: { mime: ['image/*'] } }, photo)).toBe(true)
		expect(hostActionApplies({ visibleIf: { mime: ['image/*'] } }, pdf)).toBe(false)
	})

	it('needs every named condition to hold', () => {
		const action = { visibleIf: { extension: ['eml'], mime: ['application/pdf'] } }
		expect(hostActionApplies(action, mail)).toBe(false)
	})
})

describe('CnFilesBrowser host rows', () => {
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

	it('offers a row action only on the files its condition names', async () => {
		const wrapper = mount(CnFilesBrowser, {
			propsData: {
				rootPath: '/Open Registers/Cases/abc',
				rowActions: [
					{ id: 'properties', label: 'Properties', type: 'open-modal', target: 'X' },
					{ id: 'read', label: 'Read as a message', type: 'handler', handler: 'read', visibleIf: { extension: ['eml', 'msg'] } },
				],
			},
			global: { stubs: STUBS },
		})
		await flushPromises()
		const rows = wrapper.findAll('[data-testid="cn-files-browser-row"]')
		const pdf = rows.find((row) => row.attributes('data-name') === 'report.pdf')
		const mail = rows.find((row) => row.attributes('data-name') === 'Reply.EML')
		expect(pdf.find('[data-testid="cn-files-browser-host-action-properties"]').exists()).toBe(true)
		expect(pdf.find('[data-testid="cn-files-browser-host-action-read"]').exists()).toBe(false)
		expect(mail.find('[data-testid="cn-files-browser-host-action-read"]').exists()).toBe(true)
		wrapper.unmount()
	})
})

describe('CnFilesTab forwards a documents list', () => {
	it('declares the columns, the column preference and the row data source', () => {
		const props = CnFilesTab.props
		expect(props.columns.default()).toEqual([])
		expect(props.preferenceApp.default).toBe('')
		expect(props.preferenceKey.default).toBe('files-browser-columns')
		expect(props.rowDataUrl.default).toBe(null)
		expect(props.rowDataPath.default).toBe('')
		expect(props.rowDataKey.default).toBe('fileId')
	})

	it('hands the columns and the preference to the browser, and no row data without a url', async () => {
		const columns = ['name', { key: 'senderName', label: 'Sender', source: 'row' }]
		const wrapper = mount(CnFilesTab, {
			propsData: { objectId: 'obj-1', register: 'r', schema: 's', columns, preferenceApp: 'app', preferenceKey: 'case-files' },
		})
		await flushPromises()
		wrapper.vm.browserRoot = '/Open Registers/Cases/obj-1'
		await wrapper.vm.$nextTick()
		const browser = wrapper.findComponent(CnFilesBrowser)
		expect(browser.props('columns')).toEqual(columns)
		expect(browser.props('preferenceApp')).toBe('app')
		expect(browser.props('preferenceKey')).toBe('case-files')
		expect(browser.props('rowData')).toBe(null)
		wrapper.unmount()
	})

	it('reads the row data from the host endpoint once per listing, keyed by file id', async () => {
		global.__cnDavContents = listing()
		const axios = require('@nextcloud/axios').default
		const spy = jest.spyOn(axios, 'get').mockImplementation((url) => {
			if (String(url).includes('/dossier')) {
				return Promise.resolve({ data: { total: 2, informatieobjecten: [{ fileId: 12, senderName: 'Gemeente' }, { fileId: 13, senderName: 'Inwoner' }] } })
			}
			return Promise.resolve({ data: {} })
		})
		const wrapper = mount(CnFilesTab, {
			propsData: {
				objectId: 'obj 1',
				register: 'r',
				schema: 's',
				rowDataUrl: '/apps/host/api/cases/{objectId}/dossier',
				rowDataPath: 'informatieobjecten',
			},
		})
		await flushPromises()
		wrapper.vm.browserRoot = '/Open Registers/Cases/obj-1'
		await wrapper.vm.$nextTick()
		await flushPromises()
		const browser = wrapper.findComponent(CnFilesBrowser)
		expect(typeof browser.props('rowData')).toBe('function')
		// The browser asks for it itself when it lists the folder.
		expect(browser.vm.resolvedRowData).toEqual({ 12: { fileId: 12, senderName: 'Gemeente' }, 13: { fileId: 13, senderName: 'Inwoner' } })
		const calls = spy.mock.calls.map((call) => String(call[0])).filter((url) => url.includes('/dossier'))
		expect(calls).toHaveLength(1)
		expect(calls[0]).toContain('/apps/host/api/cases/obj%201/dossier')
		spy.mockRestore()
		delete global.__cnDavContents
		wrapper.unmount()
	})
})
