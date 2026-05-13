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
import Vue from 'vue'

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
		await Vue.nextTick()
		expect(findSidebar(wrapper).exists()).toBe(true)
	})

	it('suppresses the auto-mount when the consumer fills the #sidebar slot', async () => {
		const wrapper = shallowMount(CnAppRoot, {
			propsData: { manifest, requiresApps: [] },
			slots: { sidebar: '<div class="consumer-sidebar">consumer</div>' },
			stubs: { CnObjectSidebar: true, CnAppNav: true, CnAiCompanion: true, NcContent: { template: '<div><slot/><slot name="sidebar"/></div>' }, NcAppContent: { template: '<div><slot/></div>' } },
		})
		wrapper.vm.localObjectSidebarState.active = true
		await Vue.nextTick()
		expect(findSidebar(wrapper).exists()).toBe(false)
		expect(wrapper.find('.consumer-sidebar').exists()).toBe(true)
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
})
