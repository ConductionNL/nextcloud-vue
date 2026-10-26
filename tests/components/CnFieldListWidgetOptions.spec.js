/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `variant: "options"` draws a field's choice list as framed options, each
 * with a grip and a code chip (DqZaaktypeVelden Keuzelijst: "Woning WON"),
 * and the grip moves an option by keyboard or drag, saving the new order.
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args), patch: (...args) => mockPatch(...args), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

import { mount } from '@vue/test-utils'

const CnFieldListWidget = require('../../src/components/CnFieldListWidget/CnFieldListWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const FIELD = { id: 'f-1', enumValues: ['Woning', 'Bijgebouw', 'Dakkapel'], enumCodes: { Woning: 'WON', Bijgebouw: 'BIJ' } }
const CONTENT = { field: 'enumValues', variant: 'options', code: { field: 'enumCodes' }, remove: { label: 'Remove' } }

function mountList(content = CONTENT) {
	return mount(CnFieldListWidget, {
		props: { content, objectData: FIELD, objectId: 'f-1', register: 'dossiq', schema: 'propertyDefinition' },
		global: {
			provide: { cnTranslate: (key) => key },
			stubs: { NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' }, NcNoteCard: true, NcTextField: true, NcSelect: true },
		},
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockPatch.mockReset()
	mockGet.mockResolvedValue({ data: FIELD })
	mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...FIELD, ...body } }))
})

describe('CnFieldListWidget options variant', () => {
	it('draws each option with a grip and its code chip, none where the map has no code', () => {
		const w = mountList()
		expect(w.find('.cn-field-list-widget__rows--options').exists()).toBe(true)
		expect(w.findAll('.cn-field-list-widget__grip')).toHaveLength(3)
		expect(w.findAll('.cn-field-list-widget__code').map((chip) => chip.text())).toEqual(['WON', 'BIJ'])
	})

	it('moves an option down with the arrow key and saves the order', async () => {
		const w = mountList()
		const grips = w.findAll('.cn-field-list-widget__grip')
		await grips[0].trigger('keydown', { key: 'ArrowDown' })
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining('/propertyDefinition/f-1'), { enumValues: ['Bijgebouw', 'Woning', 'Dakkapel'] })
	})

	it('draws no grip on a read-only list or another variant', () => {
		expect(mountList({ ...CONTENT, readOnly: true }).find('.cn-field-list-widget__grip').exists()).toBe(false)
		expect(mountList({ field: 'enumValues' }).find('.cn-field-list-widget__grip').exists()).toBe(false)
	})

	it('opens its add form from a button with a plus icon, not a "+" in the label', () => {
		const w = mount(CnFieldListWidget, {
			props: { content: { ...CONTENT, add: { trigger: 'button', label: 'Add option', fields: [{ key: 'value' }] } }, objectData: FIELD, objectId: 'f-1', register: 'dossiq', schema: 'propertyDefinition' },
			global: {
				provide: { cnTranslate: (key) => key },
				stubs: { NcButton: { template: '<button v-bind="$attrs"><slot name="icon" /><slot /></button>' }, NcNoteCard: true, NcTextField: true, NcSelect: true },
			},
		})
		const open = w.find('[data-testid="cn-field-list-open-add"]')
		expect(open.text()).toBe('Add option')
		expect(open.find('.plus-icon').exists()).toBe(true)
	})

	it('removes an option from an icon button named by the option', () => {
		const w = mount(CnFieldListWidget, {
			props: { content: CONTENT, objectData: FIELD, objectId: 'f-1', register: 'dossiq', schema: 'propertyDefinition' },
			global: {
				provide: { cnTranslate: (key) => key },
				stubs: { NcButton: { template: '<button v-bind="$attrs"><slot name="icon" /><slot /></button>' }, NcNoteCard: true, NcTextField: true, NcSelect: true },
			},
		})
		const remove = w.findAll('[data-testid^="cn-field-list-remove-"]')[0]
		expect(remove.text()).toBe('')
		expect(remove.find('.delete-outline-icon').exists()).toBe(true)
		expect(remove.attributes('aria-label')).toContain('Woning')
	})
})

