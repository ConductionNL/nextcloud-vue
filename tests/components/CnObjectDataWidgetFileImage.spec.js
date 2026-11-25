// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget image rows: an OpenRegister file property holds the file
 * object, and the row shows the file's URL instead of `src="[object Object]"`
 * (larpinq map page, 25 Nov 2026).
 *
 * @spec openspec/changes/data-widget-file-image/specs/data-widget/spec.md
 */

import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const DOWNLOAD = '/index.php/apps/openregister/api/files/122/download'

function widget(schema, objectData) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema, objectData },
		mocks: { t: (app, s) => s },
	})
}

describe('data widget image rows', () => {
	it('shows a file property by its download URL', () => {
		const w = widget(
			{ properties: { image: { type: 'file', title: 'Map image' } } },
			{ image: { id: 122, downloadUrl: DOWNLOAD, accessUrl: '/s/abc' } },
		)
		const img = w.find('img.cn-object-data-widget__image')
		expect(img.exists()).toBe(true)
		expect(img.attributes('src')).toBe(DOWNLOAD)
	})

	it('takes the first file of a list', () => {
		const w = widget(
			{ properties: { photo: { type: 'array', items: { type: 'file' } } } },
			{ photo: [{ accessUrl: '/s/first' }, { accessUrl: '/s/second' }] },
		)
		expect(w.find('img.cn-object-data-widget__image').attributes('src')).toBe('/s/first')
	})

	it('keeps a picture stored as a URL', () => {
		const w = widget(
			{ properties: { photo: { type: 'string' } } },
			{ photo: 'https://example.org/a.png' },
		)
		expect(w.find('img.cn-object-data-widget__image').attributes('src')).toBe('https://example.org/a.png')
	})

	it('renders no image for a file object without a URL', () => {
		const w = widget(
			{ properties: { image: { type: 'file' } } },
			{ image: { id: 122 } },
		)
		expect(w.find('img.cn-object-data-widget__image').exists()).toBe(false)
		expect(w.findAll('img').filter((img) => img.attributes('src') === '[object Object]')).toHaveLength(0)
	})
})
