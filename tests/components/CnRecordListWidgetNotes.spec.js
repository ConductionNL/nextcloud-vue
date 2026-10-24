/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list can collect a note per row and record it on the row's own
 * notes endpoint (`presentation: "notes"`, DqDagAfsluiten "Nog open van
 * vandaag"): drafts stay in the browser and count as the ready figure, one
 * button records every filled row, and the page refetches afterwards. Rows
 * can open different pages (`rowRouteField`), and an empty list can say why
 * (`emptyTexts`).
 *
 * @spec openspec/changes/record-list-notes/specs/record-list-notes/spec.md#requirement-a-record-list-can-collect-and-record-a-note-per-row
 * @spec openspec/changes/record-list-notes/specs/record-list-notes/spec.md#requirement-a-record-list-can-say-why-it-is-empty
 */
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

/**
 * Let the endpoint read and the posts settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const OPEN = [
	{ id: 'case:c1', title: 'Bezwaar parkeerboete Havenstraat', kindLabel: 'Case', routeName: 'CaseDetail', subjectId: 'c1', notesUrl: '/apps/openregister/api/objects/dossiq/case/c1/notes' },
	{ id: 'task:t1', title: 'Advies boomdeskundige beoordelen', kindLabel: 'Task', routeName: 'TaskDetail', subjectId: 't1', notesUrl: '/apps/openregister/api/flow-tasks/t1/notes' },
]

const CONTENT = {
	endpointSource: { url: '/apps/dossiq/api/personal-queue/day', responsePath: 'open' },
	presentation: 'notes',
	title: '{title}',
	pill: { field: 'kindLabel' },
	rowRouteField: 'routeName',
	rowIdField: 'subjectId',
	noteAction: {
		urlField: 'notesUrl',
		label: 'Record it',
		fieldLabel: 'What happened',
		readyLabel: 'filled in, not recorded yet',
		draftsKey: 'end-of-day',
		recordAll: { label: 'Close out your day', title: 'Ready for today?', cancel: { label: 'Cancel', route: 'MyWorkHome' } },
	},
}

const router = { resolve: (to) => ({ href: `/${to.name}/${to.params.id}` }), push: jest.fn() }

/**
 * Mount the list over the open rows.
 *
 * @param {object} [content] The content.
 * @return {import('@vue/test-utils').VueWrapper} The list.
 */
function mountList(content = CONTENT) {
	return mount(CnRecordListWidget, {
		props: { content },
		global: { mocks: { $router: router }, stubs: { RouterLink: { props: ['to'], template: '<a :data-to="to.name"><slot /></a>' } } },
	})
}

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	emit.mockReset()
	invalidateEndpointSourceCache()
	window.sessionStorage.clear()
})

