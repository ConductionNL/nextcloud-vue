/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnActionDialog fields that edit a record: a field filled from the record
 * (`valuePath`), and a write-only `secret` that says a value is stored and
 * is sent only when something is typed (a cashier's PIN the server hashes).
 *
 * @spec openspec/changes/action-dialog-secret-field/specs/action-dialog/spec.md#requirement-a-field-can-start-from-the-record-and-a-secret-is-write-only
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnActionDialog from '../../src/components/CnActionDialog/CnActionDialog.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const STAFF = {
	title: 'Edit staff member',
	fields: [
		{ field: 'name', label: 'Name', valuePath: 'name' },
		{ field: 'pin', label: 'PIN', type: 'secret', storedPath: 'hasPin' },
	],
	confirm: { label: 'Save', request: { method: 'PUT', url: '/apps/pipelinq/api/pos/staff/@objectId' } },
}

const TEXT = { props: ['modelValue', 'label', 'type', 'placeholder', 'autocomplete'], emits: ['update:modelValue'], template: '<label>{{ label }}<input :type="type" :placeholder="placeholder" :autocomplete="autocomplete" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></label>' }

/**
 * Mount the dialog over a record.
 *
 * @param {object} object The record.
 * @return {Promise<import('@vue/test-utils').VueWrapper>}
 */
async function mountDialog(object) {
	const w = mount(CnActionDialog, {
		props: { config: STAFF, objectId: 's-1', object },
		global: { stubs: { CnDialog: { template: '<div><slot /><slot name="actions" /></div>' }, NcTextField: TEXT, CnIcon: true } },
	})
	await flushPromises()
	return w
}

const input = (w, name) => w.find(`[data-testid="cn-action-dialog-field-${name}"] input`)

describe('CnActionDialog record fields', () => {
	beforeEach(() => {
		axios.put.mockReset()
		axios.put.mockResolvedValue({ data: {} })
	})

	it('starts a field from the record and says a stored secret is there without showing it', async () => {
		const w = await mountDialog({ name: 'Anna', hasPin: true })
		expect(input(w, 'name').element.value).toBe('Anna')
		const pin = input(w, 'pin')
		expect(pin.attributes('type')).toBe('password')
		expect(pin.attributes('autocomplete')).toBe('new-password')
		expect(pin.element.value).toBe('')
		expect(pin.attributes('placeholder')).toBe('Stored. Type a new value to replace it.')
	})

	it('leaves a stored secret out when nothing was typed, and lets the action run without it', async () => {
		const w = await mountDialog({ name: 'Anna', hasPin: true })
		await input(w, 'name').setValue('Anna B')
		await w.find('[data-testid="cn-action-dialog-confirm"]').trigger('click')
		await flushPromises()
		expect(axios.put).toHaveBeenCalledWith('/nc/apps/pipelinq/api/pos/staff/s-1', { name: 'Anna B' })
	})

	it('sends a typed secret, and asks for one that is required and not stored yet', async () => {
		const w = await mountDialog({ name: 'Bram', hasPin: false })
		expect(input(w, 'pin').attributes('placeholder')).toBe('')
		expect(w.find('[data-testid="cn-action-dialog-confirm"]').attributes('disabled')).toBeDefined()
		await input(w, 'pin').setValue('4321')
		await w.find('[data-testid="cn-action-dialog-confirm"]').trigger('click')
		await flushPromises()
		expect(axios.put).toHaveBeenCalledWith('/nc/apps/pipelinq/api/pos/staff/s-1', { name: 'Bram', pin: '4321' })
	})
})
