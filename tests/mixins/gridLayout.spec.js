import { gridLayout } from '../../src/mixins/gridLayout.js'

describe('gridLayout mixin', () => {
	// Create a minimal Vue-like object to test computed properties and methods
	function createInstance(layout = [], widgets = [], columns = 12) {
		const instance = {
			layout,
			widgets,
			columns,
			...gridLayout.computed,
			...gridLayout.methods,
		}
		// Bind computed properties to use instance context
		Object.keys(gridLayout.computed).forEach(key => {
			Object.defineProperty(instance, key, {
				get: gridLayout.computed[key].bind(instance),
				configurable: true,
			})
		})
		return instance
	}

	describe('sortedLayout', () => {
		it('sorts by gridY then gridX', () => {
			const layout = [
				{ id: 1, widgetId: 'b', gridX: 4, gridY: 1 },
				{ id: 2, widgetId: 'a', gridX: 0, gridY: 0 },
				{ id: 3, widgetId: 'c', gridX: 0, gridY: 1 },
			]
			const instance = createInstance(layout)
			const sorted = instance.sortedLayout

			expect(sorted[0].widgetId).toBe('a') // gridY=0
			expect(sorted[1].widgetId).toBe('c') // gridY=1, gridX=0
			expect(sorted[2].widgetId).toBe('b') // gridY=1, gridX=4
		})

		it('does not mutate the original array', () => {
			const layout = [
				{ id: 1, widgetId: 'b', gridX: 4, gridY: 1 },
				{ id: 2, widgetId: 'a', gridX: 0, gridY: 0 },
			]
			const instance = createInstance(layout)
			instance.sortedLayout

			expect(layout[0].widgetId).toBe('b') // original unchanged
		})
	})

	describe('hasGridLayout', () => {
		it('returns true when layout has items', () => {
			const instance = createInstance([{ id: 1 }])
			expect(instance.hasGridLayout).toBe(true)
		})

		it('returns false when layout is empty', () => {
			const instance = createInstance([])
			expect(instance.hasGridLayout).toBe(false)
		})

		it('returns false when layout is null-ish', () => {
			const instance = createInstance(null)
			expect(instance.hasGridLayout).toBe(false)
		})
	})

	describe('widgetGridStyle', () => {
		it('computes correct grid-column', () => {
			const instance = createInstance()
			const style = instance.widgetGridStyle({ gridX: 0, gridWidth: 8 })

			expect(style.gridColumn).toBe('1 / 9')
		})

		it('handles non-zero gridX', () => {
			const instance = createInstance()
			const style = instance.widgetGridStyle({ gridX: 4, gridWidth: 4 })

			expect(style.gridColumn).toBe('5 / 9')
		})

		it('uses full width when gridWidth not specified', () => {
			const instance = createInstance([], [], 12)
			const style = instance.widgetGridStyle({ gridX: 0 })

			expect(style.gridColumn).toBe('1 / 13')
		})

		it('includes grid-row when gridHeight is provided', () => {
			const instance = createInstance()
			const style = instance.widgetGridStyle({
				gridX: 0, gridWidth: 12, gridY: 2, gridHeight: 3,
			})

			expect(style.gridRow).toBe('3 / 6')
		})

		it('does not include grid-row when gridHeight is missing', () => {
			const instance = createInstance()
			const style = instance.widgetGridStyle({ gridX: 0, gridWidth: 6 })

			expect(style.gridRow).toBeUndefined()
		})
	})

	describe('findWidget', () => {
		it('finds widget by widgetId', () => {
			const widgets = [
				{ id: 'info', title: 'Info' },
				{ id: 'stats', title: 'Statistics' },
			]
			const instance = createInstance([], widgets)
			const widget = instance.findWidget({ widgetId: 'stats' })

			expect(widget.title).toBe('Statistics')
		})

		it('returns undefined for unknown widgetId', () => {
			const instance = createInstance([], [{ id: 'info', title: 'Info' }])
			const widget = instance.findWidget({ widgetId: 'unknown' })

			expect(widget).toBeUndefined()
		})
	})
})
