/**
 * Tests for resolveSlotColumns — shared slot→columns resolution.
 *
 * Covers the grid-widget-system (flexible columns) capability:
 * - library defaults preserved (body=12, sidebar=1, tab and section = 12)
 * - per-page slotColumns override
 * - explicit prop wins over override and default
 */

const { resolveSlotColumns, defaultSlotColumns } = require('../../src/utils/resolveSlotColumns.js')

describe('resolveSlotColumns', () => {
	it('returns library defaults when nothing is overridden', () => {
		expect(resolveSlotColumns('body')).toBe(12)
		expect(resolveSlotColumns('sidebar')).toBe(1)
		expect(resolveSlotColumns('tab:general')).toBe(12)
		expect(resolveSlotColumns('section:x')).toBe(12)
		expect(resolveSlotColumns('unknown')).toBe(12)
	})

	it('applies a per-page slotColumns override', () => {
		expect(resolveSlotColumns('body', { body: 8 })).toBe(8)
		expect(resolveSlotColumns('sidebar', { sidebar: 2 })).toBe(2)
	})

	it('ignores invalid override values and falls back to default', () => {
		expect(resolveSlotColumns('body', { body: 0 })).toBe(12)
		expect(resolveSlotColumns('body', { body: -3 })).toBe(12)
		expect(resolveSlotColumns('body', { body: 'wide' })).toBe(12)
	})

	it('lets an explicit prop win over override and default', () => {
		expect(resolveSlotColumns('body', { body: 8 }, 6)).toBe(6)
		expect(resolveSlotColumns('sidebar', null, 3)).toBe(3)
	})

	it('exposes the raw default helper', () => {
		expect(defaultSlotColumns('body')).toBe(12)
		expect(defaultSlotColumns('sidebar')).toBe(1)
	})
})
