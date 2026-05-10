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
import allTypes from '../fixtures/manifest-all-types.json'
import invalidTypeConfig from '../fixtures/manifest-invalid-type-config.json'
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

describe('validateManifest — extended page types (manifest-page-type-extensions)', () => {
	it('passes a fixture covering all 8 built-in page types', () => {
		const result = validateManifest(allTypes)
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('still validates v1.0 manifests against the bumped schema (backwards-compat)', () => {
		// `valid` fixture uses the original four types only.
		const result = validateManifest(valid)
		expect(result.valid).toBe(true)
	})

	it('rejects a logs page missing register+schema or source', () => {
		const result = validateManifest(invalidTypeConfig)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('pages[0].config') && e.includes('register+schema or source'))).toBe(true)
	})

	it('rejects a settings page with empty sections', () => {
		const result = validateManifest(invalidTypeConfig)
		expect(result.errors.some((e) => e.includes('pages[1].config.sections') && e.includes('at least 1 section'))).toBe(true)
	})

	it('rejects a chat page missing both URL fields', () => {
		const result = validateManifest(invalidTypeConfig)
		expect(result.errors.some((e) => e.includes('pages[2].config') && e.includes('conversationSource or postUrl'))).toBe(true)
	})

	it('rejects a files page missing folder', () => {
		const result = validateManifest(invalidTypeConfig)
		expect(result.errors.some((e) => e.includes('pages[3].config.folder') && e.includes('required'))).toBe(true)
	})

	it('accepts a logs page with only `source` set', () => {
		const result = validateManifest({
			version: '1.1.0',
			menu: [],
			pages: [{ id: 'l', route: '/l', type: 'logs', title: 't', config: { source: '/api/my-logs' } }],
		})
		expect(result.valid).toBe(true)
	})

	it('accepts a chat page with only `postUrl` set', () => {
		const result = validateManifest({
			version: '1.1.0',
			menu: [],
			pages: [{ id: 'c', route: '/c', type: 'chat', title: 't', config: { postUrl: '/api/post' } }],
		})
		expect(result.valid).toBe(true)
	})

	it('error path uses the JSON-path style for all four new types', () => {
		const result = validateManifest(invalidTypeConfig)
		// Each type reports a /pages/N/... style path so consumers can find the offending field.
		expect(result.errors.some((e) => e.startsWith('/pages/0/config'))).toBe(true)
		expect(result.errors.some((e) => e.startsWith('/pages/1/config/sections'))).toBe(true)
		expect(result.errors.some((e) => e.startsWith('/pages/2/config'))).toBe(true)
		expect(result.errors.some((e) => e.startsWith('/pages/3/config/folder'))).toBe(true)
	})

	it('schema declares its version as 1.3.0', () => {
		expect(schema.version).toBe('1.3.0')
	})
})

