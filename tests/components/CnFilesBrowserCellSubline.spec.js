/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A declared column's `subline`: a muted second line under the value, filled
 * from the file's row data (DqZaakDocumenten "Deels openbaar" over
 * "grond 5.1.2.e"), left out when it names no value.
 *
 * @spec openspec/changes/files-column-subline/specs/files-column-subline/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'

const ROOT = '/files/admin/Open Registers/Cases/abc'

function listing() {
	return [
		{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
		...[21, 22].map((id) => ({ filename: `${ROOT}/${id}.pdf`, basename: `${id}.pdf`, type: 'file', mime: 'application/pdf', size: 1, lastmod: '2026-09-01T10:00:00Z', props: { fileid: id } })),
	]
}

const STUBS = { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' }, CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } }

const VERDICT = { key: 'reviewVerdict', source: 'row', label: 'Assessment', subline: 'ground {reviewGrounds|values}' }

function mountBrowser(columns) {
	return mount(CnFilesBrowser, {
		propsData: {
			rootPath: '/Open Registers/Cases/abc',
			columns,
			rowData: { 21: { reviewVerdict: 'deels_openbaar', reviewGrounds: ['5.1.2.e'] }, 22: { reviewVerdict: 'openbaar', reviewGrounds: [] } },
		},
		global: { stubs: STUBS },
	})
}

const sublines = (wrapper) => wrapper.findAll('[data-testid="cn-files-browser-cell-subline"]').map((line) => line.text())

describe('CnFilesBrowser column subline', () => {
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

	it('draws the filled subline under the value of the file that has one', async () => {
		const wrapper = mountBrowser(['name', VERDICT])
		await flushPromises()
		expect(sublines(wrapper)).toEqual(['ground 5.1.2.e'])
		const cell = wrapper.findAll('[data-testid="cn-files-browser-cell-reviewVerdict"]')[0]
		expect(cell.find('[data-testid="cn-files-browser-cell-subline"]').exists()).toBe(true)
		wrapper.unmount()
	})

	it('draws no subline for a column that declares none', async () => {
		const wrapper = mountBrowser(['name', { key: 'reviewVerdict', source: 'row', label: 'Assessment' }])
		await flushPromises()
		expect(sublines(wrapper)).toEqual([])
		wrapper.unmount()
	})
})
