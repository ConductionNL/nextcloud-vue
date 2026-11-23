/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnToggleTableWidget — the `toggle-table` widget (abstract-toggle-table).
 *
 * Guarded: registered content-only; rows from `rows` and from a `source`
 * (tokens resolved in its url); extra columns with a map; flag mode PATCHes the
 * row's own field; list mode PATCHes the one list field with the key added or
 * removed, and `invert` reads a list of hidden items as visible switches; a
 * refused PATCH leaves the switch as stored and shows the server's words;
 * readOnly disables the switches.
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
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnToggleTableWidget/index.js'

const CnToggleTableWidget = require('../../src/components/CnToggleTableWidget/CnToggleTableWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const OBJECT_URL = '/index.php/apps/openregister/api/objects/portaliq/portal/p-1'

const SwitchStub = {
	props: ['modelValue', 'disabled'],
	emits: ['update:modelValue'],
	template: '<label><input type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)"></label>',
}

function make(props = {}) {
	return mount(CnToggleTableWidget, {
		props: { objectId: 'p-1', register: 'portaliq', schema: 'portal', ...props },
		global: { stubs: { NcCheckboxRadioSwitch: SwitchStub, NcNoteCard: { template: '<div class="note"><slot /></div>' } } },
	})
}

const input = (wrapper, key) => wrapper.find(`[data-testid="cn-toggle-table-row-${key}"] input`)

describe('CnToggleTableWidget', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: body }))
	})

	test('is registered as a content-only detail widget', () => {
		expect(getWidgetTypeEntry('toggle-table')).toBeTruthy()
		expect(isContentOnlyWidgetDef({ type: 'toggle-table' })).toBe(true)
	})

	describe('flag mode', () => {
		const CONTENT = {
			titleHeader: 'Method',
			toggleHeader: 'On',
			columns: [{ header: 'Route', path: 'route', map: { integriq: 'via integriq' } }],
			rows: [
				{ key: 'digid', label: 'DigiD', field: 'signinDigid', route: 'integriq' },
				{ key: 'oidc', label: 'Own broker', field: 'signinOidc', route: 'none' },
			],
		}
		const OBJECT = { id: 'p-1', signinDigid: true, signinOidc: false }

		test('rows with a mapped extra column, headers and the switches from the object', () => {
			const wrapper = make({ content: CONTENT, objectData: OBJECT })
			expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual(['Method', 'Route', 'On'])
			expect(wrapper.find('[data-testid="cn-toggle-table-row-digid"]').text()).toContain('via integriq')
			expect(input(wrapper, 'digid').element.checked).toBe(true)
			expect(input(wrapper, 'oidc').element.checked).toBe(false)
		})

		test('a toggle PATCHes that row own field', async () => {
			const wrapper = make({ content: CONTENT, objectData: OBJECT })
			await input(wrapper, 'oidc').setValue(true)
			await flush()
			expect(mockPatch).toHaveBeenCalledTimes(1)
			expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { signinOidc: true })
			expect(input(wrapper, 'oidc').element.checked).toBe(true)
		})
	})

	describe('list mode with a source', () => {
		const CONTENT = {
			bind: { mode: 'list', field: 'hiddenCaseTypes', invert: true },
			source: { url: '/apps/portaliq/api/case-types?portal=@object.slug', path: 'results', key: 'id', label: 'name', hint: 'summary' },
		}
		const OBJECT = { id: 'p-1', slug: 'zuiddrecht', hiddenCaseTypes: ['c3'] }
		const RESULTS = { results: [{ id: 'c1', name: 'Woo-verzoek', summary: '' }, { id: 'c3', name: 'Handhavingszaak', summary: 'Verborgen in dit portaal.' }] }

		beforeEach(() => {
			mockGet.mockResolvedValue({ data: RESULTS })
		})

		test('rows come from the source with its url tokens resolved; hidden ones read as off', async () => {
			const wrapper = make({ content: CONTENT, objectData: OBJECT })
			await flush()
			expect(mockGet).toHaveBeenCalledWith('/index.php/apps/portaliq/api/case-types?portal=zuiddrecht')
			expect(wrapper.find('[data-testid="cn-toggle-table-row-c1"]').text()).toContain('Woo-verzoek')
			expect(wrapper.find('[data-testid="cn-toggle-table-row-c3"]').text()).toContain('Verborgen in dit portaal.')
			expect(input(wrapper, 'c1').element.checked).toBe(true)
			expect(input(wrapper, 'c3').element.checked).toBe(false)
		})

		test('switching a row off adds its key to the list; on removes it; one PATCH of the list', async () => {
			const wrapper = make({ content: CONTENT, objectData: OBJECT })
			await flush()
			await input(wrapper, 'c1').setValue(false)
			await flush()
			expect(mockPatch).toHaveBeenLastCalledWith(OBJECT_URL, { hiddenCaseTypes: ['c3', 'c1'] })
			await input(wrapper, 'c3').setValue(true)
			await flush()
			expect(mockPatch).toHaveBeenLastCalledWith(OBJECT_URL, { hiddenCaseTypes: ['c1'] })
		})

		test('without invert a key in the list is ON', async () => {
			const wrapper = make({ content: { ...CONTENT, bind: { mode: 'list', field: 'hiddenCaseTypes' } }, objectData: OBJECT })
			await flush()
			expect(input(wrapper, 'c3').element.checked).toBe(true)
			expect(input(wrapper, 'c1').element.checked).toBe(false)
		})

		test('a refused PATCH leaves the switch as stored and shows the server words', async () => {
			mockPatch.mockRejectedValue({ response: { data: { error: 'Not allowed.' } } })
			const wrapper = make({ content: CONTENT, objectData: OBJECT })
			await flush()
			await input(wrapper, 'c1').setValue(false)
			await flush()
			expect(input(wrapper, 'c1').element.checked).toBe(true)
			expect(wrapper.find('[data-testid="cn-toggle-table-notice"]').text()).toBe('Not allowed.')
		})
	})

	test('an empty table shows the empty text; readOnly disables the switches', () => {
		expect(make({ content: { rows: [], emptyText: 'No case types.' }, objectData: {} }).find('[data-testid="cn-toggle-table-empty"]').text()).toBe('No case types.')
		const wrapper = make({ content: { readOnly: true, rows: [{ key: 'a', label: 'A', field: 'x' }] }, objectData: { x: true } })
		expect(input(wrapper, 'a').element.disabled).toBe(true)
	})
})
