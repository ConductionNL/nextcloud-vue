/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page's `rowTitle` takes every title look CnDataTable draws:
 * `link`, `plain`, `text` and `strong`. The portaliq boards draw a list's
 * title column as a 14px name in the main ink (PtInzendingen, PtNieuws:
 * `strong`) or as an ordinary cell (PtAanvraagformulieren: `text`).
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const V2_SCHEMA_URL = 'https://github.com/ConductionNL/nextcloud-vue/raw/main/src/schemas/app-manifest-v2.schema.json'

function indexManifest(rowTitle) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'Submissions', route: '/submissions', type: 'index', title: 'Submissions', config: { register: 'r', schema: 's', rowTitle } }],
	}
}

describe('CnIndexPage rowTitle looks', () => {
	it.each(['link', 'plain', 'text', 'strong'])('the prop accepts %s', (value) => {
		expect(CnIndexPage.props.rowTitle.validator(value)).toBe(true)
	})

	it('the prop refuses an unknown look', () => {
		expect(CnIndexPage.props.rowTitle.validator('bold')).toBe(false)
	})

	it.each(['link', 'plain', 'text', 'strong'])('the manifest schema accepts index rowTitle %s', (value) => {
		expect(validateManifestV2(indexManifest(value)).valid).toBe(true)
	})

	it('the manifest schema refuses an unknown index rowTitle', () => {
		expect(validateManifestV2(indexManifest('bold')).valid).toBe(false)
	})
})
