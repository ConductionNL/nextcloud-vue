/**
 * Tests for the wiki page-type validator (manifest-wiki-page-type +
 * manifest-wiki-stabilise).
 *
 * Covers:
 *   - REQ (manifest-wiki-page-type): a type='wiki' page MUST declare
 *     config.register + config.schema as non-empty strings.
 *   - REQ (manifest-wiki-stabilise): the optional typed config fields
 *     (contentField, titleField, idParam, treeField, sidebarTitleField,
 *     sidebarRegister, sidebarSchema, emptyText, emptyDescription,
 *     emptyBodyText, emptyBodyDescription) MUST be strings when present;
 *     omitted fields are tolerated; unknown keys pass for forward-compat.
 *
 * Both the v1 (`app-manifest.schema.json` → validateTypeConfig) and v2
 * (`app-manifest-v2.schema.json` → Ajv allOf/if-then) entry points are
 * exercised since both ship in the same `validateManifest()` dispatcher.
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V1_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest.schema.json'
const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

const OPTIONAL_STRING_FIELDS = [
	'contentField',
	'titleField',
	'idParam',
	'treeField',
	'sidebarTitleField',
	'sidebarRegister',
	'sidebarSchema',
	'emptyText',
	'emptyDescription',
	'emptyBodyText',
	'emptyBodyDescription',
]

/**
 * Build a minimal v1 manifest with a single wiki page.
 *
 * @param {object} config The page config (register/schema + optionals).
 * @return {object} Complete v1 manifest.
 */
function v1Wiki(config) {
	return {
		$schema: V1_SCHEMA_URL,
		version: '1.0.0',
		menu: [{ id: 'Article', label: 'Article', route: 'Article' }],
		pages: [
			{
				id: 'Article',
				route: '/articles/:id',
				type: 'wiki',
				title: 'Article',
				config,
			},
		],
	}
}

/**
 * Build a minimal v2 manifest with a single wiki page.
 *
 * @param {object} config The page config (register/schema + optionals).
 * @return {object} Complete v2 manifest.
 */
function v2Wiki(config) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.9.0',
		menu: [{ id: 'Article', label: 'Article', route: 'Article', order: 10 }],
		pages: [
			{
				id: 'Article',
				route: '/articles/:id',
				type: 'wiki',
				title: 'Article',
				config,
			},
		],
	}
}

describe('wiki page-type validation — required register + schema', () => {
	it('v1: wiki with register+schema validates', () => {
		const result = validateManifest(v1Wiki({ register: 'pipelinq', schema: 'article' }))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('v2: wiki with register+schema validates', () => {
		const result = validateManifest(v2Wiki({ register: 'pipelinq', schema: 'article' }))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('v1: wiki missing register rejected', () => {
		const result = validateManifest(v1Wiki({ schema: 'article' }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /register and schema/.test(e))).toBe(true)
	})

	it('v1: wiki missing schema rejected', () => {
		const result = validateManifest(v1Wiki({ register: 'pipelinq' }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /register and schema/.test(e))).toBe(true)
	})

	it('v1: wiki with empty-string register rejected', () => {
		const result = validateManifest(v1Wiki({ register: '', schema: 'article' }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /register and schema/.test(e))).toBe(true)
	})

	it('v2: wiki missing register rejected', () => {
		const result = validateManifest(v2Wiki({ schema: 'article' }))
		expect(result.valid).toBe(false)
	})

	it('v2: wiki missing schema rejected', () => {
		const result = validateManifest(v2Wiki({ register: 'pipelinq' }))
		expect(result.valid).toBe(false)
	})
})

describe('wiki page-type validation — optional typed config fields (stabilise)', () => {
	it('v1: omitted optional fields validate', () => {
		const result = validateManifest(v1Wiki({ register: 'pipelinq', schema: 'article' }))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('v1: well-formed wiki config with all optional fields validates', () => {
		const config = { register: 'pipelinq', schema: 'article' }
		OPTIONAL_STRING_FIELDS.forEach((f) => { config[f] = `${f}-value` })
		const result = validateManifest(v1Wiki(config))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it.each(OPTIONAL_STRING_FIELDS)('v1: non-string %s rejects with the field path', (field) => {
		const config = { register: 'pipelinq', schema: 'article', [field]: 123 }
		const result = validateManifest(v1Wiki(config))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes(field) && /must be a string when set/.test(e))).toBe(true)
	})

	it('v1: unknown config key passes (forward-compat)', () => {
		const result = validateManifest(v1Wiki({ register: 'pipelinq', schema: 'article', futureField: 'x' }))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('v2: well-formed wiki config with all optional fields validates', () => {
		const config = { register: 'pipelinq', schema: 'article' }
		OPTIONAL_STRING_FIELDS.forEach((f) => { config[f] = `${f}-value` })
		const result = validateManifest(v2Wiki(config))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('v2: non-string optional field rejects', () => {
		const result = validateManifest(v2Wiki({ register: 'pipelinq', schema: 'article', contentField: 99 }))
		expect(result.valid).toBe(false)
	})

	it('v2: unknown config key passes (forward-compat)', () => {
		const result = validateManifest(v2Wiki({ register: 'pipelinq', schema: 'article', futureField: 'x' }))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})
})
