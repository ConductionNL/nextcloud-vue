// Mock @nextcloud/l10n so we can assert the template + params reach translate,
// independent of any registered bundle. The mock prefixes the app id and
// substitutes {placeholders} the same way @nextcloud/l10n does.
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, vars = {}) => `[${app}] ` + text.replace(/\{(\w+)\}/g, (_, key) => vars[key]),
}))

import { translateValidationMessage } from '../../src/utils/validationMessages.js'

describe('translateValidationMessage', () => {
	it('extracts the single-quoted values and renders the translatable template', () => {
		const raw = "Property 'client' should match format 'uuid' but 'alice' does not. Please provide a value in the correct format."

		const out = translateValidationMessage(raw)

		// Proves: matched the pattern, passed the {property}/{format}/{value}
		// template to t('nextcloud-vue', …) and substituted the captured values.
		expect(out).toBe("[nextcloud-vue] Property 'client' should match format 'uuid' but 'alice' does not. Please provide a value in the correct format.")
	})

	it('returns an unrecognised message unchanged (no translation attempted)', () => {
		const raw = 'Some other backend error that we do not have a pattern for.'
		expect(translateValidationMessage(raw)).toBe(raw)
	})

	it('passes non-string input through untouched', () => {
		expect(translateValidationMessage(null)).toBeNull()
		expect(translateValidationMessage(undefined)).toBeUndefined()
		expect(translateValidationMessage({ a: 1 })).toEqual({ a: 1 })
	})
})
