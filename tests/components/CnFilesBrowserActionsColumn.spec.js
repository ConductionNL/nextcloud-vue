/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The files table lays out fixed, so a column's width comes from its head. A
 * row button (Beoordelen) beside the row menu needs more than the menu's
 * column: the head takes the first row's measured actions cell, or the button
 * runs past the card (DqZaakDocumenten r31: a 58px column holding a 106px
 * button and the 34px menu).
 *
 * @spec openspec/changes/files-actions-column-fits-row-button/specs/files-actions-column-fits-row-button/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'

const ROOT = '/files/admin/Open Registers/Cases/abc'
const STUBS = { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' }, CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } }

/**
 * A listing: the folder and two files.
 *
 * @return {Array<object>} The DAV entries.
 */
function listing() {
	return [
		{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
		...[21, 22].map((id) => ({ filename: `${ROOT}/${id}.pdf`, basename: `${id}.pdf`, type: 'file', mime: 'application/pdf', size: 1, lastmod: '2026-09-01T10:00:00Z', props: { fileid: id } })),
	]
}

describe('CnFilesBrowser actions column', () => {
	let widths

	beforeEach(() => {
		global.__cnDavContents = listing()
		global.__cnFileActions = []
		global.__cnNewMenuEntries = []
		widths = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
		// jsdom lays nothing out: the row button is 106px, the menu 34px.
		Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
			configurable: true,
			get() {
				if (this.classList.contains('cn-files-browser__row-button')) {
					return 106
				}
				return this.classList.contains('cn-files-browser__row-menu') ? 34 : 0
			},
		})
	})

	afterEach(() => {
		Object.defineProperty(HTMLElement.prototype, 'offsetWidth', widths)
		delete global.__cnDavContents
		delete global.__cnFileActions
		delete global.__cnNewMenuEntries
	})

	it('sizes the head to the first row\'s button and menu', async () => {
		const wrapper = mount(CnFilesBrowser, {
			propsData: { rootPath: '/Open Registers/Cases/abc', rowButton: { id: 'assess', label: 'Assess', type: 'handler', handler: 'x' } },
			global: { stubs: STUBS },
		})
		await flushPromises()
		await wrapper.vm.$nextTick()
		const head = wrapper.find('thead th.cn-files-browser__col-actions')
		// 106 + 34, plus the cell's padding and the 14px gap where the browser's CSS applies.
		expect(parseFloat(head.element.style.width)).toBeGreaterThanOrEqual(140)
		wrapper.unmount()
	})

	it('leaves the head alone without a row button', async () => {
		const wrapper = mount(CnFilesBrowser, { propsData: { rootPath: '/Open Registers/Cases/abc' }, global: { stubs: STUBS } })
		await flushPromises()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('thead th.cn-files-browser__col-actions').element.style.width).toBe('')
		wrapper.unmount()
	})
})
