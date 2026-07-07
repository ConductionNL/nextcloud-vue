/**
 * Schema tests for the entity-scaffold templating additions
 * (manifest-entity-scaffold-templating, audit item 12):
 * `pageTemplates[]`, `pageInstances[]`, `sets`.
 *
 * Confirms the additions are ADDITIVE + backward-compatible (a manifest with
 * no templating still validates unchanged — covered by the fleet regression
 * suite) and that the post-schema checks in validateManifestV2 catch a
 * duplicate template id and a dangling templateRef.
 */

const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const templated = () => ({
	$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	menu: [],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }],
	sets: {
		auditSidebar: { tabs: [{ id: 'audit', label: 'Audit Trail', order: 90 }] },
	},
	pageTemplates: [{
		id: 'detailScaffold',
		params: [
			{ name: 'id', required: true },
			{ name: 'route', required: true },
			{ name: 'label', required: true },
			{ name: 'schema', required: true },
		],
		page: {
			id: '{{id}}',
			route: '{{route}}',
			type: 'detail',
			title: '{{label}}',
			config: { register: 'demo', schema: '{{schema}}', sidebarProps: '{{set:auditSidebar}}' },
		},
	}],
	pageInstances: [{
		templateRef: 'detailScaffold',
		schema: 'Invoice',
		label: 'Invoice',
		params: { id: 'InvoiceDetail', route: '/invoices/:id' },
	}],
})

describe('app-manifest-v2 schema — entity-scaffold templating', () => {
	it('accepts a manifest declaring pageTemplates + pageInstances + sets', () => {
		const result = validateManifestV2(templated())
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts the first-class register/schema/label shortcuts on an instance', () => {
		const m = templated()
		m.pageInstances[0] = { templateRef: 'detailScaffold', register: 'demo', schema: 'X', label: 'X', params: { id: 'p', route: '/p' } }
		const result = validateManifestV2(m)
		expect(result.valid).toBe(true)
	})

	it('accepts an instance override block (layered-delta)', () => {
		const m = templated()
		m.pageInstances[0].override = { config: { auditTrail: false } }
		expect(validateManifestV2(m).valid).toBe(true)
	})

	it('rejects an unknown property inside pageTemplate (additionalProperties:false)', () => {
		const m = templated()
		m.pageTemplates[0].bogus = true
		expect(validateManifestV2(m).valid).toBe(false)
	})

	it('flags a duplicate pageTemplates[].id (post-schema check)', () => {
		const m = templated()
		m.pageTemplates.push({ ...m.pageTemplates[0] })
		const result = validateManifestV2(m)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('must be unique within pageTemplates[]'))).toBe(true)
	})

	it('flags a dangling pageInstances[].templateRef (post-schema check)', () => {
		const m = templated()
		m.pageInstances[0].templateRef = 'ghost'
		const result = validateManifestV2(m)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('references no pageTemplates[] entry'))).toBe(true)
	})

	it('is unaffected for a manifest with no templating keys', () => {
		const m = { $schema: templated().$schema, version: '1.0.0', menu: [], pages: [{ id: 'a', route: '/a', type: 'index', title: 'A' }] }
		expect(validateManifestV2(m).valid).toBe(true)
	})
})
