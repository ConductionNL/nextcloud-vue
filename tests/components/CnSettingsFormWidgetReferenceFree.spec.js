/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings-form `reference` field with `free: true` also takes a typed value
 * (a URL) besides picking an object, so portaliq's logo can still be any URL.
 *
 * @spec openspec/changes/screens-settings-form-reference-free-value/specs/settings-form/spec.md#requirement-a-reference-field-can-also-take-a-typed-value
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

const FREE = { ...FIELD, free: true, freeLabel: 'Or a URL', freePattern: '^https://', freePatternMessage: 'Use an https address.' }
const TYPED = '[data-testid="cn-settings-form-reference-free-logo"]'

describe('CnSettingsFormWidget reference field: a typed value', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockGet.mockResolvedValue({ data: { results: [{ id: 'a-1', name: 'Wapen' }] } })
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { id: 'p-1', ...body } }))
	})

	it('has no typed input without free', async () => {
		const w = await make()
		expect(w.find(TYPED).exists()).toBe(false)
	})

	it('shows a stored URL in the typed input, labelled, and empty when an object is picked', async () => {
		const w = await make(FREE, { id: 'p-1', logo: 'https://example.nl/logo.svg' })
		expect(w.find(TYPED).element.value).toBe('https://example.nl/logo.svg')
		const id = w.find(TYPED).attributes('id')
		expect(w.find(`label[for="${id}"]`).text()).toBe('Or a URL')
		await w.find(SELECT).setValue('openregister://portaliq/asset/a-1')
		expect(w.find(TYPED).element.value).toBe('')
	})

	it('saves a typed URL in the one Save', async () => {
		const w = await make(FREE)
		await w.find(TYPED).setValue('  https://example.nl/new.svg ')
		expect(w.find(SELECT).element.value).toBe('https://example.nl/new.svg')
		await w.find('form').trigger('submit')
		await flush()
		expect(mockPatch.mock.calls[0][1]).toEqual({ logo: 'https://example.nl/new.svg' })
	})

	it('refuses a typed value that does not match freePattern, but not a picked object', async () => {
		const w = await make(FREE)
		await w.find(TYPED).setValue('http://insecure.example/logo.svg')
		await w.find('form').trigger('submit')
		await flush()
		expect(mockPatch).not.toHaveBeenCalled()
		expect(w.find('.cn-settings-form__error').text()).toBe('Use an https address.')
		await w.find(SELECT).setValue('openregister://portaliq/asset/a-1')
		await w.find('form').trigger('submit')
		await flush()
		expect(mockPatch.mock.calls[0][1]).toEqual({ logo: 'openregister://portaliq/asset/a-1' })
	})
})
