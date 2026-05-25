/**
 * Tests for the manifest-wiki-stabilise change.
 *
 * Covers the 11 typed string fields newly declared under
 * pages[].config for type='wiki' pages (each must be a string when
 * present — enforced by the v2 JSON schema).
 *
 * Note: register/schema are NOT required for a wiki page. Wiki content
 * comes from the xwiki leaf integration (external, via OpenConnector),
 * not the app's own register/schema. The `type:'wiki'` page type is
 * slated for deprecation in favour of that integration — see
 * ConductionNL/nextcloud-vue#445.
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal v2 manifest with one type='wiki' page.
 *
 * @param {object} config Wiki page config.
 * @return {object} Complete v2 manifest.
 */
function manifestWithWiki(config) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.4.0',
		menu: [{ id: 'Wiki', label: 'Wiki', route: 'Wiki', order: 10 }],
		pages: [
			{
				id: 'Wiki',
				route: '/wiki/:id',
				type: 'wiki',
				title: 'Wiki',
				config,
			},
		],
	}
}

describe('type=wiki — manifest-wiki-stabilise', () => {
	it('passes with only register + schema set', () => {
		const result = validateManifest(manifestWithWiki({
			register: 'opencatalogi',
			schema: 'article',
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('passes with every typed optional field set to a string', () => {
		const result = validateManifest(manifestWithWiki({
			register: 'opencatalogi',
			schema: 'article',
			contentField: 'body',
			titleField: 'name',
			idParam: 'articleId',
			treeField: 'children',
			sidebarTitleField: 'shortTitle',
			sidebarRegister: 'opencatalogi',
			sidebarSchema: 'category',
			emptyText: 'No article',
			emptyDescription: 'Sorry.',
			emptyBodyText: 'Empty article',
			emptyBodyDescription: 'No content yet.',
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	// Wiki content is sourced from the xwiki leaf integration (external,
	// routed via OpenConnector) — a `type:'wiki'` page is NOT backed by
	// the app's own register/schema, so neither is required. (The
	// `type:'wiki'` page type itself is slated for deprecation in favour
	// of the xwiki integration — see ConductionNL/nextcloud-vue#445.)
	it('allows a wiki page without register (not app-DB-backed)', () => {
		const result = validateManifest(manifestWithWiki({
			schema: 'article',
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('allows a wiki page without schema (not app-DB-backed)', () => {
		const result = validateManifest(manifestWithWiki({
			register: 'opencatalogi',
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('rejects a non-string contentField', () => {
		const result = validateManifest(manifestWithWiki({
			register: 'opencatalogi',
			schema: 'article',
			contentField: 42,
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('contentField'))).toBe(true)
	})

	it('rejects a non-string sidebarRegister', () => {
		const result = validateManifest(manifestWithWiki({
			register: 'opencatalogi',
			schema: 'article',
			sidebarRegister: true,
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('sidebarRegister'))).toBe(true)
	})

	it('rejects a non-string emptyBodyDescription', () => {
		const result = validateManifest(manifestWithWiki({
			register: 'opencatalogi',
			schema: 'article',
			emptyBodyDescription: { fallback: 'No body' },
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('emptyBodyDescription'))).toBe(true)
	})

	it('allows an unknown config key (forward-compat)', () => {
		const result = validateManifest(manifestWithWiki({
			register: 'opencatalogi',
			schema: 'article',
			futureField: 'whatever',
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})
})
