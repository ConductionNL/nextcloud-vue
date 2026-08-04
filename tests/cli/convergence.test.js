/**
 * Integration + fleet-manifest-regression tests for the widget-dialect
 * convergence pass (audit items 11/25).
 *
 * Runs runConvergence on the two real MIXED-dialect fleet manifests
 * (zaakafhandelapp, petstore) and asserts the converged output (a) still
 * validates against the v2 schema, (b) carries a single canonical widget
 * dialect, and (c) is idempotent (re-running is byte-identical).
 */

import { runConvergence } from '../../src/cli/convergence.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

import zaaMixed from '../fixtures/dialect-manifests/zaakafhandelapp-mixed.json'
import petMixed from '../fixtures/dialect-manifests/petstore-mixed.json'

/**
 * Assert a converged manifest carries exactly one widget dialect: no page has a
 * residual dialect-B carrier (config.widgets / config.layout) and every
 * top-level widget entry is canonical (has widgetKey, not a bare type).
 *
 * @param {object} manifest The converged manifest to assert on.
 */
function assertSingleDialect(manifest) {
	for (const page of manifest.pages || []) {
		const cfg = (page.config && typeof page.config === 'object' && !Array.isArray(page.config)) ? page.config : {}
		expect(cfg.widgets).toBeUndefined()
		expect(cfg.layout).toBeUndefined()
		for (const w of page.widgets || []) {
			expect(typeof w.widgetKey).toBe('string')
			expect(w.type).toBeUndefined()
		}
	}
}

describe('runConvergence — fleet mixed-dialect regression', () => {
	for (const [name, manifest] of [['zaakafhandelapp', zaaMixed], ['petstore', petMixed]]) {
		describe(name, () => {
			it('produces a manifest that still validates against the v2 schema', () => {
				const { transformed } = runConvergence(manifest)
				const result = validateManifestV2(transformed)
				if (!result.valid) console.error(`${name} errors:`, result.errors.slice(0, 10))
				expect(result.valid).toBe(true)
			})

			it('lands on a single canonical widget dialect', () => {
				const { transformed, changed } = runConvergence(manifest)
				expect(changed).toBe(true)
				assertSingleDialect(transformed)
			})

			it('preserves every page (no page dropped)', () => {
				const { transformed } = runConvergence(manifest)
				expect(transformed.pages.length).toBe(manifest.pages.length)
			})

			it('is idempotent — a second pass is a byte-identical no-op', () => {
				const first = runConvergence(manifest).transformed
				const second = runConvergence(first)
				expect(second.changed).toBe(false)
				expect(JSON.stringify(second.transformed)).toBe(JSON.stringify(first))
			})

			it('does not mutate the input fixture', () => {
				const snapshot = JSON.stringify(manifest)
				runConvergence(manifest)
				expect(JSON.stringify(manifest)).toBe(snapshot)
			})
		})
	}

	it('reports component-only sidebar tabs for manual review (never drops them)', () => {
		const { transformed, reportItems } = runConvergence(petMixed)
		const todos = reportItems.filter((i) => i.kind === 'todo')
		expect(todos.length).toBeGreaterThan(0)
		// The petstore audit-trail sidebar tab is component-only and retained.
		const detail = transformed.pages.find((p) => p.id === 'ExampleDetail')
		expect(detail.config.sidebar).toBeDefined()
	})
})
