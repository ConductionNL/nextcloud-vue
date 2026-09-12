/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDetailWidgetHost — lib-owned integration leaves in bare mode.
 *
 * The shared integration registry stores whatever component object the
 * REGISTERING bundle handed it. On a page where OpenRegister's
 * `integration-global` bundle registers `notes`, `contacts` and `files`, that
 * object belongs to OpenRegister's copy of Vue. Rendering it under the app's
 * Vue leaves `resolveComponent()` with no current instance, so every nested
 * `NcButton` / `CnDetailCard` lands in the DOM as a literal unknown element:
 * dossiq's tabbed Notes and Contacts leaves showed `<ncbutton>`, and its Files
 * leaf rendered an empty card.
 *
 * `useIntegrationRegistry` already swaps a `__libOwned` entry for THIS bundle's
 * component. The host's two bare branches bypassed that swap by reading
 * `provider.widget` / `provider.tab` directly. These tests register a "foreign"
 * component under a lib-owned id and assert the host renders the library's own
 * component instead.
 *
 * The foreign stubs render exactly what the defect produced: a literal
 * `<ncbutton>` element. That is the load-bearing negative assertion, and it is
 * what the unfixed host renders.
 */
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { LIB_INTEGRATION_COMPONENTS } from '../../src/integrations/libComponents.js'
import { integrations } from '../../src/integrations/registry.js'

/**
 * A leaf as it renders when it belongs to another bundle's Vue.
 *
 * @param {string} marker Identifies which foreign object rendered.
 * @return {object} A component whose body is a literal `<ncbutton>`.
 */
function foreignLeaf(marker) {
	return {
		name: 'ForeignLeaf',
		render() {
			return h('div', { class: 'foreign-leaf', 'data-marker': marker }, [h('ncbutton', 'Add note')])
		},
	}
}

/** A consumer's own leaf: same bundle as the host, must NOT be swapped. */
const CustomLeaf = {
	name: 'CustomLeaf',
	render() {
		return h('div', { class: 'custom-leaf' })
	},
}

/**
 * Register an entry the way OpenRegister's bundle does: a lib-owned id whose
 * component objects are NOT this bundle's.
 *
 * @param {string} id Integration id.
 * @param {object} [extra] Descriptor overrides.
 * @return {object} The normalised entry.
 */
function registerForeign(id, extra = {}) {
	return integrations.register({
		id,
		label: id,
		requiredApp: null,
		tab: foreignLeaf(`${id}-tab`),
		widget: foreignLeaf(`${id}-widget`),
		__libOwned: true,
		...extra,
	})
}

function mountHost(integrationId, extra = {}) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget: { id: `${integrationId}-w`, type: 'integration', integrationId },
			chrome: 'bare',
			surface: 'detail-page',
			objectId: 'case-1',
			register: 'dossiq',
			schema: 'case',
			...extra,
		},
		global: {
			// The library's real leaves fetch on mount; what matters here is
			// WHICH component the host picked, so their bodies are stubbed.
			// Stubs keep the component name, so `findComponent({ name })`
			// still tells the library's copy from the foreign one.
			stubs: { CnIcon: true, CnNotesCard: true, CnContactsTab: true, CnFilesTab: true },
		},
	})
}

describe('CnDetailWidgetHost — lib-owned leaves resolve to this bundle', () => {
	afterEach(() => integrations.__resetForTests())

	it('sanity: the lib ships its own notes, contacts and files components', () => {
		expect(LIB_INTEGRATION_COMPONENTS.notes.widget.name).toBe('CnNotesCardAdapter')
		expect(LIB_INTEGRATION_COMPONENTS.contacts.tab.name).toBe('CnContactsTab')
		expect(LIB_INTEGRATION_COMPONENTS.files.tab.name).toBe('CnFilesTab')
	})

	it('bareWidget provider (notes): renders the lib widget, not the foreign one', () => {
		registerForeign('notes', { bareWidget: true })
		const w = mountHost('notes')
		expect(w.findComponent({ name: 'CnNotesCardAdapter' }).exists()).toBe(true)
		expect(w.find('.foreign-leaf').exists()).toBe(false)
		expect(w.html()).not.toMatch(/<ncbutton/i)
		w.unmount()
	})

	it('bare tab provider (contacts): renders the lib tab, not the foreign one', () => {
		registerForeign('contacts')
		const w = mountHost('contacts')
		expect(w.findComponent({ name: 'CnContactsTab' }).exists()).toBe(true)
		expect(w.find('.foreign-leaf').exists()).toBe(false)
		expect(w.html()).not.toMatch(/<ncbutton/i)
		w.unmount()
	})

	it('bare tab provider (files): the tab body is the lib component, not an empty foreign card', () => {
		registerForeign('files')
		const w = mountHost('files')
		expect(w.findComponent({ name: 'CnFilesTab' }).exists()).toBe(true)
		expect(w.html()).not.toMatch(/<ncbutton|<cndetailcard/i)
		w.unmount()
	})

	it('card chrome keeps resolving through the surface-aware resolver', () => {
		registerForeign('notes', { bareWidget: true })
		const w = mountHost('notes', { chrome: 'card' })
		expect(w.findComponent({ name: 'CnNotesCardAdapter' }).exists()).toBe(true)
		expect(w.html()).not.toMatch(/<ncbutton/i)
		w.unmount()
	})

	it('negative control: a consumer-custom id keeps its stored component', () => {
		// No `__libOwned`: the component lives in the consumer's bundle and
		// renders under the same Vue. Swapping it would be the opposite bug.
		integrations.register({ id: 'my-leaf', label: 'Mine', requiredApp: null, tab: CustomLeaf, widget: CustomLeaf })
		const w = mountHost('my-leaf')
		expect(w.find('.custom-leaf').exists()).toBe(true)
		w.unmount()
	})

	it('negative control: a consumer-custom bareWidget id keeps its stored widget', () => {
		const CustomWidget = { name: 'CustomWidget', render() {
			return h('div', { class: 'custom-widget' })
		} }
		integrations.register({ id: 'my-leaf', label: 'Mine', requiredApp: null, tab: CustomLeaf, widget: CustomWidget, bareWidget: true })
		const w = mountHost('my-leaf')
		expect(w.find('.custom-widget').exists()).toBe(true)
		expect(w.find('.custom-leaf').exists()).toBe(false)
		w.unmount()
	})

	it('a lib-owned id the lib does not ship falls back to the stored component', () => {
		// `__libOwned` on an id LIB_INTEGRATION_COMPONENTS has no entry for
		// (a newer leaf than this bundle knows) must still render something.
		registerForeign('not-in-this-build')
		const w = mountHost('not-in-this-build')
		expect(w.find('.foreign-leaf').attributes('data-marker')).toBe('not-in-this-build-tab')
		w.unmount()
	})
})
