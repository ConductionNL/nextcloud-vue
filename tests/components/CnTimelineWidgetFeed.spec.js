/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The read view as an activity card: pill chips, `layout: 'feed'` rows (a
 * round icon, a meta line of when, kind and who, then the text) and a note
 * composer that writes an OpenRegister note on the record and reads the
 * timeline again.
 *
 * @spec openspec/changes/timeline-activity-card/specs/timeline-widget/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((path) => `/index.php${path}`) }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const axios = require('@nextcloud/axios').default
const { emit, subscribe } = require('@nextcloud/event-bus')
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const SOURCE = {
	url: '/apps/pipelinq/api/timeline',
	params: { entityType: 'client', entityId: '@objectId' },
	typeLabels: { interaction: 'contact moment', note: 'note' },
	userField: 'userName',
}

const YEAR = new Date().getFullYear()

const PAGE = { items: [
	{ id: 1, type: 'interaction', title: 'Called about the permit', date: `${YEAR}-10-02T09:30:00`, userName: 'Fatma Yildiz' },
	{ id: 2, type: 'note', title: 'The street plan is under Documents.', date: `${YEAR}-10-01T10:40:00`, userName: 'Pieter Jansen' },
], page: 1, pages: 1 }

const ComposerStub = {
	name: 'CnNoteComposer',
	props: ['modelValue', 'placeholder', 'label', 'register', 'schema', 'objectId'],
	emits: ['update:modelValue', 'submit'],
	template: '<textarea data-testid="composer-stub" :placeholder="placeholder" :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}

function mountWidget(content) {
	return mount(CnTimelineWidget, {
		props: { objectId: 'k-1', register: 'pipelinq', schema: 'client', content },
		global: {
			stubs: {
				CnNoteComposer: ComposerStub,
				NcButton: { props: ['disabled'], template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
			},
		},
	})
}

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	emit.mockReset()
	subscribe.mockReset()
})

describe('CnTimelineWidget: chips as pills', () => {
	it('draws the type chips as pill buttons, the chosen one filled and pressed', async () => {
		axios.get.mockResolvedValue({ data: PAGE })
		const w = mountWidget({ endpointSource: SOURCE, typeChips: [{ value: 'interaction', label: 'Contact moments' }, { value: 'note', label: 'Notes' }] })
		await flushPromises()
		const chips = w.findAll('.cn-timeline-widget__chip')
		expect(chips.map((c) => c.text())).toEqual(['All', 'Contact moments', 'Notes'])
		expect(chips[0].element.tagName).toBe('BUTTON')
		expect(chips[0].classes()).toContain('cn-timeline-widget__chip--active')
		expect(chips[0].attributes('aria-pressed')).toBe('true')
		await chips[2].trigger('click')
		await flushPromises()
		const after = w.findAll('.cn-timeline-widget__chip')
		expect(after[2].classes()).toContain('cn-timeline-widget__chip--active')
		expect(after[0].attributes('aria-pressed')).toBe('false')
	})
})

