/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header line can count a named entity source (DqTenant "een van 6
 * organisaties op deze omgeving": `headerMetaCounts.organisations:
 * { entitySource: "organisations" }`). CnDetailPage reads it; the schema
 * accepted only register + schema.
 *
 * @spec openspec/changes/header-meta-count-entity-source/specs/detail-page/spec.md
 */
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const manifest = (headerMetaCounts) => ({
	$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
	version: '2.0.0',
	menu: [],
	pages: [{ id: 'organisation', route: '/organisations/:id', type: 'detail', title: 'Organisation', config: { entitySource: 'organisations', headerMeta: 'one of {count:organisations} organisations', headerMetaCounts } }],
})

describe('headerMetaCounts in the manifest schema', () => {
	it('accepts a count of a named entity source', () => {
		expect(validateManifestV2(manifest({ organisations: { entitySource: 'organisations' } })).valid).toBe(true)
	})

	it('keeps accepting register and schema', () => {
		expect(validateManifestV2(manifest({ cases: { register: 'dossiq', schema: 'case', filter: { status: 'open' } } })).valid).toBe(true)
	})

	it('refuses an unknown source, a lone register and both kinds at once', () => {
		expect(validateManifestV2(manifest({ x: { entitySource: 'sparkle' } })).valid).toBe(false)
		expect(validateManifestV2(manifest({ x: { register: 'dossiq' } })).valid).toBe(false)
		expect(validateManifestV2(manifest({ x: { register: 'dossiq', schema: 'case', entitySource: 'organisations' } })).valid).toBe(false)
	})
})
