/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/transition-input-reference-and-subfields/tasks.md#task-3
 */
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

function manifest(lifecycleActions) {
	return {
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '1.0.0',
		menu: [],
		pages: [{ id: 'p', route: '/p/:id', type: 'detail', title: 'P', config: { register: 'r', schema: 's', lifecycleActions } }],
	}
}

describe('config.lifecycleActions.inputs', () => {
	it('accepts picker and fields hints', () => {
		const r = validateManifestV2(manifest({ field: 'status', inputs: { merge: [{ field: 'mergedInto', picker: { filter: { lifecycle: 'active' }, excludeSelf: true, labelField: 'name' } }, { field: 'fb', fields: ['masRoute'] }] } }))
		expect(r.errors).toEqual([])
		expect(r.valid).toBe(true)
	})

	it('refuses a hint without a field, and a wrong type', () => {
		expect(validateManifestV2(manifest({ inputs: { merge: [{ fields: ['x'] }] } })).valid).toBe(false)
		expect(validateManifestV2(manifest({ inputs: { merge: [{ field: 'x', picker: { excludeSelf: 'yes' } }] } })).valid).toBe(false)
	})
})
