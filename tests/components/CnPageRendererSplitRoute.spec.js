/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The split route resolves to its list page, and the pane mounts the detail
 * page the full route would mount.
 *
 * This is the wiring across three pieces that each have their own tests:
 * buildManifestRoutes emits the route, CnPageRenderer resolves it, and
 * CnIndexPage renders the pane. Each half can be green while the join is
 * broken, and the join is where a blank screen at a valid address comes from.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import { mount, shallowMount } from '@vue/test-utils'
import { h } from 'vue'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'
import { buildManifestRoutes, splitRouteName } from '../../src/utils/buildManifestRoutes.js'

const manifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	menu: [],
	pages: [
		{
			id: 'Cases',
			route: '/cases',
			type: 'index',
			title: 'Cases',
			splitView: { enabled: true, breakpoint: 900 },
			config: { register: 'zaken', schema: 'case' },
		},
		{
			id: 'CaseDetail',
			route: '/cases/:id',
			type: 'detail',
			title: 'Case',
			tabInAddress: true,
			config: { register: 'zaken', schema: 'case' },
		},
	],
}

const IndexStub = { name: 'IndexStub', render: () => null }
const DetailStub = {
	name: 'DetailStub',
	// Declared so `props()` can be asserted on rather than `$attrs`.
	props: { objectStore: { type: Object, default: null }, register: { type: String, default: '' } },
	render: () => null,
}
/** An index stub that actually renders the pane slot, so the pane mounts. */
const SlotRenderingIndexStub = {
	name: 'SlotRenderingIndexStub',
	render() {
		const slot = this.$slots['split-pane']
		return h('div', typeof slot === 'function'
			? [slot({ id: 'case-9', layout: 'split', close: () => {}, saved: () => {} })]
			: [])
	},
}
const pageTypes = { index: IndexStub, detail: DetailStub }

/**
 * Mount the renderer on a route, with the routes the builder emits registered.
 *
 * @param {object} route The current route.
 * @return {object} The wrapper and the router's push spy.
 */
function mountOn(route) {
	const records = buildManifestRoutes(manifest, { component: CnPageRenderer })
	const push = jest.fn(() => Promise.resolve())
	const wrapper = shallowMount(CnPageRenderer, {
		propsData: { manifest, pageTypes },
		mocks: {
			$route: route,
			$router: {
				push,
				hasRoute: (name) => records.some((r) => r.name === name),
				getRoutes: () => records,
			},
		},
	})
	return { wrapper, push, records }
}

describe('the split route resolves to its list page', () => {
	const splitRoute = {
		name: 'Cases__split',
		params: { id: 'case-9' },
		query: {},
		meta: { cnPageId: 'Cases', cnSplitOf: 'Cases', cnSplitBreakpoint: 900 },
	}

	it('renders the index page, not a blank screen at a valid address', () => {
		const { wrapper } = mountOn(splitRoute)

		expect(wrapper.vm.currentPage.id).toBe('Cases')
		// By name, not identity: the renderer wraps a page type in
		// defineAsyncComponent, so the resolved value is a different object
		// that renders the same component.
		expect(wrapper.vm.resolvedComponent.name).toBe('IndexStub')
	})

	it('hands the index page the record the address names', () => {
		const { wrapper } = mountOn(splitRoute)

		expect(wrapper.vm.resolvedProps.splitId).toBe('case-9')
		expect(wrapper.vm.resolvedProps.splitView).toEqual({ enabled: true, breakpoint: 900 })
		expect(wrapper.vm.resolvedProps.splitCloseRoute).toBe('Cases')
	})

	it('mounts the SAME detail component the full route mounts', () => {
		const { wrapper } = mountOn(splitRoute)

		expect(wrapper.vm.splitPaneComponent.name).toBe('DetailStub')
		expect(wrapper.vm.splitDetailPage.id).toBe('CaseDetail')
	})

	it('gives the pane the detail page own declaration plus the open record', () => {
		const { wrapper } = mountOn(splitRoute)

		expect(wrapper.vm.splitPaneProps).toMatchObject({
			register: 'zaken',
			schema: 'case',
			objectType: 'case',
			objectId: 'case-9',
			tabInAddress: true,
		})
	})

	it('passes no bare id, which would fall through onto the pane root as an HTML attribute', () => {
		const { wrapper } = mountOn(splitRoute)

		expect('id' in wrapper.vm.splitPaneProps).toBe(false)
	})

	// The pane mounts the same component the full route does, so it has to be
	// mounted the same way.
	it('hands the pane what the HOST passes the page, not only the manifest', () => {
		const { records } = { records: buildManifestRoutes(manifest, { component: CnPageRenderer }) }
		const store = { id: 'the-host-store' }
		const wrapper = mount(CnPageRenderer, {
			propsData: { manifest, pageTypes: { index: SlotRenderingIndexStub, detail: DetailStub } },
			// An attr, which is how a host hands the page its store.
			attrs: { objectStore: store },
			mocks: {
				$route: splitRoute,
				$router: {
					push: jest.fn(() => Promise.resolve()),
					hasRoute: (name) => records.some((r) => r.name === name),
					getRoutes: () => records,
				},
			},
		})

		const pane = wrapper.findComponent(DetailStub)
		expect(pane.exists()).toBe(true)
		// `toEqual`: what arrives is a reactive proxy, so identity differs.
		expect(pane.props('objectStore')).toEqual(store)
		// The manifest still wins over an attr of the same name.
		expect(pane.props('register')).toBe('zaken')
	})

	it('mounts the detail page own actions and header components in the pane', () => {
		const withComponents = {
			...manifest,
			pages: manifest.pages.map((p) => (p.id === 'CaseDetail'
				? { ...p, actionsComponent: 'CaseActions', headerComponent: 'CaseHeader' }
				: p)),
		}
		const records = buildManifestRoutes(withComponents, { component: CnPageRenderer })
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: {
				manifest: withComponents,
				pageTypes,
				customComponents: {
					CaseActions: { name: 'CaseActions', render: () => null },
					CaseHeader: { name: 'CaseHeader', render: () => null },
				},
			},
			mocks: {
				$route: splitRoute,
				$router: {
					push: jest.fn(() => Promise.resolve()),
					hasRoute: (name) => records.some((r) => r.name === name),
					getRoutes: () => records,
				},
			},
		})

		const names = wrapper.vm.splitPaneSlotEntries.map((e) => e.name).sort()
		expect(names).toEqual(['actions', 'header'])
	})
})