describe('validateManifest — manifest-wiki-page-type', () => {
	it('accepts a wiki page with register + schema', () => {
		const result = validateManifest({
			version: '1.1.0',
			menu: [],
			pages: [{
				id: 'kb',
				route: '/kb/:id',
				type: 'wiki',
				title: 't',
				config: { register: 'pipelinq', schema: 'article' },
			}],
		})
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('accepts a wiki page with optional sidebar fields', () => {
		const result = validateManifest({
			version: '1.1.0',
			menu: [],
			pages: [{
				id: 'kb',
				route: '/kb/:id',
				type: 'wiki',
				title: 't',
				config: {
					register: 'pipelinq',
					schema: 'article',
					contentField: 'markdown',
					sidebarSchema: 'category',
					treeField: 'children',
				},
			}],
		})
		expect(result.valid).toBe(true)
	})

	it('rejects a wiki page missing register', () => {
		const result = validateManifest({
			version: '1.1.0',
			menu: [],
			pages: [{
				id: 'kb',
				route: '/kb/:id',
				type: 'wiki',
				title: 't',
				config: { schema: 'article' },
			}],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('pages[0].config') && e.includes('wiki pages must declare register and schema'))).toBe(true)
	})

	it('rejects a wiki page missing schema', () => {
		const result = validateManifest({
			version: '1.1.0',
			menu: [],
			pages: [{
				id: 'kb',
				route: '/kb/:id',
				type: 'wiki',
				title: 't',
				config: { register: 'pipelinq' },
			}],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('wiki pages must declare register and schema'))).toBe(true)
	})

	it('rejects a wiki page with empty register / schema strings', () => {
		const result = validateManifest({
			version: '1.1.0',
			menu: [],
			pages: [{
				id: 'kb',
				route: '/kb/:id',
				type: 'wiki',
				title: 't',
				config: { register: '', schema: '' },
			}],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('wiki pages must declare register and schema'))).toBe(true)
	})
})

describe('validateManifest — manifest-abstract-sidebar additions', () => {
	const baseManifest = (page) => ({
		version: '1.1.0',
		menu: [],
		pages: [page],
	})

	describe('index page sidebar config', () => {
		it('accepts a valid sidebar object', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { sidebar: { enabled: true, columnGroups: [], facets: {}, showMetadata: true, search: {} } },
			}))
			expect(result.valid).toBe(true)
		})

		it('rejects sidebar that is not an object', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { sidebar: 'enabled' },
			}))
			expect(result.errors.some((e) => e.includes('/pages/0/config/sidebar') && e.includes('must be an object'))).toBe(true)
		})

		it('rejects sidebar.enabled that is not boolean', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { sidebar: { enabled: 'yes' } },
			}))
			expect(result.errors.some((e) => e.includes('/sidebar/enabled'))).toBe(true)
		})

		it('rejects sidebar.columnGroups that is not an array', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { sidebar: { columnGroups: 'extra' } },
			}))
			expect(result.errors.some((e) => e.includes('/sidebar/columnGroups'))).toBe(true)
		})

		it('rejects sidebar.facets that is not an object', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { sidebar: { facets: ['x'] } },
			}))
			expect(result.errors.some((e) => e.includes('/sidebar/facets'))).toBe(true)
		})

		it('does NOT validate index-shape sub-fields on non-index pages', () => {
			// A detail page with a `sidebar` Boolean is the legacy
			// shape — accepted as-is, no `enabled/columnGroups/...`
			// sub-field rules apply (those are index-only).
			//
			// Note: the post-`manifest-detail-sidebar-config` contract
			// requires detail `config.sidebar` to be Boolean OR Object;
			// strings are rejected. The previous behaviour (string
			// silently accepted) is INTENTIONALLY tightened here so
			// the new Object form is unambiguous.
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebar: true },
			}))
			expect(result.valid).toBe(true)
			// And no index-only sub-field errors fired against the boolean.
			expect(result.errors.some((e) => e.includes('/sidebar/columnGroups'))).toBe(false)
		})
	})

	describe('detail page sidebarProps.tabs config', () => {
		it('accepts a valid tabs array', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
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
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebarProps: { tabs: 'oops' } },
			}))
			expect(result.errors.some((e) => e.includes('/sidebarProps/tabs') && e.includes('must be an array'))).toBe(true)
		})

		it('rejects a tab missing id', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebarProps: { tabs: [{ label: 'A', component: 'X' }] } },
			}))
			expect(result.errors.some((e) => e.includes('/tabs/0/id'))).toBe(true)
		})

		it('rejects a tab missing label', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebarProps: { tabs: [{ id: 'a', component: 'X' }] } },
			}))
			expect(result.errors.some((e) => e.includes('/tabs/0/label'))).toBe(true)
		})

		it('rejects duplicate tab ids', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
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
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
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
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { sidebarProps: { tabs: 'oops-but-not-checked' } },
			}))
			// No error about pages[0].config.sidebarProps.tabs because the page is not type=detail.
			expect(result.errors.some((e) => e.includes('/sidebarProps/tabs'))).toBe(false)
		})
	})

	describe('schema metadata bump', () => {
		it('bumps the schema version field to 1.3.0', () => {
			expect(schema.version).toBe('1.3.0')
		})

		it("page.config description references the new 'sidebar' field", () => {
			expect(schema.$defs.page.properties.config.description).toContain('sidebar')
		})
	})
})

