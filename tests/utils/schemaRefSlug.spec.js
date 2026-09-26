/**
 * Tests for schemaRefSlug — kebab-casing a `$ref` schema title into the
 * OpenRegister objects-API schema slug.
 *
 * Covers learniq round-1 defect 7: a `$ref` is authored as the schema's
 * PascalCase title (`ReportPeriod`), the objects API resolves schemas by
 * kebab-case slug (`report-period`), and the mismatch 404s for every
 * multi-word schema title while a single-word one (`Cohort`/`cohort`)
 * happens to work by accident.
 */

const { schemaRefSlug } = require('../../src/utils/schemaRefSlug.js')

describe('schemaRefSlug', () => {
	it('kebab-cases a two-word PascalCase title', () => {
		expect(schemaRefSlug('ReportPeriod')).toBe('report-period')
		expect(schemaRefSlug('LearnerProfile')).toBe('learner-profile')
	})

	it('lowercases a single-word title without inserting a dash', () => {
		expect(schemaRefSlug('Cohort')).toBe('cohort')
	})

	it('leaves an already-kebab slug untouched (idempotent)', () => {
		expect(schemaRefSlug('report-period')).toBe('report-period')
		expect(schemaRefSlug('cohort')).toBe('cohort')
	})

	it('folds spaces and parentheses to single dashes, trimming the ends', () => {
		expect(schemaRefSlug('Praktijkovereenkomst (POK)')).toBe('praktijkovereenkomst-pok')
	})

	it('keeps an acronym run together, splitting only before a new capitalised word', () => {
		expect(schemaRefSlug('HTTPServer')).toBe('http-server')
	})

	it('takes the tail of a JSON-Pointer $ref before slugifying', () => {
		expect(schemaRefSlug('#/components/schemas/ReportPeriod')).toBe('report-period')
	})

	it('passes a numeric schema id through unchanged', () => {
		expect(schemaRefSlug(85)).toBe(85)
	})

	it('passes a numeric-looking string through as a harmless no-op slug', () => {
		expect(schemaRefSlug('85')).toBe('85')
	})

	it('degrades to the empty string for null, undefined, NaN and empty input', () => {
		expect(schemaRefSlug(null)).toBe('')
		expect(schemaRefSlug(undefined)).toBe('')
		expect(schemaRefSlug(NaN)).toBe('')
		expect(schemaRefSlug('')).toBe('')
	})

	it('collapses a run of separators to one dash instead of several', () => {
		expect(schemaRefSlug('Foo   Bar')).toBe('foo-bar')
	})
})