describe('the list route still renders the list', () => {
	const listRoute = { name: 'Cases', params: {}, query: {}, meta: { cnPageId: 'Cases' } }

	it('resolves to the same page with no record open', () => {
		const { wrapper } = mountOn(listRoute)

		expect(wrapper.vm.currentPage.id).toBe('Cases')
		expect(wrapper.vm.resolvedProps.splitId).toBe('')
		expect(wrapper.vm.currentSplitId).toBeNull()
	})

	it('opens a row on the split route rather than navigating away from the list', () => {
		const { wrapper, push } = mountOn(listRoute)

		wrapper.vm.onRowOpen({ id: 'case-9' })

		expect(push).toHaveBeenCalledWith(expect.objectContaining({
			name: splitRouteName('Cases'),
			params: { id: 'case-9' },
		}))
	})

	it('warns rather than doing nothing when the host built its routes by hand', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const push = jest.fn(() => Promise.resolve())
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest, pageTypes },
			mocks: {
				$route: listRoute,
				// A hand-written router: the page ids are there, the split route is not.
				$router: { push, hasRoute: (name) => name === 'Cases' || name === 'CaseDetail' },
			},
		})

		wrapper.vm.onRowOpen({ id: 'case-9' })

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('buildManifestRoutes'))
		// It still opens the record, on the full detail route, rather than
		// leaving the row dead on click.
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'CaseDetail' }))
		warn.mockRestore()
	})
})

describe('a page that declares no split view', () => {
	const plain = {
		...manifest,
		pages: [{ ...manifest.pages[0], splitView: undefined }, manifest.pages[1]],
	}

	it('renders and navigates exactly as it does today', () => {
		const push = jest.fn(() => Promise.resolve())
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest: plain, pageTypes },
			mocks: {
				$route: { name: 'Cases', params: {}, query: {} },
				$router: { push, hasRoute: () => true },
			},
		})

		wrapper.vm.onRowOpen({ id: 'case-9' })

		expect(wrapper.vm.resolvedProps.splitView).toBeUndefined()
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'CaseDetail' }))
	})
})

/**
 * The record in the pane keeps the slot components its own page declares.
 *
 * A `type: "custom"` widget resolves through its HOST page's `slots` map and
 * nothing else, and the pane mounts a different page from the one the renderer
 * is rendering — so forwarding the index's slots here would forward the wrong
 * set. Without the detail page's own, the pane drew an empty grid cell where the
 * full route draws the widget, and the record silently lost content purely by
 * being opened beside the list.
 */
describe('the split pane forwards the DETAIL page slots', () => {
	const PlanStub = { name: 'PlanStub', render: () => null }

	const withSlots = {
		...manifest,
		pages: [
			manifest.pages[0],
			{ ...manifest.pages[1], slots: { 'widget-case-plan': 'CasePlanPanel' } },
		],
	}

	function mountSplit(m, registry) {
		const records = buildManifestRoutes(m, { component: CnPageRenderer })
		return shallowMount(CnPageRenderer, {
			propsData: { manifest: m, pageTypes },
			provide: { cnRegistry: registry },
			mocks: {
				$route: {
					name: splitRouteName('Cases'),
					params: { id: 'abc' },
					query: {},
					meta: { cnPageId: 'Cases', cnSplitOf: 'Cases', cnSplitBreakpoint: 900 },
				},
				$router: {
					push: jest.fn(() => Promise.resolve()),
					hasRoute: (name) => records.some((r) => r.name === name),
					getRoutes: () => records,
				},
			},
		})
	}

	it('resolves the detail page’s slot components for the pane', () => {
		const wrapper = mountSplit(withSlots, { CasePlanPanel: { kind: 'widget', component: PlanStub } })

		const entries = wrapper.vm.splitPaneSlotEntries
		expect(entries).toHaveLength(1)
		expect(entries[0].name).toBe('widget-case-plan')
		expect(entries[0].component.name).toBe('PlanStub')
		wrapper.unmount()
	})

	it('takes them from the DETAIL page, not the index it is rendering', () => {
		// The index declares its own slot; the pane must not receive it.
		const indexAlsoHasSlots = {
			...withSlots,
			pages: [
				{ ...withSlots.pages[0], slots: { header: 'IndexHeader' } },
				withSlots.pages[1],
			],
		}
		const wrapper = mountSplit(indexAlsoHasSlots, {
			CasePlanPanel: { kind: 'widget', component: PlanStub },
			IndexHeader: { kind: 'header', component: { name: 'IndexHeaderStub', render: () => null } },
		})

		expect(wrapper.vm.splitPaneSlotEntries.map((e) => e.name)).toEqual(['widget-case-plan'])
		wrapper.unmount()
	})

	it('is empty when the detail page declares no slots', () => {
		const wrapper = mountSplit(manifest, {})

		expect(wrapper.vm.splitPaneSlotEntries).toEqual([])
		wrapper.unmount()
	})
})
