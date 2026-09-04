/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnStorePage — the `type: "store"` page primitive: browse a remote
 * OpenRegister registry and install an item, with the app's own items as the
 * no-registry fallback that ADR-080 Decision 4 makes the price of the word
 * "Store".
 *
 * @spec hydra openspec/architecture/adr-080-store-plane.md
 * @spec hydra openspec/architecture/adr-114-app-chrome-is-seven-items.md
 */

import { getCurrentUser } from '@nextcloud/auth'
import { showSuccess } from '@nextcloud/dialogs'
import { flushPromises, mount } from '@vue/test-utils'

import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'

jest.mock('@nextcloud/auth', () => ({
	getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })),
}))
jest.mock('@nextcloud/dialogs', () => ({
	showError: jest.fn(),
	showSuccess: jest.fn(),
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => p,
}))

const BUILT_IN = [
	{ slug: 'starter', title: 'Starter template', description: 'Ships with the app.' },
]

/**
 * Stub fetch with one JSON body, recording the URLs it was called with.
 *
 * @param {object} body The JSON body to answer with.
 * @param {Array<string>} urls Sink for requested URLs.
 * @param {boolean} ok The response ok flag.
 * @return {void}
 */
function stubFetch(body, urls = [], ok = true) {
	global.fetch = jest.fn((url) => {
		urls.push(url)
		return Promise.resolve({ ok, json: () => Promise.resolve(body) })
	})
}

/**
 * Mount the page with flattened props, the way CnPageRenderer supplies them.
 *
 * @param {object} props The flattened props.
 * @return {object} The wrapper.
 */
function mountPage(props = {}) {
	return mount(CnStorePage, { props: { app: 'dossiq', ...props } })
}

