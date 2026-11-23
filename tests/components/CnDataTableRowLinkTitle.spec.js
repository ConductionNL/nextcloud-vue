/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row link is stretched over the whole row, so the pointer is on the link
 * wherever it is in the row and a clipped cell never gets its own hover. The
 * link carries the hovered cell's full text as its title instead.
 */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => `/index.php${p}`,
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const rows = [{ id: 'a', name: 'Welcome flow', note: 'A very long note that does not fit' }]
const columns = [{ key: 'name', label: 'Name' }, { key: 'note', label: 'Note' }]

function mountLinked() {
	const $router = {
		resolve: jest.fn((loc) => ({ href: `/apps/x/#/items/${loc.params.id}` })),
		push: jest.fn(() => Promise.resolve()),
	}
	return mount(CnDataTable, {
		propsData: { rows, columns, selectable: false, rowClickRoute: (row) => ({ name: 'item', params: { id: row.id } }) },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
		mocks: { $router },
		attachTo: document.body,
	})
}

function clip(el, clipped) {
	Object.defineProperty(el, 'scrollWidth', { configurable: true, value: clipped ? 300 : 100 })
	Object.defineProperty(el, 'clientWidth', { configurable: true, value: 100 })
}

describe('CnDataTable — row link title', () => {
	afterEach(() => {
		delete document.elementsFromPoint
		document.body.innerHTML = ''
	})

	it('shows the clipped cell under the pointer as the link title', async () => {
		const wrapper = mountLinked()
		const link = wrapper.find('[data-testid="cn-row-link"]')
		const cells = wrapper.findAll('tbody td')
		const noteCell = cells.at(cells.length - 1).element
		clip(noteCell, true)
		document.elementsFromPoint = () => [link.element, noteCell]

		await link.trigger('mousemove', { clientX: 10, clientY: 10 })

		expect(link.attributes('title')).toBe('A very long note that does not fit')
	})

	it('blanks the title over a cell that fits, so the first cell\'s own title does not show', async () => {
		const wrapper = mountLinked()
		const link = wrapper.find('[data-testid="cn-row-link"]')
		const cells = wrapper.findAll('tbody td')
		const noteCell = cells.at(cells.length - 1).element
		clip(noteCell, true)
		document.elementsFromPoint = () => [link.element, noteCell]
		await link.trigger('mousemove')
		clip(noteCell, false)
		await link.trigger('mousemove')

		expect(link.attributes('title')).toBe('')
	})
})
