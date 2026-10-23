/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view can drop its page's count line: DqAanMijToegewezen is a view
 * of the case list whose note after the breadcrumb already says how many
 * cases there are ("7 zaken op uw naam"), so it sets `countSubtitle: null`
 * and `countText: ""` and no "0 van 0 lopende zaken" line follows.
 *
 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-view-can-override-the-page-config-while-it-is-active
 */
import Ajv from 'ajv'
import schema from '../../src/schemas/app-manifest-v2.schema.json'
import { applySavedViewOverrides, savedViewOverrides } from '../../src/utils/savedViewOverrides.js'

describe('the count line in a saved view', () => {
	it('lets a view override countSubtitle', () => {
		const overrides = savedViewOverrides({ overrides: { countSubtitle: null, countText: '' } })
		expect(overrides).toEqual({ countSubtitle: null, countText: '' })
		expect(applySavedViewOverrides({ countSubtitle: '{total} cases', countText: '{shown} of {total}' }, overrides)).toEqual({ countSubtitle: null, countText: '' })
	})

	it('passes the manifest schema in a default view', () => {
		const overridesSchema = schema.$defs.page.properties.config.properties.defaultSavedViews.items.properties.overrides
		const validate = new Ajv({ allErrors: true, strict: false }).compile({ ...overridesSchema, $defs: schema.$defs })
		expect(validate({ countSubtitle: null, countText: '' })).toBe(true)
		expect(validate({ countSubtitle: '{total} cases' })).toBe(true)
		expect(validate({ countSubtitle: 3 })).toBe(false)
	})
})
