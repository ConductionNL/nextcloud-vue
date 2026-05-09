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

	it('schema declares its version as 1.2.0', () => {
		expect(schema.version).toBe('1.2.0')
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
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
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
		it('bumps the schema version field to 1.2.0', () => {
			expect(schema.version).toBe('1.2.0')
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

	it('REQ-MSRS-6: schema top-level version field bumps to 1.2.0 (manifest-config-refs)', () => {
		expect(schema.version).toBe('1.2.0')
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
				id: 'i', route: '/', type: 'index', title: 't',
				sidebar: { show: false },
			}))
			expect(result.valid).toBe(true)
		})

		it('accepts sidebar.show: false on a detail page', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				sidebar: { show: false },
			}))
			expect(result.valid).toBe(true)
		})

		it('accepts sidebar.show: false on a custom page', () => {
			const result = validateManifest(baseManifest({
				id: 'c', route: '/c', type: 'custom', title: 't',
				component: 'X',
				sidebar: { show: false },
			}))
			expect(result.valid).toBe(true)
		})

		it('rejects non-object top-level sidebar', () => {
			const result = validateManifest(baseManifest({
				id: 'i', route: '/', type: 'index', title: 't',
				sidebar: 'no',
			}))
			expect(result.errors.some((e) => e.includes('/pages/0/sidebar') && e.includes('must be an object'))).toBe(true)
		})

		it('rejects non-boolean sidebar.show', () => {
			const result = validateManifest(baseManifest({
				id: 'i', route: '/', type: 'index', title: 't',
				sidebar: { show: 'maybe' },
			}))
			expect(result.errors.some((e) => e.includes('/pages/0/sidebar/show'))).toBe(true)
		})

		it('tolerates unknown sub-fields for forward-compat', () => {
			const result = validateManifest(baseManifest({
				id: 'i', route: '/', type: 'index', title: 't',
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
				id: 'i', route: '/', type: 'index', title: 't',
				config: { sidebar: { enabled: true, show: false } },
			}))
			expect(result.valid).toBe(true)
		})

		it('rejects show as a string', () => {
			const result = validateManifest(baseManifest({
				id: 'i', route: '/', type: 'index', title: 't',
				config: { sidebar: { enabled: true, show: 'no' } },
			}))
			expect(result.errors.some((e) => e.includes('/config/sidebar/show'))).toBe(true)
		})
	})

	describe('config.sidebar Object form on detail pages', () => {
		it('accepts the legacy Boolean form (back-compat)', () => {
			const trueResult = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebar: true },
			}))
			expect(trueResult.valid).toBe(true)
			const falseResult = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebar: false },
			}))
			expect(falseResult.valid).toBe(true)
		})

		it('accepts a full Object form', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
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
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebar: 'opaque' },
			}))
			expect(result.errors.some((e) => e.includes('/pages/0/config/sidebar') && e.includes('boolean'))).toBe(true)
		})

		it('rejects a non-boolean show', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebar: { show: 'maybe' } },
			}))
			expect(result.errors.some((e) => e.includes('/config/sidebar/show'))).toBe(true)
		})

		it('rejects non-string register / schema / title / subtitle', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebar: { register: 1, schema: 2, title: 3, subtitle: 4 } },
			}))
			expect(result.errors.some((e) => e.includes('/config/sidebar/register'))).toBe(true)
			expect(result.errors.some((e) => e.includes('/config/sidebar/schema'))).toBe(true)
			expect(result.errors.some((e) => e.includes('/config/sidebar/title'))).toBe(true)
			expect(result.errors.some((e) => e.includes('/config/sidebar/subtitle'))).toBe(true)
		})

		it('rejects non-array hiddenTabs', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebar: { hiddenTabs: 'notes' } },
			}))
			expect(result.errors.some((e) => e.includes('/config/sidebar/hiddenTabs'))).toBe(true)
		})

		it('validates tabs declared inside config.sidebar.tabs (new path)', () => {
			const result = validateManifest(baseManifest({
				id: 'd', route: '/d/:id', type: 'detail', title: 't',
				config: { sidebar: { tabs: [{ id: 'a', component: 'X' }] } },
			}))
			// Missing label → error.
			expect(result.errors.some((e) => e.includes('/config/sidebar/tabs/0/label'))).toBe(true)
		})
	})

	describe('schema metadata stability', () => {
		it('schema version bumps to 1.2.0 with the manifest-config-refs tightening', () => {
			// `manifest-detail-sidebar-config` itself was non-breaking and
			// kept the version at 1.1.0. The successor `manifest-config-refs`
			// change wires up $refs on the recurring config sub-shapes —
			// non-breaking on documented manifests but a meaningful surface
			// change worth a minor version bump to 1.2.0.
			expect(schema.version).toBe('1.2.0')
		})

		it('mentions config.sidebar.show in the page.config description', () => {
			expect(schema.$defs.page.properties.config.description).toContain('config.sidebar.show')
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
})
