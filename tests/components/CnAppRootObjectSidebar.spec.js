/**
 * Tests for CnAppRoot's auto-mounted <CnObjectSidebar> at NcContent level.
 *
 * Covers the schema-driven-detail-page capability's CnAppRoot hoist
 * requirement: manifest-only apps get a working sidebar without
 * per-app `#sidebar` slot boilerplate, while ADR-017 stays honoured
 * (sidebar mounts at NcContent level, never inside NcAppContent).
 *
 * The mount uses `shallowMount` so we can inspect the sidebar's
 * presence (component stub) without exercising its internal render.
 */

import { shallowMount } from '@vue/test-utils'
// Vue 3 has no default export — `nextTick` is a named import.
import { nextTick as vueNextTick } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const manifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'app.home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
	dependencies: [],
}

function findSidebar(wrapper) {
	return wrapper.findComponent({ name: 'CnObjectSidebar' })
}

describe('CnAppRoot — CnObjectSidebar auto-mount', () => {
	it('does not render the sidebar when objectSidebarState.active is false (default)', () => {
		const wrapper = shallowMount(CnAppRoot, {
			propsData: { manifest, requiresApps: [] },
			stubs: { CnObjectSidebar: true, CnAppNav: true, CnAiCompanion: true, NcContent: { template: '<div><slot/></div>' }, NcAppContent: { template: '<div><slot/></div>' } },
		})
		expect(findSidebar(wrapper).exists()).toBe(false)
	})

	it('renders the sidebar when local objectSidebarState.active flips to true', async () => {
		const wrapper = shallowMount(CnAppRoot, {
			propsData: { manifest, requiresApps: [] },
			stubs: { CnObjectSidebar: true, CnAppNav: true, CnAiCompanion: true, NcContent: { template: '<div><slot/></div>' }, NcAppContent: { template: '<div><slot/></div>' } },
		})
		// CnDetailPage normally publishes via inject; in this test we
		// poke the local holder directly to simulate that publish.
		wrapper.vm.localObjectSidebarState.active = true
		wrapper.vm.localObjectSidebarState.objectType = 'r-s'
		wrapper.vm.localObjectSidebarState.objectId = 'o-1'
		await vueNextTick()
		expect(findSidebar(wrapper).exists()).toBe(true)
	})

	it('suppresses the auto-mount when the consumer fills the #sidebar slot', async () => {
		const wrapper = shallowMount(CnAppRoot, {
			propsData: { manifest, requiresApps: [] },
			slots: { sidebar: '<div class="consumer-sidebar">consumer</div>' },
			stubs: { CnObjectSidebar: true, CnAppNav: true, CnAiCompanion: true, NcContent: { template: '<div><slot/><slot name="sidebar"/></div>' }, NcAppContent: { template: '<div><slot/></div>' } },
		})
		wrapper.vm.localObjectSidebarState.active = true
		await vueNextTick()
		expect(findSidebar(wrapper).exists()).toBe(false)
		expect(wrapper.find('.consumer-sidebar').exists()).toBe(true)
	})

	it('suppresses the auto-mount when active: true is set but objectType + objectId are empty', async () => {
		// Defense in depth: CnIndexPage falls through `inject('sidebarState') ??
		// inject('objectSidebarState')`, so any legacy app that doesn't provide
		// `sidebarState` ends up writing CnIndexPage's `active: true` into our
		// objectSidebarState holder. Without this gate the auto-mount renders
		// an empty CnObjectSidebar on every index page — the openbuilt double-
		// sidebar regression. With this gate, active alone is not enough.
		const wrapper = shallowMount(CnAppRoot, {
			propsData: { manifest, requiresApps: [] },
			stubs: { CnObjectSidebar: true, CnAppNav: true, CnAiCompanion: true, NcContent: { template: '<div><slot/></div>' }, NcAppContent: { template: '<div><slot/></div>' } },
		})
		wrapper.vm.localObjectSidebarState.active = true
		// objectType + objectId left at their data() defaults ('')
		await vueNextTick()
		expect(findSidebar(wrapper).exists()).toBe(false)
	})

	it('exposes a dedicated sidebarState provide separate from objectSidebarState', () => {
		// CnIndexPage's inject uses `sidebarState` first, falling back to
		// `objectSidebarState`. CnAppRoot must provide a distinct holder
		// for the preferred name so the fallback never fires and the two
		// channels stay isolated. Inspect CnAppRoot's `$.provides` map (Vue 3; `_provided` was the Vue-2 internal)
		// directly — that's the contract every descendant inject reads.
		const wrapper = shallowMount(CnAppRoot, {
			propsData: { manifest, requiresApps: [] },
			stubs: { CnObjectSidebar: true, CnAppNav: true, CnAiCompanion: true, NcContent: { template: '<div><slot/></div>' }, NcAppContent: { template: '<div><slot/></div>' } },
		})
		const provided = wrapper.vm.$.provides
		expect(provided.sidebarState).not.toBeUndefined()
		expect(provided.objectSidebarState).not.toBeUndefined()
		// Distinct references — the two channels must NOT alias, else
		// CnIndexPage writes leak into the object-sidebar channel.
		expect(provided.sidebarState).not.toBe(provided.objectSidebarState)
		// And the index holder shape matches what CnIndexPage writes
		// (searchValue / activeFilters / facetData), not the object-
		// sidebar shape (objectType / objectId).
		expect(provided.sidebarState).toHaveProperty('searchValue')
		expect(provided.sidebarState).toHaveProperty('activeFilters')
		expect(provided.objectSidebarState).toHaveProperty('objectType')
		expect(provided.objectSidebarState).toHaveProperty('objectId')
	})

	it('suppresses the auto-mount when an ancestor provides objectSidebarState', async () => {
		// Mount CnAppRoot under a parent that already provides the holder
		// (decidesk's / procest's pattern). CnAppRoot must defer — the
		// ancestor renders its own sidebar.
		const ancestorState = {
			active: true,
			open: true,
			objectType: 'r-s',
			objectId: 'o-1',
			title: '',
			subtitle: '',
			register: '',
			schema: '',
			hiddenTabs: [],
			tabs: undefined,
		}
		const Parent = {
			components: { CnAppRoot },
			provide() { return { objectSidebarState: ancestorState } },
			template: '<CnAppRoot :manifest="manifest" :requires-apps="[]" />',
			data() { return { manifest } },
		}
		const wrapper = shallowMount(Parent, {
			stubs: { CnObjectSidebar: true, CnAppNav: true, CnAiCompanion: true, NcContent: { template: '<div><slot/></div>' }, NcAppContent: { template: '<div><slot/></div>' } },
		})
		expect(findSidebar(wrapper).exists()).toBe(false)
	})

	it('re-provides the ANCESTOR objectSidebarState holder so a deep CnDetailPage writes into the holder the host #sidebar slot reads', () => {
		// The host App (decidesk / procest) provides its OWN objectSidebarState
		// and renders a CnObjectSidebar in CnAppRoot's #sidebar slot bound to
		// that holder. CnDetailPage is a DEEP descendant of CnAppRoot (via
		// <router-view>) — it injects whichever objectSidebarState CnAppRoot
		// provides. If CnAppRoot re-provided its OWN local holder, CnDetailPage
		// would write there while the host slot reads the ancestor holder, and
		// the tab strip would never render. CnAppRoot must forward the
		// ancestor holder.
		const ancestorState = {
			active: false,
			open: true,
			objectType: '',
			objectId: '',
			title: '',
			subtitle: '',
			register: '',
			schema: '',
			hiddenTabs: [],
			tabs: undefined,
		}
		const Parent = {
			components: { CnAppRoot },
			provide() { return { objectSidebarState: ancestorState } },
			template: '<CnAppRoot :manifest="manifest" :requires-apps="[]" />',
			data() { return { manifest } },
		}
		const wrapper = shallowMount(Parent, {
			stubs: { CnObjectSidebar: true, CnAppNav: true, CnAiCompanion: true, NcContent: { template: '<div><slot/></div>' }, NcAppContent: { template: '<div><slot/></div>' } },
		})
		const appRoot = wrapper.findComponent(CnAppRoot)
		// The provide map a deep descendant (CnDetailPage) would inject from.
		expect(appRoot.vm.$.provides.objectSidebarState).toBe(ancestorState)
		expect(appRoot.vm.$.provides.objectSidebarState).not.toBe(appRoot.vm.localObjectSidebarState)
	})

	it('still provides its OWN local holder when NO ancestor provides one', () => {
		// Standalone CnAppRoot (openregister-style host without an ancestor
		// provider, or a manifest-only app relying on the auto-mount) keeps
		// using its local holder so the hoisted auto-mount path is unaffected.
		const wrapper = shallowMount(CnAppRoot, {
			propsData: { manifest, requiresApps: [] },
			stubs: { CnObjectSidebar: true, CnAppNav: true, CnAiCompanion: true, NcContent: { template: '<div><slot/></div>' }, NcAppContent: { template: '<div><slot/></div>' } },
		})
		expect(wrapper.vm.$.provides.objectSidebarState).toBe(wrapper.vm.localObjectSidebarState)
	})
})
