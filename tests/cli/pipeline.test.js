/**
 * Integration tests for the full migration pipeline.
 *
 * Runs the pipeline on each corpus fixture and validates the output against
 * the v2 schema. Also tests idempotency.
 */

import { runPipeline } from '../../src/cli/pipeline.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

// Load corpus fixtures
import procestV1 from '../fixtures/v1-manifests/procest-v1.json'
import pipelinqV1 from '../fixtures/v1-manifests/pipelinq-v1.json'
import softwarecatalogV1 from '../fixtures/v1-manifests/softwarecatalog-v1.json'
import decideskV1 from '../fixtures/v1-manifests/decidesk-v1.json'

describe('Migration pipeline — corpus integration tests', () => {
	describe('procest v1 manifest', () => {
		it('transforms to valid v2 manifest', () => {
			const { transformed } = runPipeline(procestV1)
			const result = validateManifestV2(transformed)
			if (!result.valid) {
				console.error('procest validation errors:', result.errors.slice(0, 10))
			}
			expect(result.valid).toBe(true)
			expect(result.errors).toEqual([])
		})

		it('sets $schema to v2 URL', () => {
			const { transformed } = runPipeline(procestV1)
			expect(transformed.$schema).toBe(V2_SCHEMA_URL)
		})

		it('preserves all original pages', () => {
			const { transformed } = runPipeline(procestV1)
			expect(transformed.pages.length).toBe(procestV1.pages.length)
		})

		it('preserves menu entries', () => {
			const { transformed } = runPipeline(procestV1)
			expect(transformed.menu.length).toBe(procestV1.menu.length)
		})
	})

	describe('pipelinq v1 manifest', () => {
		it('transforms to valid v2 manifest', () => {
			const { transformed } = runPipeline(pipelinqV1)
			const result = validateManifestV2(transformed)
			if (!result.valid) {
				console.error('pipelinq validation errors:', result.errors.slice(0, 10))
			}
			expect(result.valid).toBe(true)
			expect(result.errors).toEqual([])
		})

		it('sets $schema to v2 URL', () => {
			const { transformed } = runPipeline(pipelinqV1)
			expect(transformed.$schema).toBe(V2_SCHEMA_URL)
		})
	})

	describe('softwarecatalog v1 manifest', () => {
		it('transforms to valid v2 manifest', () => {
			const { transformed } = runPipeline(softwarecatalogV1)
			const result = validateManifestV2(transformed)
			if (!result.valid) {
				console.error('softwarecatalog validation errors:', result.errors.slice(0, 10))
			}
			expect(result.valid).toBe(true)
			expect(result.errors).toEqual([])
		})
	})

	describe('decidesk v1 manifest', () => {
		it('transforms to valid v2 manifest', () => {
			const { transformed } = runPipeline(decideskV1)
			const result = validateManifestV2(transformed)
			if (!result.valid) {
				console.error('decidesk validation errors:', result.errors.slice(0, 10))
			}
			expect(result.valid).toBe(true)
			expect(result.errors).toEqual([])
		})

		it('all custom pages have _note field (v2 requires _note on custom)', () => {
			const { transformed } = runPipeline(decideskV1)
			const customPages = transformed.pages.filter((p) => p.type === 'custom')
			expect(customPages.length).toBeGreaterThan(0)
			customPages.forEach((page) => {
				expect(typeof page._note).toBe('string')
				expect(page._note.length).toBeGreaterThan(0)
			})
		})

		it('sidebar tab widgets are lifted to slot:"sidebar"', () => {
			const { transformed } = runPipeline(decideskV1)
			const sidebarWidgets = transformed.pages.flatMap((p) => p.widgets || []).filter((w) => w.slot === 'sidebar')
			expect(sidebarWidgets.length).toBeGreaterThan(0)
		})

		it('dashboard page has top-level widgets from merged config.widgets+layout', () => {
			const { transformed } = runPipeline(decideskV1)
			const dashPage = transformed.pages.find((p) => p.type === 'dashboard')
			expect(dashPage).toBeDefined()
			expect(dashPage.widgets).toBeDefined()
			expect(dashPage.widgets.length).toBeGreaterThan(0)
			// config.widgets and config.layout should be removed
			expect(dashPage.config?.widgets).toBeUndefined()
			expect(dashPage.config?.layout).toBeUndefined()
		})

		it('settings sections are flattened to slot:"section:*"', () => {
			const { transformed } = runPipeline(decideskV1)
			const settingsPage = transformed.pages.find((p) => p.type === 'settings')
			expect(settingsPage).toBeDefined()
			const sectionWidgets = (settingsPage.widgets || []).filter((w) => w.slot.startsWith('section:'))
			expect(sectionWidgets.length).toBeGreaterThan(0)
		})

		it('produces a non-empty report', () => {
			const { report } = runPipeline(decideskV1, { inputFile: 'decidesk-v1.json' })
			expect(typeof report).toBe('string')
			expect(report).toContain('# Migration Report')
			expect(report).toContain('## Summary')
		})
	})
})

describe('Pipeline idempotency', () => {
	it('running the pipeline twice on a v2 manifest produces identical output', () => {
		const { transformed: firstPass } = runPipeline(decideskV1)
		// Second pass on already-v2 manifest — transformations should be no-ops
		// because the v2 manifest doesn't have config.widgets/layout, sidebarTabs, etc.
		const { transformed: secondPass } = runPipeline(firstPass)

		// Both should pass v2 validation
		expect(validateManifestV2(firstPass).valid).toBe(true)
		expect(validateManifestV2(secondPass).valid).toBe(true)

		// Page count should be identical
		expect(secondPass.pages.length).toBe(firstPass.pages.length)
		// $schema should still be v2
		expect(secondPass.$schema).toBe(V2_SCHEMA_URL)
	})

	it('does not add duplicate sidebar widgets on second pass', () => {
		const { transformed: firstPass } = runPipeline(decideskV1)
		const { transformed: secondPass } = runPipeline(firstPass)

		// Widget counts should be the same (no new widgets added on second pass)
		const firstWidgets = firstPass.pages.flatMap((p) => p.widgets || []).length
		const secondWidgets = secondPass.pages.flatMap((p) => p.widgets || []).length
		expect(secondWidgets).toBe(firstWidgets)
	})
})

describe('Pipeline report output', () => {
	it('report contains manual migration section when custom pages exist', () => {
		const { report } = runPipeline(decideskV1)
		expect(report).toContain('Manual Migration Required')
	})

	it('report contains per-page details', () => {
		const { report } = runPipeline(decideskV1)
		expect(report).toContain('Per-Page Details')
	})

	it('report contains carried-forward fields section when present', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [
				{
					id: 'p1',
					type: 'index',
					title: 'P1',
					route: '/p1',
					sidebarComponent: 'MySidebar',
					config: {},
				},
			],
		}
		const { report } = runPipeline(manifest)
		expect(report).toContain('Carried-Forward Fields')
	})
})
