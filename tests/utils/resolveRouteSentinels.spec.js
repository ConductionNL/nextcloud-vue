/**
 * Tests for the manifest-route-param-sentinel capability.
 *
 * Covers the `@route.<param>` substitution behaviour of
 * `resolveRouteSentinels` — used by `CnPageRenderer.resolvedProps()`
 * to bind vue-router params into declarative manifest config without
 * a wrapper component.
 */

import {
	resolveRouteSentinels,
	clearRouteSentinelWarnings,
} from '../../src/utils/resolveRouteSentinels.js'

describe('resolveRouteSentinels', () => {
	let warnSpy

	beforeEach(() => {
		clearRouteSentinelWarnings()
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	it('substitutes a top-level @route.<param> string', () => {
		const out = resolveRouteSentinels('@route.id', { id: '42' }, 'page-1')
		expect(out).toBe('42')
		expect(warnSpy).not.toHaveBeenCalled()
	})

	it('substitutes a nested string inside config.filter', () => {
		const config = {
			register: 'opencatalogi',
			schema: 'publication',
			filter: { catalog: '@route.catalogSlug' },
		}
		const out = resolveRouteSentinels(config, { catalogSlug: 'open-data' }, 'Publications')
		expect(out.filter.catalog).toBe('open-data')
		// The original object is NOT mutated.
		expect(config.filter.catalog).toBe('@route.catalogSlug')
	})

	it('walks arrays preserving structure', () => {
		const input = ['@route.a', { x: '@route.b' }, 'plain']
		const out = resolveRouteSentinels(input, { a: '1', b: '2' }, 'page')
		expect(out).toEqual(['1', { x: '2' }, 'plain'])
	})

	it('passes through non-sentinel strings unchanged', () => {
		const out = resolveRouteSentinels({
			label: 'Some text',
			href: 'https://example.org',
			emptyLabel: '',
		}, {}, 'page')
		expect(out).toEqual({ label: 'Some text', href: 'https://example.org', emptyLabel: '' })
	})

	it('rejects "@route.foo.bar" (dotted-path) — not a sentinel match', () => {
		const out = resolveRouteSentinels('@route.foo.bar', { foo: { bar: '1' } }, 'page')
		expect(out).toBe('@route.foo.bar')
		expect(warnSpy).not.toHaveBeenCalled()
	})

	it('rejects "@route.1abc" (param must start with a letter)', () => {
		const out = resolveRouteSentinels('@route.1abc', { '1abc': 'x' }, 'page')
		expect(out).toBe('@route.1abc')
	})

	it('substitutes to null + warns once when param is missing', () => {
		const out = resolveRouteSentinels('@route.catalogSlug', {}, 'Publications')
		expect(out).toBeNull()
		expect(warnSpy).toHaveBeenCalledTimes(1)
		expect(warnSpy.mock.calls[0][0]).toContain('catalogSlug')
	})

	it('dedupes warnings for the same (pageId, sentinel) pair', () => {
		const config = {
			filterA: '@route.missing',
			filterB: '@route.missing',
			nested: { also: '@route.missing' },
		}
		resolveRouteSentinels(config, {}, 'samePage')
		// Each of the 3 references warns at most once across the walk.
		expect(warnSpy).toHaveBeenCalledTimes(1)
	})

	it('emits a fresh warning per distinct sentinel string', () => {
		const config = { a: '@route.missingA', b: '@route.missingB' }
		resolveRouteSentinels(config, {}, 'page')
		expect(warnSpy).toHaveBeenCalledTimes(2)
	})

	it('treats undefined params as empty', () => {
		const out = resolveRouteSentinels({ x: '@route.id' }, undefined, 'page')
		expect(out).toEqual({ x: null })
		expect(warnSpy).toHaveBeenCalledTimes(1)
	})

	it('preserves non-string primitives (numbers, booleans, null)', () => {
		const input = { n: 42, b: true, nl: null, u: undefined, s: '@route.id' }
		const out = resolveRouteSentinels(input, { id: 'x' }, 'page')
		expect(out).toEqual({ n: 42, b: true, nl: null, u: undefined, s: 'x' })
	})

	it('does not recurse into non-plain objects (Date)', () => {
		const date = new Date('2025-01-01T00:00:00Z')
		const out = resolveRouteSentinels({ when: date }, {}, 'page')
		expect(out.when).toBe(date)
	})

	it('allows hyphens and underscores in the param name', () => {
		const out = resolveRouteSentinels(
			{ a: '@route.kebab-case', b: '@route.snake_case' },
			{ 'kebab-case': '1', snake_case: '2' },
			'page',
		)
		expect(out).toEqual({ a: '1', b: '2' })
	})
})
