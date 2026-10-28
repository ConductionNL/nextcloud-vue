/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The store page around its cards under the board look (board PqStore): the
 * page header with buildiq and Publish, lens chips with counts, the search
 * beside them, and a side column with the installed items, the update check
 * and what ships with the app.
 *
 * @spec openspec/changes/store-page-board-shell/specs/store-page/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('@nextcloud/dialogs', () => ({ showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const CARDS = [
	{ slug: 'b2b', title: 'B2B sales pipeline', kind: 'pipeline', version: '1.3.0', installed: true, installedVersion: '1.3.0' },
	{ slug: 'desk', title: 'Service desk routing', kind: 'queue-routing', version: '2.1.0', installed: true, installedVersion: '2.0.1', updateAvailable: true },
	{ slug: 'brevo', title: 'Bulk mail via Brevo', kind: 'connector', version: '1.4.0', installed: true, installedVersion: '1.4.0' },
	{ slug: 'box', title: 'Message box', kind: 'connector', version: '1.0.0' },
	{ slug: 'pos', title: 'Retail POS setup', kind: 'pos-setup', version: '1.1.0' },
]

const BUILT_IN = [
	{ slug: 'b2b', title: 'B2B sales pipeline' },
	{ slug: 'desk', title: 'Service desk routing' },
]

async function mountStore(props = {}, body = {}) {
	global.fetch = jest.fn(() => Promise.resolve({
		ok: true,
		json: () => Promise.resolve({ outcome: 'ok', cards: CARDS, checkedAt: '2026-10-28T06:00:00+01:00', ...body }),
	}))
	const w = mount(CnStorePage, {
		props: {
			app: 'pipelinq',
			description: 'Templates and connectors, {count} in the registry',
			builtIn: BUILT_IN,
			kindLenses: [{ kind: 'connector', label: 'Connectors' }],
			publishRoute: 'StorePublish',
			...props,
		},
		global: {
			provide: { cnLook: 'board' },
			stubs: { RouterLink: true, CnBuildiqEditButton: { template: '<button data-testid="buildiq" />' } },
		},
	})
	await flushPromises()
	return w
}

describe('CnStorePage board shell', () => {
	it('heads the page with an h1, the registry count, buildiq and Publish', async () => {
		const w = await mountStore()
		expect(w.find('h1').text()).toBe('Store')
		expect(w.find('[data-testid="cn-page-description"]').text()).toBe('Templates and connectors, 5 in the registry')
		expect(w.find('[data-testid="buildiq"]').exists()).toBe(true)
		expect(w.find('[data-testid="store-publish"]').exists()).toBe(true)
	})

	it('offers lens chips with counts: all, installed, updates and the kind lenses', async () => {
		const w = await mountStore()
		const chips = w.findAll('[data-testid^="store-lens-"]').map((chip) => chip.text().replace(/\s+/g, ' '))
		expect(chips).toEqual(['All 5', 'Installed 3', 'Updates available 1', 'Connectors 2'])
	})

	it('filters the cards by the chosen lens', async () => {
		const w = await mountStore()
		await w.find('[data-testid="store-lens-connector"]').trigger('click')
		const titles = w.findAll('[data-testid="store-results"] h3').map((h) => h.text())
		expect(titles).toEqual(['Bulk mail via Brevo', 'Message box'])
		await w.find('[data-testid="store-lens-updates"]').trigger('click')
		expect(w.findAll('[data-testid="store-results"] h3').map((h) => h.text())).toEqual(['Service desk routing'])
	})

	it('names the installed and the newer version on a card with an update', async () => {
		const w = await mountStore()
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[1]
		expect(card.find('.cn-store-page__card-version').text()).toBe('Version 2.0.1, 2.1.0 is out')
	})

	it('lists the installed items with their versions in the side column', async () => {
		const w = await mountStore()
		const rows = w.findAll('[data-testid="store-installed"] li')
		expect(rows.map((row) => row.find('.cn-store-page__installed-title').text())).toEqual(['B2B sales pipeline', 'Service desk routing', 'Bulk mail via Brevo'])
		expect(rows[1].text()).toContain('2.0.1')
		expect(rows[1].find('[data-testid="store-installed-update"]').exists()).toBe(true)
	})

	it('says when the registry was last checked and how many updates wait, and checks again on request', async () => {
		const w = await mountStore()
		const updates = w.find('[data-testid="store-updates"]')
		expect(updates.find('[data-testid="store-updates-count"]').text()).toContain('1')
		expect(global.fetch).toHaveBeenCalledTimes(1)
		await updates.find('[data-testid="store-check-now"]').trigger('click')
		await flushPromises()
		expect(global.fetch).toHaveBeenCalledTimes(2)
	})

	it('names what ships with the app', async () => {
		const w = await mountStore()
		expect(w.find('[data-testid="store-included"]').text()).toContain('B2B sales pipeline and Service desk routing')
	})

	it('keeps the Nextcloud page without the look', async () => {
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ outcome: 'ok', cards: CARDS }) }))
		const w = mount(CnStorePage, { props: { app: 'pipelinq' }, global: { provide: { cnLook: 'nextcloud' } } })
		await flushPromises()
		expect(w.find('h1').exists()).toBe(false)
		expect(w.find('[data-testid="store-installed"]').exists()).toBe(false)
		expect(w.find('[data-testid="store-lens-all"]').exists()).toBe(false)
	})
})
