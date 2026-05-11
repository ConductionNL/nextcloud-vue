/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for useSuggestFeatureAction() — NcActions descriptor factory for the
 * context-aware "Suggest feature" action.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "useSuggestFeatureAction helper")
 */

import { useSuggestFeatureAction } from '../../src/composables/useSuggestFeatureAction.js'

describe('useSuggestFeatureAction', () => {
	it('returns null when no specRef is in scope', () => {
		const vm = { $options: {}, $parent: null, $route: null }
		expect(useSuggestFeatureAction(vm, () => {})).toBeNull()
	})

	it('returns a descriptor when a specRef is declared on the component', () => {
		const vm = {
			$options: { specRef: 'catalog-management' },
			$parent: null,
		}
		const action = useSuggestFeatureAction(vm, () => {})

		expect(action).not.toBeNull()
		expect(action.specRef).toBe('catalog-management')
		expect(typeof action.label).toBe('string')
		expect(typeof action.action).toBe('function')
		expect(typeof action.icon).toBe('string')
	})

	it("invokes the onOpenModal callback with the resolved slug when the action is fired", () => {
		const vm = {
			$options: { specRef: 'avg-compliance' },
			$parent: null,
		}
		const calls = []
		const action = useSuggestFeatureAction(vm, (slug) => calls.push(slug))

		action.action()
		expect(calls).toEqual(['avg-compliance'])
	})

	it('does not throw when onOpenModal is not a function', () => {
		const vm = {
			$options: { specRef: 'foo' },
			$parent: null,
		}
		const action = useSuggestFeatureAction(vm, null)
		expect(() => action.action()).not.toThrow()
	})

	it('falls back to route meta for the slug', () => {
		const vm = {
			$options: {},
			$parent: null,
			$route: { meta: { specRef: 'route-slug' } },
		}
		const action = useSuggestFeatureAction(vm, () => {})
		expect(action.specRef).toBe('route-slug')
	})
})
