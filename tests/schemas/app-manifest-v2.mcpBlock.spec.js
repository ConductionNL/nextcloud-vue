/**
 * Golden cases for the optional top-level `mcp` block (ADR-063 advisory
 * MCP tool visibility/UX hints) in the v2 app-manifest JSON Schema.
 *
 * The block is presentational only — Hermiq (agent tool picker) and
 * openbuild (tool browser) read it in later, separately-specced work.
 * nextcloud-vue does not consume `manifest.mcp`; these tests exercise
 * schema validation only.
 *
 * Covers openspec/changes/manifest-v2-mcp-block/tasks.md §3.1
 * (REQ-MCP-001 through REQ-MCP-005).
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Minimal valid v2 manifest — empty menu/pages + $schema + version.
 */
const MINIMAL_V2 = {
	$schema: V2_SCHEMA_URL,
	version: '2.0.0',
	menu: [],
	pages: [],
}

describe('app-manifest-v2.schema.json — mcp block (REQ-MCP-001)', () => {
	it('manifest without an mcp block validates unchanged (back-compat)', () => {
		const result = validateManifestV2(MINIMAL_V2)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('required stays exactly ["$schema", "version"] — mcp is not required', () => {
		// A manifest with $schema + version and nothing else (no mcp, no
		// menu/pages/observability) still fails, but NOT because of mcp —
		// confirming mcp adds no new required-field pressure.
		const result = validateManifestV2({ $schema: V2_SCHEMA_URL, version: '2.0.0' })
		expect(result.errors.some((e) => e.includes('mcp'))).toBe(false)
	})

	it('a full mcp block (expose, pageTools, agentHints all populated) validates', () => {
		const manifest = {
			...MINIMAL_V2,
			mcp: {
				expose: true,
				pageTools: {
					'leads-index': ['pipelinq.lead.search', 'pipelinq.lead.get'],
				},
				agentHints: {
					summary: 'Manage sales leads and tickets',
					defaultTools: ['pipelinq.lead.search'],
					keywords: ['crm', 'sales', 'leads'],
				},
			},
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('an empty mcp block validates (every property is optional)', () => {
		const manifest = { ...MINIMAL_V2, mcp: {} }
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('an unknown property directly under mcp fails (additionalProperties: false)', () => {
		const manifest = { ...MINIMAL_V2, mcp: { bogusKey: true } }
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('mcp') && e.includes('additional properties'))).toBe(true)
	})
})

describe('app-manifest-v2 — mcp.expose (REQ-MCP-002)', () => {
	it('expose: true validates', () => {
		const manifest = { ...MINIMAL_V2, mcp: { expose: true } }
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('expose: false validates', () => {
		const manifest = { ...MINIMAL_V2, mcp: { expose: false } }
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('a non-boolean expose fails, citing the expose type', () => {
		const manifest = { ...MINIMAL_V2, mcp: { expose: 'yes' } }
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('expose'))).toBe(true)
	})

	it('expose omitted defaults to false under Ajv useDefaults (no schema error)', () => {
		// The compiled validator is built with useDefaults: true (see
		// scripts/build-validators.js), so an omitted `expose` is filled in
		// on the internal clone rather than raising a required-field error.
		const manifest = { ...MINIMAL_V2, mcp: {} }
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})
})

describe('app-manifest-v2 — mcp.pageTools (REQ-MCP-003)', () => {
	it('a pageTools mapping a page id to derived tool ids validates', () => {
		const manifest = {
			...MINIMAL_V2,
			mcp: {
				pageTools: {
					'leads-index': ['pipelinq.lead.search', 'pipelinq.lead.get'],
				},
			},
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('a tool id with an unknown verb fails, citing the tool-id pattern', () => {
		const manifest = {
			...MINIMAL_V2,
			mcp: { pageTools: { 'leads-index': ['pipelinq.lead.frobnicate'] } },
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('pattern'))).toBe(true)
	})

	it('a tool id missing the appId namespace fails, citing the tool-id pattern', () => {
		const manifest = {
			...MINIMAL_V2,
			mcp: { pageTools: { 'leads-index': ['lead.search'] } },
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('pattern'))).toBe(true)
	})

	it('a non-array pageTools entry fails, citing the array type', () => {
		const manifest = {
			...MINIMAL_V2,
			mcp: { pageTools: { 'leads-index': 'pipelinq.lead.search' } },
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('array'))).toBe(true)
	})
})

describe('app-manifest-v2 — mcp.agentHints (REQ-MCP-004)', () => {
	it('a full agentHints object validates', () => {
		const manifest = {
			...MINIMAL_V2,
			mcp: {
				agentHints: {
					summary: 'Manage sales leads and tickets',
					defaultTools: ['pipelinq.lead.search'],
					keywords: ['crm', 'sales', 'leads'],
				},
			},
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('an unrecognised advisory hint inside agentHints is tolerated (forward compat)', () => {
		const manifest = {
			...MINIMAL_V2,
			mcp: {
				agentHints: {
					summary: 'Manage sales leads and tickets',
					experimentalRanking: 0.9,
				},
			},
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('a non-string summary fails, citing the summary type', () => {
		const manifest = { ...MINIMAL_V2, mcp: { agentHints: { summary: 42 } } }
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('summary'))).toBe(true)
	})
})

describe('app-manifest-v2 — mcp additive/non-breaking (REQ-MCP-005)', () => {
	it('an existing v2 manifest with unrelated properties still validates with mcp added', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'leads-index',
				route: '/leads',
				type: 'index',
				title: 'app.leads',
			}],
			mcp: {
				expose: true,
				pageTools: { 'leads-index': ['pipelinq.lead.search'] },
			},
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})
})
