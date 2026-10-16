/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnToggleTableWidget `each` and `map` modes (toggle-table-objects-and-map):
 * a row per object with that object's own switch, PATCHed per object without a
 * current object (shillinq ShInstellingen "Verplichte velden"), and a config
 * map read from an endpoint and written through `save`, or held in one field
 * of the current object.
 *
 * @spec openspec/changes/toggle-table-objects-and-map/specs/toggle-table/spec.md#requirement-a-toggle-table-can-switch-objects-or-a-config-map
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()
var mockPut = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args), patch: (...args) => mockPatch(...args), put: (...args) => mockPut(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { mount } from '@vue/test-utils'

const CnToggleTableWidget = require('../../src/components/CnToggleTableWidget/CnToggleTableWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const SwitchStub = {
	props: ['modelValue', 'disabled'],
	emits: ['update:modelValue'],
	template: '<label><input type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)"></label>',
}

/**
 * @param {object} props Props.
 * @return {object} The wrapper.
 */
function make(props = {}) {
	return mount(CnToggleTableWidget, {
		props,
		global: { stubs: { NcCheckboxRadioSwitch: SwitchStub, NcNoteCard: { template: '<div class="note"><slot /></div>' } } },
	})
}

const input = (wrapper, key) => wrapper.find(`[data-testid="cn-toggle-table-row-${key}"] input`)

const FIELD_REQUIREMENTS = [
	{ id: 'fr-1', title: 'Kostenplaats op elke inkoopfactuurregel', active: true },
	{ id: 'fr-2', title: 'Project op declaraties', active: false },
]

beforeEach(() => {
	mockGet.mockReset()
	mockPatch.mockReset()
	mockPut.mockReset()
	mockPatch.mockImplementation((url, body) => Promise.resolve({ data: body }))
	mockPut.mockImplementation((url, body) => Promise.resolve({ data: body }))
})

describe('each mode: a row per object', () => {
	const CONTENT = {
		bind: { mode: 'each', field: 'active', register: 'shillinq', schema: 'FieldRequirement' },
		source: { url: '/apps/openregister/api/objects/shillinq/FieldRequirement?_limit=200', path: 'results', key: 'id', label: 'title' },
	}

	test('reads every object and its own switch, without a current object', async () => {
		mockGet.mockResolvedValue({ data: { results: FIELD_REQUIREMENTS } })
		const wrapper = make({ content: CONTENT })
		await flush()
		expect(wrapper.findAll('.cn-toggle-table__title').map((cell) => cell.text())).toEqual(['Kostenplaats op elke inkoopfactuurregel', 'Project op declaraties'])
		expect(input(wrapper, 'fr-1').element.checked).toBe(true)
		expect(input(wrapper, 'fr-2').element.checked).toBe(false)
	})

	test('a toggle PATCHes that object only, and the switch keeps the answer', async () => {
		mockGet.mockResolvedValue({ data: { results: FIELD_REQUIREMENTS } })
		const wrapper = make({ content: CONTENT })
		await flush()
		await input(wrapper, 'fr-2').setValue(true)
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/shillinq/FieldRequirement/fr-2', { active: true })
		expect(input(wrapper, 'fr-2').element.checked).toBe(true)
		expect(wrapper.emitted('saved')).toEqual([[{ field: 'active', key: 'fr-2', value: true }]])
	})

	test('a refused PATCH draws the stored value again and shows why', async () => {
		mockGet.mockResolvedValue({ data: { results: FIELD_REQUIREMENTS } })
		mockPatch.mockRejectedValue({ response: { data: { message: 'Geen rechten' } } })
		const wrapper = make({ content: CONTENT })
		await flush()
		await input(wrapper, 'fr-1').setValue(false)
		await flush()
		expect(input(wrapper, 'fr-1').element.checked).toBe(true)
		expect(wrapper.find('.note').text()).toContain('Geen rechten')
	})

	test('invert reads a false field as on and writes the opposite', async () => {
		mockGet.mockResolvedValue({ data: { results: FIELD_REQUIREMENTS } })
		const wrapper = make({ content: { ...CONTENT, bind: { ...CONTENT.bind, invert: true } } })
		await flush()
		expect(input(wrapper, 'fr-2').element.checked).toBe(true)
		await input(wrapper, 'fr-2').setValue(false)
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(expect.any(String), { active: true })
	})
})

describe('map mode: a boolean per row key', () => {
	const ROWS = [{ key: 'costCenter', label: 'Kostenplaats' }, { key: 'project', label: 'Project' }]

	test('reads the map from an endpoint and writes one key through save', async () => {
		mockGet.mockResolvedValue({ data: { required: { costCenter: true, project: false } } })
		const wrapper = make({
			content: {
				rows: ROWS,
				bind: { mode: 'map', url: '/apps/shillinq/api/settings', path: 'required' },
				save: { url: '/apps/shillinq/api/settings', method: 'PUT', payload: { required: '{changes}' } },
			},
		})
		await flush()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/shillinq/api/settings')
		expect(input(wrapper, 'costCenter').element.checked).toBe(true)
		expect(input(wrapper, 'project').element.checked).toBe(false)

		await input(wrapper, 'project').setValue(true)
		await flush()
		expect(mockPut).toHaveBeenCalledWith('/index.php/apps/shillinq/api/settings', { required: { project: true } })
		expect(input(wrapper, 'project').element.checked).toBe(true)
	})

	test('without save an endpoint map cannot be written and says so', async () => {
		mockGet.mockResolvedValue({ data: { project: false } })
		const wrapper = make({ content: { rows: ROWS, bind: { mode: 'map', url: '/apps/shillinq/api/settings' } } })
		await flush()
		await input(wrapper, 'project').setValue(true)
		await flush()
		expect(mockPut).not.toHaveBeenCalled()
		expect(mockPatch).not.toHaveBeenCalled()
		expect(input(wrapper, 'project').element.checked).toBe(false)
		expect(wrapper.find('.note').text()).toBe('This switch cannot be saved here.')
	})

	test('a map in a field of the current object is written by its dot-path', async () => {
		mockGet.mockResolvedValue({ data: { id: 'a-1', required: { costCenter: true, project: false } } })
		const wrapper = make({
			objectId: 'a-1',
			register: 'shillinq',
			schema: 'administration',
			objectData: { id: 'a-1', required: { costCenter: true, project: false } },
			content: { rows: ROWS, bind: { mode: 'map', field: 'required' } },
		})
		await flush()
		expect(input(wrapper, 'costCenter').element.checked).toBe(true)
		await input(wrapper, 'project').setValue(true)
		await flush()
		expect(mockPatch).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/shillinq/administration/a-1', { required: { costCenter: true, project: true } })
	})
})

describe('a settings page widget', () => {
	test('CnSettingsPage resolves the built-in toggle-table type, ahead of a custom component of that name', () => {
		const CnSettingsPage = require('../../src/components/CnSettingsPage/CnSettingsPage.vue').default
		const resolve = (customComponents) => CnSettingsPage.methods.resolveWidgetComponent.call({ effectiveCustomComponents: customComponents }, { type: 'toggle-table' })
		expect(resolve({})).toBe(CnToggleTableWidget)
		expect(resolve({ 'toggle-table': { name: 'Other' } })).toBe(CnToggleTableWidget)
	})
})
