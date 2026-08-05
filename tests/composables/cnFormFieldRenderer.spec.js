/**
 * Tests for cnRenderFormField — the shared field-renderer helper
 * used by CnFormPage (and, in a follow-up DRY pass, CnSettingsPage's
 * bare-fields branch).
 *
 * Spec: REQ-MFPT-* (manifest-form-page-type) — the renderer MUST
 * dispatch by `field.type` to a known set of inputs and fall back to
 * NcTextField (with a one-shot console.warn) for unknown types.
 */

import { cnRenderFormField } from '@/composables/cnFormFieldRenderer.js'

describe('cnRenderFormField', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	it('returns null when field is missing', () => {
		expect(cnRenderFormField({})).toBeNull()
		expect(cnRenderFormField({ field: null })).toBeNull()
		expect(cnRenderFormField({ field: {} })).toBeNull()
	})

	it('boolean field maps to NcCheckboxRadioSwitch with checked binding', () => {
		const onInput = jest.fn()
		const out = cnRenderFormField({
			field: { key: 'agree', type: 'boolean', label: 'Agree' },
			value: true,
			onInput,
		})
		expect(out.kind).toBe('boolean')
		expect(out.props.checked).toBe(true)
		expect(typeof out.listeners['update:checked']).toBe('function')
		out.listeners['update:checked'](false)
		expect(onInput).toHaveBeenCalledWith(false)
	})

	it('number field coerces empty string to null and other strings to Number', () => {
		const onInput = jest.fn()
		const out = cnRenderFormField({
			field: { key: 'age', type: 'number', label: 'Age' },
			value: 42,
			onInput,
		})
		expect(out.kind).toBe('number')
		expect(out.props.type).toBe('number')
		out.listeners['update:value']('')
		out.listeners['update:value']('17')
		expect(onInput).toHaveBeenNthCalledWith(1, null)
		expect(onInput).toHaveBeenNthCalledWith(2, 17)
	})

	it('password field renders NcTextField with type=password', () => {
		const out = cnRenderFormField({
			field: { key: 'pw', type: 'password', label: 'Password' },
			value: 'secret',
			onInput: jest.fn(),
		})
		expect(out.kind).toBe('password')
		expect(out.props.type).toBe('password')
	})

	it('string field renders NcTextField by default', () => {
		const out = cnRenderFormField({
			field: { key: 'name', type: 'string', label: 'Name' },
			value: 'Carol',
			onInput: jest.fn(),
		})
		expect(out.kind).toBe('string')
		expect(out.props.value).toBe('Carol')
	})

	it('string field with widget=textarea renders the textarea variant', () => {
		const out = cnRenderFormField({
			field: { key: 'comment', type: 'string', widget: 'textarea', label: 'Comment' },
			value: 'hi',
			onInput: jest.fn(),
		})
		expect(out.kind).toBe('string-textarea')
	})

	it('enum field shapes options to { label, value } and resolves selection', () => {
		const out = cnRenderFormField({
			field: { key: 'color', type: 'enum', label: 'Color', enum: ['red', 'green'] },
			value: 'green',
			onInput: jest.fn(),
		})
		expect(out.kind).toBe('enum')
		expect(out.props.options).toEqual([
			{ label: 'red', value: 'red' },
			{ label: 'green', value: 'green' },
		])
		expect(out.props.value).toEqual({ label: 'green', value: 'green' })
	})

	it('enum field maps NcSelect input(option) → onInput(option.value)', () => {
		const onInput = jest.fn()
		const out = cnRenderFormField({
			field: { key: 'color', type: 'enum', label: 'Color', enum: ['red', 'green'] },
			value: null,
			onInput,
		})
		out.listeners.input({ label: 'red', value: 'red' })
		expect(onInput).toHaveBeenCalledWith('red')
	})

	it('json field renders CnJsonViewer (read-only display)', () => {
		const out = cnRenderFormField({
			field: { key: 'cfg', type: 'json', label: 'Config' },
			value: { foo: 'bar' },
			onInput: jest.fn(),
		})
		expect(out.kind).toBe('json')
		expect(out.props.value).toEqual({ foo: 'bar' })
	})

	it('unknown field.type warns once and falls back to NcTextField', () => {
		const out = cnRenderFormField({
			field: { key: 'wat', type: 'experimental-x', label: 'X' },
			value: '',
			onInput: jest.fn(),
		})
		expect(out.kind).toBe('fallback')
		expect(warnSpy).toHaveBeenCalled()
	})

	it('translator is applied to field.label', () => {
		const t = jest.fn((k) => `T(${k})`)
		const out = cnRenderFormField({
			field: { key: 'name', type: 'string', label: 'name.label' },
			value: '',
			onInput: jest.fn(),
			t,
		})
		expect(out.props.label).toBe('T(name.label)')
		expect(t).toHaveBeenCalledWith('name.label')
	})
})
