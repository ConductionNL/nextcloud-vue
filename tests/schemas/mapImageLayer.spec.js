/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/map-image-layer/tasks.md#task-4
 */
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function manifestWithMap(config) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.5.0',
		menu: [{ id: 'Map', label: 'Map', route: 'Map', order: 10 }],
		pages: [{ id: 'Map', route: '/map', type: 'map', title: 'World', config: { center: [0, 0], ...config } }],
	}
}

describe('map pages accept an image layer', () => {
	it('accepts a picture with its pixel size and x/y marker fields', () => {
		const result = validateManifest(manifestWithMap({
			layers: [{ type: 'image', url: '/img/world.png', width: 2400, height: 1600 }],
			markers: { xField: 'x', yField: 'y', dataSource: { register: 'larp', schema: 'place' } },
		}))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('refuses an image layer without width and height', () => {
		const result = validateManifest(manifestWithMap({ layers: [{ type: 'image', url: '/img/world.png' }] }))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toMatch(/width|height/)
	})

	it('refuses a non-positive size', () => {
		expect(validateManifest(manifestWithMap({ layers: [{ type: 'image', url: '/a.png', width: 0, height: 10 }] })).valid).toBe(false)
	})

	it('still accepts the geographic layer types', () => {
		expect(validateManifest(manifestWithMap({ layers: [{ type: 'tile', url: 'https://x/{z}/{x}/{y}.png' }] })).valid).toBe(true)
	})
})
