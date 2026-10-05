/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnLinkCardsPage, the `type: "links"` page: link cards grouped under
 * captions, translated, gated like menu entries, and real links.
 */
import { mount } from '@vue/test-utils'
import CnLinkCardsPage from '../../src/components/CnLinkCardsPage/CnLinkCardsPage.vue'
import { defaultPageTypes } from '../../src/components/CnPageRenderer/pageTypes.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const categories = { sales: 'cat.sales', marketing: 'cat.marketing', empty: 'cat.empty' }
const cards = [
	{ id: 'Leads', label: 'card.leads', description: 'card.leads.desc', icon: 'CashMultiple', category: 'sales', route: 'Leads' },
	{ id: 'Pipeline', label: 'Pipeline', category: 'sales', route: '/pipeline', query: { view: 'board' } },
	{ id: 'Segments', label: 'Segments', category: 'marketing', route: 'Segments', visibleIf: { 'user.isAdmin': true } },
	{ id: 'Docs', label: 'Documentation', href: 'https://docs.example.org' },
	{ id: 'Secret', label: 'Secret', category: 'marketing', route: 'Secret', permission: 'secret.read' },
]
const messages = { 'cat.sales': 'Verkoop', 'cat.marketing': 'Marketing', 'card.leads': 'Leads NL', 'card.leads.desc': 'Elke deal.', 'page.title': 'Modules en meer' }

/**
 * @param {object} [props] Extra props.
 * @param {object} [options] `runtime`, `permissions`, `router`.
 * @return {object} The mounted page.
 */
function mountPage(props = {}, { runtime = { user: { isAdmin: true } }, permissions = [], router } = {}) {
	const $router = router ?? {
		resolve: jest.fn((to) => {
			if (to.name === 'Gone') {
				throw new Error('No match')
			}
			const query = to.query ? '?' + new URLSearchParams(to.query).toString() : ''
			return { href: '/index.php/apps/x' + (to.path ?? '/' + to.name.toLowerCase()) + query }
		}),
		push: jest.fn(() => Promise.resolve()),
	}
	const wrapper = mount(CnLinkCardsPage, {
		propsData: { title: 'page.title', categories, cards, ...props },
		global: {
			provide: { cnTranslate: (key) => messages[key] ?? key, cnManifest: { runtime }, cnPermissions: permissions },
			mocks: { $router },
		},
	})
	return { wrapper, $router }
}

const groupsOf = (wrapper) => wrapper.findAll('[data-testid="cn-link-cards-group"]')
const cardIds = (node) => node.findAll('[data-testid="cn-link-card"]').map((card) => card.attributes('data-card-id'))

