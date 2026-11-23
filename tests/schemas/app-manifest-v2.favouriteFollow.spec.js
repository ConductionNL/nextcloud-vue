/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/record-favourite-and-follow/tasks.md#task-3
 */
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

function manifest(type, config) {
	return {
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '1.0.0',
		menu: [],
		pages: [{ id: 'p', route: '/p', type, title: 'P', config }],
	}
}

describe('manifest keys favourite, follow, showFavouriteColumn, personalLenses', () => {
	it('accepts them with their types', () => {
		expect(validateManifestV2(manifest('detail', { register: 'r', schema: 's', favourite: false, follow: true })).valid).toBe(true)
		expect(validateManifestV2(manifest('index', { register: 'r', schema: 's', showFavouriteColumn: true, personalLenses: ['favourite', 'recent', 'watching'] })).valid).toBe(true)
		expect(validateManifestV2(manifest('index', { register: 'r', schema: 's', showFollowColumn: true, personalLenses: ['watching'] })).valid).toBe(true)
	})

	it('refuses a wrong type, naming the key', () => {
		const result = validateManifestV2(manifest('detail', { register: 'r', schema: 's', follow: 'yes' }))
		expect(result.valid).toBe(false)
		expect(JSON.stringify(result.errors)).toContain('follow')
	})

	it('accepts markRead and the unread lens, and refuses a non-boolean markRead', () => {
		expect(validateManifestV2(manifest('detail', { register: 'r', schema: 's', markRead: false })).valid).toBe(true)
		expect(validateManifestV2(manifest('index', { register: 'r', schema: 's', personalLenses: ['unread'] })).valid).toBe(true)
		expect(validateManifestV2(manifest('detail', { register: 'r', schema: 's', markRead: 'no' })).valid).toBe(false)
	})

	it('refuses an unknown lens', () => {
		expect(validateManifestV2(manifest('index', { register: 'r', schema: 's', personalLenses: ['unread-ish'] })).valid).toBe(false)
	})
})
