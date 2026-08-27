/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * `data-cn-route` is how a walkthrough step finds a nav entry.
 *
 * `CnWalkthrough.resolveTarget()` resolves `target: { kind: "nav-item", ref }`
 * by querying `[data-cn-route="<ref>"]`. The main, child and footer loops in
 * CnAppNav all emit it; the `section: "settings"` loop did not — so a tour step
 * pointing at a settings entry resolved to nothing and fell back to a centred,
 * anchorless coachmark.
 *
 * That failure is invisible in every way that matters: the step still appears,
 * still advances on its `route-match`, and still reads correctly. It just stops
 * doing the one thing it exists for — pointing at the entry. Measured
 * 2026-08-27 on dossiq, where `Case types` and `Flows` (both `section:
 * "settings"`) rendered with no `data-cn-route` while `Cases` and `My work`
 * had it.
 */

const { mount } = require('@vue/test-utils')
const CnAppNav = require('../../src/components/CnAppNav/CnAppNav.vue').default

const manifest = {
	version: '1.0.0',
	menu: [
		{ id: 'Cases', label: 'Cases', route: 'Cases', order: 10 },
		{ id: 'CaseTypesMenu', label: 'Case types', route: 'CaseTypes', section: 'settings', order: 90 },
		{ id: 'FlowsMenu', label: 'Flows', route: 'Flows', section: 'settings', order: 96 },
	],
	pages: [
		{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases' },
		{ id: 'CaseTypes', route: '/settings/case-types', type: 'index', title: 'Case types' },
		{ id: 'Flows', route: '/flows', type: 'flows', title: 'Flows' },
	],
}

/**
 * Mount the nav with the fixture manifest.
 *
 * @return {object} The mounted wrapper.
 */
function mountNav() {
	return mount(CnAppNav, {
		propsData: { manifest, translate: (k) => k },
		stubs: { 'router-link': { template: '<a><slot /></a>' } },
		mocks: { $route: { name: 'Cases', path: '/cases' } },
	})
}

describe('CnAppNav — walkthrough targeting', () => {
	it('exposes data-cn-route on a MAIN section entry', () => {
		// The control. Without it the assertion below could pass on a nav that
		// renders no entries at all.
		expect(mountNav().find('[data-cn-route="Cases"]').exists()).toBe(true)
	})

	it('exposes data-cn-route on a SETTINGS section entry', () => {
		// The regression: this is what a tour step targeting Case types needs.
		expect(mountNav().find('[data-cn-route="CaseTypes"]').exists()).toBe(true)
	})

	it('exposes data-cn-route on every settings entry, not just the first', () => {
		expect(mountNav().find('[data-cn-route="Flows"]').exists()).toBe(true)
	})

	it('keys the attribute by ROUTE, not by menu id', () => {
		// The distinction that made this hard to spot: `Cases` happens to have
		// menu id === route, so the working steps in the fleet all used a ref
		// that was correct by coincidence. `CaseTypesMenu` !== `CaseTypes`, and
		// a step authored with the menu id resolves to nothing.
		const wrapper = mountNav()
		expect(wrapper.find('[data-cn-route="CaseTypesMenu"]').exists()).toBe(false)
		expect(wrapper.find('[data-cn-route="FlowsMenu"]').exists()).toBe(false)
	})
})
