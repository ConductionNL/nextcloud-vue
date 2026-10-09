/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-file-and-camera-fields/tasks.md#task-5
 */
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

// No `$schema` means the v1 validator; the v2 URL selects the v2 schema, where fields[] items are open objects.
function manifestWith(field, version = '2.5.0') {
	return {
		...(version.startsWith('2') ? { $schema: V2_SCHEMA_URL } : {}),
		version,
		menu: [{ id: 'f', label: 'Form', route: 'f', order: 10 }],
		pages: [{ id: 'f', route: '/f', type: 'form', title: 'Form', config: { submitEndpoint: '/apps/x/api/y', fields: [{ key: 'receipt', label: 'Receipt', type: 'file', ...field }] } }],
	}
}

describe('a form file field in the manifest', () => {
	it('accepts multiple, capture, accept and maxSize', () => {
		for (const version of ['2.5.0', '1.5.0']) {
			const out = validateManifest(manifestWith({ multiple: true, capture: 'environment', accept: 'image/*', maxSize: 5242880 }, version))
			expect(out.errors).toEqual([])
			expect(out.valid).toBe(true)
		}
	})

	it('refuses a capture that is neither environment nor user', () => {
		const out = validateManifest(manifestWith({ capture: 'sideways' }, '1.5.0'))
		expect(out.valid).toBe(false)
		expect(out.errors.join(' ')).toMatch(/capture/)
	})
})
