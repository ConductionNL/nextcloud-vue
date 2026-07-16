/**
 * Tests for `validateFieldValue` (manifest-form-logic, REQ-MFL-8).
 *
 * Mocks @nextcloud/l10n the same way tests/utils/validationMessages.spec.js
 * does — a deterministic `translate` that prefixes the app id and substitutes
 * `{placeholder}` values, independent of any registered bundle — so built-in
 * message assertions don't depend on the real gettext runtime.
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, vars = {}) => `[${app}] ` + text.replace(/\{(\w+)\}/g, (_, key) => vars[key]),
}))

import { validateFieldValue } from '../../src/utils/formValidation.js'

describe('validateFieldValue — no validation shape', () => {
	it('returns null when the field has no validation object', () => {
		expect(validateFieldValue({ key: 'x', type: 'string' }, 'anything')).toBeNull()
	})

	it('returns null for a non-object field', () => {
		expect(validateFieldValue(null, 'x')).toBeNull()
		expect(validateFieldValue(undefined, 'x')).toBeNull()
	})
})

describe('validateFieldValue — required (per type)', () => {
	it('required string with whitespace only fails', () => {
		const field = { key: 'name', type: 'string', validation: { required: true } }
		expect(validateFieldValue(field, '   ')).toEqual(expect.stringContaining('required'))
		expect(validateFieldValue(field, '')).toEqual(expect.stringContaining('required'))
		expect(validateFieldValue(field, null)).toEqual(expect.stringContaining('required'))
	})

	it('required string with a real value passes', () => {
		const field = { key: 'name', type: 'string', validation: { required: true } }
		expect(validateFieldValue(field, 'Ada')).toBeNull()
	})

	it('required number requires a finite number', () => {
		const field = { key: 'n', type: 'number', validation: { required: true } }
		expect(validateFieldValue(field, null)).toEqual(expect.stringContaining('required'))
		expect(validateFieldValue(field, NaN)).toEqual(expect.stringContaining('required'))
		expect(validateFieldValue(field, 0)).toBeNull()
		expect(validateFieldValue(field, 42)).toBeNull()
	})

	it('required boolean must be true', () => {
		const field = { key: 'agree', type: 'boolean', validation: { required: true } }
		expect(validateFieldValue(field, false)).toEqual(expect.stringContaining('required'))
		expect(validateFieldValue(field, true)).toBeNull()
	})

	it('required enum needs a selected (non-empty) value', () => {
		const field = { key: 'kind', type: 'enum', validation: { required: true } }
		expect(validateFieldValue(field, null)).toEqual(expect.stringContaining('required'))
		expect(validateFieldValue(field, '')).toEqual(expect.stringContaining('required'))
		expect(validateFieldValue(field, 'person')).toBeNull()
	})

	it('required json needs a non-null value', () => {
		const field = { key: 'blob', type: 'json', validation: { required: true } }
		expect(validateFieldValue(field, null)).toEqual(expect.stringContaining('required'))
		expect(validateFieldValue(field, {})).toBeNull()
		expect(validateFieldValue(field, { a: 1 })).toBeNull()
	})
})

describe('validateFieldValue — min/max bounds', () => {
	it('number bounds use the numeric VALUE (max-only)', () => {
		const field = { key: 'amount', type: 'number', validation: { max: 10 } }
		expect(validateFieldValue(field, 42)).toEqual(expect.stringContaining('most'))
		expect(validateFieldValue(field, 5)).toBeNull()
	})

	it('number bounds use the numeric VALUE (min-only)', () => {
		const field = { key: 'amount', type: 'number', validation: { min: 0 } }
		expect(validateFieldValue(field, -1)).toEqual(expect.stringContaining('least'))
		expect(validateFieldValue(field, 5)).toBeNull()
	})

	it('string bounds use LENGTH, not numeric value', () => {
		const field = { key: 'name', type: 'string', validation: { min: 2 } }
		expect(validateFieldValue(field, 'a')).toEqual(expect.stringContaining('least'))
		expect(validateFieldValue(field, 'ab')).toBeNull()
	})

	it('string max bound', () => {
		const field = { key: 'name', type: 'string', validation: { max: 3 } }
		expect(validateFieldValue(field, 'abcd')).toEqual(expect.stringContaining('most'))
		expect(validateFieldValue(field, 'abc')).toBeNull()
	})

	it('both min and max set renders the between message', () => {
		const field = { key: 'name', type: 'string', validation: { min: 2, max: 4 } }
		expect(validateFieldValue(field, 'a')).toEqual(expect.stringContaining('between'))
		expect(validateFieldValue(field, 'abcde')).toEqual(expect.stringContaining('between'))
		expect(validateFieldValue(field, 'abc')).toBeNull()
	})

	it('an empty, non-required value skips min/max entirely', () => {
		const field = { key: 'name', type: 'string', validation: { min: 2 } }
		expect(validateFieldValue(field, '')).toBeNull()
		expect(validateFieldValue(field, null)).toBeNull()
	})

	it('min/max on password uses length like string', () => {
		const field = { key: 'pw', type: 'password', validation: { min: 8 } }
		expect(validateFieldValue(field, 'short')).toEqual(expect.stringContaining('least'))
		expect(validateFieldValue(field, 'longenough')).toBeNull()
	})
})

describe('validateFieldValue — pattern', () => {
	it('pattern mismatch uses the custom message when provided', () => {
		const field = {
			key: 'kvk',
			type: 'string',
			validation: { pattern: '^[0-9]{8}$', message: 'i18n.kvk-invalid' },
		}
		const translate = (key) => `TRANSLATED(${key})`
		expect(validateFieldValue(field, '12ab', translate)).toBe('TRANSLATED(i18n.kvk-invalid)')
	})

	it('pattern mismatch without a custom message uses the built-in default', () => {
		const field = { key: 'kvk', type: 'string', validation: { pattern: '^[0-9]{8}$' } }
		expect(validateFieldValue(field, '12ab')).toEqual(expect.stringContaining('Invalid format'))
	})

	it('pattern match passes', () => {
		const field = { key: 'kvk', type: 'string', validation: { pattern: '^[0-9]{8}$' } }
		expect(validateFieldValue(field, '12345678')).toBeNull()
	})

	it('an uncompilable pattern never throws and never blocks the user (schema catches it)', () => {
		const field = { key: 'kvk', type: 'string', validation: { pattern: '([a-z' } }
		expect(() => validateFieldValue(field, 'anything')).not.toThrow()
		expect(validateFieldValue(field, 'anything')).toBeNull()
	})
})

describe('validateFieldValue — translate argument defaults to identity', () => {
	it('without a translate function, validation.message passes through unchanged', () => {
		const field = { key: 'kvk', type: 'string', validation: { required: true, message: 'i18n.kvk-required' } }
		expect(validateFieldValue(field, '')).toBe('i18n.kvk-required')
	})
})
