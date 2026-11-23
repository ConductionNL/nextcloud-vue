/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldListWidget: a row title that links (`row.href`), a lead line filled
 * from the object (`lead`), and a call after every save (`afterSave`).
 *
 * @spec openspec/changes/field-list-links-lead-after-save/specs/field-list/spec.md#requirement-a-field-list-links-its-rows-leads-with-the-object-and-calls-after-a-save
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

import '../../src/components/CnFieldListWidget/index.js'

const CnFieldListWidget = require('../../src/components/CnFieldListWidget/CnFieldListWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

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

const ticket = {
	id: 't-1',
	subjectReference: {
		title: 'Bouwvergunning Dorpsstraat 4',
		items: [
			{ title: 'Besluit', url: 'https://open.example/besluit.pdf' },
			{ title: 'Aanvraag', url: 'javascript:alert(1)' },
			{ title: 'Tekening', url: '/apps/files/f/3' },
		],
	},
}

const SNAPSHOT = {
	field: 'subjectReference.items',
	readOnly: true,
	lead: 'Question about the dossier "{subjectReference.title}"',
	row: { title: 'title', href: 'url' },
	emptyText: 'The dossier held no documents when the question was asked.',
}

describe('CnFieldListWidget links, lead and afterSave', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockPost.mockReset()
	})

	it('links a row title to a safe href, opening an absolute one in a new tab', () => {
		const w = mountList(SNAPSHOT, ticket)
		const links = w.findAll('a.cn-field-list-widget__title')
		expect(links.map((a) => a.text())).toEqual(['Besluit', 'Tekening'])
		expect(links[0].attributes('href')).toBe('https://open.example/besluit.pdf')
		expect(links[0].attributes('target')).toBe('_blank')
		expect(links[0].attributes('rel')).toBe('noopener noreferrer')
		expect(links[1].attributes('target')).toBeUndefined()
		// A javascript: url is never a link; the title still shows.
		expect(w.text()).toContain('Aanvraag')
	})

	it('fills the lead line from the object, through the translator', () => {
		const w = mountList(SNAPSHOT, ticket, (key) => key.replace('Question about the dossier', 'Vraag over het dossier'))
		expect(w.find('[data-testid="cn-field-list-lead"]').text()).toBe('Vraag over het dossier "Bouwvergunning Dorpsstraat 4"')
	})

	it('calls the afterSave endpoint once a save went through', async () => {
		mockGet.mockResolvedValue({ data: { editors: [] } })
		mockPatch.mockResolvedValue({ data: { editors: [{ userId: 'anna' }] } })
		mockPost.mockResolvedValue({ data: {} })
		const w = mountList({
			...EDITORS,
			afterSave: { url: '/apps/pipelinq/api/contacts-sync/write-back', method: 'POST', body: { objectType: 'contact', objectId: '@objectId' } },
		})
		await w.find('[data-testid="cn-field-list-input-userId"] input').setValue('anna')
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/contacts-sync/write-back', { objectType: 'contact', objectId: 'p-1' })
	})

	it('keeps the save and says so when the afterSave call fails', async () => {
		mockGet.mockResolvedValue({ data: { editors: [] } })
		mockPatch.mockResolvedValue({ data: { editors: [{ userId: 'anna' }] } })
		mockPost.mockRejectedValue(new Error('down'))
		const w = mountList({
			...EDITORS,
			afterSave: { url: '/apps/pipelinq/api/contacts-sync/write-back', failureText: 'Saved here, not in Contacts.' },
		})
		await w.find('[data-testid="cn-field-list-input-userId"] input').setValue('anna')
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		await flush()
		expect(w.find('[data-testid="cn-field-list-row-anna"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-field-list-notice"]').text()).toBe('Saved here, not in Contacts.')
	})
})
