/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-smart-paste/tasks.md#task-1
 */
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function manifestWithForm(extraConfig) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.5.0',
		menu: [{ id: 'Form', label: 'Form', route: 'Form', order: 10 }],
		pages: [
			{
				id: 'Form',
				route: '/form',
				type: 'form',
				title: 'Form',
				config: {
					fields: [{ key: 'naam', type: 'string' }, { key: 'telefoon', type: 'string' }],
					submitHandler: 'onSubmit',
					mode: 'create',
					...extraConfig,
				},
			},
		],
	}
}

const ok = { enabled: true, fields: ['naam', 'telefoon'], handler: 'fill', hint: 'Paste an email signature' }

describe('config.smartPaste validation', () => {
	it('accepts a well-formed block and a form without one', () => {
		expect(validateManifest(manifestWithForm({ smartPaste: ok })).valid).toBe(true)
		expect(validateManifest(manifestWithForm({})).valid).toBe(true)
	})

	it('fails with the path when a field key is not declared', () => {
		const result = validateManifest(manifestWithForm({ smartPaste: { ...ok, fields: ['naam', 'adres'] } }))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toContain('smartPaste/fields[1]')
		expect(result.errors.join('\n')).toContain('adres')
	})

	it('fails when enabled without a handler', () => {
		const { handler, ...noHandler } = ok
		const result = validateManifest(manifestWithForm({ smartPaste: noHandler }))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toContain('smartPaste/handler')
	})

	it('fails when enabled in public mode', () => {
		const result = validateManifest(manifestWithForm({ mode: 'public', smartPaste: ok }))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toContain('public form')
	})

	it('refuses an unknown key inside smartPaste', () => {
		expect(validateManifest(manifestWithForm({ smartPaste: { ...ok, extra: 1 } })).valid).toBe(false)
	})
})
