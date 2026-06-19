/**
 * Tests for flexible per-slot columns + reserved delta marker rejection in
 * the v2 validator (grid-widget-system + manifest-delta-merge capabilities).
 *
 * - widget fits a widened slot (config.slotColumns)
 * - widget exceeds the resolved bound → error names the bound
 * - default bound (12) unchanged when no slotColumns
 * - slotColumns shape validation
 * - reserved $op / __order rejected outside delta mode
 * - optional widget id accepted; duplicate ids rejected
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const SCHEMA = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function manifestWith(page) {
	return { $schema: SCHEMA, version: '2.0.0', menu: [], pages: [page] }
}

function bodyWidget(extra = {}) {
	return { widgetKey: 'chart', slot: 'body', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2, ...extra }
}

describe('validateManifestV2 — flexible columns', () => {
	it('accepts a widget that fits a widened slot', () => {
		const m = manifestWith({
			id: 'p', route: '/', type: 'dashboard', title: 'P',
			config: { slotColumns: { body: 16 } },
			widgets: [bodyWidget({ gridX: 0, gridWidth: 14 }), bodyWidget({ widgetKey: 'stats-block', gridX: 14, gridWidth: 2 })],
		})
		const { valid, errors } = validateManifestV2(m)
		expect(valid).toBe(true)
		expect(errors).toEqual([])
	})

	it('rejects a widget exceeding the resolved bound and names it', () => {
		const m = manifestWith({
			id: 'p', route: '/', type: 'dashboard', title: 'P',
			config: { slotColumns: { body: 8 } },
			widgets: [bodyWidget({ gridX: 4, gridWidth: 6 })],
		})
		const { valid, errors } = validateManifestV2(m)
		expect(valid).toBe(false)
		expect(errors.some((e) => e.includes('exceeds 8'))).toBe(true)
	})

	it('keeps the default 12-column bound when no slotColumns set', () => {
		const m = manifestWith({
			id: 'p', route: '/', type: 'dashboard', title: 'P',
			widgets: [bodyWidget({ gridX: 6, gridWidth: 8 })],
		})
		const { valid, errors } = validateManifestV2(m)
		expect(valid).toBe(false)
		expect(errors.some((e) => e.includes('exceeds 12'))).toBe(true)
	})

	it('rejects a malformed slotColumns map', () => {
		const m = manifestWith({
			id: 'p', route: '/', type: 'dashboard', title: 'P',
			config: { slotColumns: { body: 0 } },
			widgets: [],
		})
		const { valid, errors } = validateManifestV2(m)
		expect(valid).toBe(false)
		expect(errors.some((e) => e.includes('slotColumns'))).toBe(true)
	})
})

describe('validateManifestV2 — reserved delta markers + widget id', () => {
	it('rejects $op in a non-delta manifest', () => {
		const m = manifestWith({
			id: 'p', route: '/', type: 'dashboard', title: 'P',
			widgets: [bodyWidget({ $op: 'remove' })],
		})
		const { valid, errors } = validateManifestV2(m)
		expect(valid).toBe(false)
		expect(errors.some((e) => e.includes('$op'))).toBe(true)
	})

	it('rejects __order in a non-delta manifest', () => {
		const m = manifestWith({
			id: 'p', route: '/', type: 'dashboard', title: 'P', __order: { widgets: ['x'] },
			widgets: [bodyWidget()],
		})
		const { valid, errors } = validateManifestV2(m)
		expect(valid).toBe(false)
		expect(errors.some((e) => e.includes('__order'))).toBe(true)
	})

	it('accepts an optional widget id and rejects duplicates within a page', () => {
		const ok = manifestWith({
			id: 'p', route: '/', type: 'dashboard', title: 'P',
			widgets: [bodyWidget({ id: 'a', gridX: 0 }), bodyWidget({ id: 'b', gridX: 4 })],
		})
		expect(validateManifestV2(ok).valid).toBe(true)

		const dup = manifestWith({
			id: 'p', route: '/', type: 'dashboard', title: 'P',
			widgets: [bodyWidget({ id: 'a', gridX: 0 }), bodyWidget({ id: 'a', gridX: 4 })],
		})
		const { valid, errors } = validateManifestV2(dup)
		expect(valid).toBe(false)
		expect(errors.some((e) => e.includes('unique'))).toBe(true)
	})
})
