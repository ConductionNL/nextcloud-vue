/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldListWidget: an entry is edited in place (`edit`), a checkbox field
 * can be exclusive across the list (one primary address), and a row title
 * links with a scheme (`mailto:`, `tel:`).
 *
 * @spec openspec/changes/field-list-edit/specs/field-list/spec.md#requirement-a-field-list-entry-can-be-edited-and-one-entry-can-be-the-primary
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), patch: (...a) => mockPatch(...a), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

import { mount } from '@vue/test-utils'

const CnFieldListWidget = require('../../src/components/CnFieldListWidget/CnFieldListWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const EMAILS = {
	field: 'emails',
	row: {
		title: 'value',
		href: { path: 'value', scheme: 'mailto' },
		pill: { path: 'kind', map: { work: 'Work', private: 'Private' } },
		meta: [{ path: 'primary', map: { true: 'Primary', false: '' } }],
	},
	add: {
		label: 'Add',
		trigger: 'button',
		exclusive: ['primary'],
		fields: [
			{ key: 'kind', label: 'Kind', type: 'select', options: [{ value: 'work', label: 'Work' }, { value: 'private', label: 'Private' }] },
			{ key: 'value', label: 'Email address', required: true },
			{ key: 'primary', label: 'Primary', type: 'checkbox' },
		],
	},
	edit: { label: 'Edit' },
	remove: { label: 'Remove' },
}

const contact = {
	id: 'c-1',
	emails: [{ kind: 'work', value: 'jan@work.example', primary: true }, { kind: 'private', value: 'jan@home.example', primary: false }],
}

/**
 * Mount the list.
 *
 * @param {object} content The content.
 * @return {object} The wrapper.
 */
function mountList(content = EMAILS) {
	return mount(CnFieldListWidget, {
		props: { content, objectData: contact, objectId: 'c-1', register: 'pipelinq', schema: 'contact' },
		global: {
			provide: { cnTranslate: (key) => key },
			stubs: {
				NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				NcNoteCard: { props: ['type'], template: '<div class="note"><slot /></div>' },
				NcTextField: {
					props: ['modelValue', 'label'],
					emits: ['update:modelValue'],
					template: '<label>{{ label }}<input class="text" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
				},
				NcSelect: { props: ['modelValue', 'options', 'inputLabel'], emits: ['update:modelValue'], template: '<div class="select-stub" />' },
				NcCheckboxRadioSwitch: {
					inheritAttrs: false,
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template: '<label><input type="checkbox" class="check" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
				},
				CnStatusBadge: { props: ['label'], template: '<span class="pill">{{ label }}</span>' },
			},
		},
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockPatch.mockReset()
	mockGet.mockResolvedValue({ data: { emails: contact.emails } })
	mockPatch.mockImplementation((url, body) => Promise.resolve({ data: body }))
})

describe('CnFieldListWidget: edit and primary', () => {
	it('links each address with its scheme', () => {
		const w = mountList()
		const links = w.findAll('a.cn-field-list-widget__title')
		expect(links.map((a) => a.attributes('href'))).toEqual(['mailto:jan@work.example', 'mailto:jan@home.example'])
		expect(links[0].attributes('target')).toBeUndefined()
	})

	it('opens an entry in the form, prefilled, and saves it in place', async () => {
		const w = mountList()
		await w.find('[data-testid="cn-field-list-edit-1"]').trigger('click')
		const input = w.find('[data-testid="cn-field-list-input-value"] input.text')
		expect(input.element.value).toBe('jan@home.example')
		await input.setValue('jan@new.example')
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch.mock.calls[0][1].emails).toEqual([
			{ kind: 'work', value: 'jan@work.example', primary: true },
			{ kind: 'private', value: 'jan@new.example', primary: false },
		])
	})

	it('makes one entry the primary and clears it on the others', async () => {
		const w = mountList()
		await w.find('[data-testid="cn-field-list-edit-1"]').trigger('click')
		await w.find('[data-testid="cn-field-list-input-primary"] input.check').setValue(true)
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		await flush()
		expect(mockPatch.mock.calls[0][1].emails.map((e) => e.primary)).toEqual([false, true])
	})

	it('adds an entry as the primary and clears the others', async () => {
		const w = mountList()
		await w.find('[data-testid="cn-field-list-open-add"]').trigger('click')
		await w.find('[data-testid="cn-field-list-input-value"] input.text').setValue('jan@third.example')
		await w.find('[data-testid="cn-field-list-input-primary"] input.check').setValue(true)
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		await flush()
		expect(mockPatch.mock.calls[0][1].emails.map((e) => [e.value, e.primary])).toEqual([
			['jan@work.example', false],
			['jan@home.example', false],
			['jan@third.example', true],
		])
	})

	it('names each edit button after its row, and offers none read-only', () => {
		expect(mountList().find('[data-testid="cn-field-list-edit-0"]').attributes('aria-label')).toBe('Edit: jan@work.example')
		expect(mountList({ ...EMAILS, readOnly: true }).find('[data-testid="cn-field-list-edit-0"]').exists()).toBe(false)
	})
})
