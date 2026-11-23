/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The manifest schema accepts the relative filter tokens a page filter uses:
 * `@myGroups` (dossiq's `filter.assignedGroup`), `@monthEnd` and
 * `@nextMonthStart` ("closes this month"), and refuses a token outside the
 * vocabulary.
 *
 * @spec openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-the-filter-vocabulary-names-the-end-of-the-month
 */
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

/**
 * A one-page manifest whose index page carries the given filter.
 *
 * @param {object} filter The page filter.
 * @return {object} The manifest.
 */
function manifest(filter) {
	return {
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '1.0.0',
		menu: [],
		pages: [{ id: 'p', route: '/p', type: 'index', title: 'P', config: { register: 'r', schema: 's', filter } }],
	}
}

describe('manifest schema: filter tokens', () => {
	it('accepts @myGroups on a group field', () => {
		expect(validateManifestV2(manifest({ assignedGroup: '@myGroups' })).valid).toBe(true)
	})

	it('accepts @myTeam on a group field', () => {
		expect(validateManifestV2(manifest({ assignedGroup: '@myTeam' })).valid).toBe(true)
	})

	it('accepts @monthEnd and @nextMonthStart in operator form', () => {
		expect(validateManifestV2(manifest({ expectedCloseDate: { gte: '@monthStart', lte: '@monthEnd' } })).valid).toBe(true)
		expect(validateManifestV2(manifest({ expectedCloseDate: { gte: '@monthStart', lt: '@nextMonthStart' } })).valid).toBe(true)
	})

	it('refuses a token outside the vocabulary', () => {
		expect(validateManifestV2(manifest({ expectedCloseDate: { lte: '@endOfMonth' } })).valid).toBe(false)
	})
})
