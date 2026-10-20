/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Pills and menu entries take their tone and icon from the record they point at.
 *
 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-pill-takes-its-tone-and-icon-from-the-referenced-record
 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-saved-view-s-icon-shows-in-the-my-views-menu
 */
import { pillLook } from '../../src/utils/detailActionModel.js'
import { variantForColor } from '../../src/utils/headerFieldChips.js'
import { normalizeSavedViewMenu, syncSavedViewMenu, toggleSavedViewMenuEntry, withSavedViewMenu } from '../../src/utils/savedViewMenu.js'

describe('variantForColor', () => {
	it.each([
		['blue', 'info'],
		['blue-light', 'info'],
		['green', 'success'],
		['green-light', 'success'],
		['orange', 'warning'],
		['orange-light', 'warning'],
		['red', 'error'],
		['red-light', 'error'],
		['purple', 'purple'],
		['purple-light', 'purple'],
		['teal', 'teal'],
		['teal-light', 'teal'],
		['grey', 'default'],
		['grey-light', 'default'],
	])('maps the NL Design System hue %s onto %s', (hue, variant) => {
		expect(variantForColor(hue)).toBe(variant)
	})

	it('keeps the badge roles and makes anything else neutral', () => {
		expect(variantForColor('warning')).toBe('warning')
		expect(variantForColor('magenta')).toBe('default')
		expect(variantForColor(null)).toBe('default')
	})
})

describe('pillLook', () => {
	it('lays the colour tone over the declared variant and colour map, with the icon', () => {
		expect(pillLook({ color: 'red', icon: 'FileDocumentOutline' })).toEqual({ variant: 'error', colorMap: null, icon: 'FileDocumentOutline' })
	})

	it('leaves the pill as declared without a colour or an icon', () => {
		expect(pillLook({ color: null, icon: null })).toEqual({})
		expect(pillLook(undefined)).toEqual({})
		expect(pillLook({ icon: 'Gavel' })).toEqual({ icon: 'Gavel' })
	})
})

describe('saved view menu icons', () => {
	it('keeps an entry icon and shows it in the menu', () => {
		const entries = toggleSavedViewMenuEntry([], { id: 'case-type-1', page: 'Cases', name: 'Bezwaar', icon: 'Gavel' })
		expect(entries).toEqual([{ id: 'case-type-1', page: 'Cases', name: 'Bezwaar', icon: 'Gavel' }])
		const menu = withSavedViewMenu([{ id: 'cases', label: 'Cases', route: 'Cases' }], entries)
		expect(menu.find((item) => item.label === 'Bezwaar').icon).toBe('Gavel')
	})

	it('falls back to the filter icon', () => {
		const menu = withSavedViewMenu([], normalizeSavedViewMenu([{ id: 'v', page: 'Cases', name: 'Mine' }]))
		expect(menu.find((item) => item.label === 'Mine').icon).toBe('FilterOutline')
	})

	it('takes a view icon on sync', () => {
		const out = syncSavedViewMenu([{ id: 'v', page: 'Cases', name: 'Old' }], 'Cases', [{ id: 'v', name: 'New', icon: 'Gavel' }])
		expect(out).toEqual([{ id: 'v', page: 'Cases', name: 'New', icon: 'Gavel' }])
	})
})
