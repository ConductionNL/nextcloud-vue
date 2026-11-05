/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * detail-parent-crumb in the manifest schema: a crumb can name the record's
 * parent (`parent`, `labelField`, `param`) instead of a label.
 *
 * @spec openspec/changes/detail-parent-crumb/specs/detail-page/spec.md#requirement-a-sub-record-trail-can-show-its-parent-record
 */
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * @param {Array<object>} breadcrumb The detail page's crumbs.
 * @return {object} A minimal manifest.
 */
function manifestWith(breadcrumb) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '1.0.0',
		menu: [{ id: 'cases', label: 'Cases', route: 'cases', order: 10 }],
		pages: [{
			id: 'case',
			route: '/cases/:id',
			type: 'detail',
			title: 'Case',
			config: {
				register: 'app',
				schema: 'case',
				visibilityContext: { parentCase: { field: 'parentCase', register: 'app', schema: 'case' } },
				breadcrumb,
			},
		}],
	}
}

describe('the manifest schema: a parent crumb', () => {
	it('accepts a crumb that names the parent instead of a label', () => {
		const result = validateManifest(manifestWith([
			{ label: 'All cases', route: 'Cases', currentField: 'identifier', separator: '/' },
			{ parent: 'parentCase', labelField: 'identifier', route: 'CaseDetail', param: 'id' },
		]))
		expect(result.errors).toEqual([])
	})

	it('refuses a crumb with neither a label nor a parent', () => {
		expect(validateManifest(manifestWith([{ route: 'Cases' }])).valid).toBe(false)
	})
})
