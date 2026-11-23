/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakDocumenten: Type, Richting and Auteur show by default on a case type
 * that reviews documents (`hidden: { not: <flag> }`), and "Samenvoegen tot
 * één PDF" is a toolbar button that runs on the ticked files and says why it
 * is off while none is ticked.
 *
 * @spec openspec/changes/files-columns-by-flag-and-toolbar-selection/specs/files-browser/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'
import { normaliseFileColumns, visibleFileColumns } from '../../src/components/CnFilesBrowser/filesBrowserColumns.js'

const ROOT = '/files/admin/Open Registers/Cases/abc'

const STUBS = { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' }, CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } }

describe('a column hidden unless a flag holds', () => {
	const declare = (flag) => normaliseFileColumns(['name', { key: 'type', label: 'Type', source: 'row', hidden: { not: flag } }])

	it('shows the column when the flag is true', () => {
		expect(visibleFileColumns(declare(true), null).map((c) => c.key)).toEqual(['name', 'type'])
	})

	it('hides it, still in the chooser, when the flag is false or missing', () => {
		expect(visibleFileColumns(declare(false), null).map((c) => c.key)).toEqual(['name'])
		expect(visibleFileColumns(declare(undefined), null).map((c) => c.key)).toEqual(['name'])
		expect(declare(false).map((c) => c.key)).toEqual(['name', 'type'])
	})
})

describe('CnFilesBrowser toolbar selection actions', () => {
	beforeEach(() => {
		global.__cnDavContents = [
			{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
			{ filename: `${ROOT}/a.pdf`, basename: 'a.pdf', type: 'file', mime: 'application/pdf', size: 1, lastmod: '2026-09-01T10:00:00Z', props: { fileid: 21 } },
			{ filename: `${ROOT}/b.pdf`, basename: 'b.pdf', type: 'file', mime: 'application/pdf', size: 2, lastmod: '2026-09-02T10:00:00Z', props: { fileid: 22 } },
		]
		global.__cnFileActions = []
		global.__cnNewMenuEntries = []
	})

	afterEach(() => {
		delete global.__cnDavContents
		delete global.__cnFileActions
		delete global.__cnNewMenuEntries
	})

	const MERGE = [{ id: 'merge', label: 'Merge into one PDF', type: 'open-modal', target: 'MergeDialog', disabledReason: 'Tick the files to merge' }]

	it('is off with its reason until a file is ticked, then runs on the ticked files', async () => {
		const dispatched = []
		const wrapper = mount(CnFilesBrowser, {
			propsData: { rootPath: '/Open Registers/Cases/abc', toolbarSelectionActions: MERGE },
			global: { stubs: STUBS, provide: { cnDispatchAction: (action) => dispatched.push(action) } },
		})
		await flushPromises()
		const button = () => wrapper.find('[data-testid="cn-files-browser-toolbar-selection-merge"]')
		expect(button().attributes('disabled')).toBeDefined()
		const reasonId = button().attributes('aria-describedby')
		expect(wrapper.find(`#${reasonId}`).text()).toBe('Tick the files to merge')
		const row = wrapper.findAll('[data-testid="cn-files-browser-row"]').find((r) => r.attributes('data-name') === 'b.pdf')
		await row.find('[data-testid="cn-files-browser-select"]').setValue(true)
		expect(button().attributes('disabled')).toBeUndefined()
		expect(wrapper.find('[data-testid="cn-files-browser-bulk-bar"]').exists()).toBe(false)
		await button().trigger('click')
		expect(dispatched).toHaveLength(1)
		expect(dispatched[0].target).toBe('MergeDialog')
		expect(dispatched[0].props.fileIds).toEqual([22])
		wrapper.unmount()
	})
})
