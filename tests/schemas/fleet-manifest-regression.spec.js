/**
 * Fleet-manifest regression suite (2026-07-06 manifest fleet audit, item 15).
 *
 * Validates every DEPLOYED fleet app manifest against the CURRENT candidate
 * v2 schema in this library. A schema change here that would invalidate a
 * manifest already shipped in a fleet app fails in THIS suite — before the
 * library is released — instead of surfacing later as install drift (the
 * exact problem the audit chased: installed schema generations spanned
 * beta.30..beta.155, each app effectively validated against a different
 * schema).
 *
 * The corpus is a vendored snapshot under tests/fixtures/fleet-manifests/
 * (CI has no fleet checkout). Refresh it with
 * `node scripts/update-fleet-manifest-fixtures.js <fleet-root>` AFTER a
 * deliberate, reviewed manifest change lands in a fleet app — never to make
 * a failing regression test pass (that defeats the guard: a red run here
 * means the schema change would break a deployed app, so fix the schema or
 * coordinate the app migration, do not silently re-snapshot).
 */

import fs from 'fs'
import path from 'path'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

// jest transpiles this spec to CommonJS, so __dirname is provided natively.
const CORPUS_DIR = path.resolve(__dirname, '../fixtures/fleet-manifests')

const index = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'index.json'), 'utf8'))
const apps = Object.keys(index).sort()

// Load each manifest once.
const corpus = apps.map((app) => ({
	app,
	manifest: JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, `${app}.json`), 'utf8')),
	meta: index[app],
}))

describe('fleet-manifest regression — candidate schema accepts every deployed manifest (audit item 15)', () => {
	it('the corpus is non-empty and covers the expected fleet size', () => {
		// Guard against a corpus that silently emptied (a broken refresh or a
		// missing fixtures dir would otherwise make every per-app test vanish
		// and the suite pass green with zero coverage).
		expect(apps.length).toBeGreaterThanOrEqual(20)
	})

	it.each(corpus)('$app validates against the current v2 schema', ({ manifest }) => {
		const result = validateManifestV2(manifest)
		// Surface the offending app + errors so a schema-tightening PR sees
		// exactly what it would break, not just "expected true".
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it.each(corpus)('$app declares a v2 $schema (no v1 regression)', ({ meta }) => {
		// Every fleet manifest completed the v2 migration on 2026-07-06
		// (launchpad was the last v1). A fixture reverting to v1 is a
		// regression worth catching here.
		expect(typeof meta.$schema).toBe('string')
		expect(meta.$schema).toMatch(/app-manifest-v2\.schema\.json$/)
	})
})
