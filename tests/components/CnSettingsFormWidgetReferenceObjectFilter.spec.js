/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings-form `reference` field's `filter` can name the record the form
 * edits: `@objectId` and `@object.<field>`, so the logo list is the logos of
 * this portal. Until the record has the value the list is not read.
 *
 * @spec openspec/changes/screens-settings-form-reference-object-filter/specs/settings-form/spec.md#requirement-a-reference-fields-filter-can-name-the-record-being-edited
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args), patch: (...args) => mockPatch(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { mount } from '@vue/test-utils'

const CnSettingsFormWidget = require('../../src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const FIELD = { key: 'logo', label: 'Logo', type: 'reference', register: 'portaliq', schema: 'asset', labelField: 'name', valueTemplate: 'openregister://{register}/{schema}/{id}', filter: { kind: 'logo' } }
const SELECT = '[data-testid="cn-settings-form-reference-logo"]'

async function make(field = FIELD, object = { id: 'p-1', logo: '' }) {
	const w = mount(CnSettingsFormWidget, {
		props: { content: { fields: [field] }, objectData: object, objectId: 'p-1', register: 'portaliq', schema: 'portal' },
		global: { stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' } } },
	})
	await flush()
	await flush()
	await flush()
	return w
}

describe('CnSettingsFormWidget reference field: a filter on the record being edited', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockGet.mockResolvedValue({ data: { results: [{ id: 'a-1', name: 'Wapen' }] } })
	})

	it('resolves @objectId and @object.<field> from the record', async () => {
		await make({ ...FIELD, filter: { kind: 'logo', portal: '@objectId', organisation: '@object.organisation' } }, { id: 'p-1', logo: '', organisation: 'org-7' })
		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(mockGet.mock.calls[0][1].params).toEqual({ kind: 'logo', portal: 'p-1', organisation: 'org-7', _limit: 100 })
	})

	it('does not read while the record has no value for the token, and reads once it has', async () => {
		const w = await make({ ...FIELD, filter: { organisation: '@object.organisation' } }, { id: 'p-1', logo: '' })
		expect(mockGet).not.toHaveBeenCalled()
		await w.setProps({ objectData: { id: 'p-1', logo: '', organisation: 'org-7' } })
		await flush()
		await flush()
		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(mockGet.mock.calls[0][1].params).toEqual({ organisation: 'org-7', _limit: 100 })
		expect(w.findAll(`${SELECT} option`).map((o) => o.text())).toEqual(['None', 'Wapen'])
	})

	it('reads again only when the record changes the query', async () => {
		const w = await make({ ...FIELD, filter: { organisation: '@object.organisation' } }, { id: 'p-1', logo: '', organisation: 'org-7' })
		expect(mockGet).toHaveBeenCalledTimes(1)
		await w.setProps({ objectData: { id: 'p-1', logo: 'a-1', organisation: 'org-7' } })
		await flush()
		expect(mockGet).toHaveBeenCalledTimes(1)
		await w.setProps({ objectData: { id: 'p-1', logo: 'a-1', organisation: 'org-8' } })
		await flush()
		expect(mockGet).toHaveBeenCalledTimes(2)
		expect(mockGet.mock.calls[1][1].params).toEqual({ organisation: 'org-8', _limit: 100 })
	})

	it('reads a filter without tokens once, as before', async () => {
		const w = await make()
		await w.setProps({ objectData: { id: 'p-1', logo: 'a-1' } })
		await flush()
		expect(mockGet).toHaveBeenCalledTimes(1)
	})
})
