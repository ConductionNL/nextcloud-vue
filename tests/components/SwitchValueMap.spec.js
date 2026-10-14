/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A switch with a value map (`values: { on, off }`) reads and writes those
 * values instead of true/false, so an app config flag stored as "1"/"0" or
 * "true"/"false" can be a switch: in switch-rows and in a settings-form.
 *
 * @spec openspec/changes/screens-switch-value-map/specs/switch-rows/spec.md#requirement-a-switch-can-read-and-write-a-value-map
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

const CnSettingsFormWidget = require('../../src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue').default

describe('switch value maps', () => {
	beforeEach(() => {
		mockPatch.mockReset()
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...OBJECT, ...body } }))
	})

	it('switch-rows reads "1" as on and writes "0" / "1"', async () => {
		const content = { rows: [{ key: 'publicVoting', label: 'Public voting', values: { on: '1', off: '0' } }] }
		const w = make({ content, objectData: { id: 'p-1', publicVoting: '1' } })
		expect(input(w, 'publicVoting').element.checked).toBe(true)
		await input(w, 'publicVoting').setValue(false)
		await flush()
		expect(mockPatch.mock.calls[0][1]).toEqual({ publicVoting: '0' })
		expect(input(w, 'publicVoting').element.checked).toBe(false)
	})

	it('switch-rows takes the widget\'s values for every row, a row\'s own winning, and keeps invert', async () => {
		const content = { values: { on: 'true', off: 'false' }, rows: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B', invert: true }, { key: 'c', label: 'C', values: { on: 1, off: 0 } }] }
		const w = make({ content, objectData: { id: 'p-1', a: 'true', b: 'true', c: 1 } })
		expect(input(w, 'a').element.checked).toBe(true)
		expect(input(w, 'b').element.checked).toBe(false)
		expect(input(w, 'c').element.checked).toBe(true)
		await input(w, 'b').setValue(true)
		await flush()
		expect(mockPatch.mock.calls[0][1]).toEqual({ b: 'false' })
	})

	it('a boolean switch without a map is unchanged: "1" is off', () => {
		const w = make({ content: { rows: [{ key: 'flag', label: 'Flag' }] }, objectData: { id: 'p-1', flag: '1' } })
		expect(input(w, 'flag').element.checked).toBe(false)
	})

	it('a settings-form switch with values reads "1" and saves "0"', async () => {
		const w = mount(CnSettingsFormWidget, {
			props: { content: { fields: [{ key: 'publicVoting', label: 'Public voting', type: 'switch', values: { on: '1', off: '0' } }] }, objectData: { id: 'p-1', publicVoting: '1' }, objectId: 'p-1', register: 'portaliq', schema: 'portal' },
			global: { stubs: { NcCheckboxRadioSwitch: SwitchStub, NcNoteCard: { template: '<div class="note"><slot /></div>' } } },
		})
		const box = w.find('[data-testid="cn-settings-form-field-publicVoting"] input')
		expect(box.element.checked).toBe(true)
		await box.setValue(false)
		await w.find('form').trigger('submit')
		await flush()
		expect(mockPatch.mock.calls[0][1]).toEqual({ publicVoting: '0' })
		expect(w.find('[data-testid="cn-settings-form-field-publicVoting"] input').element.checked).toBe(false)
	})
})
