/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-column-order-and-pinning/tasks.md#task-5
 */
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function manifestWith(config) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.5.0',
		menu: [{ id: 'orders', label: 'Orders', route: 'orders', order: 10 }],
		pages: [{ id: 'orders', route: '/orders', type: 'index', title: 'Orders', config: { register: 'r', schema: 's', ...config } }],
	}
}

describe('config.personalColumns on an index page', () => {
	it('accepts a boolean', () => {
		expect(validateManifest(manifestWith({ personalColumns: false })).valid).toBe(true)
		expect(validateManifest(manifestWith({ personalColumns: true })).valid).toBe(true)
	})

	it('refuses anything else', () => {
		const out = validateManifest(manifestWith({ personalColumns: 'no' }))
		expect(out.valid).toBe(false)
		expect(out.errors.join(' ')).toMatch(/personalColumns/)
	})
})
