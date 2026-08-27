/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * AN ICON NAME THAT DOES NOT RESOLVE FAILS SILENTLY.
 *
 * `CnIcon` looks a string up in the registry, then the ADR-077 semantic
 * vocabulary, then the dashboard set — and renders a help-circle when it finds
 * none of them. There is no warning, because an unknown name is
 * indistinguishable from a name the app has simply not registered yet.
 *
 * The flow canvas's step menu asked for `Pencil` and `Delete`. The vocabulary
 * publishes `PencilOutline` and `DeleteOutline`. So two of three entries drew a
 * question mark — and `Copy`, whose name happened to be right, drew correctly,
 * which is exactly what made it read as a styling quirk rather than as a lookup
 * that had failed.
 *
 * ⚠️ THIS ASSERTS THE RESOLVED COMPONENT, NOT THAT A NAME WAS PASSED. A test
 * that checked `action.icon === 'PencilOutline'` would restate the source and
 * pass for any string at all, which is the whole failure mode.
 */
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnIcon from '../../src/components/CnIcon/CnIcon.vue'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * What CnIcon renders for a name, and what it renders for a name that cannot
 * possibly exist — the fallback, measured rather than assumed.
 *
 * @param {string} name The icon name.
 * @return {object} The resolved component.
 */
function resolve(name) {
	return mount(CnIcon, { props: { name } }).vm.resolvedComponent
}

const FALLBACK = resolve('NoSuchIconExistsAnywhere')

/**
 * Mount the editor and read both context menus' action lists.
 *
 * @return {{node: Array<object>, edge: Array<object>}} The actions.
 */
function menus() {
	setActivePinia(createPinia())

	const wrapper = mount(CnFlowDetail, {
		global: {
			stubs: { CnGraphCanvas: true, NcEmptyContent: true, Sitemap: true },
			mocks: { t: (app, s) => s },
		},
	})

	return { node: wrapper.vm.nodeMenuActions, edge: wrapper.vm.edgeMenuActions }
}

describe('the flow canvas’s menu icons', () => {
	it('has a fallback that is a real component, or this whole file proves nothing', () => {
		// The control. If `resolve()` returned undefined for an unknown name,
		// every assertion below would compare undefined against a component and
		// pass regardless of what the menus actually ask for.
		expect(FALLBACK).toBeTruthy()
	})

	it('resolves every named icon on the step menu', () => {
		const named = menus().node.filter((action) => typeof action.icon === 'string')

		// Counted, so a menu that silently stopped declaring icons cannot pass
		// this by having nothing to check.
		expect(named).toHaveLength(3)

		for (const action of named) {
			expect(resolve(action.icon)).not.toBe(FALLBACK)
		}
	})

	it('resolves every named icon on the line menu', () => {
		const named = menus().edge.filter((action) => typeof action.icon === 'string')

		expect(named).toHaveLength(3)

		for (const action of named) {
			expect(resolve(action.icon)).not.toBe(FALLBACK)
		}
	})

	it('gives every entry on both menus an icon of some kind', () => {
		const { node, edge } = menus()

		for (const action of [...node, ...edge]) {
			expect(action.icon).toBeTruthy()
		}
	})

	/**
	 * The line's three router entries pass COMPONENTS rather than names, on
	 * purpose: a line's shape has no ADR-077 concept behind it, and inventing
	 * one for three drawing options would put a private entry into a
	 * fleet-wide vocabulary.
	 */
	it('passes components, not invented names, for the routers', () => {
		const components = menus().edge.filter((action) => typeof action.icon === 'object')

		expect(components.length).toBeGreaterThanOrEqual(3)
	})
})
