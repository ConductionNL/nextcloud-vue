/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The catalogue card of the store page under the board look: icon chip, title,
 * "<kind> · <publisher>", a state pill, the description and a footer with the
 * version and one named action.
 *
 * @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-a-catalogue-card-has-an-icon-a-state-and-one-action
 * @spec openspec/changes/screens-store-page-pq-board/specs/store-page/spec.md#requirement-the-store-page-draws-board-pqstore
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('@nextcloud/dialogs', () => ({ showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const CARDS = [
	{ slug: 'b2b', title: 'B2B sales pipeline', typeName: 'Pipeline template', publisher: 'Conduction', description: 'A sales flow.', version: '1.3.0', installed: true, openUrl: '/apps/pipelinq' },
	{ slug: 'upd', title: 'Support desk', kind: 'app-template', description: 'Tickets.', version: '2.0.0', latestVersion: '2.1.0', installed: true, updateAvailable: true },
	{ slug: 'new', title: 'Intake', kind: 'app-template', description: 'Intake form.', version: '0.1.0' },
	{ slug: 'brevo', title: 'Bulk mail', kind: 'adapter', description: 'Mailings.', version: '1.4.0' },
]

async function mountStore(look, props = {}, body = { outcome: 'ok', cards: CARDS }) {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(body) }))
	const w = mount(CnStorePage, { props: { app: 'pipelinq', ...props }, global: { provide: { cnLook: look } } })
	await flushPromises()
	return w
}