describe('CnStorePage', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
	})

	it('prefers the built-in items the ENGINE served over the page config', async () => {
		// An app declares these ONCE, in its `store` manifest block. The prop
		// is a second place to write the same list, and an app that declared
		// them only in the manifest used to render nothing: the engine parsed
		// them and never sent them. Mirrors how served `kinds` already wins.
		stubFetch({
			outcome: 'ok',
			cards: [],
			builtIn: [
				{ slug: 'municipality', title: 'Municipality' },
				{ slug: 'association', title: 'Association or VvE' },
				{ slug: 'corporate', title: 'Company board' },
				{ slug: 'works-council', title: 'Works council' },
			],
		})

		const wrapper = mountPage({ builtIn: [{ slug: 'from-config', title: 'From page config' }] })
		await flushPromises()

		expect(wrapper.vm.visibleBuiltIn).toHaveLength(4)
		expect(wrapper.vm.visibleBuiltIn[0].slug).toBe('municipality')
	})

	it('falls back to the page config when the engine serves no built-ins', async () => {
		stubFetch({ outcome: 'ok', cards: [] })

		const wrapper = mountPage({ builtIn: [{ slug: 'from-config', title: 'From page config' }] })
		await flushPromises()

		expect(wrapper.vm.visibleBuiltIn).toHaveLength(1)
		expect(wrapper.vm.visibleBuiltIn[0].slug).toBe('from-config')
	})

	it('still shows what the app ships when the store answers ok with nothing', async () => {
		// ADR-080 Decision 4: a surface that goes blank was never a store. A
		// configured registry that has published nothing yet answers `ok` with
		// zero cards, and the built-ins used to be hidden for any answer at
		// all — so decidiq, which declares four, rendered a heading, a search
		// box and nothing else.
		stubFetch({ outcome: 'ok', cards: [] })

		const wrapper = mountPage({
			builtIn: [
				{ slug: 'municipality', title: 'Municipality', description: 'A council.' },
				{ slug: 'association', title: 'Association or VvE', description: "A members' meeting." },
			],
		})
		await flushPromises()

		expect(wrapper.vm.visibleBuiltIn).toHaveLength(2)
		expect(wrapper.find('[data-testid="store-builtin"]').exists()).toBe(true)
	})

	it('hides the built-ins once the remote actually offers something', async () => {
		stubFetch({ outcome: 'ok', cards: [{ slug: 'remote-thing', title: 'Remote thing' }] })

		const wrapper = mountPage({
			builtIn: [{ slug: 'municipality', title: 'Municipality' }],
		})
		await flushPromises()

		expect(wrapper.vm.visibleBuiltIn).toHaveLength(0)
	})

	it('addresses the declaring app, and only the declaring app', async () => {
		const urls = []
		stubFetch({ outcome: 'ok', cards: [] }, urls)

		mountPage({ app: 'shillinq' })
		await flushPromises()

		expect(urls).toHaveLength(1)
		expect(urls[0]).toBe('/apps/shillinq/api/store/items')
	})

	// THE PROP CONTRACT, NOT page.config. CnPageRenderer flattens config into
	// top-level props and passes no `page` key at all. A component reading
	// page.config renders empty forever, which is what happened to
	// CnReportsPage before nextcloud-vue#897. This test fails if the component
	// ever goes back to reading page.config as its primary source.
	it('reads the flattened props the renderer actually passes', async () => {
		stubFetch({ outcome: 'ok', cards: [] })

		const w = mountPage({ title: 'Store', description: 'Install case types.' })
		await flushPromises()

		expect(w.text()).toContain('Install case types.')
	})

	it('renders remote cards when the registry answers', async () => {
		stubFetch({
			outcome: 'ok',
			cards: [
				{ slug: 'vth', title: 'Enforcement', description: 'A track.', kind: 'configuration-template', version: '1.2.0' },
			],
		})

		const w = mountPage({ builtIn: BUILT_IN })
		await flushPromises()

		expect(w.find('[data-testid="store-results"]').exists()).toBe(true)
		expect(w.text()).toContain('Enforcement')
		expect(w.text()).toContain('1.2.0')
		// ADR-080 D4: built-ins are the FALLBACK, not a second list beside a
		// working registry.
		expect(w.find('[data-testid="store-builtin"]').exists()).toBe(false)
	})

	it('falls back to the app\'s own items when no registry is configured', async () => {
		stubFetch({ outcome: 'not_configured', cards: [] })

		const w = mountPage({ builtIn: BUILT_IN })
		await flushPromises()

		expect(w.find('[data-testid="store-not-configured"]').exists()).toBe(true)
		expect(w.find('[data-testid="store-builtin"]').exists()).toBe(true)
		expect(w.text()).toContain('Starter template')
	})

	it('does not promise items below when the app ships none', async () => {
		stubFetch({ outcome: 'not_configured', cards: [] })

		const w = mountPage({ builtIn: [] })
		await flushPromises()

		expect(w.find('[data-testid="store-not-configured"]').exists()).toBe(true)
		expect(w.find('[data-testid="store-builtin"]').exists()).toBe(false)
		expect(w.text()).not.toContain('The items below ship with this app.')
	})

	it('reports an unreachable registry as a warning, not as an empty store', async () => {
		stubFetch({ outcome: 'store_unreachable', cards: [] })

		const w = mountPage({ builtIn: BUILT_IN })
		await flushPromises()

		expect(w.find('[data-testid="store-unreachable"]').exists()).toBe(true)
		expect(w.find('[data-testid="store-builtin"]').exists()).toBe(true)
	})

	// A network rejection must not read as "the registry said there is nothing".
	it('treats a thrown request as unreachable', async () => {
		global.fetch = jest.fn(() => Promise.reject(new Error('offline')))

		const w = mountPage()
		await flushPromises()

		expect(w.find('[data-testid="store-unreachable"]').exists()).toBe(true)
	})

	// NEGATIVE CONTROL ON THE URL. Without an app id there is no endpoint to
	// address; a request to /apps//api/... 404s and reads to the user as a
	// registry that is down.
	it('makes no request at all when no app is declared', async () => {
		const urls = []
		stubFetch({ outcome: 'ok', cards: [] }, urls)

		const w = mountPage({ app: '' })
		await flushPromises()

		expect(urls).toHaveLength(0)
		expect(w.find('[data-testid="store-not-configured"]').exists()).toBe(true)
	})

	it('hides Install from a non-administrator', async () => {
		getCurrentUser.mockReturnValue({ uid: 'user', isAdmin: false })
		stubFetch({ outcome: 'ok', cards: [{ slug: 'vth', title: 'Enforcement' }] })

		const w = mountPage()
		await flushPromises()

		expect(w.text()).toContain('Enforcement')
		expect(w.text()).not.toContain('Install')
	})

	it('installs through the declaring app and reports success', async () => {
		const urls = []
		stubFetch({ outcome: 'ok', cards: [{ slug: 'vth', title: 'Enforcement' }], components: [] }, urls)

		const w = mountPage({ app: 'dossiq' })
		await flushPromises()

		await w.findComponent({ name: 'NcButton' })
		await w.vm.install({ slug: 'vth', title: 'Enforcement' })
		await flushPromises()

		expect(urls).toContain('/apps/dossiq/api/store/items/vth/install')
		expect(showSuccess).toHaveBeenCalled()
	})

	// A partial install is an OUTCOME, not a failure: the configuration lands
	// and the refused records are named.
	it('names the components a partial install refused', async () => {
		stubFetch({
			outcome: 'ok',
			cards: [],
			success: true,
			components: [
				{ schema: 'caseType', status: 'installed' },
				{ schema: 'case', status: 'refused' },
			],
		})

		const w = mountPage()
		await flushPromises()
		await w.vm.install({ slug: 'vth', title: 'Enforcement' })
		await flushPromises()

		const report = w.find('[data-testid="store-install-report"]')
		expect(report.exists()).toBe(true)
		expect(report.text()).toContain('case')
		expect(showSuccess).not.toHaveBeenCalled()
	})

	// THE BLOCK KEY MUST NOT BE INERT. An app declares its kinds once, in the
	// `store` manifest block, and the engine serves them with the cards. Before
	// this the component read only its page config, so the block key was
	// declared and read by nobody.
	it('prefers the kinds the engine served over its own prop', async () => {
		stubFetch({ outcome: 'ok', cards: [], kinds: ['case-type', 'flow-template'] })

		const w = mountPage({ kinds: ['from-page-config'] })
		await flushPromises()

		expect(w.vm.kindOptions.map((o) => o.value)).toEqual(['', 'case-type', 'flow-template'])
	})

	// A served EMPTY list means the app declares none; it must not blank the
	// filters, because that is indistinguishable from a response that never
	// carried the key.
	it('falls back to the prop when the engine serves no kinds', async () => {
		stubFetch({ outcome: 'ok', cards: [], kinds: [] })

		const w = mountPage({ kinds: ['from-page-config'] })
		await flushPromises()

		expect(w.vm.kindOptions.map((o) => o.value)).toEqual(['', 'from-page-config'])
	})

	// The filters survive a registry that is down: the engine sends `kinds` on
	// every arm, so an unconfigured store still offers them over built-ins.
	it('keeps the served kinds when the registry is not configured', async () => {
		stubFetch({ outcome: 'not_configured', cards: [], kinds: ['case-type'] })

		const w = mountPage()
		await flushPromises()

		expect(w.vm.kindOptions.map((o) => o.value)).toEqual(['', 'case-type'])
	})

	it('offers the ADR-080 kind vocabulary, and an app\'s own kinds when given', async () => {
		stubFetch({ outcome: 'ok', cards: [] })

		const def = mountPage()
		await flushPromises()
		expect(def.vm.kindOptions.map((o) => o.value)).toEqual([
			'', 'app-template', 'adapter', 'source-template', 'configuration-template', 'agent-template',
		])

		const own = mountPage({ kinds: ['case-type'] })
		await flushPromises()
		expect(own.vm.kindOptions.map((o) => o.value)).toEqual(['', 'case-type'])
	})

	it('sends the search term and the kind filter as query parameters', async () => {
		const urls = []
		stubFetch({ outcome: 'ok', cards: [] }, urls)

		const w = mountPage()
		await flushPromises()

		w.vm.query = 'enforcement'
		await w.vm.selectKind('adapter')
		await flushPromises()

		expect(urls[urls.length - 1]).toBe(
			'/apps/dossiq/api/store/items?q=enforcement&kind=adapter',
		)
	})
})
