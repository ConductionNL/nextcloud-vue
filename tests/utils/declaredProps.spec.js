/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { defineAsyncComponent } from 'vue'
import { declaredPropNames, pickDeclaredProps, resetDeclaredPropWarnings } from '../../src/utils/declaredProps.js'

describe('declaredPropNames', () => {
	it('reads array and object props, camelCased', () => {
		expect([...declaredPropNames({ props: ['a', 'some-key'] })]).toEqual(['a', 'someKey'])
		expect([...declaredPropNames({ props: { b: String } })]).toEqual(['b'])
	})

	it('follows extends and mixins', () => {
		const base = { props: { fromBase: String } }
		const mixin = { props: ['fromMixin'] }
		expect([...declaredPropNames({ extends: base, mixins: [mixin], props: ['own'] })].sort()).toEqual(['fromBase', 'fromMixin', 'own'])
	})

	it('is null for a component that takes every attribute', () => {
		expect(declaredPropNames({ inheritAttrs: false, props: ['a'] })).toBeNull()
		expect(declaredPropNames({ extends: { inheritAttrs: false }, props: ['a'] })).toBeNull()
		expect(declaredPropNames(() => null)).toBeNull()
		expect(declaredPropNames(defineAsyncComponent(() => Promise.resolve({ props: ['a'] })))).toBeNull()
		expect(declaredPropNames(null)).toBeNull()
	})

	it('reads a functional component\'s props', () => {
		const fn = () => null
		fn.props = ['x']
		expect([...declaredPropNames(fn)]).toEqual(['x'])
	})
})

describe('pickDeclaredProps', () => {
	beforeEach(() => resetDeclaredPropWarnings())

	it('keeps declared keys, in kebab or camel case, and drops the rest', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(pickDeclaredProps({ props: ['someKey'] }, { someKey: 1, 'some-key': 2, other: 3 }, 't')).toEqual({ someKey: 1, 'some-key': 2 })
		expect(warn).toHaveBeenCalledTimes(1)
		warn.mockRestore()
	})

	it('drops silently for a component that reads `content`', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(pickDeclaredProps({ props: ['content'] }, { other: 3 }, 't')).toEqual({})
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('passes everything for a component that takes every attribute', () => {
		const bindings = { a: 1, b: 2 }
		expect(pickDeclaredProps({ inheritAttrs: false }, bindings, 't')).toBe(bindings)
	})
})
