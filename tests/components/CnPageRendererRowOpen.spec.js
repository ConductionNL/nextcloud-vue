/**
 * Tests for CnPageRenderer.onRowOpen — the bridge that makes an index page's
 * built-in View action (and row-click) navigate to the matching detail page.
 * CnIndexPage only emits `view` / `row-click`; for manifest-driven pages
 * CnPageRenderer must resolve the `type: 'detail'` page with the same
 * register+schema and push to it with the row id as the `:id` route param.
 */
import { shallowMount } from '@vue/test-utils'

const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default

const manifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	pages: [
		{ id: 'Meetings', route: '/meetings', type: 'index', title: 'Meetings', config: { register: 'decidesk', schema: 'meeting' } },
		{ id: 'MeetingDetail', route: '/meetings/:id', type: 'detail', title: 'Meeting', config: { register: 'decidesk', schema: 'meeting' } },
		{ id: 'Decisions', route: '/decisions', type: 'index', title: 'Decisions', config: { register: 'decidesk', schema: 'decision' } },
		{ id: 'DecisionDetail', route: '/decisions/:id', type: 'detail', title: 'Decision', config: { register: 'decidesk', schema: 'decision' } },
	],
}

// Stub page components so mounting doesn't instantiate the real CnIndexPage
// (which needs an active Pinia). We only exercise the onRowOpen method.
const stub = { name: 'StubPage', render: (h) => h('div') }
const pageTypes = { index: stub, detail: stub }

function mountAt(pageId, m = manifest) {
	const push = jest.fn(() => Promise.resolve())
	const wrapper = shallowMount(CnPageRenderer, {
		propsData: { manifest: m, pageTypes },
		mocks: { $route: { name: pageId, params: {} }, $router: { push } },
	})
	return { wrapper, push }
}

describe('CnPageRenderer.onRowOpen', () => {
	it('navigates to the matching detail page with the row id', () => {
		const { wrapper, push } = mountAt('Meetings')
		wrapper.vm.onRowOpen({ id: 'abc-123', title: 'A meeting' })
		expect(push).toHaveBeenCalledWith({ name: 'MeetingDetail', params: { id: 'abc-123' } })
	})

	it('picks the detail page matching THIS index page register+schema', () => {
		const { wrapper, push } = mountAt('Decisions')
		wrapper.vm.onRowOpen({ id: 'dec-9' })
		expect(push).toHaveBeenCalledWith({ name: 'DecisionDetail', params: { id: 'dec-9' } })
	})

	it('falls back to @self.id / @self.uuid for the id', () => {
		const { wrapper, push } = mountAt('Meetings')
		wrapper.vm.onRowOpen({ '@self': { uuid: 'uuid-7' } })
		expect(push).toHaveBeenCalledWith({ name: 'MeetingDetail', params: { id: 'uuid-7' } })
	})

	it('no-ops when the row has no resolvable id', () => {
		const { wrapper, push } = mountAt('Meetings')
		wrapper.vm.onRowOpen({ title: 'no id here' })
		expect(push).not.toHaveBeenCalled()
	})

	it('no-ops when no matching detail page exists', () => {
		const noDetail = { ...manifest, pages: manifest.pages.filter(p => p.type !== 'detail') }
		const { wrapper, push } = mountAt('Meetings', noDetail)
		wrapper.vm.onRowOpen({ id: 'abc-123' })
		expect(push).not.toHaveBeenCalled()
	})

	it('resolvedProps sets rowClickToView on an index page that has a detail page', () => {
		const { wrapper } = mountAt('Meetings')
		expect(wrapper.vm.resolvedProps.rowClickToView).toBe(true)
	})

	it('resolvedProps omits rowClickToView when no matching detail page exists', () => {
		const noDetail = { ...manifest, pages: manifest.pages.filter(p => p.type !== 'detail') }
		const { wrapper } = mountAt('Meetings', noDetail)
		expect(wrapper.vm.resolvedProps.rowClickToView).toBeUndefined()
	})

	describe('the target route names its own id param', () => {
		// A manifest is free to write `/applications/:objectId`. Pushing a
		// hardcoded `{ id }` there makes vue-router discard the param and throw
		// `Missing required param "objectId"`, so the row click dies in an
		// unhandled error instead of navigating (seen on buildiq's Apps page).
		const objectIdManifest = {
			...manifest,
			pages: [
				{ id: 'Apps', route: '/applications', type: 'index', title: 'Apps', config: { register: 'buildiq', schema: 'built-app' } },
				{ id: 'AppDetail', route: '/applications/:objectId', type: 'detail', title: 'App', config: { register: 'buildiq', schema: 'built-app' } },
			],
		}

		it('uses the param the detail route declares, not `id`', () => {
			const { wrapper, push } = mountAt('Apps', objectIdManifest)
			wrapper.vm.onRowOpen({ id: 'pet-store' })
			expect(push).toHaveBeenCalledWith({ name: 'AppDetail', params: { objectId: 'pet-store' } })
		})

		it('carries the parent params of a nested detail route over', () => {
			const nested = {
				...manifest,
				pages: [
					{ id: 'Schemas', route: '/builder/:slug/schemas', type: 'index', title: 'Schemas', config: { register: 'b', schema: 's' } },
					{ id: 'SchemaDetail', route: '/builder/:slug/schemas/:schemaId', type: 'detail', title: 'Schema', config: { register: 'b', schema: 's' } },
				],
			}
			const push = jest.fn(() => Promise.resolve())
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: { manifest: nested, pageTypes },
				mocks: { $route: { name: 'Schemas', params: { slug: 'pet-store' } }, $router: { push } },
			})
			wrapper.vm.onRowOpen({ id: 'sch-4' })
			expect(push).toHaveBeenCalledWith({ name: 'SchemaDetail', params: { slug: 'pet-store', schemaId: 'sch-4' } })
		})

		it('reads the path off the router for a rowRoute outside the manifest', () => {
			const external = {
				...manifest,
				pages: [
					{ id: 'Apps', route: '/applications', type: 'index', title: 'Apps', config: { register: 'buildiq', schema: 'built-app', rowRoute: 'Canvas' } },
				],
			}
			const push = jest.fn(() => Promise.resolve())
			const getRoutes = () => [{ name: 'Canvas', path: '/canvas/:canvasId' }]
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: { manifest: external, pageTypes },
				mocks: { $route: { name: 'Apps', params: {} }, $router: { push, getRoutes } },
			})
			wrapper.vm.onRowOpen({ id: 'c-1' })
			expect(push).toHaveBeenCalledWith({ name: 'Canvas', params: { canvasId: 'c-1' } })
		})
	})
})

