/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `secondLine`: a file's second line as a list of fields joined with " · ",
 * or variants chosen by `when` (DqZaakDocumenten type · size · date,
 * DqDocumentenBeheer sender · date).
 *
 * @spec openspec/changes/files-second-line-fields/specs/files-second-line-fields/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'
import CnFilesTab from '../../src/components/CnObjectSidebar/CnFilesTab.vue'

const ROOT = '/files/admin/Open Registers/Cases/abc'

function listing() {
	return [
		{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
		...[21, 22].map((id) => ({ filename: `${ROOT}/${id}.pdf`, basename: `${id}.pdf`, type: 'file', mime: 'application/pdf', size: 1, lastmod: '2026-09-01T10:00:00Z', props: { fileid: id } })),
	]
}

const STUBS = { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' }, CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } }

function mountBrowser(propsData = {}) {
	return mount(CnFilesBrowser, {
		propsData: { rootPath: '/Open Registers/Cases/abc', rowData: { 21: { senderName: 'Inwoner' }, 22: {} }, ...propsData },
		global: { stubs: STUBS },
	})
}

const lines = (wrapper) => wrapper.findAll('[data-testid="cn-files-browser-name-secondary"]').map((line) => line.text())

describe('CnFilesBrowser secondLine', () => {
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

	it('joins the fields with " · " and leaves an empty one out', async () => {
		const wrapper = mountBrowser({ secondLine: ['senderName', 'type'] })
		await flushPromises()
		expect(lines(wrapper)).toEqual(['Inwoner · PDF', 'PDF'])
		wrapper.unmount()
	})

	it('takes the first variant whose when is true, or that has none', async () => {
		const variants = [{ when: false, fields: ['type'] }, { when: '@context.caseType.documentReview.enabled', fields: ['size'] }, { fields: ['senderName'] }]
		const wrapper = mountBrowser({ secondLine: variants })
		await flushPromises()
		expect(lines(wrapper)).toEqual(['Inwoner'])
		wrapper.unmount()
		const review = mountBrowser({ secondLine: [{ when: true, fields: ['type'] }, { fields: ['senderName'] }] })
		await flushPromises()
		expect(lines(review)).toEqual(['PDF', 'PDF'])
		review.unmount()
	})

	it('wins over nameSecondary, and is forwarded by the files tab', async () => {
		const wrapper = mountBrowser({ secondLine: ['type'], nameSecondary: '{name}' })
		await flushPromises()
		expect(lines(wrapper)).toEqual(['PDF', 'PDF'])
		wrapper.unmount()
		expect(CnFilesTab.props.secondLine).toBeDefined()
	})
})