// `manifest-settings-rich-sections` — extending the settings section
// shape with `component` and `widgets[]` body kinds (REQ-MSRS-1..6).
describe('validateManifest — settings rich sections (manifest-settings-rich-sections)', () => {
	const richFixture = require('../fixtures/manifest-settings-rich.json')

	const settingsPage = (sections) => ({
		version: '1.1.0',
		menu: [],
		pages: [{
			id: 'app-settings',
			route: '/settings',
			type: 'settings',
			title: 'myapp.settings.title',
			config: { saveEndpoint: '/api/x', sections },
		}],
	})

	it('REQ-MSRS-1: bare-fields section keeps validating (back-compat)', () => {
		const result = validateManifest(settingsPage([
			{ title: 'g', fields: [{ key: 'x', type: 'boolean', label: 'X' }] },
		]))
		expect(result.valid).toBe(true)
	})

	it('REQ-MSRS-1: component-only section is valid', () => {
		const result = validateManifest(settingsPage([
			{ title: 'g', component: 'MyPanel', props: { foo: 1 } },
		]))
		expect(result.valid).toBe(true)
	})

	it('REQ-MSRS-1: widgets-only section is valid', () => {
		const result = validateManifest(settingsPage([
			{
				title: 'g',
				widgets: [{ type: 'version-info', props: { appName: 'X', appVersion: '1' } }],
			},
		]))
		expect(result.valid).toBe(true)
	})

	it('REQ-MSRS-1: section declaring fields + widgets is rejected (mixed body)', () => {
		const result = validateManifest(settingsPage([
			{
				title: 'g',
				fields: [{ key: 'x', type: 'boolean', label: 'X' }],
				widgets: [{ type: 'version-info', props: { appName: 'X', appVersion: '1' } }],
			},
		]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('must declare exactly one of fields | component | widgets'))).toBe(true)
	})

	it('REQ-MSRS-1: section declaring component + widgets is rejected (mixed body)', () => {
		const result = validateManifest(settingsPage([
			{
				title: 'g',
				component: 'MyPanel',
				widgets: [{ type: 'version-info', props: { appName: 'X', appVersion: '1' } }],
			},
		]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('must declare exactly one of fields | component | widgets'))).toBe(true)
	})

	it('REQ-MSRS-1: empty-body section is rejected', () => {
		const result = validateManifest(settingsPage([
			{ title: 'g' },
		]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('must declare exactly one of fields | component | widgets'))).toBe(true)
	})

	it('REQ-MSRS-2: widgets[] entry without `type` is rejected', () => {
		const result = validateManifest(settingsPage([
			{ title: 'g', widgets: [{ props: { foo: 1 } }] },
		]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/widgets/0/type'))).toBe(true)
	})

	it('REQ-MSRS-2: widgets[] entry with empty-string `type` is rejected', () => {
		const result = validateManifest(settingsPage([
			{ title: 'g', widgets: [{ type: '' }] },
		]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/widgets/0/type'))).toBe(true)
	})

	it('REQ-MSRS-5: rich fixture validates with errors=[] (covers all flavors)', () => {
		const result = validateManifest(richFixture)
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('REQ-MSRS-6: schema description names the new section keys + built-in widget types', () => {
		const description = schema.$defs.page.properties.config.description
		expect(description).toContain('component')
		expect(description).toContain('widgets')
		expect(description).toContain('version-info')
		expect(description).toContain('register-mapping')
	})

	it('REQ-MSRS-6: schema top-level version field bumps to 1.3.0 (manifest-card-index-component + manifest-actions-dispatch)', () => {
		expect(schema.version).toBe('1.3.0')
	})
})

// REQ-MDSC-7 / REQ-MDSC-8 — manifest-detail-sidebar-config.
//
// Adds:
//   - Per-page top-level `sidebar` field (sibling of `config`,
//     applies to every page type including `type:"custom"`).
//   - Object form for `config.sidebar` on detail pages.
//   - `config.sidebar.show` boolean on index pages.
describe('validateManifest — manifest-detail-sidebar-config additions', () => {
	const baseManifest = (page) => ({
		version: '1.1.0',
		menu: [],
		pages: [page],
	})

	describe('per-page top-level sidebar field', () => {
		it('accepts sidebar.show: false on an index page', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				sidebar: { show: false },
			}))
			expect(result.valid).toBe(true)
		})

		it('accepts sidebar.show: false on a detail page', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				sidebar: { show: false },
			}))
			expect(result.valid).toBe(true)
		})

		it('accepts sidebar.show: false on a custom page', () => {
			const result = validateManifest(baseManifest({
				id: 'c',
				route: '/c',
				type: 'custom',
				title: 't',
				component: 'X',
				sidebar: { show: false },
			}))
			expect(result.valid).toBe(true)
		})

		it('rejects non-object top-level sidebar', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				sidebar: 'no',
			}))
			expect(result.errors.some((e) => e.includes('/pages/0/sidebar') && e.includes('must be an object'))).toBe(true)
		})

		it('rejects non-boolean sidebar.show', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				sidebar: { show: 'maybe' },
			}))
			expect(result.errors.some((e) => e.includes('/pages/0/sidebar/show'))).toBe(true)
		})

		it('tolerates unknown sub-fields for forward-compat', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				sidebar: { show: false, position: 'left' },
			}))
			expect(result.valid).toBe(true)
		})

		it('schema declares the page.sidebar property', () => {
			expect(schema.$defs.page.properties.sidebar).toBeDefined()
			expect(schema.$defs.page.properties.sidebar.properties.show.type).toBe('boolean')
		})
	})

	describe('config.sidebar.show on index pages', () => {
		it('accepts show: false on the index sidebar config', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { sidebar: { enabled: true, show: false } },
			}))
			expect(result.valid).toBe(true)
		})

		it('rejects show as a string', () => {
			const result = validateManifest(baseManifest({
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { sidebar: { enabled: true, show: 'no' } },
			}))
			expect(result.errors.some((e) => e.includes('/config/sidebar/show'))).toBe(true)
		})
	})

	describe('config.sidebar Object form on detail pages', () => {
		it('accepts the legacy Boolean form (back-compat)', () => {
			const trueResult = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebar: true },
			}))
			expect(trueResult.valid).toBe(true)
			const falseResult = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebar: false },
			}))
			expect(falseResult.valid).toBe(true)
		})

		it('accepts a full Object form', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: {
					sidebar: {
						show: false,
						enabled: true,
						register: 'leads',
						schema: 'lead',
						title: 'Override',
						subtitle: 'Sub',
						hiddenTabs: ['notes'],
						tabs: [{ id: 'a', label: 'A', component: 'X' }],
					},
				},
			}))
			expect(result.valid).toBe(true)
		})

		it('rejects a non-Boolean / non-Object value', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebar: 'opaque' },
			}))
			expect(result.errors.some((e) => e.includes('/pages/0/config/sidebar') && e.includes('boolean'))).toBe(true)
		})

		it('rejects a non-boolean show', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebar: { show: 'maybe' } },
			}))
			expect(result.errors.some((e) => e.includes('/config/sidebar/show'))).toBe(true)
		})

		it('rejects non-string register / schema / title / subtitle', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebar: { register: 1, schema: 2, title: 3, subtitle: 4 } },
			}))
			expect(result.errors.some((e) => e.includes('/config/sidebar/register'))).toBe(true)
			expect(result.errors.some((e) => e.includes('/config/sidebar/schema'))).toBe(true)
			expect(result.errors.some((e) => e.includes('/config/sidebar/title'))).toBe(true)
			expect(result.errors.some((e) => e.includes('/config/sidebar/subtitle'))).toBe(true)
		})

		it('rejects non-array hiddenTabs', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebar: { hiddenTabs: 'notes' } },
			}))
			expect(result.errors.some((e) => e.includes('/config/sidebar/hiddenTabs'))).toBe(true)
		})

		it('validates tabs declared inside config.sidebar.tabs (new path)', () => {
			const result = validateManifest(baseManifest({
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { sidebar: { tabs: [{ id: 'a', component: 'X' }] } },
			}))
			// Missing label → error.
			expect(result.errors.some((e) => e.includes('/config/sidebar/tabs/0/label'))).toBe(true)
		})
	})

	describe('schema metadata stability', () => {
		it('schema version reaches 1.3.0 with the manifest-card-index-component additive change', () => {
			// `manifest-detail-sidebar-config` itself was non-breaking and
			// kept the version at 1.1.0. The successor `manifest-config-refs`
			// change wires up $refs on the recurring config sub-shapes and
			// bumped to 1.2.0. `manifest-card-index-component` and
			// `manifest-actions-dispatch` further bump to 1.3.0 (additive).
			expect(schema.version).toBe('1.3.0')
		})

		it('mentions config.sidebar.show in the page.config description', () => {
			expect(schema.$defs.page.properties.config.description).toContain('config.sidebar.show')
		})
	})

	describe('manifest-card-index-component additions', () => {
		it('documents cardComponent in the page.config description', () => {
			expect(schema.$defs.page.properties.config.description).toContain('cardComponent')
		})

		it('validates a type:"index" page with cardComponent set', () => {
			const result = validateManifest({
				version: '1.3.0',
				menu: [],
				pages: [{
					id: 'orgs',
					route: '/organisations',
					type: 'index',
					title: 'Organisations',
					config: {
						register: 'softwarecatalog',
						schema: 'organisation',
						cardComponent: 'OrganisatieCard',
					},
				}],
			})
			expect(result.valid).toBe(true)
			expect(result.errors).toEqual([])
		})

		it('still validates a type:"index" page WITHOUT cardComponent (backwards compat)', () => {
			const result = validateManifest({
				version: '1.2.0',
				menu: [],
				pages: [{
					id: 'orgs',
					route: '/organisations',
					type: 'index',
					title: 'Organisations',
					config: {
						register: 'softwarecatalog',
						schema: 'organisation',
					},
				}],
			})
			expect(result.valid).toBe(true)
			expect(result.errors).toEqual([])
		})
	})

	describe('manifest-sidebar-show.json fixture', () => {
		// eslint-disable-next-line global-require
		const fixture = require('../fixtures/manifest-sidebar-show.json')

		it('passes validateManifest end-to-end', () => {
			const result = validateManifest(fixture)
			expect(result.valid).toBe(true)
			expect(result.errors).toEqual([])
		})

		it('exercises sidebar.show on all three page types', () => {
			const types = fixture.pages.map((p) => p.type)
			expect(types).toEqual(expect.arrayContaining(['index', 'detail', 'custom']))
			const customPage = fixture.pages.find((p) => p.type === 'custom')
			expect(customPage.sidebar.show).toBe(false)
		})
	})

	// `manifest-resolve-sentinel` capability: build-time validator
	// must permissively accept @resolve:<key> in pages[].config.* and
	// reject it everywhere else.
	describe('@resolve: sentinel rules', () => {
		const baseManifest = (overrides) => ({
			version: '1.0.0',
			menu: [{ id: 'home', label: 'app.home' }],
			pages: [
				{ id: 'home', route: '/', type: 'index', title: 't', config: { register: 'plain' } },
			],
			...overrides,
		})

		it('accepts a sentinel under pages[].config.register at build time', () => {
			const result = validateManifest(baseManifest({
				pages: [
					{ id: 'home', route: '/', type: 'index', title: 't', config: { register: '@resolve:my_register' } },
				],
			}))
			expect(result.valid).toBe(true)
			expect(result.errors).toEqual([])
		})

		it('accepts a sentinel under nested pages[].config.sections[].saveEndpoint', () => {
			const result = validateManifest(baseManifest({
				pages: [
					{
						id: 'settings',
						route: '/settings',
						type: 'settings',
						title: 't',
						config: {
							sections: [
								{ title: 'x', component: 'CustomSection', saveEndpoint: '@resolve:settings_endpoint' },
							],
						},
					},
				],
			}))
			expect(result.valid).toBe(true)
		})

		it('rejects a sentinel in pages[].route', () => {
			const result = validateManifest(baseManifest({
				pages: [
					{ id: 'home', route: '@resolve:my_route', type: 'index', title: 't' },
				],
			}))
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('/pages/0/route') && e.includes('@resolve:'))).toBe(true)
		})

		it('rejects a sentinel in pages[].id', () => {
			const result = validateManifest(baseManifest({
				pages: [
					{ id: '@resolve:my_id', route: '/', type: 'index', title: 't' },
				],
			}))
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('/pages/0/id') && e.includes('@resolve:'))).toBe(true)
		})

		it('rejects a sentinel in version', () => {
			const result = validateManifest(baseManifest({ version: '@resolve:app_version' }))
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('/version') && e.includes('@resolve:'))).toBe(true)
		})

		it('rejects a sentinel in dependencies[]', () => {
			const result = validateManifest(baseManifest({ dependencies: ['openregister', '@resolve:dep'] }))
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('/dependencies/1') && e.includes('@resolve:'))).toBe(true)
		})

		it('rejects a sentinel in menu[].route', () => {
			const result = validateManifest(baseManifest({
				menu: [{ id: 'home', label: 'l', route: '@resolve:home_route' }],
			}))
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('/menu/0/route') && e.includes('@resolve:'))).toBe(true)
		})

		it('rejects a sentinel in menu[].id', () => {
			const result = validateManifest(baseManifest({
				menu: [{ id: '@resolve:home_id', label: 'l' }],
			}))
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('/menu/0/id') && e.includes('@resolve:'))).toBe(true)
		})

		it('rejects a sentinel in pages[].component', () => {
			const result = validateManifest(baseManifest({
				pages: [
					{ id: 'home', route: '/', type: 'custom', title: 't', component: '@resolve:my_component' },
				],
			}))
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('/pages/0/component') && e.includes('@resolve:'))).toBe(true)
		})
	})
})

