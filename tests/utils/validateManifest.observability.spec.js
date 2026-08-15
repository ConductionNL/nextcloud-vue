/**
 * Tests for the manifest `observability` block (ADR-040, AppHost).
 *
 * The block is consumed at request time by the OpenRegister AppHost
 * observability engine (GenericHealthController + GenericMetricsController),
 * NOT by the Vue renderer. These tests confirm the v2 schema accepts a
 * well-formed observability block (health.checks[] over the 5 closed check
 * types + severity, metrics[] over the 6 source kinds, statusCodePolicy)
 * and rejects malformed shapes (unknown check type, unknown source kind,
 * missing required keys, unknown additional properties).
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal valid v2 manifest carrying the supplied observability block.
 *
 * @param {object} observability The observability block under test.
 * @return {object} Complete v2 manifest.
 */
function manifestWithObservability(observability) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.10.0',
		menu: [],
		pages: [],
		observability,
	}
}

describe('observability block — ADR-040 (positive)', () => {
	it('manifest with no observability block validates (additive/optional)', () => {
		const result = validateManifestV2({
			$schema: V2_SCHEMA_URL,
			version: '2.10.0',
			menu: [],
			pages: [],
		})
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('empty observability block validates', () => {
		const result = validateManifestV2(manifestWithObservability({}))
		expect(result.valid).toBe(true)
	})

	it('full observability block with all 5 health check types + 6 metric kinds validates', () => {
		const observability = {
			_note: 'Full coverage example for the schema test.',
			health: {
				statusCodePolicy: 'adr006',
				checks: [
					{ id: 'db', type: 'database', severity: 'critical' },
					{ id: 'fs', type: 'filesystem', severity: 'degraded' },
					{ id: 'or-enabled', type: 'appEnabled', app: 'openregister', severity: 'critical' },
					{ id: 'cfg', type: 'appConfig', key: 'some_key', severity: 'degraded' },
					{ id: 'or-up', type: 'orAvailable', severity: 'critical' },
				],
			},
			metrics: [
				{
					name: 'objects_total',
					type: 'gauge',
					help: 'Total objects',
					source: { kind: 'objectCount', register: 'myapp', schema: 'item' },
				},
				{
					name: 'objects_by_status',
					type: 'gauge',
					source: {
						kind: 'objectCount',
						register: 'myapp',
						schema: 'item',
						groupBy: ['status'],
						labelMap: { status: 'state' },
						labelDefaults: { status: 'unknown' },
						filter: { status: { neq: 'archived' } },
					},
				},
				{
					name: 'rows_total',
					type: 'gauge',
					source: { kind: 'tableCount', table: 'myapp_widgets' },
				},
				{
					name: 'configured_limit',
					type: 'gauge',
					source: { kind: 'appConfig', key: 'max_items' },
				},
				{
					name: 'custom_provider_metric',
					type: 'counter',
					source: { kind: 'provider', id: 'my-metrics-provider' },
				},
			],
		}
		const result = validateManifestV2(manifestWithObservability(observability))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('always200 statusCodePolicy validates', () => {
		const result = validateManifestV2(manifestWithObservability({
			health: { statusCodePolicy: 'always200', checks: [] },
		}))
		expect(result.valid).toBe(true)
	})
})

describe('observability block — ADR-040 (negative)', () => {
	it('rejects an unknown health check type', () => {
		const result = validateManifestV2(manifestWithObservability({
			health: { checks: [{ id: 'bad', type: 'redis' }] },
		}))
		expect(result.valid).toBe(false)
	})

	it('rejects an unknown metric source kind', () => {
		const result = validateManifestV2(manifestWithObservability({
			metrics: [{ name: 'x', type: 'gauge', source: { kind: 'graphql' } }],
		}))
		expect(result.valid).toBe(false)
	})

	it('rejects an invalid statusCodePolicy enum value', () => {
		const result = validateManifestV2(manifestWithObservability({
			health: { statusCodePolicy: 'always503', checks: [] },
		}))
		expect(result.valid).toBe(false)
	})

	it('rejects an invalid severity enum value', () => {
		const result = validateManifestV2(manifestWithObservability({
			health: { checks: [{ id: 'db', type: 'database', severity: 'fatal' }] },
		}))
		expect(result.valid).toBe(false)
	})

	it('rejects a health check missing the required type', () => {
		const result = validateManifestV2(manifestWithObservability({
			health: { checks: [{ id: 'db' }] },
		}))
		expect(result.valid).toBe(false)
	})

	it('rejects a metric missing the required source', () => {
		const result = validateManifestV2(manifestWithObservability({
			metrics: [{ name: 'x', type: 'gauge' }],
		}))
		expect(result.valid).toBe(false)
	})

	it('rejects an invalid metric type enum value', () => {
		const result = validateManifestV2(manifestWithObservability({
			metrics: [{ name: 'x', type: 'histogram', source: { kind: 'tableCount', table: 't' } }],
		}))
		expect(result.valid).toBe(false)
	})

	it('rejects unknown additional properties on the observability block', () => {
		const result = validateManifestV2(manifestWithObservability({
			tracing: { enabled: true },
		}))
		expect(result.valid).toBe(false)
	})
})
