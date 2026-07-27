/**
 * Tests for the raw/reactive manifest boundary in CnAppRoot (audit item 9,
 * change `manifest-markraw-reactivity`).
 *
 * - The bundled manifest is held RAW at boot (a `shallowRef`), so Vue never
 *   deep-observes the (up to ~434 KB) immutable manifest graph during ordinary
 *   navigation and rendering — the read path is non-reactive.
 * - The ADR-041 in-app editor opts the manifest into reactivity IN PLACE on
 *   edit-enter (identity preserved), and live menu edits render in the default
 *   CnAppNav exactly as under the previous always-deep-reactive model.
 * - Discard restores the original menu; the CnAppNav prop stays === the manifest
 *   prop outside edit mode (menuManifest identity guard).
 *
 * CnAppRoot is mounted NESTED inside a wrapper render function so its `manifest`
 * prop is not root-observed by @vue/test-utils. This matches production
 * (`main.js`: `new Vue → App → CnAppRoot`), where the manifest reaches CnAppRoot
 * as a plain child prop. A direct `mount(CnAppRoot, { propsData })` makes Vue
 * observe the propsData object as a ROOT prop — a harness artifact that hides
 * the raw boundary this change establishes.
 */

import { mount } from '@vue/test-utils'
import { isReactive, h } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')
const { diffManifest } = require('../../src/utils/diffManifest.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const makeManifest = () => ({
	version: '1.0.0',
	dependencies: [],
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }],
})

/**
 * Mount CnAppRoot nested inside a wrapper so its manifest prop is not
 * root-observed (production-like). Returns the wrapper + the CnAppRoot child.
 *
 * @param {object} manifest The manifest object passed as a plain child prop.
 * @param {object} [extraProps] Additional props forwarded to CnAppRoot.
 * @return {{ wrapper: object, root: object }}
 */
function mountNested(manifest, extraProps = {}) {
	const Wrapper = {
		components: { CnAppRoot },
		render() {
			return h(CnAppRoot, {
				props: { manifest, appId: 'myapp', isLoading: false, translate: (k) => k, requiresApps: [], ...extraProps },
			})
		},
	}
	const wrapper = mount(Wrapper, {
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
	return { wrapper, root: wrapper.findComponent(CnAppRoot) }
}

describe('CnAppRoot — raw/reactive manifest boundary (audit item 9)', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
		global.OC = global.OC || {}
		global.OC.appswebroots = {}
	})

	it('holds the bundled manifest RAW at boot (no deep observation)', () => {
		const manifest = makeManifest()
		const { root } = mountNested(manifest)
		const held = root.vm.manifestEditor.source.value
		expect(held).toBe(manifest)
		expect(isReactive(held)).toBe(false)
		expect(isReactive(held.pages[0])).toBe(false)
		expect(isReactive(held.menu[0])).toBe(false)
	})

	it('opts the manifest into reactivity in place on edit-enter (identity preserved)', async () => {
		const manifest = makeManifest()
		const { wrapper, root } = mountNested(manifest)
		expect(isReactive(root.vm.manifestEditor.source.value)).toBe(false)
		root.vm.manifestEditor.enter()
		await wrapper.vm.$nextTick()
		const held = root.vm.manifestEditor.source.value
		expect(held).toBe(manifest) // identity preserved (reactive IN PLACE)
		expect(isReactive(held)).toBe(true)
		expect(isReactive(held.pages[0])).toBe(true)
	})

	it('renders live menu edits (label + add) through the default CnAppNav while editing', async () => {
		const manifest = makeManifest()
		const { wrapper, root } = mountNested(manifest)
		const nav = wrapper.findComponent({ name: 'CnAppNav' })
		expect(nav.html()).toContain('name="Home"')

		root.vm.manifestEditor.enter()
		await wrapper.vm.$nextTick()

		// In-place label edit on the (now reactive) menu renders live.
		root.vm.manifestEditor.working.value.menu[0].label = 'Renamed'
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(nav.html()).toContain('name="Renamed"')

		// Appending a menu item renders live too.
		root.vm.manifestEditor.working.value.menu.push({ id: 'added', label: 'Added', route: 'x' })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(nav.html()).toContain('name="Added"')
	})

	it('discards an edit in place, restoring the original menu', async () => {
		const manifest = makeManifest()
		const { wrapper, root } = mountNested(manifest)
		const nav = wrapper.findComponent({ name: 'CnAppNav' })
		root.vm.manifestEditor.enter()
		await wrapper.vm.$nextTick()
		root.vm.manifestEditor.working.value.menu[0].label = 'Discarded'
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(nav.html()).toContain('name="Discarded"')

		root.vm.manifestEditor.cancel()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(root.vm.manifestEditor.editing.value).toBe(false)
		expect(manifest.menu[0].label).toBe('Home') // restored in place
		expect(nav.html()).toContain('name="Home"')
	})

	it('commits an edit via the ADR-041 delta/persist contract on save', async () => {
		const manifest = makeManifest()
		const before = makeManifest()
		const persist = jest.fn().mockResolvedValue(undefined)
		const { root } = mountNested(manifest, { persistManifestDelta: persist })
		root.vm.manifestEditor.enter()
		root.vm.manifestEditor.working.value.pages[0].title = 'Committed'
		const after = JSON.parse(JSON.stringify(root.vm.manifestEditor.source.value))
		const delta = await root.vm.manifestEditor.save()
		expect(delta).toEqual(diffManifest(before, after))
		expect(persist).toHaveBeenCalledWith(delta)
		expect(root.vm.manifestEditor.editing.value).toBe(false)
	})

	it('passes the manifest to CnAppNav by identity outside edit mode (async-merge guard)', () => {
		const manifest = makeManifest()
		const { wrapper } = mountNested(manifest)
		const nav = wrapper.findComponent({ name: 'CnAppNav' })
		expect(nav.props('manifest')).toBe(manifest)
	})
})
