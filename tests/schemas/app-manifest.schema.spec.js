/**
 * Tests for the app-manifest JSON Schema and the FE validator that
 * checks against it. Covers REQ-JMR-001 from the json-manifest-renderer
 * spec, exercised against the fixtures in tests/fixtures.
 *
 * Note: the FE validator is the hand-rolled `validateManifest` (see
 * src/utils/validateManifest.js) which covers the rules that matter at
 * runtime (required fields, semver, closed page-type enum, page id
 * uniqueness, dependencies type, custom-page component requirement).
 * The full schema with `additionalProperties:false` and `format` URI
 * checks is enforced by Ajv in the BE / hydra CI validators that
 * consume the same JSON Schema file (see ConductionNL/hydra#195).
 */

import schema from '../../src/schemas/app-manifest.schema.json'
import valid from '../fixtures/manifest-valid.json'
import invalid from '../fixtures/manifest-invalid.json'
import { validateManifest } from '../../src/utils/validateManifest.js'

describe('app-manifest.schema.json (metadata)', () => {
	it('declares JSON Schema draft 2020-12', () => {
		expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
	})

	it('uses the GitHub raw URL on `main` as $id', () => {
		expect(schema.$id).toBe(
			'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest.schema.json',
		)
	})

	it('has a title and description', () => {
		expect(schema.title).toBe('Conduction App Manifest')
		expect(typeof schema.description).toBe('string')
	})

	it('has a closed page-type enum of exactly index|detail|dashboard|custom', () => {
		expect(schema.$defs.page.properties.type.enum).toEqual(['index', 'detail', 'dashboard', 'custom'])
	})

	it('lists version, menu, pages as top-level required fields', () => {
		expect(schema.required).toEqual(expect.arrayContaining(['version', 'menu', 'pages']))
	})

	it('disallows additional top-level properties', () => {
		expect(schema.additionalProperties).toBe(false)
	})
})

describe('validateManifest (FE)', () => {
	it('passes a valid fixture exercising all four page types and nested children', () => {
		const result = validateManifest(valid)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('rejects a non-semver version', () => {
		const result = validateManifest(invalid)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/version') && e.includes('semver'))).toBe(true)
	})

	it('rejects a page with an unknown type', () => {
		const result = validateManifest(invalid)
		expect(result.errors.some((e) => e.includes('type must be one of'))).toBe(true)
	})

	it('rejects duplicate page ids', () => {
		const result = validateManifest(invalid)
		expect(result.errors.some((e) => e.includes('unique within pages[]'))).toBe(true)
	})

	it('rejects a custom-type page that is missing the `component` field', () => {
		const result = validateManifest(invalid)
		expect(result.errors.some((e) => e.includes('component is required when type is "custom"'))).toBe(true)
	})

	it('rejects a menu item missing its label', () => {
		const result = validateManifest(invalid)
		expect(result.errors.some((e) => e.includes('/menu/0/label'))).toBe(true)
	})

	it('returns a single error when manifest is not an object', () => {
		const result = validateManifest('not an object')
		expect(result).toEqual({ valid: false, errors: ['manifest must be an object'] })
	})
})
