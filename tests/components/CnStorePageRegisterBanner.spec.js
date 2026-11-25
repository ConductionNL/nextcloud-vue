import { getCurrentUser } from '@nextcloud/auth'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The store page as board LpStore draws it: a banner for the connected
 * register, a lens per category with its count, 8 cards per page, and the
 * widget count and usage on every card. All opt-in under the board look.
 *
 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('@nextcloud/dialogs', () => ({ showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const nl = require('../../l10n/nl.json').translations

/**
 * Items for a register: `count` items, the first three Intranet, the rest Management.
 *
 * @param {number} count How many.
 * @return {Array<object>}
 */
function items(count) {
	return Array.from({ length: count }, (_, i) => ({
		slug: `item-${i}`,
		title: `Item ${i}`,
		category: i < 3 ? 'Intranet' : 'Management',
		version: '1.0.0',
		widgets: i === 0 ? 6 : undefined,
		usage: i === 0 ? 12 : undefined,
	}))
}

async function mountStore(body, props = {}, look = 'board') {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(body) }))
	const w = mount(CnStorePage, {
		props: { app: 'launchpad', ...props },
		global: { provide: { cnLook: look }, stubs: { RouterLink: true, CnBuildiqEditButton: true } },
	})
	await flushPromises()
	return w
}

const lensText = (w) => w.findAll('.cn-store-page__lens').map((b) => b.text().replace(/\s+/g, ' ').trim())

describe('CnStorePage category lenses', () => {
	it('adds a lens per served category, sorted, with its count', async () => {
		const w = await mountStore({ outcome: 'ok', cards: items(4) }, { categoryLenses: true })
		expect(lensText(w)).toEqual(['All items 4', 'Installed 0', 'Updates available 0', 'Intranet 3', 'Management 1'])
		await w.find('[data-testid="store-lens-category:Management"]').trigger('click')
		expect(w.findAll('.cn-store-page__card')).toHaveLength(1)
	})

	it('reads a list of categories and counts each once per item', async () => {
		const cards = [{ slug: 'a', category: ['Intranet', 'Intranet', 'HR'] }, { slug: 'b', category: '' }]
		const w = await mountStore({ outcome: 'ok', cards }, { categoryLenses: true })
		expect(lensText(w).slice(3)).toEqual(['HR 1', 'Intranet 1'])
	})

	it('shows no category lens without categoryLenses', async () => {
		const w = await mountStore({ outcome: 'ok', cards: items(4) })
		expect(lensText(w)).toHaveLength(3)
	})
})

describe('CnStorePage paging', () => {
	it('shows pageSize cards and a pager that moves on', async () => {
		const w = await mountStore({ outcome: 'ok', cards: items(23) }, { pageSize: 8 })
		expect(w.findAll('.cn-store-page__card')).toHaveLength(8)
		expect(w.find('[data-testid="store-pager-label"]').text()).toBe('Page 1 of 3')
		await w.find('[data-testid="store-pager-next"]').trigger('click')
		expect(w.find('[data-testid="store-pager-label"]').text()).toBe('Page 2 of 3')
		expect(w.findAll('.cn-store-page__card')[0].text()).toContain('Item 8')
		expect(nl['Page {page} of {pages}']).toBe('Pagina {page} van {pages}')
	})

	it('returns to the first page on another lens', async () => {
		const w = await mountStore({ outcome: 'ok', cards: items(23) }, { pageSize: 8, categoryLenses: true })
		await w.find('[data-testid="store-pager-next"]').trigger('click')
		await w.find('[data-testid="store-lens-all"]').trigger('click')
		await w.find('[data-testid="store-lens-category:Management"]').trigger('click')
		expect(w.find('[data-testid="store-pager-label"]').text()).toBe('Page 1 of 3')
		expect(w.findAll('.cn-store-page__card')[0].text()).toContain('Item 3')
	})

	it('draws no pager when everything fits, or without the board look', async () => {
		const w = await mountStore({ outcome: 'ok', cards: items(5) }, { pageSize: 8 })
		expect(w.find('[data-testid="store-pager"]').exists()).toBe(false)
		const plain = await mountStore({ outcome: 'ok', cards: items(23) }, { pageSize: 8 }, 'nextcloud')
		expect(plain.findAll('.cn-store-page__card')).toHaveLength(23)
	})
})

