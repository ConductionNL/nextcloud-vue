/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldListWidget `variant: "pairs"`: each entry a label and a value
 * (board PqKlant Contactkanalen "E-mail, privé  s.devries@example.nl"), an
 * empty list as one label with the empty text, and `mirror` writing a plain
 * field from the preferred entry in the same PATCH.
 *
 * @spec openspec/changes/contact-side-cards-generic/specs/contact-side-cards-generic/spec.md#requirement-a-field-list-draws-its-entries-as-label-and-value-pairs
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
		patch: (...args) => mockPatch(...args),
		post: jest.fn(),
	},
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

const { mount } = require('@vue/test-utils')
const CnFieldListWidget = require('../../src/components/CnFieldListWidget/CnFieldListWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const OBJECT_URL = '/index.php/apps/openregister/api/objects/pipelinq/client/k-1'

const EMAILS = {
	field: 'emails',
	variant: 'pairs',
	row: {
		label: ['Email', { path: 'kind', map: { private: 'private', work: 'work' } }],
		title: 'value',
		meta: [{ path: 'primary', map: { true: 'preferred', false: '' } }],
		href: { path: 'value', scheme: 'mailto' },
	},
	add: {
		label: 'Email address',
		trigger: 'button',
		exclusive: ['primary'],
		fields: [
			{ key: 'value', label: 'Email address', required: true },
			{ key: 'primary', label: 'Preferred', type: 'checkbox' },
		],
	},
	mirror: { field: 'email', path: 'value', prefer: 'primary' },
	remove: { label: 'Remove' },
	emptyLabel: 'Email',
	emptyText: 'None yet',
}

const client = {
	id: 'k-1',
	emails: [
		{ kind: 'private', value: 's.devries@example.nl', primary: true },
		{ value: 'sanne@werk.nl', primary: false },
	],
}

/**
 * Mount the widget.
 *
 * @param {object} content The content.
 * @param {object} [object] The object.
 * @return {object} The wrapper.
 */
function mountList(content, object = client) {
	return mount(CnFieldListWidget, {
		props: { content, objectData: object, objectId: 'k-1', register: 'pipelinq', schema: 'client' },
		global: {
			provide: { cnTranslate: (key) => (key === 'Email' ? 'E-mail' : key) },
			stubs: {
				NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				NcActions: { template: '<div class="actions-stub" v-bind="$attrs"><slot /></div>' },
				NcActionButton: { template: '<button class="action-stub" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				NcNoteCard: true,
				NcCheckboxRadioSwitch: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />' },
				NcTextField: {
					props: ['modelValue', 'label'],
					emits: ['update:modelValue'],
					template: '<label>{{ label }}<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
				},
				NcSelect: true,
			},
		},
	})
}

describe('CnFieldListWidget pairs variant', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
	})

	it('draws each entry as a label and a linked value', () => {
		const w = mountList(EMAILS)
		const pairs = w.findAll('[data-testid^="cn-field-list-pair-"]')
		expect(pairs).toHaveLength(2)
		expect(pairs[0].find('dt').text()).toBe('E-mail, private')
		expect(pairs[0].find('.cn-field-list-widget__pair-text').text()).toBe('s.devries@example.nl, preferred')
		expect(pairs[0].find('dd a').attributes('href')).toBe('mailto:s.devries@example.nl')
		expect(pairs[1].find('dt').text()).toBe('E-mail')
		expect(pairs[1].find('.cn-field-list-widget__pair-text').text()).toBe('sanne@werk.nl')
		expect(w.find('.cn-field-list-widget__rows').exists()).toBe(false)
	})

	it('draws an empty list as its label with the empty text', () => {
		const w = mountList(EMAILS, { id: 'k-1', emails: [] })
		const empty = w.find('[data-testid="cn-field-list-pair-empty"]')
		expect(empty.find('dt').text()).toBe('E-mail')
		expect(empty.find('dd').text()).toBe('None yet')
		expect(w.find('[data-testid="cn-field-list-empty"]').exists()).toBe(false)
	})

	it('draws nothing for an empty list without an empty label', () => {
		const w = mountList({ ...EMAILS, emptyLabel: undefined }, { id: 'k-1', emails: [] })
		expect(w.find('[data-testid="cn-field-list-pair-empty"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-field-list-empty"]').exists()).toBe(false)
	})

	it('puts remove in a menu named after the entry', () => {
		const w = mountList(EMAILS)
		const menu = w.find('[data-testid="cn-field-list-menu-item-0"]')
		expect(menu.exists()).toBe(true)
		expect(menu.text()).toContain('Remove')
	})

	it('writes the mirror field from the preferred entry in the same PATCH', async () => {
		mockGet.mockResolvedValue({ data: client })
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...client, ...body } }))
		const w = mountList(EMAILS)
		w.vm.adding = true
		await w.vm.$nextTick()
		await w.find('[data-testid="cn-field-list-input-value"] input').setValue('nieuw@example.nl')
		await w.find('[data-testid="cn-field-list-input-primary"] input').setValue(true)
		await w.find('[data-testid="cn-field-list-add"]').trigger('submit')
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		const [url, body] = mockPatch.mock.calls[0]
		expect(url).toBe(OBJECT_URL)
		expect(body.email).toBe('nieuw@example.nl')
		expect(body.emails.filter((entry) => entry.primary)).toHaveLength(1)
	})

	it('mirrors the first entry when none is preferred, and empties it with the list', async () => {
		const stored = { id: 'k-1', emails: [{ value: 'a@example.nl', primary: false }, { value: 'b@example.nl', primary: false }] }
		mockGet.mockResolvedValue({ data: stored })
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...stored, ...body } }))
		const w = mountList(EMAILS, stored)
		await w.vm.remove({ key: 'item-1' })
		await flush()
		expect(mockPatch.mock.calls[0][1]).toEqual({ emails: [{ value: 'a@example.nl', primary: false }], email: 'a@example.nl' })
		mockGet.mockResolvedValue({ data: { id: 'k-1', emails: [{ value: 'a@example.nl' }] } })
		await w.vm.remove({ key: 'item-0' })
		await flush()
		expect(mockPatch.mock.calls[1][1]).toEqual({ emails: [], email: '' })
	})
})
