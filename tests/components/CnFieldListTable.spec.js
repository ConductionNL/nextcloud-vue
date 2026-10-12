/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldListWidget, table variant (abstract-field-list-table).
 *
 * Guarded: `variant: 'table'` draws a header row and one row per entry with the
 * configured columns (strong first cell, a mapped pill); the per-row menu holds
 * the row actions and remove, named after the row; a `detail` line becomes a
 * warning band under the table with the row actions placed in the band; the add
 * form opens from a header button and closes after a save; without `variant`
 * nothing changes (the list rows stay).
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()
var mockPost = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
		patch: (...args) => mockPatch(...args),
		post: (...args) => mockPost(...args),
	},
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { mount } from '@vue/test-utils'

const CnFieldListWidget = require('../../src/components/CnFieldListWidget/CnFieldListWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const OBJECT_URL = '/index.php/apps/openregister/api/objects/portaliq/portal/p-1'

const DOMAINS = [
	{ hostname: 'zuiddrecht.nl', verified: true, valid: '14 jan 2027', txt: '' },
	{ hostname: 'nieuw.zuiddrecht.nl', verified: false, valid: '', txt: 'verify=8f3a1c' },
]
const OBJECT = { id: 'p-1', slug: 'zuiddrecht', domains: DOMAINS }

const CONTENT = {
	field: 'domains',
	key: 'hostname',
	variant: 'table',
	columns: [
		{ header: 'Domain', path: 'hostname', strong: true },
		{ header: 'Status', path: 'verified', pill: true, map: { true: 'Verified', false: 'Waiting' }, variantMap: { true: 'success', false: 'warning' } },
		{ header: 'Certificate', path: 'valid' },
	],
	row: { title: 'hostname', detail: { template: '{hostname}: set the TXT record {txt}.', when: { verified: false } } },
	rowActions: [
		{ id: 'verify', label: 'Check again', placement: 'band', when: { verified: false }, request: { method: 'POST', url: '/apps/portaliq/api/domains/verify', payload: { hostname: '@row.hostname' } } },
		{ id: 'cert', label: 'Renew certificate', request: { method: 'POST', url: '/apps/portaliq/api/domains/cert' } },
	],
	add: { label: 'Add domain', trigger: 'button', placement: 'header', fields: [{ key: 'hostname', label: 'Domain', required: true }] },
	remove: { label: 'Remove' },
}

const stubs = {
	NcButton: { emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
	NcActions: { template: '<div class="actions" v-bind="$attrs"><slot /></div>' },
	NcActionButton: { emits: ['click'], template: '<button class="action" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
	NcTextField: {
		props: ['modelValue', 'label'],
		emits: ['update:modelValue'],
		template: '<label>{{ label }}<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
	},
	NcSelect: { template: '<div />' },
}

function make(content = CONTENT) {
	return mount(CnFieldListWidget, {
		props: { content, objectData: OBJECT, objectId: 'p-1', register: 'portaliq', schema: 'portal' },
		global: { stubs },
	})
}

describe('CnFieldListWidget table variant', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockPost.mockReset()
		mockGet.mockResolvedValue({ data: OBJECT })
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...OBJECT, ...body } }))
		mockPost.mockResolvedValue({ data: {} })
	})

	test('a header row and one row per entry with the configured columns', () => {
		const wrapper = make()
		expect(wrapper.findAll('thead th').map((th) => th.text()).slice(0, 3)).toEqual(['Domain', 'Status', 'Certificate'])
		expect(wrapper.findAll('tbody tr')).toHaveLength(2)
		const first = wrapper.find('[data-testid="cn-field-list-row-zuiddrecht.nl"]')
		expect(first.find('strong').text()).toBe('zuiddrecht.nl')
		expect(first.text()).toContain('Verified')
		expect(first.text()).toContain('14 jan 2027')
		expect(wrapper.find('[data-testid="cn-field-list-row-nieuw.zuiddrecht.nl"]').text()).toContain('Waiting')
	})

	test('the row menu holds the actions not placed in the band, then remove, named after the row', () => {
		const wrapper = make()
		const menu = wrapper.find('[data-testid="cn-field-list-menu-zuiddrecht.nl"]')
		expect(menu.attributes('arialabel') || menu.attributes('aria-label') || '').toContain('zuiddrecht.nl')
		expect(wrapper.findAll('[data-testid="cn-field-list-menu-zuiddrecht.nl"] .action').map((a) => a.text())).toEqual(['Renew certificate', 'Remove'])
		expect(wrapper.find('[data-testid="cn-field-list-menu-verify-zuiddrecht.nl"]').exists()).toBe(false)
	})

	test('a menu item runs the row action; remove PATCHes the list without the row', async () => {
		const wrapper = make()
		await wrapper.find('[data-testid="cn-field-list-menu-cert-zuiddrecht.nl"]').trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/portaliq/api/domains/cert', {})
		await wrapper.find('[data-testid="cn-field-list-menu-remove-nieuw.zuiddrecht.nl"]').trigger('click')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { domains: [DOMAINS[0]] })
	})

	test('a detail line is a warning band under the table with its band action', async () => {
		const wrapper = make()
		const band = wrapper.find('[data-testid="cn-field-list-band-nieuw.zuiddrecht.nl"]')
		expect(band.text()).toContain('nieuw.zuiddrecht.nl: set the TXT record verify=8f3a1c.')
		expect(wrapper.find('[data-testid="cn-field-list-band-zuiddrecht.nl"]').exists()).toBe(false)
		await band.find('[data-testid="cn-field-list-band-action-verify-nieuw.zuiddrecht.nl"]').trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/portaliq/api/domains/verify', { hostname: 'nieuw.zuiddrecht.nl' })
	})

	test('the add form opens from the header button and closes after a save', async () => {
		const wrapper = make()
		expect(wrapper.find('[data-testid="cn-field-list-add"]').exists()).toBe(false)
		await wrapper.find('[data-testid="cn-field-list-open-add"]').trigger('click')
		const input = wrapper.find('[data-testid="cn-field-list-add"] input')
		await input.setValue('extra.zuiddrecht.nl')
		await wrapper.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { domains: [...DOMAINS, { hostname: 'extra.zuiddrecht.nl' }] })
		expect(wrapper.find('[data-testid="cn-field-list-add"]').exists()).toBe(false)
	})

	test('without variant: table the list rows are drawn as before', () => {
		const wrapper = make({ ...CONTENT, variant: undefined, add: { label: 'Add', fields: CONTENT.add.fields } })
		expect(wrapper.find('table').exists()).toBe(false)
		expect(wrapper.findAll('.cn-field-list-widget__row')).toHaveLength(2)
		expect(wrapper.find('[data-testid="cn-field-list-open-add"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-field-list-add"]').exists()).toBe(true)
	})
})
