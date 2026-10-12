/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSettingsFormWidget, `file` field type (abstract-settings-form-file).
 *
 * Guarded: the field shows the stored file's name (or the placeholder); the
 * button opens Nextcloud's file picker with the configured mime filter and start
 * folder; the picked node fills `valueTemplate`; the change goes out in the
 * form's one PATCH; remove empties the value (sent as null); closing the picker
 * changes nothing.
 */
var mockPatch = jest.fn()
var mockPickNodes = jest.fn()
var mockBuilder

class MockFilePickerClosed extends Error {}

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { patch: (...args) => mockPatch(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	FilePickerClosed: MockFilePickerClosed,
	getFilePickerBuilder: (...args) => {
		mockBuilder.title = args[0]
		return mockBuilder
	},
}))

import { mount } from '@vue/test-utils'

const CnSettingsFormWidget = require('../../src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const OBJECT_URL = '/index.php/apps/openregister/api/objects/portaliq/portal/p-1'

const CONTENT = {
	fields: [
		{
			key: 'logo',
			label: 'Logo',
			type: 'file',
			placeholder: 'No logo',
			chooseLabel: 'Choose a logo from Media',
			picker: { title: 'Choose a logo', mimeTypes: ['image/svg+xml', 'image/png'], startAt: '/Media', valueTemplate: 'media:{fileid}:{name}' },
		},
	],
}

function make(object = { id: 'p-1', logo: '/Media/logo-zuiddrecht.svg' }) {
	return mount(CnSettingsFormWidget, {
		props: { content: CONTENT, objectData: object, objectId: 'p-1', register: 'portaliq', schema: 'portal' },
		global: { stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' }, NcButton: { emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' } } },
	})
}

describe('CnSettingsFormWidget file field', () => {
	beforeEach(() => {
		mockPatch.mockReset()
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: body }))
		mockPickNodes.mockReset()
		mockBuilder = {
			setMultiSelect: jest.fn(() => mockBuilder),
			allowDirectories: jest.fn(() => mockBuilder),
			startAt: jest.fn(() => mockBuilder),
			addButton: jest.fn(() => mockBuilder),
			setMimeTypeFilter: jest.fn(() => mockBuilder),
			build: jest.fn(() => ({ pickNodes: mockPickNodes })),
		}
	})

	test('shows the stored file name, or the placeholder, with the configured button label', () => {
		expect(make().find('.cn-settings-form__control--file').text()).toBe('logo-zuiddrecht.svg')
		const empty = make({ id: 'p-1', logo: '' })
		expect(empty.find('.cn-settings-form__control--file').text()).toBe('No logo')
		expect(empty.find('[data-testid="cn-settings-form-choose-logo"]').text()).toBe('Choose a logo from Media')
		expect(empty.find('[data-testid="cn-settings-form-clear-logo"]').exists()).toBe(false)
	})

	test('the button opens the picker with the mime filter and start folder; the node fills the template', async () => {
		mockPickNodes.mockResolvedValue([{ path: '/Media/nieuw.png', fileid: 4711, basename: 'nieuw.png' }])
		const wrapper = make()
		await wrapper.find('[data-testid="cn-settings-form-choose-logo"]').trigger('click')
		await flush()
		expect(mockBuilder.title).toBe('Choose a logo')
		expect(mockBuilder.setMimeTypeFilter).toHaveBeenCalledWith(['image/svg+xml', 'image/png'])
		expect(mockBuilder.startAt).toHaveBeenCalledWith('/Media')
		expect(mockBuilder.allowDirectories).toHaveBeenCalledWith(false)
		expect(wrapper.find('.cn-settings-form__control--file').text()).toBe('media:4711:nieuw.png')
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { logo: 'media:4711:nieuw.png' })
	})

	test('without a template the path is the value', async () => {
		mockPickNodes.mockResolvedValue([{ path: '/Media/a.png', fileid: 1 }])
		const wrapper = mount(CnSettingsFormWidget, {
			props: { content: { fields: [{ key: 'logo', label: 'Logo', type: 'file' }] }, objectData: { id: 'p-1' }, objectId: 'p-1', register: 'portaliq', schema: 'portal' },
			global: { stubs: { NcNoteCard: true, NcButton: { emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' } } },
		})
		await wrapper.find('[data-testid="cn-settings-form-choose-logo"]').trigger('click')
		await flush()
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { logo: '/Media/a.png' })
	})

	test('remove empties the value and the PATCH carries null', async () => {
		const wrapper = make()
		await wrapper.find('[data-testid="cn-settings-form-clear-logo"]').trigger('click')
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { logo: null })
	})

	test('closing the picker changes nothing and shows no error', async () => {
		mockPickNodes.mockRejectedValue(new MockFilePickerClosed('closed'))
		const wrapper = make()
		await wrapper.find('[data-testid="cn-settings-form-choose-logo"]').trigger('click')
		await flush()
		expect(wrapper.find('.cn-settings-form__control--file').text()).toBe('logo-zuiddrecht.svg')
		expect(wrapper.find('[data-testid="cn-settings-form-notice"]').exists()).toBe(false)
	})

	test('a picker that fails to open says so', async () => {
		mockPickNodes.mockRejectedValue(new Error('chunk failed'))
		const wrapper = make()
		await wrapper.find('[data-testid="cn-settings-form-choose-logo"]').trigger('click')
		await flush()
		expect(wrapper.find('[data-testid="cn-settings-form-notice"]').text()).toBe('The file picker could not be opened.')
	})
})
