const { mount } = require('@vue/test-utils')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIndexPage `tableTitle`: the table view draws a title at the top of its
 * card, in the host's translation (board PqInloop "In de wachtrij"); the head
 * row then reads on the card's white with a rule under it.
 *
 * @spec openspec/changes/index-table-title/specs/index-table-title/spec.md
 */
const fs = require('fs')
const path = require('path')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const ROWS = [{ id: 'a', title: 'Anna' }]

/**
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountPage(props) {
	return mount(CnIndexPage, {
		props: { objects: ROWS, schema: { title: 'Ticket', properties: { title: { type: 'string' } } }, viewMode: 'table', ...props },
		global: { provide: { cnTranslate: (s) => (s === 'In the queue' ? 'In de wachtrij' : s) }, stubs: { CnDataTable: true } },
	})
}

describe('CnIndexPage — a titled table card', () => {
	it('draws the title at the top of the table card, translated', () => {
		const page = mountPage({ tableTitle: 'In the queue' })
		const title = page.find('[data-testid="cn-index-page-table-title"]')
		expect(title.text()).toBe('In de wachtrij')
		expect(page.find('.cn-index-page__main').classes()).toContain('cn-index-page__main--titled')
	})

	it('draws no title without one (control)', () => {
		const page = mountPage({})
		expect(page.find('[data-testid="cn-index-page-table-title"]').exists()).toBe(false)
		expect(page.find('.cn-index-page__main').classes()).not.toContain('cn-index-page__main--titled')
	})

	it('puts the head row of a titled table on white with a rule under it (board look)', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8')
		const m = /\.cn-look-board \.cn-index-page__main--titled \.cn-data-table thead th[^{]*\{([^}]*)\}/.exec(css)
		expect(m).not.toBeNull()
		expect(m[1]).toContain('background-color: var(--color-main-background)')
		expect(m[1]).toContain('border-bottom: 1px solid var(--color-border)')
	})
})
