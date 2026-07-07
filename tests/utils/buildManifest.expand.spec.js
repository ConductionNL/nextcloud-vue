/**
 * Tests that buildManifest wires the entity-scaffold expander transparently
 * (manifest-entity-scaffold-templating, audit item 12): a templated base
 * manifest expands its instantiations into concrete pages[] at boot, while a
 * manifest with no templating passes through unchanged.
 */

const { buildManifest } = require('../../src/utils/buildManifest.js')

describe('buildManifest — entity-scaffold expansion wiring', () => {
	it('expands base pageTemplates + pageInstances into concrete pages', () => {
		const base = {
			version: '1.0.0',
			pages: [{ id: 'Home', route: '/', type: 'index', title: 'Home' }],
			pageTemplates: [{
				id: 't',
				params: [{ name: 'id', required: true }, { name: 'route', required: true }, { name: 'schema', required: true }],
				page: { id: '{{id}}', route: '{{route}}', type: 'detail', title: 'Detail', config: { schema: '{{schema}}' } },
			}],
			pageInstances: [
				{ templateRef: 't', schema: 'Invoice', params: { id: 'InvoiceDetail', route: '/invoices/:id' } },
				{ templateRef: 't', schema: 'Barcode', params: { id: 'BarcodeDetail', route: '/barcodes/:id' } },
			],
		}
		const merged = buildManifest(base, [], {})
		const ids = merged.pages.map((p) => p.id)
		expect(ids).toContain('Home')
		expect(ids).toContain('InvoiceDetail')
		expect(ids).toContain('BarcodeDetail')
		expect(merged.pages.find((p) => p.id === 'InvoiceDetail').config.schema).toBe('Invoice')
		// instantiations consumed
		expect('pageInstances' in merged).toBe(false)
	})

	it('expands pageInstances declared in a fragment', () => {
		const base = {
			version: '1.0.0',
			pages: [],
			pageTemplates: [{
				id: 't',
				params: [{ name: 'id', required: true }, { name: 'route', required: true }],
				page: { id: '{{id}}', route: '{{route}}', type: 'index', title: 'X' },
			}],
		}
		const fragment = { pageInstances: [{ templateRef: 't', params: { id: 'FromFragment', route: '/ff' } }] }
		const merged = buildManifest(base, [fragment], {})
		expect(merged.pages.map((p) => p.id)).toContain('FromFragment')
	})

	it('passes a non-templated manifest through unchanged', () => {
		const base = { version: '1.0.0', pages: [{ id: 'a', route: '/a', type: 'index', title: 'A' }], menu: [] }
		const merged = buildManifest(base, [], {})
		expect(merged.pages).toHaveLength(1)
		expect('pageTemplates' in merged).toBe(false)
	})
})
