/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings-form field of type `reference`: the person picks an object of a
 * configured register and schema, and the form stores its reference in the
 * configured format, in the form's one Save.
 *
 * @spec openspec/changes/screens-settings-form-reference/specs/settings-form/spec.md#requirement-a-settings-form-field-can-pick-an-object
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

describe('CnSettingsFormWidget reference field', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockGet.mockResolvedValue({ data: { results: [{ id: 'a-1', name: 'Wapen' }, { id: 'a-2', name: 'Woordmerk' }, { name: 'No id' }] } })
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { id: 'p-1', ...body } }))
	})

	it('reads the objects of the configured register and schema, with the filter', async () => {
		const w = await make()
		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(mockGet.mock.calls[0][0]).toBe('/index.php/apps/openregister/api/objects/portaliq/asset')
		expect(mockGet.mock.calls[0][1].params).toEqual({ kind: 'logo', _limit: 100 })
		expect(w.findAll(`${SELECT} option`).map((o) => o.text())).toEqual(['None', 'Wapen', 'Woordmerk'])
	})

	it('stores the reference in the configured format, in the one Save', async () => {
		const w = await make()
		await w.find(SELECT).setValue('openregister://portaliq/asset/a-2')
		expect(mockPatch).not.toHaveBeenCalled()
		await w.find('form').trigger('submit')
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch.mock.calls[0][1]).toEqual({ logo: 'openregister://portaliq/asset/a-2' })
	})

	it('stores the id without a valueTemplate, and null for "None"', async () => {
		const w = await make({ ...FIELD, valueTemplate: undefined }, { id: 'p-1', logo: 'a-1' })
		expect(w.find(SELECT).element.value).toBe('a-1')
		await w.find(SELECT).setValue('')
		await w.find('form').trigger('submit')
		await flush()
		expect(mockPatch.mock.calls[0][1]).toEqual({ logo: null })
	})

	it('keeps a stored value that is not one of the objects (a free URL) selectable', async () => {
		const w = await make(FIELD, { id: 'p-1', logo: 'https://example.nl/logo.svg' })
		expect(w.findAll(`${SELECT} option`).map((o) => o.text())).toEqual(['None', 'https://example.nl/logo.svg', 'Wapen', 'Woordmerk'])
		expect(w.find(SELECT).element.value).toBe('https://example.nl/logo.svg')
		await w.find('form').trigger('submit')
		await flush()
		expect(mockPatch).not.toHaveBeenCalled()
	})

	it('a required field has no "None", and a failed read says so and keeps the stored value', async () => {
		const required = await make({ ...FIELD, required: true })
		expect(required.findAll(`${SELECT} option`).map((o) => o.text())).toEqual(['Wapen', 'Woordmerk'])
		mockGet.mockRejectedValue(new Error('boom'))
		const failed = await make(FIELD, { id: 'p-1', logo: 'a-9' })
		expect(failed.find('.cn-settings-form__error').text()).toBe('The list to choose from could not be loaded.')
		expect(failed.find(SELECT).element.value).toBe('a-9')
	})
})
