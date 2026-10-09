/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/manifest-i18n-labels/tasks.md#task-1
 */
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

function base(i18n) {
	return {
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '1.0.0',
		menu: [],
		pages: [],
		...(i18n ? { i18n } : {}),
	}
}

describe('manifest i18n block', () => {
	it('a manifest with translations validates', () => {
		const out = validateManifestV2(base({ sourceLanguage: 'nl', languages: ['en'], labels: { en: { Vergunningen: 'Permits' } } }))
		expect(out.errors).toEqual([])
		expect(out.valid).toBe(true)
	})

	it('a label language that is not declared fails, naming it', () => {
		const out = validateManifestV2(base({ sourceLanguage: 'nl', languages: ['en'], labels: { de: { Vergunningen: 'Genehmigungen' } } }))
		expect(out.valid).toBe(false)
		expect(out.errors.join(' ')).toMatch(/"de" is not declared/)
	})

	it('the source language inside languages fails', () => {
		const out = validateManifestV2(base({ sourceLanguage: 'nl', languages: ['nl', 'en'], labels: {} }))
		expect(out.valid).toBe(false)
		expect(out.errors.join(' ')).toMatch(/source language/)
	})

	it('refuses a non-string translation, a repeated language and unknown keys', () => {
		expect(validateManifestV2(base({ sourceLanguage: 'nl', languages: ['en'], labels: { en: { A: 3 } } })).valid).toBe(false)
		expect(validateManifestV2(base({ sourceLanguage: 'nl', languages: ['en', 'en'], labels: {} })).valid).toBe(false)
		expect(validateManifestV2(base({ sourceLanguage: 'nl', languages: ['en'], labels: {}, extra: 1 })).valid).toBe(false)
	})

	it('a manifest without i18n is unchanged', () => {
		expect(validateManifestV2(base(null)).valid).toBe(true)
	})
})
