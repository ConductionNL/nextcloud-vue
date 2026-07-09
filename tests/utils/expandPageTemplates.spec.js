/**
 * Tests for expandPageTemplates — entity-scaffold page-template expander
 * (manifest-entity-scaffold-templating, audit item 12).
 *
 * Covers:
 * - parameter substitution (exact-match typed values + embedded interpolation)
 * - shared `{{set:NAME}}` references
 * - optional-parameter key drop
 * - unknown-templateRef error (named)
 * - missing-required-parameter error (named)
 * - undeclared-placeholder + unknown-set errors (named)
 * - byte-equivalence round-trip (expanded === original, modulo key order)
 * - layered-delta override reuses mergeManifestDelta semantics
 * - no-op passthrough for a manifest without templating
 * - throwOnError vs collect-errors (runtime fallback) modes
 * - input manifest is never mutated
 */

const { expandPageTemplates } = require('../../src/utils/expandPageTemplates.js')

/**
 * Canonicalise for byte-equivalence-modulo-key-order comparison.
 * @param {*} value The value to canonicalise (deep key-sort).
 * @return {*} The canonicalised value.
 */
function canonical(value) {
	if (Array.isArray(value)) return value.map(canonical)
	if (value !== null && typeof value === 'object') {
		return Object.keys(value).sort().reduce((acc, k) => {
			acc[k] = canonical(value[k])
			return acc
		}, {})
	}
	return value
}

const detailTemplateManifest = () => ({
	$schema: 'x/app-manifest-v2.schema.json',
	version: '1.0.0',
	pageTemplates: [
		{
			id: 'detailScaffold',
			params: [
				{ name: 'id', required: true },
				{ name: 'route', required: true },
				{ name: 'label', required: true },
				{ name: 'schema', required: true },
				{ name: 'fields', required: true },
				{ name: 'documentationUrl', required: false },
			],
			page: {
				id: '{{id}}',
				route: '{{route}}',
				type: 'detail',
				title: '{{label}}',
				config: {
					register: 'shillinq',
					schema: '{{schema}}',
					auditTrail: true,
					fields: '{{fields}}',
					sidebarProps: '{{set:auditSidebar}}',
					documentationUrl: '{{documentationUrl}}',
				},
			},
		},
	],
	sets: {
		auditSidebar: { tabs: [{ id: 'audit', label: 'Audit Trail', order: 90 }] },
	},
	pageInstances: [
		{
			templateRef: 'detailScaffold',
			schema: 'Barcode',
			label: 'Barcode',
			params: {
				id: 'BarcodeDetail',
				route: '/inventory/barcodes/:id',
				fields: [{ key: 'barcode', label: 'Barcode', type: 'string' }],
				documentationUrl: 'https://shillinq.conduction.nl/barcodes',
			},
		},
		{
			templateRef: 'detailScaffold',
			schema: 'Invoice',
			label: 'Invoice',
			params: {
				id: 'InvoiceDetail',
				route: '/finance/invoices/:id',
				fields: [{ key: 'total', label: 'Total', type: 'number' }],
				// documentationUrl omitted → optional key dropped
			},
		},
	],
})

describe('expandPageTemplates — substitution', () => {
	it('substitutes exact-match placeholders preserving value type', () => {
		const { manifest, expandedCount, errors } = expandPageTemplates(detailTemplateManifest())
		expect(errors).toEqual([])
		expect(expandedCount).toBe(2)
		const barcode = manifest.pages.find((p) => p.id === 'BarcodeDetail')
		expect(barcode.type).toBe('detail')
		expect(barcode.title).toBe('Barcode')
		expect(barcode.config.schema).toBe('Barcode')
		// array value preserved as an array (not stringified)
		expect(Array.isArray(barcode.config.fields)).toBe(true)
		expect(barcode.config.fields[0].key).toBe('barcode')
		// constant carried through
		expect(barcode.config.register).toBe('shillinq')
		expect(barcode.config.auditTrail).toBe(true)
	})

	it('resolves a shared {{set:NAME}} reference to the named set value', () => {
		const { manifest } = expandPageTemplates(detailTemplateManifest())
		const barcode = manifest.pages.find((p) => p.id === 'BarcodeDetail')
		expect(barcode.config.sidebarProps).toEqual({ tabs: [{ id: 'audit', label: 'Audit Trail', order: 90 }] })
	})

	it('drops an exact-match key whose optional parameter is absent', () => {
		const { manifest } = expandPageTemplates(detailTemplateManifest())
		const invoice = manifest.pages.find((p) => p.id === 'InvoiceDetail')
		expect('documentationUrl' in invoice.config).toBe(false)
		const barcode = manifest.pages.find((p) => p.id === 'BarcodeDetail')
		expect(barcode.config.documentationUrl).toBe('https://shillinq.conduction.nl/barcodes')
	})

	it('interpolates embedded placeholders as strings', () => {
		const m = {
			version: '1.0.0',
			pageTemplates: [{
				id: 't',
				params: [{ name: 'label', required: true }, { name: 'id', required: true }, { name: 'route', required: true }],
				page: { id: '{{id}}', route: '{{route}}', type: 'index', title: 'Manage {{label}} records' },
			}],
			pageInstances: [{ templateRef: 't', label: 'Invoice', params: { id: 'x', route: '/x' } }],
		}
		const { manifest } = expandPageTemplates(m)
		expect(manifest.pages[0].title).toBe('Manage Invoice records')
	})
})

