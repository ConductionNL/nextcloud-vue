/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSettingsFormWidget — the `settings-form` widget (abstract-settings-form).
 *
 * Guarded: the registered type is content-only; values come from the object;
 * a save PATCHes only the changed fields, against the LAST SAVED values (an
 * edit back to the loaded value after a save is a change); numbers go out as
 * numbers and empty as null; required, pattern and number range refuse before
 * any write; a refused PATCH shows the server's words; readOnly hides save.
 */
var mockPatch = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { patch: (...args) => mockPatch(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnSettingsFormWidget/index.js'

const CnSettingsFormWidget = require('../../src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const OBJECT_URL = '/index.php/apps/openregister/api/objects/portaliq/portal/p-1'

const CONTENT = {
	fields: [
		{ key: 'title', label: 'Name', required: true },
		{ key: 'slug', label: 'Address', pattern: '^[a-z0-9-]+$', patternMessage: 'Lowercase only.', hint: 'Pages belong to the portal through this.' },
		{ key: 'kind', label: 'Kind', type: 'select', options: [{ value: 'site', label: 'Site' }, { value: 'portal', label: 'Portal' }] },
		{ key: 'note', label: 'Note', type: 'textarea' },
		{ key: 'limit', label: 'Limit', type: 'number', min: 0, max: 100 },
		{ key: 'open', label: 'Open', type: 'switch' },
	],
}

const OBJECT = { id: 'p-1', title: 'Zuiddrecht', slug: 'zuiddrecht', kind: 'site', note: '', limit: 10, open: false }

function make(props = {}) {
	return mount(CnSettingsFormWidget, {
		props: { content: CONTENT, objectData: OBJECT, objectId: 'p-1', register: 'portaliq', schema: 'portal', ...props },
		global: { stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' }, NcCheckboxRadioSwitch: { props: ['modelValue'], template: '<label class="sw"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>' } } },
	})
}

describe('CnSettingsFormWidget', () => {
	beforeEach(() => {
		mockPatch.mockReset()
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...OBJECT, ...body } }))
	})

	test('is registered as a content-only detail widget', () => {
		expect(getWidgetTypeEntry('settings-form')).toBeTruthy()
		expect(isContentOnlyWidgetDef({ type: 'settings-form' })).toBe(true)
	})

	test('draws a framed control and its hint per field from the object', () => {
		const wrapper = make()
		expect(wrapper.find('[data-testid="cn-settings-form-field-title"] input').element.value).toBe('Zuiddrecht')
		expect(wrapper.find('[data-testid="cn-settings-form-field-kind"] select').element.value).toBe('site')
		expect(wrapper.find('[data-testid="cn-settings-form-field-slug"] .cn-settings-form__hint').text()).toBe('Pages belong to the portal through this.')
		expect(wrapper.find('[data-testid="cn-settings-form-field-note"]').classes()).toContain('cn-settings-form__field--wide')
		expect(wrapper.find('.cn-settings-form__grid').classes()).toContain('cn-settings-form__grid--2')
		expect(make({ content: { ...CONTENT, columns: 1 } }).find('.cn-settings-form__grid').classes()).toContain('cn-settings-form__grid--1')
	})

	test('a save PATCHes only the changed fields', async () => {
		const wrapper = make()
		await wrapper.find('[data-testid="cn-settings-form-field-title"] input').setValue('Gemeente Zuiddrecht')
		await wrapper.find('[data-testid="cn-settings-form-field-limit"] input').setValue('25')
		await wrapper.find('[data-testid="cn-settings-form-field-open"] input').setValue(true)
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { title: 'Gemeente Zuiddrecht', limit: 25, open: true })
	})

	test('nothing changed writes nothing', async () => {
		const wrapper = make()
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(mockPatch).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-settings-form-notice"]').text()).toBe('Saved.')
	})

	test('compares against the last SAVED values: editing back to the loaded value after a save is a change', async () => {
		const wrapper = make()
		const title = wrapper.find('[data-testid="cn-settings-form-field-title"] input')
		await title.setValue('Changed')
		await wrapper.find('form').trigger('submit')
		await flush()
		await title.setValue('Zuiddrecht')
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(2)
		expect(mockPatch.mock.calls[1][1]).toEqual({ title: 'Zuiddrecht' })
	})

	test('an empty number goes out as null', async () => {
		const wrapper = make()
		await wrapper.find('[data-testid="cn-settings-form-field-limit"] input').setValue('')
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { limit: null })
	})

	test('required, pattern and number range refuse before any write', async () => {
		const wrapper = make()
		await wrapper.find('[data-testid="cn-settings-form-field-title"] input').setValue('')
		await wrapper.find('[data-testid="cn-settings-form-field-slug"] input').setValue('Not Valid')
		await wrapper.find('[data-testid="cn-settings-form-field-limit"] input').setValue('500')
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(mockPatch).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-settings-form-field-title"] .cn-settings-form__error').text()).toBe('Fill this in.')
		expect(wrapper.find('[data-testid="cn-settings-form-field-slug"] .cn-settings-form__error').text()).toBe('Lowercase only.')
		expect(wrapper.find('[data-testid="cn-settings-form-field-limit"] .cn-settings-form__error').exists()).toBe(true)
	})

	test('a refused PATCH shows the server words and keeps the typed value', async () => {
		mockPatch.mockRejectedValue({ response: { data: { error: 'Not allowed.' } } })
		const wrapper = make()
		const title = wrapper.find('[data-testid="cn-settings-form-field-title"] input')
		await title.setValue('X')
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(wrapper.find('[data-testid="cn-settings-form-notice"]').text()).toBe('Not allowed.')
		expect(title.element.value).toBe('X')
	})

	test('readOnly has no save button and no write', () => {
		const wrapper = make({ content: { ...CONTENT, readOnly: true } })
		expect(wrapper.find('[data-testid="cn-settings-form-save"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-settings-form-field-title"] input').attributes('readonly')).toBeDefined()
	})

	test('labels go through cnTranslate', () => {
		const wrapper = mount(CnSettingsFormWidget, {
			props: { content: CONTENT, objectData: OBJECT, objectId: 'p-1', register: 'portaliq', schema: 'portal' },
			global: { provide: { cnTranslate: (key) => `NL ${key}` }, stubs: { NcNoteCard: true, NcCheckboxRadioSwitch: true } },
		})
		expect(wrapper.find('[data-testid="cn-settings-form-field-title"] label').text()).toBe('NL Name')
		expect(wrapper.find('[data-testid="cn-settings-form-save"]').text()).toBe('NL Save')
	})
})