describe('CnRecordListWidget notes', () => {
	it('draws a field per row and opens each row on its own page', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		const w = mountList()
		await flush()
		expect(w.find('[data-testid="cn-record-list-notes"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-record-list-note-case:c1"]').exists()).toBe(true)
		expect(w.findAll('.cn-record-notes__title').map((a) => a.attributes('data-to'))).toEqual(['CaseDetail', 'TaskDetail'])
	})

	it('colours an ended or ending term as an error and a term to come as a warning', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		const w = mountList()
		await flush()
		const rows = w.findComponent({ name: 'CnRecordNoteRows' })
		expect(rows.vm.dueToneOf({ tone: 'danger' })).toBe('error')
		expect(rows.vm.dueToneOf({ tone: 'today' })).toBe('error')
		expect(rows.vm.dueToneOf({ tone: 'upcoming' })).toBe('warning')
		expect(rows.vm.dueToneOf({ tone: 'empty' })).toBe('muted')
	})

	it('keeps a typed note in the browser and counts it as ready', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		const w = mountList()
		await flush()
		const rows = w.findComponent({ name: 'CnRecordNoteRows' })
		rows.vm.setDraft('case:c1', 'Hoorzitting gepland')
		await flush()
		expect(w.find('.cn-record-notes__ready-figure').text()).toBe('1')
		expect(JSON.parse(window.sessionStorage.getItem('cn-record-list-notes:end-of-day'))).toEqual({ 'case:c1': 'Hoorzitting gepland' })

		const again = mountList()
		await flush()
		expect(again.find('.cn-record-notes__ready-figure').text()).toBe('1')
	})

	it('records a note on the row\'s own endpoint, clears it and refreshes the page', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		axios.post.mockResolvedValue({ data: { id: 1 } })
		const w = mountList()
		await flush()
		const rows = w.findComponent({ name: 'CnRecordNoteRows' })
		rows.vm.setDraft('task:t1', 'Advies gelezen')
		await rows.vm.record(rows.vm.items[1])
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/openregister/api/flow-tasks/t1/notes', { message: 'Advies gelezen' })
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', {})
		expect(rows.vm.hasDraft('task:t1')).toBe(false)
	})

	it('tells the row\'s leaf that the note is recorded, so it can record its hours with it', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		axios.post.mockResolvedValue({ data: { id: 1 } })
		const heard = []
		const listener = (event) => heard.push(event.detail)
		document.addEventListener('cn-record-notes:recorded', listener)
		const w = mountList({ ...CONTENT, rowLeaf: { id: 'humaniq-hours', app: 'humaniq', register: 'dossiq', objectIdField: 'subjectId', schemaField: 'subjectType' } })
		await flush()
		const rows = w.findComponent({ name: 'CnRecordNoteRows' })
		rows.vm.setDraft('task:t1', 'Advies gelezen')
		await rows.vm.record(rows.vm.items[1])
		document.removeEventListener('cn-record-notes:recorded', listener)
		expect(heard).toEqual([{ objectId: 't1', register: 'dossiq', schema: '', surface: 'row', note: 'Advies gelezen' }])
	})

	it('sends no leaf event for a list without a leaf', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		axios.post.mockResolvedValue({ data: { id: 1 } })
		const heard = []
		const listener = (event) => heard.push(event.detail)
		document.addEventListener('cn-record-notes:recorded', listener)
		const w = mountList()
		await flush()
		const rows = w.findComponent({ name: 'CnRecordNoteRows' })
		rows.vm.setDraft('case:c1', 'Gebeld')
		await rows.vm.record(rows.vm.items[0])
		document.removeEventListener('cn-record-notes:recorded', listener)
		expect(heard).toEqual([])
	})

	it('records every filled row with one button and refreshes once', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		axios.post.mockResolvedValue({ data: {} })
		const w = mountList()
		await flush()
		const rows = w.findComponent({ name: 'CnRecordNoteRows' })
		rows.vm.setDraft('case:c1', 'Gebeld')
		rows.vm.setDraft('task:t1', 'Gelezen')
		await rows.vm.recordEvery()
		expect(axios.post).toHaveBeenCalledTimes(2)
		expect(emit).toHaveBeenCalledTimes(1)
		expect(rows.vm.readyCount).toBe(0)
	})

	it('keeps the note when recording fails, and says so', async () => {
		axios.get.mockResolvedValue({ data: { open: OPEN } })
		axios.post.mockRejectedValue(new Error('500'))
		const w = mountList()
		await flush()
		const rows = w.findComponent({ name: 'CnRecordNoteRows' })
		rows.vm.setDraft('case:c1', 'Gebeld')
		await rows.vm.record(rows.vm.items[0])
		await flush()
		expect(rows.vm.hasDraft('case:c1')).toBe(true)
		expect(w.find('[data-testid="cn-record-list-notes-error"]').exists()).toBe(true)
		expect(emit).not.toHaveBeenCalled()
	})

	it('says why it is empty with the first emptyTexts entry that holds', async () => {
		axios.get.mockImplementation(async (url) => (url.includes('/day') ? { data: { open: [], opened: 0 } } : { data: {} }))
		global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ open: [], opened: 0 }) }))
		const w = mountList({
			...CONTENT,
			emptyText: 'Everything you opened today has a note.',
			emptyTexts: [{ when: { endpoint: '/apps/dossiq/api/personal-queue/day', field: 'opened', op: 'eq', value: 0 }, text: 'You have not opened anything today.' }],
		})
		await flush()
		expect(w.find('[data-testid="cn-record-list-empty"]').text()).toBe('You have not opened anything today.')
	})
})
