/**
 * Tests for cnRenderFormField — the shared field-renderer helper
 * used by CnFormPage (and, in a follow-up DRY pass, CnSettingsPage's
 * bare-fields branch).
 *
 * Spec: REQ-MFPT-* (manifest-form-page-type) — the renderer MUST
 * dispatch by `field.type` to a known set of inputs and fall back to
 * NcTextField (with a one-shot console.warn) for unknown types.
 */

import * as ncVue from '@nextcloud/vue'
import { cnRenderFormField, NC_TEXT_AREA_AVAILABLE } from '@/composables/cnFormFieldRenderer.js'

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
		out.listeners['update:modelValue']('')
		out.listeners['update:modelValue']('17')
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
		expect(out.props.modelValue).toBe('Carol')
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
		expect(out.props.modelValue).toEqual({ label: 'green', value: 'green' })
	})

	it('enum field maps NcSelect update:modelValue(option) → onInput(option.value)', () => {
		// @nextcloud/vue 9's NcSelect declares `emits: [" ", "update:modelValue"]`
		// and never emits `input` — see the composable's inline comment. Asserting
		// on `update:modelValue` here is what would have caught the dead-listener
		// bug (the old test asserted `out.listeners.input`, which always existed
		// on the returned object regardless of whether NcSelect ever called it).
		const onInput = jest.fn()
		const out = cnRenderFormField({
			field: { key: 'color', type: 'enum', label: 'Color', enum: ['red', 'green'] },
			value: null,
			onInput,
		})
		out.listeners['update:modelValue']({ label: 'red', value: 'red' })
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

/**
 * NcTextArea must actually RESOLVE.
 *
 * It used to be pulled in with a CommonJS call inside a try/catch. That call
 * cannot succeed from an ESM build — `@nextcloud/vue@9` publishes an
 * `exports` map with an `import` condition and no CommonJS one — so the catch
 * fired, `NcTextArea` stayed null forever, and every `widget: "textarea"`
 * field quietly rendered a bare `<textarea>` with no label wiring and no
 * error state. Nothing threw; nothing logged; the only visible trace was a
 * build warning in each consuming app.
 *
 * The assertions below are about the RESOLVED VALUE, not about the shape of
 * the returned object: `kind === 'string-textarea'` was true throughout the
 * broken period, which is why the existing test could not see the bug.
 */
describe('cnRenderFormField — NcTextArea resolution', () => {
	it('CONTROL: @nextcloud/vue really does export NcTextArea here', () => {
		// If this ever fails, every assertion below is measuring the absence of
		// a component that was never available — a different bug wearing the
		// same failure message.
		expect(ncVue.NcTextArea).toBeDefined()
		expect(ncVue.NcTextArea).not.toBeNull()
	})

	it('reports NcTextArea as AVAILABLE', () => {
		// The old code exported no such flag at all: the "is the fallback in
		// use?" question had no observable answer, which is what let a
		// permanently-null component go unnoticed.
		expect(NC_TEXT_AREA_AVAILABLE).toBe(true)
	})

	it('renders the real NcTextArea, not the degraded native <textarea>', () => {
		const out = cnRenderFormField({
			field: { key: 'comment', type: 'string', widget: 'textarea', label: 'Comment' },
			value: 'hi',
			onInput: jest.fn(),
		})
		expect(out.tag).not.toBe('textarea')
		expect(out.tag).toBe(ncVue.NcTextArea)
	})

	it('gives the textarea field the NC-native error state (REQ-MFL-11)', () => {
		// The consequence that was silently lost: `supportsNativeError` only
		// admits `string-textarea` when the tag is a component, so with
		// NcTextArea null the validation message never reached the input and
		// CnFormPage fell back to an adjacent role="alert" instead.
		const out = cnRenderFormField({
			field: { key: 'comment', type: 'string', widget: 'textarea', label: 'Comment' },
			value: 'hi',
			onInput: jest.fn(),
			error: 'Too short',
		})
		expect(out.props.error).toBe(true)
		expect(out.props.helperText).toBe('Too short')
	})

	it('WARNS — loudly — when it does have to fall back', () => {
		// A fallback is acceptable; an UNOBSERVABLE fallback is not. Module
		// state is reset because the warning is one-shot per process.
		jest.resetModules()
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			// eslint-disable-next-line n/global-require
			const { cnRenderFormField: fresh } = require('@/composables/cnFormFieldRenderer.js')
			const out = fresh({
				field: { key: 'comment', type: 'string', widget: 'textarea', label: 'Comment' },
				value: '',
				onInput: jest.fn(),
				componentMap: { 'string-textarea': null },
			})
			expect(out.tag).toBe('textarea')
			expect(warn).toHaveBeenCalledTimes(1)
			expect(String(warn.mock.calls[0][0])).toMatch(/NcTextArea is unavailable/)
		} finally {
			warn.mockRestore()
		}
	})
})
