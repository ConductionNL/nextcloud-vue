/**
 * Tests for the manifest-detail-sidebartabs change.
 *
 * Covers:
 *   - schema (v2): `config.sidebarTabs[]` typed array on detail pages.
 *   - validator: validateDetailSidebarTabs catches missing id/label,
 *     duplicate ids, non-array shape, malformed entry fields.
 *   - cross-ref: validateSidebarTabGroupRefs flags `widgets[]`
 *     entries with `slot:'sidebar'` referencing a tabGroup that
 *     isn't declared in `config.sidebarTabs[].id`.
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal v2 manifest with one type='detail' page.
 *
 * @param {object} config Detail page config.
 * @param {Array} widgets Optional widgets[] on the page (for cross-ref tests).
 * @return {object} Complete v2 manifest.
 */
function manifestWithDetail(config, widgets) {
	const page = {
		id: 'ItemDetail',
		route: '/items/:id',
		type: 'detail',
		title: 'Item',
		config,
	}
	if (widgets) page.widgets = widgets
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.2.0',
		menu: [{ id: 'ItemDetail', label: 'Item', route: 'ItemDetail', order: 10 }],
		pages: [page],
	}
}

describe('config.sidebarTabs — manifest-detail-sidebartabs', () => {
	it('passes when sidebarTabs is omitted', () => {
		const result = validateManifest(manifestWithDetail({
			register: 'myapp',
			schema: 'item',
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('passes with an empty sidebarTabs array', () => {
		const result = validateManifest(manifestWithDetail({
			register: 'myapp',
			schema: 'item',
			sidebarTabs: [],
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('passes with a well-formed sidebarTabs entry', () => {
		const result = validateManifest(manifestWithDetail({
			register: 'myapp',
			schema: 'item',
			sidebarTabs: [
				{ id: 'overview', label: 'Overview' },
				{ id: 'history', label: 'History', icon: 'icon-history', order: 20 },
			],
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('rejects a tab entry missing id', () => {
		const result = validateManifest(manifestWithDetail({
			register: 'myapp',
			schema: 'item',
			sidebarTabs: [{ label: 'Overview' }],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /sidebarTabs\/0(?:\/id)?/.test(e))).toBe(true)
	})

	it('rejects a tab entry missing label', () => {
		const result = validateManifest(manifestWithDetail({
			register: 'myapp',
			schema: 'item',
			sidebarTabs: [{ id: 'overview' }],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /sidebarTabs\/0(?:\/label)?/.test(e))).toBe(true)
	})

	it('rejects duplicate tab ids', () => {
		const result = validateManifest(manifestWithDetail({
			register: 'myapp',
			schema: 'item',
			sidebarTabs: [
				{ id: 'overview', label: 'Overview' },
				{ id: 'overview', label: 'Overview again' },
			],
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('duplicate'))).toBe(true)
	})

	it('rejects non-array sidebarTabs', () => {
		const result = validateManifest(manifestWithDetail({
			register: 'myapp',
			schema: 'item',
			sidebarTabs: 'tabs',
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('sidebarTabs'))).toBe(true)
	})

	it('rejects a widget tabGroup that does not match any declared tab', () => {
		const result = validateManifest(manifestWithDetail(
			{
				register: 'myapp',
				schema: 'item',
				sidebarTabs: [{ id: 'overview', label: 'Overview' }],
			},
			[
				{ widgetKey: 'data', slot: 'sidebar', tabGroup: 'typo', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 1 },
			],
		))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /tabGroup.*typo/.test(e))).toBe(true)
	})

	it('passes when widget tabGroup matches a declared tab', () => {
		const result = validateManifest(manifestWithDetail(
			{
				register: 'myapp',
				schema: 'item',
				sidebarTabs: [{ id: 'overview', label: 'Overview' }],
			},
			[
				{ widgetKey: 'data', slot: 'sidebar', tabGroup: 'overview', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 1 },
			],
		))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('flags a widget tabGroup when sidebarTabs is missing entirely', () => {
		const result = validateManifest(manifestWithDetail(
			{
				register: 'myapp',
				schema: 'item',
			},
			[
				{ widgetKey: 'data', slot: 'sidebar', tabGroup: 'overview', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 1 },
			],
		))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('config.sidebarTabs'))).toBe(true)
	})
})
