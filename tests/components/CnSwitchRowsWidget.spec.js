/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSwitchRowsWidget — the `switch-rows` widget (abstract-switch-rows).
 *
 * Guarded: registered content-only; a switch per row from the boolean field,
 * with label and hint; a toggle PATCHes only that field; `invert` flips what is
 * shown and what is stored; a refused PATCH puts the switch back and shows the
 * server's words; readOnly disables the switches.
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

import '../../src/components/CnSwitchRowsWidget/index.js'

const CnSwitchRowsWidget = require('../../src/components/CnSwitchRowsWidget/CnSwitchRowsWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const OBJECT_URL = '/index.php/apps/openregister/api/objects/portaliq/portal/p-1'

const CONTENT = {
	rows: [
		{ key: 'trafficEnabled', label: 'Measure traffic', hint: 'Without cookies.' },
		{ key: 'installDisabled', label: 'Install as app', invert: true },
	],
}
const OBJECT = { id: 'p-1', trafficEnabled: true, installDisabled: false }

const SwitchStub = {
	props: ['modelValue', 'disabled'],
	emits: ['update:modelValue'],
	template: '<label class="sw"><input type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>',
}

function make(props = {}) {
	return mount(CnSwitchRowsWidget, {
		props: { content: CONTENT, objectData: OBJECT, objectId: 'p-1', register: 'portaliq', schema: 'portal', ...props },
		global: { stubs: { NcCheckboxRadioSwitch: SwitchStub, NcNoteCard: { template: '<div class="note"><slot /></div>' } } },
	})
}

const input = (wrapper, key) => wrapper.find(`[data-testid="cn-switch-rows-row-${key}"] input`)

describe('CnSwitchRowsWidget', () => {
	beforeEach(() => {
		mockPatch.mockReset()
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...OBJECT, ...body } }))
	})

	test('is registered as a content-only detail widget', () => {
		expect(getWidgetTypeEntry('switch-rows')).toBeTruthy()
		expect(isContentOnlyWidgetDef({ type: 'switch-rows' })).toBe(true)
	})

	test('a switch per row with its label and hint, read from the object', () => {
		const wrapper = make()
		expect(input(wrapper, 'trafficEnabled').element.checked).toBe(true)
		expect(input(wrapper, 'installDisabled').element.checked).toBe(true)
		expect(wrapper.find('[data-testid="cn-switch-rows-row-trafficEnabled"]').text()).toContain('Without cookies.')
	})

	test('a toggle PATCHes only that field', async () => {
		const wrapper = make()
		await input(wrapper, 'trafficEnabled').setValue(false)
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { trafficEnabled: false })
		expect(input(wrapper, 'trafficEnabled').element.checked).toBe(false)
	})

	test('invert stores the opposite of what the switch shows', async () => {
		const wrapper = make()
		await input(wrapper, 'installDisabled').setValue(false)
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { installDisabled: true })
		expect(input(wrapper, 'installDisabled').element.checked).toBe(false)
	})

	test('a refused PATCH puts the switch back and shows the server words', async () => {
		mockPatch.mockRejectedValue({ response: { data: { error: 'Not allowed.' } } })
		const wrapper = make()
		await input(wrapper, 'trafficEnabled').setValue(false)
		await flush()
		expect(input(wrapper, 'trafficEnabled').element.checked).toBe(true)
		expect(wrapper.find('[data-testid="cn-switch-rows-notice"]').text()).toBe('Not allowed.')
	})

	test('without a register, schema or id it writes nothing', async () => {
		const wrapper = make({ register: '' })
		await input(wrapper, 'trafficEnabled').setValue(false)
		await flush()
		expect(mockPatch).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-switch-rows-notice"]').exists()).toBe(true)
	})

	test('readOnly disables the switches', () => {
		const wrapper = make({ content: { ...CONTENT, readOnly: true } })
		expect(input(wrapper, 'trafficEnabled').element.disabled).toBe(true)
	})

	test('labels go through cnTranslate', () => {
		const wrapper = mount(CnSwitchRowsWidget, {
			props: { content: CONTENT, objectData: OBJECT, objectId: 'p-1', register: 'portaliq', schema: 'portal' },
			global: { provide: { cnTranslate: (key) => `NL ${key}` }, stubs: { NcCheckboxRadioSwitch: SwitchStub, NcNoteCard: true } },
		})
		expect(wrapper.find('[data-testid="cn-switch-rows-row-trafficEnabled"]').text()).toContain('NL Measure traffic')
	})
})
