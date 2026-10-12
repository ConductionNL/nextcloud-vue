/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChipsFieldWidget — the `chips-field` widget (abstract-chips-field).
 *
 * Guarded: registered content-only; a chip per stored string; adding trims,
 * lowercases on request, checks the pattern and refuses a duplicate BEFORE any
 * write, then PATCHes the full new list of that one field; removing PATCHes the
 * list without the entry; a refused PATCH shows the server's words and keeps the
 * chips; `options` turns the add input into a choice of the remaining ones.
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

import '../../src/components/CnChipsFieldWidget/index.js'

const CnChipsFieldWidget = require('../../src/components/CnChipsFieldWidget/CnChipsFieldWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const OBJECT_URL = '/index.php/apps/openregister/api/objects/portaliq/portal/p-1'

const CONTENT = {
	field: 'domains',
	label: 'Without approval for these domains',
	addLabel: 'Domain',
	lowercase: true,
	pattern: '^[a-z0-9-]+(\\.[a-z0-9-]+)+$',
	patternMessage: 'This is not a domain.',
}
const OBJECT = { id: 'p-1', domains: ['zuiddrecht.nl', 'oosthaven.nl'] }

function make(props = {}) {
	return mount(CnChipsFieldWidget, {
		props: { content: CONTENT, objectData: OBJECT, objectId: 'p-1', register: 'portaliq', schema: 'portal', ...props },
		global: { stubs: { NcButton: { template: '<button><slot /></button>' } } },
	})
}

async function addValue(wrapper, value) {
	await wrapper.find('[data-testid="cn-chips-field-add"]').trigger('click')
	await wrapper.find('[data-testid="cn-chips-field-input"]').setValue(value)
	await wrapper.find('form').trigger('submit')
	await flush()
}

describe('CnChipsFieldWidget', () => {
	beforeEach(() => {
		mockPatch.mockReset()
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...OBJECT, ...body } }))
	})

	test('is registered as a content-only detail widget', () => {
		expect(getWidgetTypeEntry('chips-field')).toBeTruthy()
		expect(isContentOnlyWidgetDef({ type: 'chips-field' })).toBe(true)
	})

	test('a chip per stored string, the label and an add chip', () => {
		const wrapper = make()
		expect(wrapper.findAll('.cn-chips-field__chip')).toHaveLength(2)
		expect(wrapper.find('.cn-chips-field__label').text()).toBe('Without approval for these domains')
		expect(wrapper.find('[data-testid="cn-chips-field-add"]').text()).toBe('+ Domain')
	})

	test('adding trims and lowercases, then PATCHes the full list of that field', async () => {
		const wrapper = make()
		await addValue(wrapper, '  Nieuw-Stad.NL ')
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { domains: ['zuiddrecht.nl', 'oosthaven.nl', 'nieuw-stad.nl'] })
		expect(wrapper.findAll('.cn-chips-field__chip')).toHaveLength(3)
		expect(wrapper.find('[data-testid="cn-chips-field-input"]').exists()).toBe(false)
	})

	test('a value that fails the pattern is refused before any write', async () => {
		const wrapper = make()
		await addValue(wrapper, 'geen domein')
		expect(mockPatch).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-chips-field-error"]').text()).toBe('This is not a domain.')
	})

	test('a duplicate and an empty value are refused before any write', async () => {
		const wrapper = make()
		await addValue(wrapper, 'ZUIDDRECHT.nl')
		expect(wrapper.find('[data-testid="cn-chips-field-error"]').text()).toBe('This is already in the list.')
		await wrapper.find('[data-testid="cn-chips-field-input"]').setValue('')
		await wrapper.find('form').trigger('submit')
		expect(wrapper.find('[data-testid="cn-chips-field-error"]').text()).toBe('Fill this in.')
		expect(mockPatch).not.toHaveBeenCalled()
	})

	test('removing PATCHes the list without the entry, with a named remove button', async () => {
		const wrapper = make()
		const button = wrapper.find('[data-testid="cn-chips-field-remove-oosthaven.nl"]')
		expect(button.attributes('aria-label')).toBe('Remove: oosthaven.nl')
		await button.trigger('click')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { domains: ['zuiddrecht.nl'] })
		expect(wrapper.findAll('.cn-chips-field__chip')).toHaveLength(1)
	})

	test('a refused PATCH shows the server words and keeps the chips', async () => {
		mockPatch.mockRejectedValue({ response: { data: { error: 'Not allowed.' } } })
		const wrapper = make()
		await wrapper.find('[data-testid="cn-chips-field-remove-oosthaven.nl"]').trigger('click')
		await flush()
		expect(wrapper.find('[data-testid="cn-chips-field-error"]').text()).toBe('Not allowed.')
		expect(wrapper.findAll('.cn-chips-field__chip')).toHaveLength(2)
	})

	test('options turn the add input into a choice of the remaining ones, chips show their labels', async () => {
		const wrapper = make({
			objectData: { id: 'p-1', locales: ['nl'] },
			content: { field: 'locales', addLabel: 'Language', options: [{ value: 'nl', label: 'Nederlands' }, { value: 'en', label: 'English' }, { value: 'de', label: 'Deutsch' }] },
		})
		expect(wrapper.find('.cn-chips-field__chip').text()).toContain('Nederlands')
		await wrapper.find('[data-testid="cn-chips-field-add"]').trigger('click')
		const select = wrapper.find('select[data-testid="cn-chips-field-input"]')
		expect(select.findAll('option').map((o) => o.text())).toEqual(['English', 'Deutsch'])
		await select.setValue('de')
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { locales: ['nl', 'de'] })
	})

	test('readOnly shows no add chip and no remove buttons', () => {
		const wrapper = make({ content: { ...CONTENT, readOnly: true } })
		expect(wrapper.find('[data-testid="cn-chips-field-add"]').exists()).toBe(false)
		expect(wrapper.find('.cn-chips-field__remove').exists()).toBe(false)
	})

	test('minItems refuses removing the last allowed chip with the message and sends nothing', async () => {
		const wrapper = make({ content: { ...CONTENT, minItems: 2 } })
		await wrapper.find('[data-testid="cn-chips-field-remove-oosthaven.nl"]').trigger('click')
		await flush()
		expect(wrapper.find('[data-testid="cn-chips-field-error"]').text()).toBe('Keep at least 2.')
		expect(mockPatch).not.toHaveBeenCalled()
		expect(wrapper.findAll('.cn-chips-field__chip')).toHaveLength(2)
	})

	test('required means one: the last chip stays, a custom message is used', async () => {
		const wrapper = make({ content: { ...CONTENT, required: true, minItemsMessage: 'Choose a language.' }, objectData: { id: 'p-1', domains: ['nl'] } })
		await wrapper.find('[data-testid="cn-chips-field-remove-nl"]').trigger('click')
		await flush()
		expect(wrapper.find('[data-testid="cn-chips-field-error"]').text()).toBe('Choose a language.')
		expect(mockPatch).not.toHaveBeenCalled()
	})

	test('with a modelValue the widget writes nothing and emits the new list', async () => {
		const wrapper = make({ content: { lowercase: true, addLabel: 'Domain' }, modelValue: ['a.nl', 'b.nl'], objectData: null })
		await wrapper.find('[data-testid="cn-chips-field-remove-a.nl"]').trigger('click')
		await addValue(wrapper, 'C.NL')
		expect(mockPatch).not.toHaveBeenCalled()
		expect(wrapper.emitted('update:modelValue')[0]).toEqual([['b.nl']])
		expect(wrapper.emitted('update:modelValue')[1]).toEqual([['a.nl', 'b.nl', 'c.nl']])
	})
})
