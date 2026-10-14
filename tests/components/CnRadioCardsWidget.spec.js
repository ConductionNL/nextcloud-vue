/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRadioCardsWidget — the `radio-cards` widget (abstract-radio-cards).
 *
 * Guarded: registered content-only; a card per option with title and
 * description, the stored value checked; choosing PATCHes only that field;
 * a refused PATCH puts the choice back and shows the server's words; readOnly
 * disables the inputs; labels go through cnTranslate.
 */
var mockPatch = jest.fn()
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { patch: (...args) => mockPatch(...args), get: (...args) => mockGet(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnRadioCardsWidget/index.js'

const CnRadioCardsWidget = require('../../src/components/CnRadioCardsWidget/CnRadioCardsWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const OBJECT_URL = '/index.php/apps/openregister/api/objects/portaliq/portal/p-1'

const CONTENT = {
	field: 'signup',
	options: [
		{ value: 'nobody', label: 'Nobody', description: 'Only accounts the municipality issued.' },
		{ value: 'approval', label: 'With approval', description: 'Everyone signs up, an administrator approves.' },
		{ value: 'anyone', label: 'Anyone', description: 'Right after the confirmation mail.' },
	],
}
const OBJECT = { id: 'p-1', signup: 'approval' }

function make(props = {}) {
	return mount(CnRadioCardsWidget, {
		props: { content: CONTENT, objectData: OBJECT, objectId: 'p-1', register: 'portaliq', schema: 'portal', ...props },
		global: { stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' } } },
	})
}

const input = (wrapper, value) => wrapper.find(`[data-testid="cn-radio-cards-option-${value}"] input`)

describe('CnRadioCardsWidget', () => {
	beforeEach(() => {
		mockPatch.mockReset()
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...OBJECT, ...body } }))
	})

	test('is registered as a content-only detail widget', () => {
		expect(getWidgetTypeEntry('radio-cards')).toBeTruthy()
		expect(isContentOnlyWidgetDef({ type: 'radio-cards' })).toBe(true)
	})

	test('a card per option with title and description, the stored value checked', () => {
		const wrapper = make()
		expect(wrapper.findAll('.cn-radio-cards__card')).toHaveLength(3)
		expect(wrapper.find('[data-testid="cn-radio-cards-option-nobody"]').text()).toContain('Only accounts the municipality issued.')
		expect(input(wrapper, 'approval').element.checked).toBe(true)
		expect(input(wrapper, 'nobody').element.checked).toBe(false)
		expect(wrapper.find('[data-testid="cn-radio-cards-option-approval"]').classes()).toContain('cn-radio-cards__card--selected')
		expect(wrapper.find('.cn-radio-cards__grid').classes()).toContain('cn-radio-cards__grid--2')
	})

	test('choosing a card PATCHes only that field', async () => {
		const wrapper = make()
		await input(wrapper, 'anyone').setValue(true)
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { signup: 'anyone' })
		expect(wrapper.find('[data-testid="cn-radio-cards-option-anyone"]').classes()).toContain('cn-radio-cards__card--selected')
	})

	test('a refused PATCH puts the choice back and shows the server words', async () => {
		mockPatch.mockRejectedValue({ response: { data: { error: 'Not allowed.' } } })
		const wrapper = make()
		await input(wrapper, 'anyone').setValue(true)
		await flush()
		expect(wrapper.find('[data-testid="cn-radio-cards-option-approval"]').classes()).toContain('cn-radio-cards__card--selected')
		expect(wrapper.find('[data-testid="cn-radio-cards-option-anyone"]').classes()).not.toContain('cn-radio-cards__card--selected')
		expect(wrapper.find('[data-testid="cn-radio-cards-notice"]').text()).toBe('Not allowed.')
	})

	test('without a register it writes nothing', async () => {
		const wrapper = make({ register: '' })
		await input(wrapper, 'anyone').setValue(true)
		await flush()
		expect(mockPatch).not.toHaveBeenCalled()
	})

	test('readOnly disables the inputs', () => {
		const wrapper = make({ content: { ...CONTENT, readOnly: true } })
		expect(input(wrapper, 'nobody').element.disabled).toBe(true)
	})

	test('texts go through cnTranslate and the legend shows', () => {
		const wrapper = mount(CnRadioCardsWidget, {
			props: { content: { ...CONTENT, label: 'Sign up' }, objectData: OBJECT, objectId: 'p-1', register: 'portaliq', schema: 'portal' },
			global: { provide: { cnTranslate: (key) => `NL ${key}` }, stubs: { NcNoteCard: true } },
		})
		expect(wrapper.find('legend').text()).toBe('NL Sign up')
		expect(wrapper.find('[data-testid="cn-radio-cards-option-nobody"]').text()).toContain('NL Nobody')
	})
	test('a nested field is read by path and written as the enclosing object, re-read first', async () => {
		const stored = { id: 'p-1', authentication: { registration: { policy: 'approval', contact: 'a@b.nl' } } }
		mockGet.mockResolvedValue({ data: stored })
		const wrapper = make({
			content: { ...CONTENT, field: 'authentication.registration.policy' },
			objectData: stored,
		})
		expect(input(wrapper, 'approval').element.checked).toBe(true)
		await input(wrapper, 'anyone').setValue(true)
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch.mock.calls[0][1]).toEqual({ authentication: { registration: { policy: 'anyone', contact: 'a@b.nl' } } })
		expect(input(wrapper, 'anyone').element.checked).toBe(true)
	})

	test('a save template writes through the endpoint and never PATCHes the object', async () => {
		const put = jest.fn(() => Promise.resolve({ data: {} }))
		require('@nextcloud/axios').default.put = put
		const wrapper = make({ content: { ...CONTENT, save: { url: '/apps/x/api/{object.id}/signup', method: 'PUT', payload: { signup: '{value}' } } } })
		await input(wrapper, 'anyone').setValue(true)
		await flush()
		expect(mockPatch).not.toHaveBeenCalled()
		expect(put).toHaveBeenCalledWith('/index.php/apps/x/api/p-1/signup', { signup: 'anyone' })
	})

	test('variant list draws one column with the list class and keeps choosing and saving', async () => {
		const wrapper = make({ content: { ...CONTENT, variant: 'list', columns: 3 } })
		expect(wrapper.find('[data-testid="cn-radio-cards"]').classes()).toContain('cn-radio-cards--list')
		expect(wrapper.find('.cn-radio-cards__grid').classes()).toContain('cn-radio-cards__grid--1')
		expect(wrapper.find('[data-testid="cn-radio-cards-option-approval"]').text()).toContain('Everyone signs up, an administrator approves.')
		mockPatch.mockResolvedValueOnce({ data: { ...OBJECT, signup: 'anyone' } })
		await input(wrapper, 'anyone').setValue(true)
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { signup: 'anyone' })
	})

	test('the default variant is cards', () => {
		const wrapper = make()
		expect(wrapper.find('[data-testid="cn-radio-cards"]').classes()).not.toContain('cn-radio-cards--list')
		expect(wrapper.find('.cn-radio-cards__grid').classes()).toContain('cn-radio-cards__grid--2')
	})
})