describe('CnTimelineWidget: layout feed', () => {
	it('draws each event as a round icon, a meta line of when, kind and who, and the text', async () => {
		axios.get.mockResolvedValue({ data: PAGE })
		const w = mountWidget({ order: 'desc', layout: 'feed', endpointSource: SOURCE })
		await flushPromises()
		expect(w.find('.cn-timeline-widget--feed').exists()).toBe(true)
		const rows = w.findAll('[data-testid="cn-timeline-widget-event"]')
		expect(rows).toHaveLength(2)
		expect(rows[0].find('.cn-timeline-widget__feed-icon').exists()).toBe(true)
		expect(rows[0].find('.cn-timeline-widget__dot').exists()).toBe(false)
		const meta = rows[0].find('.cn-timeline-widget__feed-meta').text()
		expect(meta).toMatch(/ · contact moment · Fatma Yildiz$/)
		expect(meta).not.toMatch(String(YEAR))
		expect(rows[0].find('.cn-timeline-widget__feed-text').text()).toBe('Called about the permit')
		expect(rows[1].find('.cn-timeline-widget__feed-meta').text()).toMatch(/ · note · Pieter Jansen$/)
	})

	it('keeps a detail that says more than the text, under it', async () => {
		axios.get.mockResolvedValue({ data: { items: [{ id: 1, type: 'interaction', title: 'Called', description: 'Asked when the permit starts.', date: '2026-10-02T09:30:00' }], page: 1, pages: 1 } })
		const w = mountWidget({ layout: 'feed', endpointSource: SOURCE })
		await flushPromises()
		expect(w.find('.cn-timeline-widget__feed-detail').text()).toBe('Asked when the permit starts.')
	})

	it('names a date-only moment without a time', async () => {
		axios.get.mockResolvedValue({ data: { items: [{ id: 1, type: 'calendar', title: 'Site visit booked', date: '2026-10-05' }], page: 1, pages: 1 } })
		const w = mountWidget({ layout: 'feed', endpointSource: SOURCE })
		await flushPromises()
		expect(w.find('.cn-timeline-widget__feed-meta').text()).not.toMatch(/\d{1,2}:\d{2}/)
	})
})

describe('CnTimelineWidget: note composer', () => {
	const CONTENT = {
		layout: 'feed',
		endpointSource: SOURCE,
		composer: { placeholder: 'Add an internal note. Type @ to mention a colleague.', label: 'Add note', submitLabel: 'Add note' },
	}

	it('writes the note on the record and reads the timeline again', async () => {
		axios.get.mockResolvedValue({ data: PAGE })
		axios.post.mockResolvedValue({ data: { id: 7 } })
		const w = mountWidget(CONTENT)
		await flushPromises()
		const box = w.find('[data-testid="composer-stub"]')
		expect(box.attributes('placeholder')).toBe('Add an internal note. Type @ to mention a colleague.')
		const button = w.find('[data-testid="cn-timeline-widget-add-note"]')
		expect(button.text()).toBe('Add note')
		expect(button.attributes('disabled')).toBeDefined()
		await box.setValue('Called back, all clear.')
		expect(w.find('[data-testid="cn-timeline-widget-add-note"]').attributes('disabled')).toBeUndefined()
		await w.find('[data-testid="cn-timeline-widget-add-note"]').trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/pipelinq/client/k-1/notes', { message: 'Called back, all clear.' })
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(axios.get.mock.calls[1][1].params._page).toBe(1)
		expect(w.find('[data-testid="composer-stub"]').element.value).toBe('')
		expect(emit).toHaveBeenCalledWith('cn:timeline:changed', expect.objectContaining({ objectId: 'k-1' }))
	})

	it('keeps the text and says so when the note is not saved', async () => {
		axios.get.mockResolvedValue({ data: PAGE })
		axios.post.mockRejectedValue(new Error('down'))
		const w = mountWidget(CONTENT)
		await flushPromises()
		await w.find('[data-testid="composer-stub"]').setValue('Keep me')
		await w.find('[data-testid="cn-timeline-widget-add-note"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="composer-stub"]').element.value).toBe('Keep me')
		expect(w.find('[data-testid="cn-timeline-widget-note-error"]').exists()).toBe(true)
	})

	it('draws no composer without one configured', async () => {
		axios.get.mockResolvedValue({ data: PAGE })
		const w = mountWidget({ endpointSource: SOURCE })
		await flushPromises()
		expect(w.find('[data-testid="composer-stub"]').exists()).toBe(false)
	})

	it('reads again when another part of the page changes the timeline of this record', async () => {
		axios.get.mockResolvedValue({ data: PAGE })
		mountWidget(CONTENT)
		await flushPromises()
		const handler = subscribe.mock.calls.find(([channel]) => channel === 'cn:timeline:changed')[1]
		handler({ objectId: 'other' })
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(1)
		handler({ objectId: 'k-1' })
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(2)
	})
})
