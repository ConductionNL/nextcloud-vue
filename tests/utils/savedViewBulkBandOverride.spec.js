/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view can turn the idle bulk band off: DqTeamwachtrij and
 * DqAanMijToegewezen are views of a case list that draws the band before a
 * selection, and their boards draw none until rows are selected.
 *
 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-view-can-override-the-page-config-while-it-is-active
 */
import Ajv from 'ajv'
import schema from '../../src/schemas/app-manifest-v2.schema.json'
import { applySavedViewOverrides, savedViewOverrides } from '../../src/utils/savedViewOverrides.js'

describe('bulkBandAlways in a saved view', () => {
	it('is a key a view may override', () => {
		const overrides = savedViewOverrides({ overrides: { bulkBandAlways: false } })
		expect(overrides).toEqual({ bulkBandAlways: false })
		expect(applySavedViewOverrides({ bulkBandAlways: true, title: 'Cases' }, overrides)).toEqual({ bulkBandAlways: false, title: 'Cases' })
	})

	it('passes the manifest schema in a default view', () => {
		const ajv = new Ajv({ allErrors: true, strict: false })
		const overridesSchema = schema.$defs.page.properties.config.properties.defaultSavedViews.items.properties.overrides
		const validate = ajv.compile({ ...overridesSchema, $defs: schema.$defs })
		expect(validate({ bulkBandAlways: false })).toBe(true)
		expect(validate({ bulkBandAlways: 'no' })).toBe(false)
	})
})
