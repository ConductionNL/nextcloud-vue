/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Where the Edit row action goes, and where it does not.
 *
 * The renderer used to send Edit to the record's detail page whenever one
 * existed, reasoning that the modal shows flat scalars only and the detail
 * page shows the whole record. What it actually produced was an Edit bound to
 * the same `onRowOpen` as a row click: the same destination, under a second
 * name, with the form no longer reachable from the list at all. On a split
 * view that was starkest — Edit opened the pane that was already open.
 *
 * So the routing is no longer derived. Opening a record and editing it are
 * different acts; Edit shows the form, a row click opens the record, and a
 * page that wants the old behaviour declares `config.editOpensDetail: true`.
 *
 * The detail half stays: a schema-bound detail page still gains its own Edit
 * button, which is additive rather than a replacement for the modal.
 */
import { shallowMount } from '@vue/test-utils'

const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default

const manifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	pages: [
		// dossiq's real pair — the one in the bug report.
		{ id: 'CaseTypes', route: '/settings/case-types', type: 'index', title: 'Case types', config: { register: 'dossiq', schema: 'caseType' } },
		{ id: 'CaseTypeDetail', route: '/settings/case-types/:id', type: 'detail', title: 'Case type', config: { register: 'dossiq', schema: 'caseType' } },
		// An index with NO detail page: the modal is its only edit surface.
		{ id: 'Orphans', route: '/orphans', type: 'index', title: 'Orphans', config: { register: 'dossiq', schema: 'orphan' } },
		// An index whose row surface is a custom page, named explicitly.
		{ id: 'Graphs', route: '/graphs', type: 'index', title: 'Graphs', config: { register: 'dossiq', schema: 'graph', rowRoute: 'GraphCanvas' } },
		{ id: 'GraphCanvas', route: '/graphs/:id', type: 'custom', title: 'Graph', component: 'GraphCanvas' },
		// A detail page bound to no schema — nothing to build a form from.
		{ id: 'AboutPage', route: '/about/:id', type: 'detail', title: 'About', config: {} },
		// dossiq's cases pair: an index whose row click opens the record in a
		// split pane rather than leaving the list.
		{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', splitView: { enabled: true, breakpoint: 1024, paneWidth: '42%' }, config: { register: 'dossiq', schema: 'case' } },
		{ id: 'CaseDetail', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'dossiq', schema: 'case' } },
	],
}

const stub = { name: 'StubPage', render: (h) => h('div') }
const pageTypes = { index: stub, detail: stub, custom: stub }

/**
 * Mount the renderer at a page.
 *
 * @param {string} pageId The route/page id.
 * @param {object} m      The manifest.
 * @return {object} The mounted wrapper.
 */
function mountAt(pageId, m = manifest) {
	return shallowMount(CnPageRenderer, {
		propsData: { manifest: m, pageTypes },
		mocks: { $route: { name: pageId, params: {} }, $router: { push: jest.fn(() => Promise.resolve()) } },
	})
}

describe('CnPageRenderer — Edit opens the form, never a page', () => {
	it.each([
		['CaseTypes', 'a matching type:detail page'],
		['Graphs', 'an explicit rowRoute to a custom canvas'],
		['Cases', 'a split view whose pane holds the detail page'],
		['Orphans', 'nowhere to go at all'],
	])('leaves editOpensDetail off on an index with %s', (pageId) => {
		expect(mountAt(pageId).vm.resolvedProps.editOpensDetail).toBeUndefined()
	})

	it('does not follow rowClickToView — the two are different acts', () => {
		// They were one signal, and that is the whole bug: `@editOpen` and
		// `@rowClick` are both bound to `onRowOpen`, so deriving one from the
		// other made Edit a second row click and left the form unreachable.
		const p = mountAt('CaseTypes').vm.resolvedProps
		expect(p.rowClickToView).toBe(true)
		expect(p.editOpensDetail).toBeUndefined()
	})

	it('leaves it off at the split address too, where the pane is already open', () => {
		// The state the report was made from: pane open, row menu used on the
		// list beside it. A split address resolves to the INDEX page — via the
		// `meta` the real router carries, which is why it has to be mocked here
		// or the renderer finds no page and the case proves nothing.
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest, pageTypes },
			mocks: {
				$route: { name: 'Cases__split', params: { id: 'abc' }, query: {}, meta: { cnPageId: 'Cases', cnSplitOf: 'Cases', cnSplitBreakpoint: 1024 } },
				$router: { push: jest.fn(() => Promise.resolve()) },
			},
		})
		const p = wrapper.vm.resolvedProps
		expect(wrapper.vm.currentPage.id).toBe('Cases')
		expect(p.rowClickToView).toBe(true)
		expect(p.editOpensDetail).toBeUndefined()
	})

	it.each(['Cases', 'CaseTypes', 'Graphs'])('lets %s ask for the old routing with an explicit true', (pageId) => {
		const m = JSON.parse(JSON.stringify(manifest))
		m.pages.find((p) => p.id === pageId).config.editOpensDetail = true
		expect(mountAt(pageId, m).vm.resolvedProps.editOpensDetail).toBe(true)
	})

	it('passes an explicit false through as false', () => {
		const m = JSON.parse(JSON.stringify(manifest))
		m.pages.find((p) => p.id === 'CaseTypes').config.editOpensDetail = false
		expect(mountAt('CaseTypes', m).vm.resolvedProps.editOpensDetail).toBe(false)
	})
})

describe('CnPageRenderer — the detail half of the edit rule', () => {
	it('turns on the detail page Edit button for a schema-bound detail page', () => {
		expect(mountAt('CaseTypeDetail').vm.resolvedProps.showEditAction).toBe(true)
	})

	it('leaves it off for a detail page bound to no schema', () => {
		expect(mountAt('AboutPage').vm.resolvedProps.showEditAction).toBeUndefined()
	})

	it('lets an explicit config.showEditAction:false keep a detail page read-only', () => {
		const m = JSON.parse(JSON.stringify(manifest))
		m.pages.find((p) => p.id === 'CaseTypeDetail').config.showEditAction = false
		expect(mountAt('CaseTypeDetail', m).vm.resolvedProps.showEditAction).toBe(false)
	})

	it('does NOT put showEditAction on index pages, where it means something else', () => {
		// `showEditAction` is also a CnIndexPage prop (show the Edit ROW
		// action). Leaking the detail-page meaning onto an index would be a
		// silent, different change.
		expect(mountAt('CaseTypes').vm.resolvedProps.showEditAction).toBeUndefined()
	})
})

describe('CnPageRenderer — no index page loses its form', () => {
	it('never takes the modal away from an index that did not ask', () => {
		// The invariant this replaces read the other way round: it checked that
		// an index which gave up its modal had a detail page to edit on. That
		// held, and the record was still editable — just never from the list,
		// which is where the reader was. Nothing is taken away implicitly now.
		for (const page of manifest.pages.filter((p) => p.type === 'index')) {
			expect(mountAt(page.id).vm.resolvedProps.editOpensDetail).toBeUndefined()
		}
	})
})
