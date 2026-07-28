/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Regression tests for three Vue-3 semantics defects that the Vue-2 ESLint
 * preset could not see, all found while adopting
 * `@nextcloud/eslint-config/vue3`:
 *
 *  1. `vue/no-deprecated-props-default-this` — a prop `default()` factory
 *     reading `this` crashes on mount under Vue 3.
 *  2. `vue/require-slots-as-functions` — `$slots.x` is a FUNCTION in Vue 3,
 *     so `.length` on it is the arity (0), not the vnode count.
 *  3. `vue/require-explicit-emits` — a hyphenated `v-on` argument lands in
 *     `$attrs` CAMELIZED, so listener feature-detection keyed on the
 *     hyphenated name never fires; and once an event is declared in
 *     `emits`, it leaves `$attrs` entirely.
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnLockedBanner from '@/components/CnLockedBanner/CnLockedBanner.vue'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

describe('CnLockedBanner — prop default factory must not read `this`', () => {
	it('mounts without an explicit `message` and interpolates `lockedBy`', () => {
		const w = mount(CnLockedBanner, { props: { lockedBy: 'alice' } })
		expect(w.text()).toContain('alice')
	})

	it('keeps the default message reactive when `lockedBy` arrives late', async () => {
		// A prop `default()` factory is resolved ONCE and cached per instance,
		// so a `lockedBy` that arrives asynchronously off a `useObjectLock()`
		// ref would never reach the text. The computed does.
		const w = mount(CnLockedBanner, { props: { lockedBy: '' } })
		await w.setProps({ lockedBy: 'bob' })
		expect(w.text()).toContain('bob')
	})

	it('still honours an explicit `message` override', () => {
		const w = mount(CnLockedBanner, { props: { lockedBy: 'alice', message: 'Custom copy' } })
		expect(w.text()).toContain('Custom copy')
		expect(w.text()).not.toContain('alice')
	})
})

describe('$slots entries are functions under Vue 3', () => {
	// Guards the shape CnDetailPage.hasDefaultSlotContent relies on: reading
	// `.length` off the slot yields its arity (0 for every compiled slot),
	// which silently reads as "no content" for ANY slot.
	const Probe = {
		name: 'Probe',
		computed: {
			shape() {
				const slot = this.$slots.default
				return `${typeof slot}:${slot ? slot.length : 'none'}`
			},
		},
		template: '<div>{{ shape }}</div>',
	}

	it('exposes a zero-arity function, never an array', () => {
		const w = mount(Probe, { slots: { default: '<p>real content</p>' } })
		expect(w.text()).toBe('function:0')
	})
})

describe('CnDashboardPage — hyphenated listener detection', () => {
	const stubs = {
		CnDashboardGrid: { template: '<div />', props: ['layout'] },
		CnWidgetWrapper: { template: '<div><slot /></div>' },
		CnWidgetRenderer: { template: '<div />' },
	}

	/**
	 * @param {object} listeners Extra props/listeners to bind on the page.
	 * @return {object} Mounted wrapper.
	 */
	function mountPage(listeners = {}) {
		return mount(CnDashboardPage, {
			props: { widgetShowRefresh: null, ...listeners },
			global: { stubs },
		})
	}

	it('detects a bound @widget-refresh listener', () => {
		// Vue's compiler camelizes every v-on argument, so the listener prop
		// key is `onWidgetRefresh`. Probing `$attrs['onWidget-refresh']` — the
		// hyphenated spelling — was `undefined` unconditionally, so the
		// auto-detect never fired and Refresh never appeared.
		const w = mountPage({ onWidgetRefresh: () => {} })
		expect(w.vm.effectiveWidgetShowRefresh).toBe(true)
	})

	it('stays false when no listener is bound', () => {
		expect(mountPage().vm.effectiveWidgetShowRefresh).toBe(false)
	})

	it('lets an explicit widgetShowRefresh prop win over detection', () => {
		const w = mount(CnDashboardPage, {
			props: { widgetShowRefresh: false, onWidgetRefresh: () => {} },
			global: { stubs },
		})
		expect(w.vm.effectiveWidgetShowRefresh).toBe(false)
	})
})