describe('expandPageTemplates — named errors', () => {
	it('fails on an unknown templateRef, naming the dangling reference', () => {
		const m = detailTemplateManifest()
		m.pageInstances[0].templateRef = 'noSuchTemplate'
		const { errors, expandedCount } = expandPageTemplates(m)
		expect(expandedCount).toBe(1) // the other instance still expands
		expect(errors).toHaveLength(1)
		expect(errors[0]).toContain('unknown templateRef "noSuchTemplate"')
		expect(errors[0]).toContain('pageInstances[0]')
	})

	it('fails on a missing required parameter, naming instance + parameter', () => {
		const m = detailTemplateManifest()
		delete m.pageInstances[1].schema // schema is required
		const { errors } = expandPageTemplates(m)
		expect(errors.some((e) => e.includes('requires parameter "schema"') && e.includes('pageInstances[1]'))).toBe(true)
	})

	it('fails on an undeclared placeholder in the template', () => {
		const m = {
			version: '1.0.0',
			pageTemplates: [{
				id: 't',
				params: [{ name: 'id', required: true }],
				page: { id: '{{id}}', route: '/x', type: 'index', title: '{{undeclaredThing}}' },
			}],
			pageInstances: [{ templateRef: 't', params: { id: 'x' } }],
		}
		const { errors } = expandPageTemplates(m)
		expect(errors.some((e) => e.includes('{{undeclaredThing}}') && e.includes('not a declared parameter'))).toBe(true)
	})

	it('fails on an unknown {{set:NAME}} reference', () => {
		const m = {
			version: '1.0.0',
			pageTemplates: [{
				id: 't',
				params: [{ name: 'id', required: true }],
				page: { id: '{{id}}', route: '/x', type: 'index', title: 'X', config: { sidebarProps: '{{set:ghost}}' } },
			}],
			pageInstances: [{ templateRef: 't', params: { id: 'x' } }],
		}
		const { errors } = expandPageTemplates(m)
		expect(errors.some((e) => e.includes('unknown set "ghost"'))).toBe(true)
	})

	it('throws in throwOnError mode (build-time / codemod path)', () => {
		const m = detailTemplateManifest()
		m.pageInstances[0].templateRef = 'nope'
		expect(() => expandPageTemplates(m, { throwOnError: true })).toThrow(/unknown templateRef "nope"/)
	})
})

describe('expandPageTemplates — byte-equivalence round-trip', () => {
	it('expands to pages byte-equivalent (modulo key order) to hand-written pages', () => {
		// The concrete pages a hand-written manifest would ship.
		const original = [
			{
				id: 'BarcodeDetail',
				route: '/inventory/barcodes/:id',
				type: 'detail',
				title: 'Barcode',
				config: {
					register: 'shillinq',
					schema: 'Barcode',
					auditTrail: true,
					fields: [{ key: 'barcode', label: 'Barcode', type: 'string' }],
					sidebarProps: { tabs: [{ id: 'audit', label: 'Audit Trail', order: 90 }] },
					documentationUrl: 'https://shillinq.conduction.nl/barcodes',
				},
			},
			{
				id: 'InvoiceDetail',
				route: '/finance/invoices/:id',
				type: 'detail',
				title: 'Invoice',
				config: {
					register: 'shillinq',
					schema: 'Invoice',
					auditTrail: true,
					fields: [{ key: 'total', label: 'Total', type: 'number' }],
					sidebarProps: { tabs: [{ id: 'audit', label: 'Audit Trail', order: 90 }] },
				},
			},
		]
		const { manifest } = expandPageTemplates(detailTemplateManifest())
		original.forEach((orig) => {
			const expanded = manifest.pages.find((p) => p.id === orig.id)
			expect(canonical(expanded)).toEqual(canonical(orig))
		})
	})
})

