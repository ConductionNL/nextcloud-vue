/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for useSpecRef() — context-aware capability slug resolver.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "useSpecRef composable")
 */

import { useSpecRef } from '../../src/composables/useSpecRef.js'

describe('useSpecRef', () => {
	it('returns null when no source provides a slug', () => {
		const vm = { $options: {}, $parent: null, $route: null }
		expect(useSpecRef(vm)).toBeNull()
	})

	it('returns the slug declared on the component itself', () => {
		const vm = {
			$options: { specRef: 'catalog-management' },
			$parent: null,
		}
		expect(useSpecRef(vm)).toBe('catalog-management')
	})

	it('returns the slug declared on an ancestor when the current component has none', () => {
		const ancestor = {
			$options: { specRef: 'parent-slug' },
			$parent: null,
		}
		const vm = {
			$options: {},
			$parent: ancestor,
		}
		expect(useSpecRef(vm)).toBe('parent-slug')
	})

	it('returns the component-level slug when both component and route declare one', () => {
		const vm = {
			$options: { specRef: 'foo' },
			$parent: null,
			$route: { meta: { specRef: 'bar' } },
		}
		// Component option wins over route meta — strongest statement of intent first.
		expect(useSpecRef(vm)).toBe('foo')
	})

	it('falls back to route meta when no ancestor declares a slug', () => {
		const vm = {
			$options: {},
			$parent: null,
			$route: { meta: { specRef: 'bar' } },
		}
		expect(useSpecRef(vm)).toBe('bar')
	})

	it('returns null for a non-object input', () => {
		expect(useSpecRef(null)).toBeNull()
		expect(useSpecRef(undefined)).toBeNull()
		expect(useSpecRef('not-a-vm')).toBeNull()
	})

	it('ignores empty-string slugs', () => {
		const vm = {
			$options: { specRef: '' },
			$parent: null,
			$route: { meta: { specRef: 'bar' } },
		}
		// Empty string at the component level is treated as "absent", so the route fallback wins.
		expect(useSpecRef(vm)).toBe('bar')
	})

	it('ignores non-string slug values', () => {
		const vm = {
			$options: { specRef: 42 },
			$parent: null,
			$route: { meta: { specRef: 'bar' } },
		}
		expect(useSpecRef(vm)).toBe('bar')
	})
})