/**
 * `config.rowRoute` — the escape hatch for an index whose detail surface is NOT
 * a `type: 'detail'` page (an authoring canvas, a form page, another register).
 * The key used to parse, validate and do nothing, so such an index shipped rows
 * that were dead on click and looked exactly like a broken table.
 */
describe('CnPageRenderer.onRowOpen with config.rowRoute', () => {
	const graphManifest = {
		$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
		version: '1.0.0',
		pages: [
			{
				id: 'GraphIndex',
				route: '/graphs',
				type: 'index',
				title: 'Graphs',
				// The detail surface is a CUSTOM page, so there is no
				// register+schema detail page to derive.
				config: { register: 'hermiq', schema: 'agentflow', rowRoute: 'GraphDetail' },
			},
			{ id: 'GraphDetail', route: '/graphs/:id', type: 'custom', component: 'GraphBuilder', title: 'Graph' },
		],
	}

	function mountGraphs(m = graphManifest, router = {}) {
		const push = jest.fn(() => Promise.resolve())
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest: m, pageTypes },
			mocks: { $route: { name: 'GraphIndex', params: {} }, $router: { push, ...router } },
		})
		return { wrapper, push }
	}

	it('opens the named custom page even though no detail page matches', () => {
		const { wrapper, push } = mountGraphs()
		wrapper.vm.onRowOpen({ id: 'graph-1' })
		expect(push).toHaveBeenCalledWith({ name: 'GraphDetail', params: { id: 'graph-1' } })
	})

	it('enables rowClickToView from rowRoute alone', () => {
		const { wrapper } = mountGraphs()
		expect(wrapper.vm.resolvedProps.rowClickToView).toBe(true)
	})

	it('wins over a matching detail page', () => {
		const both = {
			...graphManifest,
			pages: [
				...graphManifest.pages,
				{ id: 'AgentflowDetail', route: '/af/:id', type: 'detail', title: 'Agentflow', config: { register: 'hermiq', schema: 'agentflow' } },
			],
		}
		const { wrapper, push } = mountGraphs(both)
		wrapper.vm.onRowOpen({ id: 'graph-2' })
		expect(push).toHaveBeenCalledWith({ name: 'GraphDetail', params: { id: 'graph-2' } })
	})

	it('reports an unregistered route name instead of navigating', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		// A router that CAN be asked, and says no.
		const { wrapper, push } = mountGraphs(graphManifest, { hasRoute: () => false })
		wrapper.vm.onRowOpen({ id: 'graph-3' })
		expect(push).not.toHaveBeenCalled()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('GraphDetail'))
		warn.mockRestore()
	})

	it('navigates when the router cannot be asked about route names', () => {
		// No hasRoute / getRoutes on the router (older router, or a test double):
		// an unanswerable question must not block a working row click.
		const { wrapper, push } = mountGraphs()
		wrapper.vm.onRowOpen({ id: 'graph-4' })
		expect(push).toHaveBeenCalled()
	})

	it('navigates when getRoutes lists the name', () => {
		const { wrapper, push } = mountGraphs(graphManifest, {
			getRoutes: () => [{ name: 'GraphIndex' }, { name: 'GraphDetail' }],
		})
		wrapper.vm.onRowOpen({ id: 'graph-5' })
		expect(push).toHaveBeenCalledWith({ name: 'GraphDetail', params: { id: 'graph-5' } })
	})
})
