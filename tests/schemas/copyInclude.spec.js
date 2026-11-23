/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-copy-with-relations/tasks.md#task-5
 */
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function manifestWith(copy) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.5.0',
		menu: [{ id: 'apps', label: 'Applications', route: 'apps', order: 10 }],
		pages: [{ id: 'apps', route: '/apps', type: 'index', title: 'Applications', config: { register: 'r', schema: 's', copy } }],
	}
}

describe('config.copy.include on an index page', () => {
	it('accepts the three kinds', () => {
		const out = validateManifest(manifestWith({ include: ['relationRows', 'incoming', 'files'] }))
		expect(out.errors).toEqual([])
		expect(out.valid).toBe(true)
	})

	it('rejects a kind it does not know, and a repeated one', () => {
		expect(validateManifest(manifestWith({ include: ['deepCopy'] })).valid).toBe(false)
		expect(validateManifest(manifestWith({ include: ['files', 'files'] })).valid).toBe(false)
	})

	it('rejects other keys under copy', () => {
		expect(validateManifest(manifestWith({ include: ['files'], recursive: true })).valid).toBe(false)
	})
})
