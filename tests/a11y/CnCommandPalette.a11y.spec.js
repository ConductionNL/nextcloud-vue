/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnCommandPalette` — the Ctrl/Cmd+K command
 * palette anchored in nc-vue (see the component's own docblock). Mounts
 * with the REAL `NcDialog` (curated in `support/realNextcloudVue.js`) so
 * `axe-core` inspects the real `role="dialog"` / `aria-modal` chrome
 * around the palette's own hand-rolled WAI-ARIA combobox/listbox markup
 * (`role="combobox"` input, `aria-activedescendant`, `role="listbox"` /
 * `role="option"`).
 *
 * Covers both states the task calls out: OPEN (empty query, idle list)
 * and RESULTS (a query with matches rendered, across sections).
 */

const { mountAttached } = require('./support/mountAttached.js')
const { expectAccessible } = require('../../src/testing/a11y.js')
const CnCommandPalette = require('../../src/components/CnCommandPalette/CnCommandPalette.vue').default
const { createCommandRegistry } = require('../../src/commandPalette/registry.js')
const { useCommandPalette } = require('../../src/composables/useCommandPalette.js')

const manifest = {
	menu: [
		{ id: 'home', label: 'Home', route: 'home', icon: 'Home' },
		{ id: 'settings', label: 'Settings', route: 'settings' },
	],
}

describe('CnCommandPalette — accessibility', () => {
	let wrapper
	let registry
	let cp

	beforeEach(() => {
		registry = createCommandRegistry()
		cp = useCommandPalette(registry)
		cp.state.isOpen = false
	})

	afterEach(() => {
		wrapper?.unmount()
		cp.state.isOpen = false
	})

	it('has no WCAG 2.1 AA violations in the open, empty-query (idle) state', async () => {
		cp.register({ id: 'create-thing', title: 'Create thing', section: 'Actions', run: () => {} })
		wrapper = mountAttached(CnCommandPalette, {
			propsData: { manifest, commandRegistry: registry, appId: 'testapp' },
		})
		cp.open()
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with a query and ranked, sectioned results', async () => {
		cp.register({ id: 'create-thing', title: 'Create thing', section: 'Actions', run: () => {} })
		wrapper = mountAttached(CnCommandPalette, {
			propsData: { manifest, commandRegistry: registry, appId: 'testapp' },
		})
		cp.open()
		await wrapper.vm.$nextTick()
		wrapper.vm.query = 'e'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.flatResults.length).toBeGreaterThan(0)
		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations in the empty-results state', async () => {
		wrapper = mountAttached(CnCommandPalette, {
			propsData: { manifest: { menu: [] }, commandRegistry: registry, appId: 'testapp' },
		})
		cp.open()
		await wrapper.vm.$nextTick()
		wrapper.vm.query = 'zzz-no-match'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.flatResults).toHaveLength(0)
		await expectAccessible(wrapper)
	})
})
