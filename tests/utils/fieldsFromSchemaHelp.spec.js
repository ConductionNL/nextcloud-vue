/**
 * `x-help` on a schema property becomes the field's `help`.
 *
 * @spec openspec/changes/field-help-in-place/tasks.md#task-1
 */
import { fieldsFromSchema } from '../../src/utils/schema.js'

const schemaWith = (key, prop) => ({ properties: { [key]: { type: 'string', title: 'T', ...prop } } })

describe('fieldsFromSchema x-help', () => {
	it('emits a string x-help as help, beside the unchanged description', () => {
		const [field] = fieldsFromSchema(schemaWith('a', { description: 'Short', 'x-help': 'The long explanation.' }))
		expect(field.help).toBe('The long explanation.')
		expect(field.description).toBe('Short')
		expect(field.descriptionLong).toBe('The long explanation.')
	})

	it('picks the user language from a language map', () => {
		const map = { nl: 'Kies de categorie uit art. 3.3 Woo', en: 'Pick the category from art. 3.3' }
		expect(fieldsFromSchema(schemaWith('wooCategory', { description: 'The Woo category', 'x-help': map }), { language: 'nl' })[0]).toMatchObject({ description: 'The Woo category', help: 'Kies de categorie uit art. 3.3 Woo' })
	})

	it('falls back from region to base language, then en, then the first entry', () => {
		const prop = (map) => schemaWith('a', { 'x-help': map })
		expect(fieldsFromSchema(prop({ nl: 'NL', en: 'EN' }), { language: 'nl_NL' })[0].help).toBe('NL')
		expect(fieldsFromSchema(prop({ nl: 'NL', en: 'EN' }), { language: 'de' })[0].help).toBe('EN')
		expect(fieldsFromSchema(prop({ nl: 'NL', fr: 'FR' }), { language: 'de' })[0].help).toBe('NL')
		expect(fieldsFromSchema(prop({ nl: 'NL', en: 'EN' }))[0].help).toBe('EN')
	})

	it("is '' when absent and leaves a long description as before", () => {
		const long = 'A long sentence. ' + 'More words here. '.repeat(30)
		const [field] = fieldsFromSchema(schemaWith('a', { description: long }))
		expect(field.help).toBe('')
		expect(field.descriptionLong).not.toBe('')
	})

	it('ignores a malformed value with one warning naming the property', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const schema = schemaWith('brokenHelpProp', { 'x-help': 42 })
		expect(fieldsFromSchema(schema)[0].help).toBe('')
		fieldsFromSchema(schema)
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('brokenHelpProp')
		warn.mockRestore()
	})
})
