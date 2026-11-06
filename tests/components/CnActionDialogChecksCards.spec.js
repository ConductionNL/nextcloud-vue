/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An action dialog ticks several items, offers one choice as cards, and can
 * say what its request answered.
 *
 * @spec openspec/changes/action-dialog-checks-cards/specs/action-dialog-checks-cards/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnActionDialog from '../../src/components/CnActionDialog/CnActionDialog.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const RECORD = {
	documents: [{ id: 'd1', name: 'Quote' }, { id: 'd2', name: 'Floor plan' }],
}

const stubs = {
	CnDialog: { name: 'CnDialog', template: '<div><slot /><slot name="actions" /></div>' },
	NcSelect: true,
	NcTextField: true,
	NcCheckboxRadioSwitch: {
		name: 'NcCheckboxRadioSwitch',
		props: ['modelValue', 'type'],
		emits: ['update:modelValue'],
		template: '<label class="check" :data-on="String(modelValue)"><slot /></label>',
	},
	NcButton: {
		name: 'NcButton',
		props: ['disabled'],
		emits: ['click'],
		template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
	},
	CnChoiceCards: { name: 'CnChoiceCards', props: ['modelValue', 'options', 'label'], emits: ['update:modelValue'], template: '<div class="cards" />' },
	CnIcon: true,
}

function mountDialog(fields, confirm = {}, extra = {}) {
	return mount(CnActionDialog, {
		props: {
			object: RECORD,
			config: { title: 'Act', fields, confirm: { label: 'Go', request: { url: '/apps/x/act', ...confirm } }, ...extra },
		},
		global: { stubs },
	})
}

function confirmButton(w) {
	return w.findAll('button').find((b) => b.text() === 'Go')
}

const SPLIT = { field: 'docs', type: 'checks', label: 'Documents that go along', itemsPath: 'documents', optionValue: 'id', optionLabel: '{name}', default: ['d1'] }

describe('a checks field', () => {
	beforeEach(() => axios.post.mockReset())

	it('lists the items off the record in a fieldset, ticking the default', async () => {
		const w = mountDialog([SPLIT])
		await flushPromises()
		const set = w.find('[data-testid="cn-action-dialog-checks-docs"]')
		expect(set.classes()).toContain('cn-action-dialog__check-field')
		expect(set.classes()).not.toContain('cn-action-dialog__checks')
		expect(set.element.tagName).toBe('FIELDSET')
		expect(set.find('legend').text()).toBe('Documents that go along')
		const checks = set.findAllComponents({ name: 'NcCheckboxRadioSwitch' })
		expect(checks.map((c) => c.text())).toEqual(['Quote', 'Floor plan'])
		expect(checks.map((c) => c.props('modelValue'))).toEqual([true, false])
	})

	it('sends the ticked values as a list', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = mountDialog([SPLIT])
		await flushPromises()
		w.findAllComponents({ name: 'NcCheckboxRadioSwitch' })[1].vm.$emit('update:modelValue', true)
		await flushPromises()
		await confirmButton(w).trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][1].docs).toEqual(['d1', 'd2'])
	})

	it('drops an unticked item, and "all" starts with every item', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = mountDialog([{ ...SPLIT, default: 'all' }])
		await flushPromises()
		w.findAllComponents({ name: 'NcCheckboxRadioSwitch' })[0].vm.$emit('update:modelValue', false)
		await flushPromises()
		await confirmButton(w).trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][1].docs).toEqual(['d2'])
	})

	it('holds the confirm until something is ticked, unless optional', async () => {
		const required = mountDialog([{ ...SPLIT, default: undefined }])
		await flushPromises()
		expect(confirmButton(required).attributes('disabled')).toBeDefined()
		required.findAllComponents({ name: 'NcCheckboxRadioSwitch' })[0].vm.$emit('update:modelValue', true)
		await flushPromises()
		expect(confirmButton(required).attributes('disabled')).toBeUndefined()

		const optional = mountDialog([{ ...SPLIT, default: undefined, required: false }])
		await flushPromises()
		expect(confirmButton(optional).attributes('disabled')).toBeUndefined()
	})

	it('reads plain options and says when there is nothing to tick', async () => {
		const w = mountDialog([{ field: 'a', type: 'checks', label: 'A', options: ['one'], required: false }, { field: 'b', type: 'checks', label: 'B', itemsPath: 'missing', required: false }])
		await flushPromises()
		expect(w.find('[data-testid="cn-action-dialog-checks-a"]').text()).toContain('one')
		expect(w.find('[data-testid="cn-action-dialog-checks-b"]').text()).toContain('Nothing to choose from.')
	})
})

describe('a cards field', () => {
	const SHARE = { field: 'mode', type: 'cards', label: 'How', default: 'share', options: [{ value: 'share', label: 'Share', description: 'You stay owner' }, { value: 'transfer', label: 'Transfer' }] }

	beforeEach(() => axios.post.mockReset())

	it('draws the options as cards and sends the default', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = mountDialog([SHARE])
		await flushPromises()
		const cards = w.findComponent({ name: 'CnChoiceCards' })
		expect(cards.props('modelValue')).toBe('share')
		expect(cards.props('options')[0].description).toBe('You stay owner')
		await confirmButton(w).trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][1].mode).toBe('share')
	})

	it('sends the choice, and holds the confirm while nothing is chosen', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = mountDialog([{ ...SHARE, default: undefined }])
		await flushPromises()
		expect(confirmButton(w).attributes('disabled')).toBeDefined()
		w.findComponent({ name: 'CnChoiceCards' }).vm.$emit('update:modelValue', 'transfer')
		await flushPromises()
		await confirmButton(w).trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][1].mode).toBe('transfer')
	})
})

describe('the answer of the request', () => {
	beforeEach(() => axios.post.mockReset())

	it('shows the text at answerPath in place of the done text', async () => {
		axios.post.mockResolvedValue({ data: { message: 'No open case in another domain.' } })
		const w = mountDialog([], { answerPath: 'message' }, { doneText: 'Done looking' })
		await flushPromises()
		await confirmButton(w).trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-action-dialog-done"]').text()).toBe('No open case in another domain.')
	})

	it('falls back to the done text when the answer lacks the path', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = mountDialog([], { answerPath: 'message' }, { doneText: 'Done looking' })
		await flushPromises()
		await confirmButton(w).trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-action-dialog-done"]').text()).toBe('Done looking')
	})
})

describe('the readiness rows', () => {
	const rows = (labels, items) => CnActionDialog.computed.checklist.call({ config: { checklist: { labels } }, items, fill: (value) => value })

	it('drops a met row marked hideWhenMet and keeps it while unmet', () => {
		const labels = { ended: { label: 'Ended', hideWhenMet: true } }
		expect(rows(labels, [{ id: 'ended', met: true }])).toEqual([])
		expect(rows(labels, [{ id: 'ended', met: false }]).map((row) => row.id)).toEqual(['ended'])
	})

	it('uses a detail with detailWhen only while that path is filled', () => {
		const labels = { decision: { detail: 'on {date}', detailWhen: 'date' } }
		expect(rows(labels, [{ id: 'decision', met: true, date: '2026-10-28' }])[0].detail).toBe('on {date}')
		expect(rows(labels, [{ id: 'decision', met: true, detail: 'partly public' }])[0].detail).toBe('partly public')
	})
})
