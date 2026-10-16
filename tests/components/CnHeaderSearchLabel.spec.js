/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The app's own line on the search field in Nextcloud's header under the
 * board look (screens-board-top-bar-search).
 *
 * @spec openspec/changes/screens-board-top-bar-search/tasks.md
 */
import { mount } from '@vue/test-utils'
import CnAppRoot from '../../src/components/CnAppRoot/CnAppRoot.vue'
import CnHeaderSearchLabel from '../../src/components/CnHeaderSearchLabel/CnHeaderSearchLabel.vue'

const NC_LINE = 'Search apps, files, tags, messages …'

/** Nextcloud's header with its resting search field, as Nextcloud 34 draws it. */
function addHeader() {
	const header = document.createElement('div')
	header.id = 'header'
	header.innerHTML = '<div class="header-end"><div class="unified-search-menu"><search class="unified-search-input">'
		+ '<button type="button" class="unified-search-input__button"><span class="unified-search-input__icon"></span>'
		+ `<span class="unified-search-input__label">${NC_LINE}</span></button></search></div></div>`
	document.body.appendChild(header)
	return header
}

const label = () => document.querySelector('#header .unified-search-input__label')
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
	document.body.innerHTML = ''
})

describe('CnHeaderSearchLabel', () => {
	it('writes the line into the label and keeps every node Nextcloud drew', async () => {
		const header = addHeader()
		const button = header.querySelector('button')
		const span = label()
		const text = span.firstChild
		const w = mount(CnHeaderSearchLabel, { props: { label: 'Zoek zaken, documenten of contacten' } })
		expect(span.textContent).toBe('Zoek zaken, documenten of contacten')
		expect(label()).toBe(span)
		expect(span.firstChild).toBe(text)
		expect(header.querySelector('button')).toBe(button)
		expect(button.children).toHaveLength(2)
		w.unmount()
	})

	it('puts Nextcloud\'s line back on unmount', () => {
		addHeader()
		const w = mount(CnHeaderSearchLabel, { props: { label: 'Zoek zaken' } })
		w.unmount()
		expect(label().textContent).toBe(NC_LINE)
	})

	it('writes the line again when Nextcloud re-renders the field', async () => {
		const header = addHeader()
		const w = mount(CnHeaderSearchLabel, { props: { label: 'Zoek zaken' } })
		header.querySelector('.unified-search-menu').innerHTML = '<search class="unified-search-input"><button type="button" class="unified-search-input__button">'
			+ `<span class="unified-search-input__label">${NC_LINE}</span></button></search>`
		await flush()
		expect(label().textContent).toBe('Zoek zaken')
		w.unmount()
		expect(label().textContent).toBe(NC_LINE)
	})

	it('follows a changed label', async () => {
		addHeader()
		const w = mount(CnHeaderSearchLabel, { props: { label: 'Zoek zaken' } })
		await w.setProps({ label: 'Zoek tickets' })
		expect(label().textContent).toBe('Zoek tickets')
		w.unmount()
	})

	it('does nothing without a header or without the field', () => {
		const w = mount(CnHeaderSearchLabel, { props: { label: 'Zoek zaken' } })
		expect(document.body.textContent).toBe('')
		w.unmount()
		const header = document.createElement('div')
		header.id = 'header'
		document.body.appendChild(header)
		const w2 = mount(CnHeaderSearchLabel, { props: { label: 'Zoek zaken' } })
		expect(header.innerHTML).toBe('')
		w2.unmount()
	})
})

describe('the header search line in CnAppRoot', () => {
	const mountRoot = ({ look = 'board', nav = { searchPlaceholder: 'Zoek zaken, documenten of contacten' } } = {}) => mount(CnAppRoot, {
		props: {
			appId: 'dossiq',
			manifest: { version: '1.0.0', menu: [], pages: [], nav },
			requiresApps: [],
			look,
		},
		global: { stubs: { CnAppLoading: true, CnAppNav: true, CnEnvironmentBanner: true, CnCommandPalette: true, CnAiCompanion: true, CnObjectSidebar: true, CnWalkthrough: true }, mocks: { $route: { params: {} } } },
	})

	it('applies nav.searchPlaceholder under the board look', async () => {
		addHeader()
		const w = mountRoot()
		await w.vm.$nextTick()
		expect(w.findComponent(CnHeaderSearchLabel).exists()).toBe(true)
		expect(label().textContent).toBe('Zoek zaken, documenten of contacten')
		w.unmount()
		expect(label().textContent).toBe(NC_LINE)
	})

	it('leaves Nextcloud\'s line without the board look, without the key, or without a header', async () => {
		addHeader()
		expect(mountRoot({ look: '' }).findComponent(CnHeaderSearchLabel).exists()).toBe(false)
		expect(mountRoot({ nav: {} }).findComponent(CnHeaderSearchLabel).exists()).toBe(false)
		expect(label().textContent).toBe(NC_LINE)
		document.body.innerHTML = ''
		expect(mountRoot().findComponent(CnHeaderSearchLabel).exists()).toBe(false)
	})
})