describe('CnLinkCardsPage', () => {
	it('is the component the renderer mounts for type "links"', () => {
		expect(defaultPageTypes.links).toBeTruthy()
	})

	it('draws ungrouped cards first, then one group per category in declared order', () => {
		const { wrapper } = mountPage()
		expect(groupsOf(wrapper).map((group) => group.attributes('data-group'))).toEqual(['', 'sales', 'marketing'])
		expect(cardIds(groupsOf(wrapper)[0])).toEqual(['Docs'])
		expect(cardIds(groupsOf(wrapper)[1])).toEqual(['Leads', 'Pipeline'])
	})

	it('does not draw a group that has no visible card', () => {
		const { wrapper } = mountPage()
		expect(wrapper.text()).not.toContain('cat.empty')
		const gated = mountPage({}, { runtime: { user: { isAdmin: false } }, permissions: ['other'] }).wrapper
		expect(groupsOf(gated).map((group) => group.attributes('data-group'))).toEqual(['', 'sales'])
		expect(gated.text()).not.toContain('Marketing')
	})

	it('translates the title, the captions, the labels and the descriptions', () => {
		const { wrapper } = mountPage()
		expect(wrapper.find('h2').text()).toBe('Modules en meer')
		expect(wrapper.findAll('h3').map((heading) => heading.text())).toEqual(['Verkoop', 'Marketing'])
		const leads = wrapper.find('[data-card-id="Leads"]')
		expect(leads.text()).toContain('Leads NL')
		expect(leads.text()).toContain('Elke deal.')
	})

	it('renders each group as a labelled region holding a list of links', () => {
		const { wrapper } = mountPage()
		const sales = groupsOf(wrapper)[1]
		expect(sales.attributes('aria-labelledby')).toBe(sales.find('h3').attributes('id'))
		expect(sales.find('ul').findAll('li')).toHaveLength(2)
		expect(sales.findAll('li > a')).toHaveLength(2)
	})

	it('gives a route card a router-resolved href, by name or by path, with its query', () => {
		const { wrapper, $router } = mountPage()
		expect(wrapper.find('[data-card-id="Leads"]').attributes('href')).toBe('/index.php/apps/x/leads')
		expect(wrapper.find('[data-card-id="Pipeline"]').attributes('href')).toBe('/index.php/apps/x/pipeline?view=board')
		expect($router.resolve).toHaveBeenCalledWith({ path: '/pipeline', query: { view: 'board' } })
	})

	it('routes a plain click and leaves a modified click to the browser', async () => {
		const { wrapper, $router } = mountPage()
		await wrapper.find('[data-card-id="Leads"]').trigger('click')
		expect($router.push).toHaveBeenCalledWith({ name: 'Leads' })
		await wrapper.find('[data-card-id="Leads"]').trigger('click', { ctrlKey: true })
		expect($router.push).toHaveBeenCalledTimes(1)
	})

	it('opens an href card in a new tab and never routes it', async () => {
		const { wrapper, $router } = mountPage()
		const docs = wrapper.find('[data-card-id="Docs"]')
		expect(docs.attributes('href')).toBe('https://docs.example.org')
		expect(docs.attributes('target')).toBe('_blank')
		expect(docs.attributes('rel')).toBe('noopener noreferrer')
		await docs.trigger('click')
		expect($router.push).not.toHaveBeenCalled()
	})

	it('hides a card whose visibleIf fails, and while runtime has not arrived', () => {
		expect(mountPage({}, { runtime: { user: { isAdmin: false } } }).wrapper.find('[data-card-id="Segments"]').exists()).toBe(false)
		expect(mountPage({}, { runtime: null }).wrapper.find('[data-card-id="Segments"]').exists()).toBe(false)
		expect(mountPage().wrapper.find('[data-card-id="Segments"]').exists()).toBe(true)
	})

	it('checks a card permission the way the menu does: an empty list allows', () => {
		expect(mountPage().wrapper.find('[data-card-id="Secret"]').exists()).toBe(true)
		expect(mountPage({}, { permissions: ['other'] }).wrapper.find('[data-card-id="Secret"]').exists()).toBe(false)
		expect(mountPage({}, { permissions: ['secret.read'] }).wrapper.find('[data-card-id="Secret"]').exists()).toBe(true)
	})

	it('leaves out a card with no target, and one whose route does not resolve', () => {
		const { wrapper } = mountPage({ cards: [{ id: 'a', label: 'No target' }, { id: 'b', label: 'Gone', route: 'Gone' }, cards[0]] })
		expect(cardIds(wrapper)).toEqual(['Leads'])
	})

	it('ties a description to its card and marks the icon decorative', () => {
		const { wrapper } = mountPage()
		const leads = wrapper.find('[data-card-id="Leads"]')
		expect(wrapper.find(`[id="${leads.attributes('aria-describedby')}"]`).text()).toBe('Elke deal.')
		expect(wrapper.find('[data-card-id="Pipeline"]').attributes('aria-describedby')).toBeUndefined()
	})

	it('says so when no card is visible', () => {
		const { wrapper } = mountPage({ cards: [] })
		expect(wrapper.find('[data-testid="cn-link-cards-empty"]').text()).toBe('Nothing to open here.')
		expect(groupsOf(wrapper)).toHaveLength(0)
		expect(mountPage({ cards: [], emptyLabel: 'Niets' }).wrapper.find('[data-testid="cn-link-cards-empty"]').text()).toBe('Niets')
	})

	it('reads its config from a whole page when a host mounts it by hand', () => {
		const { wrapper } = mountPage({ title: null, categories: null, cards: null, page: { title: 'Own', config: { cards: [cards[0]] } } })
		expect(wrapper.find('h2').text()).toBe('Own')
		expect(cardIds(wrapper)).toEqual(['Leads'])
	})
})

describe('manifest: type "links"', () => {
	const manifest = (page) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'Modules', route: '/modules', type: 'links', title: 'Modules and more', ...page }],
	})

	it('accepts categories and cards', () => {
		const result = validateManifestV2(manifest({ config: { description: 'd', categories: { sales: 'Sales' }, cards: cards.map(({ ...card }) => card) } }))
		expect(result.errors).toEqual([])
	})

	it('refuses a page with no cards, a card with no target, one with both, and an unknown card key', () => {
		expect(validateManifestV2(manifest({})).valid).toBe(false)
		expect(validateManifestV2(manifest({ config: { cards: [] } })).valid).toBe(false)
		expect(validateManifestV2(manifest({ config: { cards: [{ id: 'a', label: 'A' }] } })).valid).toBe(false)
		expect(validateManifestV2(manifest({ config: { cards: [{ id: 'a', label: 'A', route: 'A', href: 'https://x' }] } })).valid).toBe(false)
		expect(validateManifestV2(manifest({ config: { cards: [{ id: 'a', label: 'A', route: 'A', colour: 'red' }] } })).valid).toBe(false)
	})

	it('allows more than one links page in an app', () => {
		const two = manifest({ config: { cards: [cards[0]] } })
		two.pages.push({ ...two.pages[0], id: 'More', route: '/more' })
		expect(validateManifestV2(two).errors).toEqual([])
	})
})
