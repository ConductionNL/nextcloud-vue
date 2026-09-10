/**
 * Tests for the declared query-string props a page type may receive.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * `resolvedProps` merged the page's top-level fields, its `config` and the
 * route PARAMS, and never the query. A page type that documented a
 * query-string prop therefore could not be handed one: CnFlowDetail declares a
 * `run` prop and its own JSDoc says it arrives from `?run=`, and no URL could
 * set it. Every run deep link in the fleet opened the right flow with no run
 * selected, which reads as a broken link rather than as a missing wire.
 *
 * WHY IT IS AN ALLOWLIST
 * ----------------------
 * Query keys and config keys share one namespace in `resolvedProps`. Spreading
 * the whole query would let `?register=x` or `?showDeleteAction=true` overrule
 * what a manifest declared, on every page type in all 21 apps at once. So the
 * negative tests below are not tidiness: they are the reason the positive one
 * is allowed to exist, and they must keep failing if the allowlist is ever
 * softened into a spread.
 */
import { shallowMount } from '@vue/test-utils'

import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'

const manifest = {
	version: '1.0.0',
	menu: [],
	pages: [
		{
			id: 'FlowDetail',
			route: '/flows/:id',
			type: 'flow',
			title: 'Flow',
			config: { app: 'dossiq' },
		},
		{
			id: 'Tickets',
			route: '/tickets',
			type: 'index',
			title: 'Tickets',
			config: { register: 'dossiq', schema: 'ticket', columns: [] },
		},
	],
}

/**
 * Mount the renderer on one page with a given route params/query pair.
 *
 * @param {string} name The route name to render.
 * @param {object} params The route params.
 * @param {object} query The route query.
 * @return {object} The wrapper.
 */
function mountPage(name, params = {}, query = {}) {
	return shallowMount(CnPageRenderer, {
		props: { manifest },
		global: { mocks: { $route: { name, params, query } } },
	})
}

describe('CnPageRenderer declared query props', () => {
	it('hands a flow page the run named by ?run=', () => {
		const wrapper = mountPage('FlowDetail', { id: 'flow-1' }, { run: 'run-7' })

		expect(wrapper.vm.resolvedProps.run).toBe('run-7')
		expect(wrapper.vm.resolvedProps.id).toBe('flow-1')
	})

	it('leaves run undefined when the URL names none', () => {
		const wrapper = mountPage('FlowDetail', { id: 'flow-1' }, {})

		// Undefined, never '' — the prop's own default is '', and forwarding an
		// empty string would make "no run named" two values instead of one.
		expect(wrapper.vm.resolvedProps.run).toBeUndefined()
	})

	it('drops an empty ?run=', () => {
		const wrapper = mountPage('FlowDetail', { id: 'flow-1' }, { run: '' })

		expect(wrapper.vm.resolvedProps.run).toBeUndefined()
	})

	it('drops a repeated ?run=a&run=b, which arrives as an array', () => {
		const wrapper = mountPage('FlowDetail', { id: 'flow-1' }, { run: ['a', 'b'] })

		// A String-typed prop handed an array is a Vue type warning and an
		// unusable value. Two runs is not a deep link to one run.
		expect(wrapper.vm.resolvedProps.run).toBeUndefined()
	})

	it('does NOT forward a query key the page type never declared', () => {
		const wrapper = mountPage('FlowDetail', { id: 'flow-1' }, { run: 'run-7', app: 'evil' })

		// `app` is a real config key on this page. If the query could set it,
		// a URL would repoint the page at another app's flow store.
		expect(wrapper.vm.resolvedProps.app).toBe('dossiq')
	})

	it('does NOT forward query keys to a page type with no declaration', () => {
		const wrapper = mountPage('Tickets', {}, { run: 'run-7', register: 'evil', showDeleteAction: 'true' })

		expect(wrapper.vm.resolvedProps.run).toBeUndefined()
		expect(wrapper.vm.resolvedProps.register).toBe('dossiq')
		expect(wrapper.vm.resolvedProps.showDeleteAction).toBeUndefined()
	})

	it('lets a route param outrank a query key of the same name', () => {
		const wrapper = mountPage('FlowDetail', { id: 'flow-1', run: 'from-path' }, { run: 'from-query' })

		// A path segment is stronger evidence about what is being addressed
		// than a query is, so params stay the last word.
		expect(wrapper.vm.resolvedProps.run).toBe('from-path')
	})

	it('survives a route with no query object at all', () => {
		const wrapper = shallowMount(CnPageRenderer, {
			props: { manifest },
			global: { mocks: { $route: { name: 'FlowDetail', params: { id: 'flow-1' } } } },
		})

		expect(wrapper.vm.resolvedProps.run).toBeUndefined()
		expect(wrapper.vm.resolvedProps.id).toBe('flow-1')
	})
})