describe('CnStorePage catalogue card (board look)', () => {
	it('draws the installed template: chip, title, kind and publisher, pill, description and an Open footer', async () => {
		const w = await mountStore('board')
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[0]
		expect(card.classes()).toContain('cn-store-page__card--board')
		expect(card.find('.cn-store-page__card-chip').exists()).toBe(true)
		expect(card.find('h3').text()).toBe('B2B sales pipeline')
		expect(card.find('[data-testid="store-card-kind"]').text()).toBe('Pipeline template · Conduction')
		expect(card.find('[data-testid="store-card-state"]').text()).toBe('Installed')
		expect(card.find('.cn-store-page__card-description').text()).toBe('A sales flow.')
		expect(card.find('.cn-store-page__card-version').text()).toBe('Version 1.3.0')
		const action = card.find('[data-testid="store-card-action"]')
		expect(action.text()).toBe('Open')
		expect(action.attributes('aria-label')).toBe('Open B2B sales pipeline')
	})

	it('shows the Update pill, the newer version and the Update action for an item with an update', async () => {
		const w = await mountStore('board')
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[1]
		expect(card.find('[data-testid="store-card-state"]').text()).toBe('Update')
		expect(card.find('.cn-store-page__card-version').text()).toBe('Version 2.0.0, 2.1.0 is out')
		const action = card.find('[data-testid="store-card-action"]')
		expect(action.text()).toBe('Update')
		expect(action.classes()).toContain('cn-store-page__card-action--update')
	})

	it('shows the Available pill and an Install action for an item that is not installed', async () => {
		const w = await mountStore('board')
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[2]
		expect(card.find('[data-testid="store-card-state"]').text()).toBe('Available')
		expect(card.find('[data-testid="store-card-state"]').classes()).toContain('cn-store-page__card-state--available')
		expect(card.find('[data-testid="store-card-action"]').text()).toBe('Install')
	})

	it('draws chips with counts, and a chip filters the loaded cards without asking the registry again', async () => {
		const w = await mountStore('board', { kindChips: [{ value: 'adapter', label: 'Connectors' }] })
		const chips = w.findAll('[data-testid="store-chips"] button')
		expect(chips.map((c) => c.text().replace(/\s+/g, ' '))).toEqual(['All 4', 'Installed 2', 'Updates available 1', 'Connectors 1'])
		expect(chips[0].attributes('aria-pressed')).toBe('true')
		const calls = global.fetch.mock.calls.length
		await chips[1].trigger('click')
		expect(w.findAll('[data-testid="store-results"] .cn-store-page__card h3').map((h) => h.text())).toEqual(['B2B sales pipeline', 'Support desk'])
		await w.find('[data-testid="store-chip-kind:adapter"]').trigger('click')
		expect(w.findAll('[data-testid="store-results"] .cn-store-page__card h3').map((h) => h.text())).toEqual(['Bulk mail'])
		await w.find('[data-testid="store-chip-updates"]').trigger('click')
		expect(w.findAll('[data-testid="store-results"] .cn-store-page__card h3').map((h) => h.text())).toEqual(['Support desk'])
		expect(global.fetch.mock.calls.length).toBe(calls)
	})

	it('offers a chip per served kind that has a card when the app names no kind chips', async () => {
		const w = await mountStore('board')
		const labels = w.findAll('[data-testid="store-chips"] button').map((c) => c.text().replace(/\s+/g, ' '))
		expect(labels).toEqual(['All 4', 'Installed 2', 'Updates available 1', 'App template 2', 'Adapter 1'])
	})

	it('draws the side column: installed items with versions, the update check and the bundled items', async () => {
		const w = await mountStore('board', { updatesNote: 'An update keeps your own changes.', builtIn: [{ slug: 'a', title: 'B2B sales pipeline' }, { slug: 'b', title: 'Retail POS setup' }] })
		const rows = w.findAll('[data-testid="store-aside-installed"] li')
		expect(rows.map((r) => r.text().replace(/\s+/g, ' '))).toEqual(['B2B sales pipeline 1.3.0', 'Support desk 2.0.0 Update'])
		expect(w.find('[data-testid="store-updates-summary"]').text()).toBe('1 update is ready. An update keeps your own changes.')
		expect(w.find('[data-testid="store-aside-updates"]').text()).toMatch(/Last checked today at \d/)
		const builtin = w.find('[data-testid="store-aside-builtin"]')
		expect(builtin.find('h3').text()).toBe('Included with Pipelinq')
		expect(builtin.text()).toContain('B2B sales pipeline, Retail POS setup ship with the app.')
		expect(builtin.text()).toContain('Only administrators install.')
		const calls = global.fetch.mock.calls.length
		await w.find('[data-testid="store-check-updates"]').trigger('click')
		await flushPromises()
		expect(global.fetch.mock.calls.length).toBe(calls + 1)
	})

	it('says everything is up to date and that nothing is installed for a store with neither', async () => {
		const w = await mountStore('board', {}, { outcome: 'ok', cards: [CARDS[2]] })
		expect(w.find('[data-testid="store-updates-summary"]').text()).toBe('Everything is up to date.')
		expect(w.find('[data-testid="store-aside-installed"]').text()).toContain('Nothing from this store is installed yet.')
		expect(w.find('[data-testid="store-aside-builtin"]').exists()).toBe(false)
	})

	it('draws the footnote, and Publish as the primary button beside the buildiq square', async () => {
		const w = await mountStore('board', { footnote: 'Comes from the library.', publishRoute: 'Publish', canPublish: true })
		expect(w.find('[data-testid="store-footnote"]').text()).toBe('Comes from the library.')
		const buttons = w.find('.cn-store-page__header-buttons')
		expect(buttons.find('[data-testid="store-publish"]').classes()).toContain('button-vue--primary')
	})

	it('hides Install when the viewer may not install', async () => {
		const w = await mountStore('board', { canInstall: false })
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[2]
		expect(card.find('[data-testid="store-card-action"]').exists()).toBe(false)
	})

	it('lays the cards three a row from the stylesheet, with no inline track', async () => {
		const w = await mountStore('board')
		expect(w.classes()).toContain('cn-store-page--board')
		expect(w.find('[data-testid="store-results"]').attributes('style')).toBeUndefined()
		const css = require('fs').readFileSync(require('path').join(__dirname, '../../src/css/look-board-store.css'), 'utf8')
		expect(css).toMatch(/\.cn-store-page__grid \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
		expect(css).toMatch(/\.cn-store-page__aside \{[^}]*max-width: 300px/)
		expect(require('fs').readFileSync(require('path').join(__dirname, '../../src/css/index.css'), 'utf8')).toContain("@import './look-board-store.css';")
	})

	it('keeps the plain card without the look', async () => {
		const w = await mountStore('nextcloud')
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[0]
		expect(card.classes()).not.toContain('cn-store-page__card--board')
		expect(card.find('.cn-store-page__card-chip').exists()).toBe(false)
		expect(card.find('[data-testid="store-install"]').exists()).toBe(true)
		expect(w.find('[data-testid="store-results"]').attributes('style')).toBeUndefined()
		expect(w.find('[data-testid="store-chips"]').exists()).toBe(false)
		expect(w.find('[data-testid="store-aside"]').exists()).toBe(false)
		expect(w.find('[data-testid="store-footnote"]').exists()).toBe(false)
		expect(w.find('[data-testid="store-kind-all"]').exists()).toBe(true)
	})
})