describe('CnStorePage card widgets and usage', () => {
	it('shows the counts the register reports and nothing otherwise', async () => {
		const w = await mountStore({ outcome: 'ok', cards: items(2) })
		const [first, second] = w.findAll('.cn-store-page__card')
		expect(first.find('[data-testid="store-card-widgets"]').text()).toBe('6 widgets')
		expect(first.find('[data-testid="store-card-usage"]').text()).toBe('Used by 12 organisations')
		expect(second.find('[data-testid="store-card-widgets"]').exists()).toBe(false)
		expect(second.find('[data-testid="store-card-usage"]').exists()).toBe(false)
	})
})

describe('CnStorePage register banner', () => {
	const registry = { name: 'VNG dashboardregister', url: 'https://register.vng.nl/dashboards/?x=1' }

	afterEach(() => getCurrentUser.mockImplementation(() => ({ uid: 'admin', isAdmin: true })))

	it('names the register, its address, the last check and Connected', async () => {
		const w = await mountStore({ outcome: 'ok', cards: items(1), registry, checkedAt: '2026-11-25T06:00:00Z' }, { banner: {} })
		const banner = w.find('[data-testid="store-banner"]')
		expect(banner.find('[data-testid="store-banner-name"]').text()).toBe('VNG dashboardregister')
		expect(banner.find('[data-testid="store-banner-address"]').text()).toBe('register.vng.nl/dashboards')
		expect(banner.find('[data-testid="store-banner-checked"]').text()).toContain('Last checked')
		expect(banner.find('[data-testid="store-banner-state"]').text()).toBe('Connected')
		expect(banner.find('[data-testid="store-banner-note"]').exists()).toBe(false)
	})

	it('tells whoever may not install that only administrators do', async () => {
		getCurrentUser.mockImplementation(() => ({ uid: 'pieter', isAdmin: false }))
		const w = await mountStore({ outcome: 'ok', cards: items(1), registry }, { banner: {} })
		expect(w.find('[data-testid="store-banner-note"]').text()).toBe('Only administrators install for the whole organisation.')
		expect(nl['Only administrators install for the whole organisation.']).toBe('Alleen beheerders installeren voor de hele organisatie.')
	})

	it('says Not reachable when the register did not answer, and falls back to the address as name', async () => {
		const w = await mountStore({ outcome: 'store_unreachable', cards: [], registry: { url: 'https://r.example/x' } }, { banner: {} })
		expect(w.find('[data-testid="store-banner-name"]').text()).toBe('r.example/x')
		expect(w.find('[data-testid="store-banner-state"]').text()).toBe('Not reachable')
	})

	it('without a register says none is connected, links to the settings and shows no lenses or cards', async () => {
		const w = await mountStore({ outcome: 'not_configured', cards: [] }, { banner: { settingsUrl: '/apps/launchpad/admin/sharing', settingsLabel: 'Open the Sharing tab' } })
		expect(w.find('[data-testid="store-banner-not-connected"]').exists()).toBe(true)
		const link = w.find('[data-testid="store-banner-settings"]')
		expect(link.text()).toBe('Open the Sharing tab')
		expect(link.attributes('href')).toBe('/apps/launchpad/admin/sharing')
		expect(w.find('.cn-store-page__lens-row').exists()).toBe(false)
		expect(w.find('[data-testid="store-not-configured"]').exists()).toBe(false)
		expect(w.find('[data-testid="store-results"]').exists()).toBe(false)
	})

	it('draws no banner without the config', async () => {
		const w = await mountStore({ outcome: 'ok', cards: items(1), registry })
		expect(w.find('[data-testid="store-banner"]').exists()).toBe(false)
	})
})