describe('expandPageTemplates — layered-delta override (reuses mergeManifestDelta)', () => {
	it('applies an instantiation override over the substituted page via the delta merge', () => {
		const m = detailTemplateManifest()
		m.pageInstances[0].override = {
			config: { auditTrail: false, extraFlag: true },
		}
		const { manifest, errors } = expandPageTemplates(m)
		expect(errors).toEqual([])
		const barcode = manifest.pages.find((p) => p.id === 'BarcodeDetail')
		// scalar overridden by the delta
		expect(barcode.config.auditTrail).toBe(false)
		// new key added by the delta
		expect(barcode.config.extraFlag).toBe(true)
		// untouched keys preserved from the substituted base
		expect(barcode.config.schema).toBe('Barcode')
	})

	it('merges a keyed widgets[] array by id (mergeManifestDelta semantics, not wholesale replace)', () => {
		const m = {
			version: '1.0.0',
			pageTemplates: [{
				id: 't',
				params: [{ name: 'id', required: true }],
				page: {
					id: '{{id}}',
					route: '/x',
					type: 'dashboard',
					title: 'X',
					widgets: [{ id: 'w1', widgetKey: 'k1', slot: 'body' }, { id: 'w2', widgetKey: 'k2', slot: 'body' }],
				},
			}],
			pageInstances: [{
				templateRef: 't',
				params: { id: 'x' },
				override: { widgets: [{ id: 'w1', widgetKey: 'kNEW' }] },
			}],
		}
		const { manifest } = expandPageTemplates(m)
		const page = manifest.pages[0]
		// w1 patched in place (keyed merge), w2 preserved — not a wholesale replace.
		expect(page.widgets).toHaveLength(2)
		expect(page.widgets.find((w) => w.id === 'w1').widgetKey).toBe('kNEW')
		expect(page.widgets.find((w) => w.id === 'w2').widgetKey).toBe('k2')
	})
})

describe('expandPageTemplates — passthrough + purity', () => {
	it('is a no-op for a manifest without templating', () => {
		const m = { version: '1.0.0', pages: [{ id: 'a', route: '/a', type: 'index', title: 'A' }] }
		const { manifest, expandedCount, errors } = expandPageTemplates(m)
		expect(expandedCount).toBe(0)
		expect(errors).toEqual([])
		expect(manifest.pages).toEqual(m.pages)
		expect('pageInstances' in manifest).toBe(false)
	})

	it('removes pageInstances from the output but keeps pageTemplates by default', () => {
		const { manifest } = expandPageTemplates(detailTemplateManifest())
		expect('pageInstances' in manifest).toBe(false)
		expect(Array.isArray(manifest.pageTemplates)).toBe(true)
	})

	it('strips pageTemplates + sets when stripTemplates is set (build ship path)', () => {
		const { manifest } = expandPageTemplates(detailTemplateManifest(), { stripTemplates: true })
		expect('pageTemplates' in manifest).toBe(false)
		expect('sets' in manifest).toBe(false)
		expect('pageInstances' in manifest).toBe(false)
	})

	it('never mutates the input manifest', () => {
		const m = detailTemplateManifest()
		const snapshot = JSON.parse(JSON.stringify(m))
		expandPageTemplates(m)
		expect(m).toEqual(snapshot)
	})

	it('appends expanded pages after any pre-existing concrete pages', () => {
		const m = detailTemplateManifest()
		m.pages = [{ id: 'Standalone', route: '/s', type: 'index', title: 'Standalone' }]
		const { manifest } = expandPageTemplates(m)
		expect(manifest.pages[0].id).toBe('Standalone')
		expect(manifest.pages.map((p) => p.id)).toEqual(['Standalone', 'BarcodeDetail', 'InvoiceDetail'])
	})
})
