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
})
