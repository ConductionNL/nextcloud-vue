/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The renderer half of "a record with a detail page is edited on that page".
 *
 * CnIndexPage and CnDetailPage each carry one half of the rule as an opt-in
 * prop; neither can decide on its own whether the rule applies, because
 * neither can see the manifest. CnPageRenderer can, and it already resolves
 * exactly the signal the rule needs — `detailPageByRegisterSchema`, the same
 * map that decides whether a row click opens anything.
 *
 * The two halves MUST ship together. Turning off the index modal without
 * turning on the detail button leaves the record read-only; the reverse leaves
 * it with two edit surfaces, which is where this started.
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

describe('CnPageRenderer — the index half of the edit rule', () => {
	it('sets editOpensDetail on an index page that has a matching detail page', () => {
		expect(mountAt('CaseTypes').vm.resolvedProps.editOpensDetail).toBe(true)
	})

	it('leaves editOpensDetail off when there is nowhere to send the user', () => {
		// Otherwise Edit would emit into the void and the record would have no
		// edit surface at all.
		expect(mountAt('Orphans').vm.resolvedProps.editOpensDetail).toBeUndefined()
	})

	it('sets editOpensDetail from an explicit rowRoute, not just a type:detail page', () => {
		// The row surface may be a custom authoring canvas rather than a
		// `type:"detail"` page — same rule, same signal as rowClickToView.
		expect(mountAt('Graphs').vm.resolvedProps.editOpensDetail).toBe(true)
	})

	it('tracks rowClickToView exactly — the two are one signal', () => {
		for (const id of ['CaseTypes', 'Orphans', 'Graphs']) {
			const p = mountAt(id).vm.resolvedProps
			expect(Boolean(p.editOpensDetail)).toBe(Boolean(p.rowClickToView))
		}
	})

	it('lets an explicit config.editOpensDetail:false override the default', () => {
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

describe('CnPageRenderer — the halves ship together', () => {
	it('every index page that stops offering the modal has a detail page that gained the button', () => {
		// The invariant that makes the rule safe. If this ever fails, some
		// record in the fleet has become uneditable.
		const indexes = manifest.pages.filter((p) => p.type === 'index')
		for (const idx of indexes) {
			const props = mountAt(idx.id).vm.resolvedProps
			if (!props.editOpensDetail) continue
			const cfg = idx.config || {}
			const target = cfg.rowRoute
				|| manifest.pages.find((p) => p.type === 'detail' && (p.config || {}).register === cfg.register && (p.config || {}).schema === cfg.schema)?.id
			expect(target).toBeTruthy()
			const targetPage = manifest.pages.find((p) => p.id === target)
			// A custom row surface owns its own editing; only a type:"detail"
			// page is the library's to wire.
			if (targetPage.type !== 'detail') continue
			expect(mountAt(target).vm.resolvedProps.showEditAction).toBe(true)
		}
	})
})
