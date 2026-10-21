/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * labelsByField: label records matched on a field other than their id.
 *
 * @spec openspec/changes/quick-filters-from-value-field/specs/index-page/spec.md#requirement-quick-filter-tabs-can-name-a-record-matched-on-another-field
 */
import { labelsByField } from '../../src/utils/labelsByField.js'

jest.mock('@nextcloud/router', () => ({
	generateUrl: (path, params = {}) => `/index.php${path.replace(/\{(\w+)\}/g, (_, key) => params[key])}`,
}))

const PORTALS = [
	{ id: 'p-1', slug: 'zuiddrecht', title: 'Gemeente Zuiddrecht' },
	{ id: 'p-2', slug: 'mijn-zuiddrecht', title: 'Mijn Zuiddrecht' },
	{ id: 'p-3', slug: 'other', title: 'Not asked for' },
]

describe('labelsByField', () => {
	it('asks once for the values as an IN list and labels each by its record', async () => {
		const get = jest.fn().mockResolvedValue({ data: { results: PORTALS } })
		const labels = await labelsByField({ register: 'portaliq', schema: 'portal', field: 'slug', values: ['zuiddrecht', 'mijn-zuiddrecht', 'zuiddrecht'] }, get)
		expect(get).toHaveBeenCalledTimes(1)
		expect(get).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/portaliq/portal', { params: { slug: ['zuiddrecht', 'mijn-zuiddrecht'], _limit: 2 } })
		expect(labels).toEqual({ zuiddrecht: 'Gemeente Zuiddrecht', 'mijn-zuiddrecht': 'Mijn Zuiddrecht' })
	})

	it('reads the named label field and leaves out a value no record carries', async () => {
		const get = jest.fn().mockResolvedValue({ data: { results: [{ slug: 'zuiddrecht', title: 'T', meta: { name: 'Zuiddrecht' } }] } })
		expect(await labelsByField({ register: 'r', schema: 's', field: 'slug', values: ['zuiddrecht', 'gone'], labelField: 'meta.name' }, get)).toEqual({ zuiddrecht: 'Zuiddrecht' })
	})

	it('answers nothing, without a request, when there is nothing to ask, and nothing after a failure', async () => {
		const get = jest.fn().mockRejectedValue(new Error('500'))
		expect(await labelsByField({ register: 'r', schema: 's', field: 'slug', values: [] }, get)).toEqual({})
		expect(await labelsByField({ register: 'r', schema: 's', values: ['a'] }, get)).toEqual({})
		expect(get).not.toHaveBeenCalled()
		expect(await labelsByField({ register: 'r', schema: 's', field: 'slug', values: ['a'] }, get)).toEqual({})
	})
})
