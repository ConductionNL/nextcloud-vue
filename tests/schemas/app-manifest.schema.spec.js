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

	it('declares page.type as a free-form string (extensible via the pageTypes registry)', () => {
		expect(schema.$defs.page.properties.type).toMatchObject({ type: 'string' })
		expect(schema.$defs.page.properties.type.enum).toBeUndefined()
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

	it('accepts any non-empty type string by default; restrict via options.allowedTypes', () => {
		const restricted = validateManifest(invalid, { allowedTypes: ['index', 'detail', 'dashboard'] })
		expect(restricted.valid).toBe(false)
		expect(restricted.errors.some((e) => e.includes('"wizard"') && e.includes('must be one of'))).toBe(true)

		// Without the option the same fixture's "wizard" type passes the type
		// check (other rules still fire — duplicate id, missing component, etc.).
		const lenient = validateManifest(invalid)
		expect(lenient.errors.some((e) => e.includes('/pages/0/type'))).toBe(false)
	})

	it('rejects an empty page type', () => {
		const result = validateManifest({ version: '1.0.0', menu: [], pages: [{ id: 'x', route: '/x', type: '', title: 'x' }] })
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/type must be a non-empty string'))).toBe(true)
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

describe('validateManifest — manifest-abstract-sidebar additions', () => {
	const baseManifest = (page) => ({
		version: '1.0.1',
		menu: [],
		pages: [page],
	})

	describe('index page sidebar config', () => {
		it('accepts a valid sidebar object', () => {
			const result = validateManifest(baseManifest({
				id: 'i', route: '/', type: 'index', title: 't',
				config: { sidebar: { enabled: true, columnGroups: [], facets: {}, showMetadata: true, search: {} } },
			}))
			expect(result.valid).toBe(true)
		})

		it('rejects sidebar that is not an object', () => {
			const result = validateManifest(baseManifest({
				id: 'i', route: '/', type: 'index', title: 't',
				config: { sidebar: 'enabled' },
			}))
			expect(result.errors.some((e) => e.includes('/pages/0/config/sidebar') && e.includes('must be an object'))).toBe(true)
		})

		it('rejects sidebar.enabled that is not boolean', () => {
			const result = validateManifest(baseManifest({
				id: 'i', route: '/', type: 'index', title: 't',
				config: { sidebar: { enabled: 'yes' } },
			}))
			expect(result.errors.some((e) => e.includes('/sidebar/enabled'))).toBe(true)
		})

		it('rejects sidebar.columnGroups that is not an array', () => {
			const result = validateManifest(baseManifest({
				id: 'i', route: '/', type: 'index', title: 't',
				config: { sidebar: { columnGroups: 'extra' } },
			}))
			expect(result.errors.some((e) => e.includes('/sidebar/columnGroups'))).toBe(true)
		})

		it('rejects sidebar.facets that is not an object', () => {
			const result = validateManifest(baseManifest({
				id: 'i', route: '/', type: 'index', title: 't',
				config: { sidebar: { facets: ['x'] } },
			}))
			expect(result.errors.some((e) => e.includes('/sidebar/facets'))).toBe(true)
		})

		it('does NOT validate sidebar fields on non-index pages', () => {
			// A detail page with a `sidebar` field is treated as opaque — no
			// type-specific sidebar-config validation. Sidebar tabs go via
			// sidebarProps.tabs instead.
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebar: 'opaque-stuff' },
			}))
			// no error about /pages/0/config/sidebar
			expect(result.errors.some((e) => e.includes('/pages/0/config/sidebar'))).toBe(false)
		})
	})

	describe('detail page sidebarProps.tabs config', () => {
		it('accepts a valid tabs array', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: {
					sidebarProps: {
						tabs: [
							{ id: 'a', label: 'A', widgets: [{ type: 'data' }] },
							{ id: 'b', label: 'B', component: 'X' },
						],
					},
				},
			}))
			expect(result.valid).toBe(true)
		})

		it('rejects tabs that is not an array', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebarProps: { tabs: 'oops' } },
			}))
			expect(result.errors.some((e) => e.includes('/sidebarProps/tabs') && e.includes('must be an array'))).toBe(true)
		})

		it('rejects a tab missing id', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebarProps: { tabs: [{ label: 'A', component: 'X' }] } },
			}))
			expect(result.errors.some((e) => e.includes('/tabs/0/id'))).toBe(true)
		})

		it('rejects a tab missing label', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebarProps: { tabs: [{ id: 'a', component: 'X' }] } },
			}))
			expect(result.errors.some((e) => e.includes('/tabs/0/label'))).toBe(true)
		})

		it('rejects duplicate tab ids', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: {
					sidebarProps: {
						tabs: [
							{ id: 'same', label: 'A', component: 'X' },
							{ id: 'same', label: 'B', component: 'Y' },
						],
					},
				},
			}))
			expect(result.errors.some((e) => e.includes('/tabs/1/id') && e.includes('unique'))).toBe(true)
		})

		it('rejects a tab declaring both widgets and component', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: {
					sidebarProps: {
						tabs: [{ id: 'a', label: 'A', widgets: [{ type: 'data' }], component: 'X' }],
					},
				},
			}))
			expect(result.errors.some((e) => e.includes('/tabs/0') && e.includes('widgets OR component'))).toBe(true)
		})

		it('does NOT validate tabs on non-detail pages', () => {
			const result = validateManifest(baseManifest({
				id: 'i', route: '/', type: 'index', title: 't',
				config: { sidebarProps: { tabs: 'oops-but-not-checked' } },
			}))
			// No error about pages[0].config.sidebarProps.tabs because the page is not type=detail.
			expect(result.errors.some((e) => e.includes('/sidebarProps/tabs'))).toBe(false)
		})
	})

	describe('schema metadata bump', () => {
		it('bumps the schema version field to 1.0.1', () => {
			expect(schema.version).toBe('1.0.1')
		})

		it("page.config description references the new 'sidebar' field", () => {
			expect(schema.$defs.page.properties.config.description).toContain('sidebar')
		})
	})
})
