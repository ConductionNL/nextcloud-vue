/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The store page as board PqStore draws it: every catalogue card carries a
 * state pill under its kind line (Installed, Update or Available), Install
 * and Update are soft pill buttons while Open stays an outlined button, the
 * first lens reads "Alle" and the search is a field with a placeholder and a
 * magnifier ("Zoek in de store"). The stylesheet half is read as text, since
 * jsdom draws no layout.
 *
 * @spec openspec/changes/store-page-board-as-drawn/specs/store-page/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('@nextcloud/dialogs', () => ({ showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const fs = require('fs')
const path = require('path')
const nl = require('../../l10n/nl.json').translations

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const boardCss = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list holds exactly this selector.
 *
 * @param {string} text The stylesheet.
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(text, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(text))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const CARDS = [
	{ slug: 'b2b', title: 'B2B sales pipeline', typeName: 'Pipeline template', publisher: 'Conduction', version: '1.3.0', installed: true, openUrl: '/apps/pipelinq' },
	{ slug: 'desk', title: 'Support desk', kind: 'app-template', version: '2.1.0', installed: true, updateAvailable: true },
	{ slug: 'box', title: 'Message box', kind: 'app-template', version: '1.0.0' },
]

async function mountStore() {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ outcome: 'ok', cards: CARDS }) }))
	const w = mount(CnStorePage, {
		props: { app: 'pipelinq' },
		global: { provide: { cnLook: 'board' }, stubs: { RouterLink: true, CnBuildiqEditButton: true } },
	})
	await flushPromises()
	return w
}

describe('CnStorePage as board PqStore draws it', () => {
	it('puts the state pill under the kind line, in the heading column', async () => {
		const w = await mountStore()
		const heading = w.findAll('.cn-store-page__card')[0].find('.cn-store-page__card-heading')
		const children = heading.element.children
		expect(children[children.length - 1].getAttribute('data-testid')).toBe('store-card-state')
		expect(children[children.length - 2].getAttribute('data-testid')).toBe('store-card-kind')
	})

	it('marks an item that is not installed as Available', async () => {
		const w = await mountStore()
		const pill = w.findAll('.cn-store-page__card')[2].find('[data-testid="store-card-state"]')
		expect(pill.text()).toBe('Available')
		expect(pill.classes()).toContain('cn-store-page__card-state--available')
		expect(nl.Available).toBe('Beschikbaar')
	})

	it('draws Install and Update as soft pill buttons and Open as an outlined one', async () => {
		const w = await mountStore()
		const actions = w.findAll('[data-testid="store-card-action"]')
		expect(actions[0].classes()).not.toContain('cn-store-page__card-action--soft')
		expect(actions[1].classes()).toContain('cn-store-page__card-action--soft')
		expect(actions[2].classes()).toContain('cn-store-page__card-action--soft')
	})

	it('reads "Alle" on the first lens and "Zoek in de store" in the search', async () => {
		const w = await mountStore()
		expect(nl[w.find('[data-testid="store-lens-all"]').text().replace(/\s*\d+$/, '')]).toBe('Alle')
		const search = w.find('input[data-testid="store-search"]')
		expect(search.attributes('type')).toBe('search')
		expect(search.attributes('placeholder')).toBe('Search the store')
		expect(search.attributes('aria-label')).toBe('Search the store')
		expect(nl['Search the store']).toBe('Zoek in de store')
	})

	it('filters the cards from the search field', async () => {
		const w = await mountStore()
		await w.find('input[data-testid="store-search"]').setValue('desk')
		expect(w.vm.query).toBe('desk')
	})

	it('heads the page on the index header rhythm, Publish 40px high', () => {
		expect(bodyOf(css, '.cn-look-board .cn-store-page--board .cn-page-header')).toContain('padding-top: 4px;')
		expect(bodyOf(css, '.cn-look-board .cn-store-page--board .cn-page-header .cn-page-header__description')).toContain('grid-row: 2;')
		expect(bodyOf(css, '.cn-look-board .cn-store-page--board .cn-store-page__header-actions > .button-vue--primary')).toContain('height: var(--cn-board-control-height) !important;')
		const standalone = '.cn-look-board .cn-page-header:not(.cn-look-nextcloud *):not(.cn-index-page *):not(.cn-settings-page *):not(.cn-chat-page *):not(.cn-files-page *):not(.cn-form-page *):not(.cn-logs-page *):not(.cn-map-page *):not(.cn-store-page--board *) .cn-page-header__description'
		expect(bodyOf(boardCss, standalone)).toContain('margin-top: 12.4px;')
	})

	it('draws the pills on a normal line in the board tag tones', () => {
		const pill = bodyOf(css, '.cn-look-board .cn-store-page__card--board .cn-store-page__card-state')
		expect(pill).toContain('line-height: normal;')
		expect(bodyOf(css, '.cn-look-board .cn-store-page__card-state--installed')).toContain('--nldesign-component-status-badge-success-background-color')
		expect(bodyOf(css, '.cn-look-board .cn-store-page__card-state--update')).toContain('--nldesign-component-status-badge-warning-background-color')
		expect(bodyOf(css, '.cn-look-board .cn-store-page__card-state--available')).toContain('background: var(--color-background-hover);')
	})

	it('draws the soft action as a pill without an edge', () => {
		const soft = bodyOf(css, '.cn-look-board .cn-store-page__card--board .cn-store-page__card-action--soft.button-vue')
		expect(soft).toContain('border-radius: 17px;')
		expect(soft).toContain('background: var(--color-primary-element-light);')
	})

	it('keeps the lens chips 8px apart over the core button margin, 36px high', () => {
		const lens = bodyOf(css, '.cn-look-board .cn-store-page__lenses > .cn-store-page__lens')
		expect(lens).toContain('margin: 0;')
		expect(lens).toContain('height: 36px;')
		expect(lens).toContain('border-radius: 18px;')
	})

	it('gives the side column 260px, 20px from the cards, and its rows a normal line', () => {
		const layout = bodyOf(css, '.cn-look-board .cn-store-page__layout')
		expect(layout).toContain('grid-template-columns: minmax(0, 1fr) 260px;')
		expect(layout).toContain('gap: 20px;')
		expect(bodyOf(css, '.cn-look-board .cn-store-page__installed li')).toContain('line-height: normal;')
		expect(bodyOf(css, '.cn-look-board .cn-store-page__side-title')).toContain('line-height: 1.2;')
		expect(bodyOf(css, '.cn-look-board .cn-store-page__side-card')).toContain('gap: 12px;')
	})
})
