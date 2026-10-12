/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldListWidget — the `field-list` widget (abstract-field-list).
 *
 * Guarded: rows of one object field (title, initials, meta, pill, aside,
 * detail line); an add re-reads the stored list and PATCHes that ONE field;
 * a duplicate and an invalid value are refused before any write; a refused
 * PATCH shows the server's words and keeps the list; remove; a row action
 * calls its request with resolved tokens; rowSource merges live state by key;
 * readOnly hides every control.
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
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnFieldListWidget/index.js'

const CnFieldListWidget = require('../../src/components/CnFieldListWidget/CnFieldListWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const OBJECT_URL = '/index.php/apps/openregister/api/objects/portaliq/portal/p-1'

const EDITORS = {
	field: 'editors',
	key: 'userId',
	row: {
		title: 'displayName',
		titleFallback: 'userId',
		avatar: true,
		meta: [{ path: 'role', map: { 'chief-editor': 'Chief editor', editor: 'Editor' } }],
	},
	add: {
		label: 'Add',
		unique: 'userId',
		fields: [
			{ key: 'userId', label: 'User name', required: true },
			{ key: 'role', label: 'Role', type: 'select', options: [{ value: 'editor', label: 'Editor' }, { value: 'chief-editor', label: 'Chief editor' }] },
		],
	},
	remove: { label: 'Remove' },
	emptyText: 'Nobody listed yet.',
}

const portal = {
	id: 'p-1',
	slug: 'zuiddrecht',
	editors: [{ userId: 'pieter', displayName: 'Pieter Jansen', role: 'chief-editor' }],
	domains: [{ hostname: 'zuiddrecht.nl', verified: true }, { hostname: 'nieuw.zuiddrecht.nl', verified: false }],
}

/**
 * Mount the widget.
 *
 * @param {object} content The content.
 * @param {object} [object] The object.
 * @param {Function} [cnTranslate] The injected translator.
 * @return {object} The wrapper.
 */
function mountList(content, object = portal, cnTranslate = (key) => key) {
	return mount(CnFieldListWidget, {
		props: { content, objectData: object, objectId: 'p-1', register: 'portaliq', schema: 'portal' },
		global: {
			provide: { cnTranslate },
			stubs: {
				NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
				NcTextField: {
					props: ['modelValue', 'label', 'error', 'helperText'],
					emits: ['update:modelValue'],
					template: '<label>{{ label }}<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><span class="helper">{{ helperText }}</span></label>',
				},
				NcSelect: { props: ['modelValue', 'options', 'inputLabel'], template: '<div class="select-stub" />' },
			},
		},
	})
}

describe('CnFieldListWidget', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockPost.mockReset()
	})

	it('registers as a renderer-only, content-only detail type', () => {
		const entry = getWidgetTypeEntry('field-list')
		expect(entry.renderer).toBe(CnFieldListWidget)
		expect(entry.form).toBeNull()
		expect(isContentOnlyWidgetDef({ type: 'field-list' })).toBe(true)
	})

	it('draws one row per entry with title, initials and mapped meta', () => {
		const w = mountList(EDITORS)
		const row = w.find('[data-testid="cn-field-list-row-pieter"]')
		expect(row.find('.cn-field-list-widget__title').text()).toBe('Pieter Jansen')
		expect(row.find('.cn-field-list-widget__avatar').text()).toBe('PJ')
		expect(row.find('.cn-field-list-widget__meta').text()).toBe('Chief editor')
	})

	it('shows the empty text for an empty field', () => {
		const w = mountList(EDITORS, { id: 'p-1', editors: [] })
		expect(w.find('[data-testid="cn-field-list-empty"]').text()).toBe('Nobody listed yet.')
	})

	it('adds by re-reading the stored list and PATCHing that one field', async () => {
		const stored = [...portal.editors, { userId: 'anouk', role: 'editor' }]
		mockGet.mockResolvedValue({ data: { ...portal, editors: stored } })
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...portal, ...body } }))
		const w = mountList(EDITORS)
		await w.find('[data-testid="cn-field-list-input-userId"] input').setValue('lars')
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		expect(mockGet).toHaveBeenCalledWith(OBJECT_URL)
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { editors: [...stored, { userId: 'lars', role: 'editor' }] })
		expect(w.findAll('.cn-field-list-widget__row').length).toBe(3)
		expect(w.emitted('saved')).toBeTruthy()
	})

	it('refuses a missing required value and a duplicate before writing', async () => {
		const w = mountList(EDITORS)
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		expect(w.find('[data-testid="cn-field-list-input-userId"] .helper').text()).toBe('Fill this in.')
		expect(mockGet).not.toHaveBeenCalled()

		mockGet.mockResolvedValue({ data: portal })
		await w.find('[data-testid="cn-field-list-input-userId"] input').setValue('pieter')
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		expect(mockPatch).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-field-list-notice"]').text()).toBe('This is already in the list.')
	})

	it('checks a pattern', async () => {
		const content = { field: 'domains', key: 'hostname', row: { title: 'hostname' }, add: { fields: [{ key: 'hostname', label: 'Domain', required: true, pattern: '^[a-z0-9.-]+\\.[a-z]{2,}$', patternMessage: 'Not a domain' }] } }
		const w = mountList(content)
		await w.find('[data-testid="cn-field-list-input-hostname"] input').setValue('not a domain')
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		expect(w.find('[data-testid="cn-field-list-input-hostname"] .helper').text()).toBe('Not a domain')
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('shows the server words on a refused PATCH and keeps the list', async () => {
		mockGet.mockResolvedValue({ data: portal })
		mockPatch.mockRejectedValue({ message: 'Request failed', response: { data: { error: 'You may not change this portal.' } } })
		const w = mountList(EDITORS)
		await w.find('[data-testid="cn-field-list-input-userId"] input').setValue('lars')
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		expect(w.find('[data-testid="cn-field-list-notice"]').text()).toBe('You may not change this portal.')
		expect(w.findAll('.cn-field-list-widget__row').length).toBe(1)
	})

	it('removes an entry by key', async () => {
		mockGet.mockResolvedValue({ data: portal })
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...portal, ...body } }))
		const w = mountList(EDITORS)
		await w.find('[data-testid="cn-field-list-remove-pieter"]').trigger('click')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { editors: [] })
		expect(w.find('[data-testid="cn-field-list-empty"]').exists()).toBe(true)
	})

	it('pills, detail lines and a row action on a matching row, with live state merged by key', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ hostname: 'nieuw.zuiddrecht.nl', name: '_portaliq', value: 'abc' }] } })
		mockPost.mockResolvedValue({ data: { message: 'Checked.' } })
		const content = {
			field: 'domains',
			key: 'hostname',
			row: {
				title: 'hostname',
				pill: { path: 'verified', map: { true: 'Verified', false: 'Waiting' }, variantMap: { true: 'success', false: 'warning' } },
				detail: { template: 'Publish this TXT record: {name} = {value}', when: { verified: false } },
			},
			rowActions: [{ id: 'verify', label: 'Check again', when: { verified: false }, request: { method: 'POST', url: '/apps/portaliq/api/cms/domains/verify', payload: { portal: '@object.slug', hostname: '@row.hostname' } } }],
			rowSource: { url: '/apps/portaliq/api/cms/domains?portal=@object.slug', path: 'results', key: 'hostname' },
		}
		const w = mountList(content)
		await flush()
		await w.vm.$nextTick()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/portaliq/api/cms/domains?portal=zuiddrecht')
		const pending = w.find('[data-testid="cn-field-list-row-nieuw.zuiddrecht.nl"]')
		expect(pending.find('.cn-field-list-widget__detail').text()).toBe('Publish this TXT record: _portaliq = abc')
		expect(w.find('[data-testid="cn-field-list-row-zuiddrecht.nl"] .cn-field-list-widget__detail').exists()).toBe(false)
		expect(w.find('[data-testid="cn-field-list-action-verify-zuiddrecht.nl"]').exists()).toBe(false)

		await pending.find('[data-testid="cn-field-list-action-verify-nieuw.zuiddrecht.nl"]').trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/portaliq/api/cms/domains/verify', { portal: 'zuiddrecht', hostname: 'nieuw.zuiddrecht.nl' })
		expect(w.find('[data-testid="cn-field-list-notice"]').attributes('data-type')).toBe('info')
	})

	it('hides every control when read-only', () => {
		const w = mountList({ ...EDITORS, readOnly: true })
		expect(w.find('[data-testid="cn-field-list-add"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-field-list-remove-pieter"]').exists()).toBe(false)
	})

	it('shows the translated aside fallback when a row has no value, and nothing without a fallback', () => {
		const rows = { field: 'domains', key: 'hostname', row: { title: 'hostname' } }
		const object = { ...portal, domains: [{ hostname: 'a.nl', checkedAt: '2026-10-01' }, { hostname: 'b.nl' }] }
		const dutch = (key) => (key === 'Not checked' ? 'Niet gecontroleerd' : key)

		const withFallback = mountList({ ...rows, row: { ...rows.row, aside: { path: 'checkedAt', prefix: 'Checked', fallback: 'Not checked' } } }, object, dutch)
		expect(withFallback.find('[data-testid="cn-field-list-row-b.nl"] .cn-field-list-widget__aside').text()).toBe('Niet gecontroleerd')
		expect(withFallback.find('[data-testid="cn-field-list-row-a.nl"] .cn-field-list-widget__aside').text()).toBe('Checked 2026-10-01')

		const without = mountList({ ...rows, row: { ...rows.row, aside: { path: 'checkedAt' } } }, object)
		expect(without.find('[data-testid="cn-field-list-row-b.nl"] .cn-field-list-widget__aside').exists()).toBe(false)
	})
})