// `manifest-settings-orchestration` — adds tabs[] orchestration shape
// (REQ-MSO-1..5, 7-8) and the `widgets[].type === "component"`
// discriminator with `componentName` (REQ-MSO-6).
describe('validateManifest — settings orchestration (manifest-settings-orchestration)', () => {
	const tabsFixture = require('../fixtures/manifest-settings-tabs.json')

	const settingsPage = (config) => ({
		version: '1.2.0',
		menu: [],
		pages: [{
			id: 'app-settings',
			route: '/settings',
			type: 'settings',
			title: 'myapp.settings.title',
			config,
		}],
	})

	it('REQ-MSO-1: tabs-only manifest is valid', () => {
		const result = validateManifest(settingsPage({
			tabs: [
				{
					id: 'general',
					label: 'General',
					sections: [
						{ title: 'g', fields: [{ key: 'x', type: 'boolean', label: 'X' }] },
					],
				},
			],
		}))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('REQ-MSO-1: declaring both sections[] and tabs[] is rejected', () => {
		const result = validateManifest(settingsPage({
			sections: [{ title: 'g', fields: [{ key: 'x', type: 'boolean', label: 'X' }] }],
			tabs: [{
				id: 'general',
				label: 'General',
				sections: [
					{ title: 'g', fields: [{ key: 'x', type: 'boolean', label: 'X' }] },
				],
			}],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('must declare exactly one of sections | tabs'))).toBe(true)
	})

	it('REQ-MSO-1: empty config keeps the existing `sections required` error (back-compat)', () => {
		const result = validateManifest(settingsPage({}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('.sections: required'))).toBe(true)
		// MUST NOT additionally emit the new orchestration-mutex error.
		expect(result.errors.some((e) => e.includes('must declare exactly one of sections | tabs'))).toBe(false)
	})

	it('REQ-MSO-2: tab with empty id is rejected', () => {
		const result = validateManifest(settingsPage({
			tabs: [{
				id: '',
				label: 'General',
				sections: [
					{ title: 'g', fields: [{ key: 'x', type: 'boolean', label: 'X' }] },
				],
			}],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/tabs/0/id'))).toBe(true)
	})

	it('REQ-MSO-2: tab with empty label is rejected', () => {
		const result = validateManifest(settingsPage({
			tabs: [{
				id: 'general',
				label: '',
				sections: [
					{ title: 'g', fields: [{ key: 'x', type: 'boolean', label: 'X' }] },
				],
			}],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/tabs/0/label'))).toBe(true)
	})

	it('REQ-MSO-2: tab with empty sections[] is rejected', () => {
		const result = validateManifest(settingsPage({
			tabs: [{ id: 'general', label: 'General', sections: [] }],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/tabs/0/sections'))).toBe(true)
	})

	it('REQ-MSO-2: tab missing sections array is rejected', () => {
		const result = validateManifest(settingsPage({
			tabs: [{ id: 'general', label: 'General' }],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/tabs/0/sections'))).toBe(true)
	})

	it('REQ-MSO-3: duplicate tab IDs are rejected (later index gets the error)', () => {
		const result = validateManifest(settingsPage({
			tabs: [
				{
					id: 'a',
					label: 'A',
					sections: [
						{ title: 'g', fields: [{ key: 'x', type: 'boolean', label: 'X' }] },
					],
				},
				{
					id: 'b',
					label: 'B',
					sections: [
						{ title: 'g', fields: [{ key: 'y', type: 'boolean', label: 'Y' }] },
					],
				},
				{
					id: 'a',
					label: 'A2',
					sections: [
						{ title: 'g', fields: [{ key: 'z', type: 'boolean', label: 'Z' }] },
					],
				},
			],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/tabs/2/id') && e.includes('duplicate id "a"'))).toBe(true)
	})

	it('REQ-MSO-4: tab with mixed-body section is rejected (shared section validator)', () => {
		const result = validateManifest(settingsPage({
			tabs: [{
				id: 'general',
				label: 'General',
				sections: [{
					title: 'g',
					fields: [{ key: 'x', type: 'boolean', label: 'X' }],
					widgets: [{ type: 'version-info', props: { appName: 'X', appVersion: '1' } }],
				}],
			}],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('must declare exactly one of fields | component | widgets'))).toBe(true)
		expect(result.errors.some((e) => e.includes('/tabs/0/sections/0'))).toBe(true)
	})

	it('REQ-MSO-6: widget {type:"component"} without componentName is rejected', () => {
		const result = validateManifest(settingsPage({
			sections: [{ title: 'g', widgets: [{ type: 'component' }] }],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/widgets/0/componentName'))).toBe(true)
	})

	it('REQ-MSO-6: widget {type:"component", componentName:"X"} is valid', () => {
		const result = validateManifest(settingsPage({
			sections: [{ title: 'g', widgets: [{ type: 'component', componentName: 'WorkflowEditor' }] }],
		}))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('REQ-MSO-6: widget with type:"component" and empty componentName is rejected', () => {
		const result = validateManifest(settingsPage({
			sections: [{ title: 'g', widgets: [{ type: 'component', componentName: '' }] }],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/widgets/0/componentName'))).toBe(true)
	})

	it('REQ-MSO-7: existing flat-fields manifest still validates (back-compat)', () => {
		const result = validateManifest(settingsPage({
			sections: [{ title: 'g', fields: [{ key: 'x', type: 'boolean', label: 'X' }] }],
		}))
		expect(result.valid).toBe(true)
	})

	it('REQ-MSO-7: existing rich-sections manifest still validates (back-compat)', () => {
		const result = validateManifest(settingsPage({
			sections: [{
				title: 'g',
				widgets: [{ type: 'version-info', props: { appName: 'X', appVersion: '1' } }],
			}],
		}))
		expect(result.valid).toBe(true)
	})

	it('REQ-MSO-7: tabs fixture validates with errors=[] (covers every flavor)', () => {
		const result = validateManifest(tabsFixture)
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('REQ-MSO-8: schema description names the new tabs[] and componentName keys', () => {
		const description = schema.$defs.page.properties.config.description
		expect(description).toContain('tabs')
		expect(description).toContain('componentName')
	})

	it('REQ-MSO-8: schema declares the tabs[] property under config', () => {
		const config = schema.$defs.page.properties.config
		expect(config.properties.tabs).toBeDefined()
		expect(config.properties.tabs.type).toBe('array')
		expect(config.properties.tabs.items.required).toEqual(
			expect.arrayContaining(['id', 'label', 'sections']),
		)
	})

	it('REQ-MSO-8: schema top-level version field is at the current schema version', () => {
		expect(schema.version).toBe('1.3.0')
	})
})

// `manifest-form-page-type` — adds the `type:'form'` page type with
// handler-mode + endpoint-mode submit dispatch.
describe('validateManifest — manifest-form-page-type', () => {
	const baseField = { key: 'name', label: 'i18n.name', type: 'string' }

	const wrap = (page) => ({
		version: '1.0.0',
		menu: [],
		pages: [page],
	})

	it('accepts a type=form page with handler-mode dispatch', () => {
		const result = validateManifest(wrap({
			id: 'survey', route: '/s', type: 'form', title: 'Survey',
			config: { fields: [baseField], submitHandler: 'submitSurvey' },
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('accepts a type=form page with endpoint-mode dispatch', () => {
		const result = validateManifest(wrap({
			id: 'survey', route: '/s', type: 'form', title: 'Survey',
			config: { fields: [baseField], submitEndpoint: '/api/forms', submitMethod: 'POST', mode: 'public' },
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('rejects a type=form page missing fields', () => {
		const result = validateManifest(wrap({
			id: 'survey', route: '/s', type: 'form', title: 'Survey',
			config: { submitHandler: 'submitSurvey' },
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('non-empty fields[] array'))).toBe(true)
	})

	it('rejects a type=form page with empty fields[]', () => {
		const result = validateManifest(wrap({
			id: 'survey', route: '/s', type: 'form', title: 'Survey',
			config: { fields: [], submitHandler: 'submitSurvey' },
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('non-empty fields[] array'))).toBe(true)
	})

	it('rejects a type=form page with both submitHandler and submitEndpoint', () => {
		const result = validateManifest(wrap({
			id: 'survey', route: '/s', type: 'form', title: 'Survey',
			config: { fields: [baseField], submitHandler: 'h', submitEndpoint: '/api' },
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('exactly one of submitHandler | submitEndpoint'))).toBe(true)
	})

	it('rejects a type=form page with neither submitHandler nor submitEndpoint', () => {
		const result = validateManifest(wrap({
			id: 'survey', route: '/s', type: 'form', title: 'Survey',
			config: { fields: [baseField] },
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('exactly one of submitHandler | submitEndpoint'))).toBe(true)
	})

	it('rejects a type=form page with disallowed submitMethod', () => {
		const result = validateManifest(wrap({
			id: 'survey', route: '/s', type: 'form', title: 'Survey',
			config: { fields: [baseField], submitEndpoint: '/api', submitMethod: 'GET' },
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('POST | PUT | PATCH'))).toBe(true)
	})

	it('rejects a type=form page with disallowed mode', () => {
		const result = validateManifest(wrap({
			id: 'survey', route: '/s', type: 'form', title: 'Survey',
			config: { fields: [baseField], submitHandler: 'h', mode: 'review' },
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('edit | create | public'))).toBe(true)
	})

	it('validates each form field against the formField $def shape', () => {
		const result = validateManifest(wrap({
			id: 'survey', route: '/s', type: 'form', title: 'Survey',
			config: { fields: [{ key: 'x' /* missing label + type */ }], submitHandler: 'h' },
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/fields/0/label') || e.includes('/fields/0/type'))).toBe(true)
	})
})
