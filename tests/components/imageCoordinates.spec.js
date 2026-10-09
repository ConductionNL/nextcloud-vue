/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/map-image-layer/tasks.md#task-1
 */
import { fromImagePoint, hasImagePosition, imageBounds, paddedImageBounds, toImagePoint } from '../../src/components/CnMapWidget/imageCoordinates.js'

describe('image coordinates', () => {
	it('puts (0, 0) at the top left and y downward', () => {
		expect(toImagePoint(820, 610)).toEqual({ lat: -610, lng: 820 })
		expect(imageBounds(2400, 1600)).toEqual([[-1600, 0], [0, 2400]])
	})

	it('round-trips a pixel', () => {
		const size = { width: 2400, height: 1600 }
		expect(fromImagePoint(toImagePoint(820, 610), size)).toEqual({ x: 820, y: 610 })
	})

	it('rounds and clamps a click to the picture', () => {
		const size = { width: 100, height: 50 }
		expect(fromImagePoint({ lat: -10.6, lng: 20.4 }, size)).toEqual({ x: 20, y: 11 })
		expect(fromImagePoint({ lat: 30, lng: -5 }, size)).toEqual({ x: 0, y: 0 })
		expect(fromImagePoint({ lat: -500, lng: 900 }, size)).toEqual({ x: 100, y: 50 })
	})

	it('pads the bounds so a drag cannot lose the picture', () => {
		expect(paddedImageBounds(100, 50, 0.1)).toEqual([[-55, -10], [5, 110]])
	})

	it('needs two finite numbers to place a row', () => {
		expect(hasImagePosition({ x: 1, y: 2 }, 'x', 'y')).toBe(true)
		expect(hasImagePosition({ x: 1 }, 'x', 'y')).toBe(false)
		expect(hasImagePosition({ x: '1', y: 2 }, 'x', 'y')).toBe(false)
		expect(hasImagePosition(null, 'x', 'y')).toBe(false)
	})
})
