/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Replies and group mentions in the sidebar tab and on the detail-page card.
 *
 * @spec openspec/changes/notes-replies-group-mentions-and-images/tasks.md#task-1
 * @spec openspec/changes/notes-replies-group-mentions-and-images/tasks.md#task-2
 * @spec openspec/changes/notes-replies-group-mentions-and-images/tasks.md#task-3
 */
import { mount } from '@vue/test-utils'
import CnNotesCard from '../../src/components/CnNotesCard/CnNotesCard.vue'
import CnNotesTab from '../../src/components/CnObjectSidebar/CnNotesTab.vue'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn().mockResolvedValue([]),
	searchNextcloudGroups: jest.fn().mockResolvedValue([]),
}))

async function flush(w, n = 5) {
	for (let i = 0; i < n; i++) {
		await w.vm.$nextTick()
		await new Promise((r) => setTimeout(r, 0))
	}
}
const ok = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body) })

const withParent = [
	{ id: 'n1', parentId: null, author: 'anna', actorDisplayName: 'Anna', message: 'Who takes this?', created: '2026-01-01T09:00:00Z' },
	{ id: 'n2', parentId: null, author: 'bram', actorDisplayName: 'Bram', message: 'Separate topic', created: '2026-01-01T10:00:00Z' },
	{ id: 'n3', parentId: 'n1', author: 'chris', actorDisplayName: 'Chris', message: 'I do', created: '2026-01-01T11:00:00Z' },
]
const loose = withParent.map(({ parentId, ...rest }) => rest)

const tabProps = { objectId: 'T1', register: 'tasks', schema: 'task' }

describe('CnNotesTab replies', () => {
	beforeEach(() => {
		global.OC = { currentUser: 'dana' }
	})
	afterEach(() => {
		delete global.fetch
		delete global.OC
	})

	it('shows a reply under the note it answers, not at the end of the list', async () => {
		global.fetch = jest.fn().mockResolvedValue(ok({ results: withParent }))
		const w = mount(CnNotesTab, { props: tabProps })
		await flush(w)
		const threads = w.findAll('.cn-notes-tab__thread')
		expect(threads).toHaveLength(2)
		expect(threads[0].text()).toContain('Who takes this?')
		expect(threads[0].text()).toContain('I do')
		expect(threads[1].text()).not.toContain('I do')
		expect(threads[0].find('.cn-notes-tab__thread-list').attributes('aria-label')).toBe('Note by Anna and its replies')
		expect(threads[0].findAll('.cn-notes-tab__reply')).toHaveLength(1)
	})

	it('offers Reply naming the author, and posts the parentId; a reply to a reply goes to the top', async () => {
		const calls = []
		global.fetch = jest.fn((url, init = {}) => {
			calls.push({ url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null })
			return Promise.resolve(ok(init.method === 'POST' ? { id: 'n4' } : { results: withParent }))
		})
		const w = mount(CnNotesTab, { props: tabProps })
		await flush(w)
		const reply = w.findAll('[data-testid="cn-note-reply-action"]')
		expect(reply.length).toBe(3)

		// Reply to Chris's reply (n3): the reply is attached to n1, the top of that thread.
		w.vm.startReply(withParent[2])
		await flush(w)
		expect(w.get('[data-testid="cn-notes-replying"]').text()).toContain('Replying to Chris')
		w.vm.newNoteText = 'thanks'
		await w.vm.addNote()
		await flush(w)
		const post = calls.find((c) => c.method === 'POST')
		expect(post.body).toEqual({ message: 'thanks', parentId: 'n1' })
		expect(w.find('[data-testid="cn-notes-replying"]').exists()).toBe(false)
	})

	it('Reply buttons name the author they answer', async () => {
		global.fetch = jest.fn().mockResolvedValue(ok({ results: withParent }))
		const w = mount(CnNotesTab, { props: tabProps })
		await flush(w)
		expect(w.vm.replyAria(withParent[0])).toBe('Reply to Anna')
	})

	it('with no parentId key in the response there is no Reply', async () => {
		global.fetch = jest.fn().mockResolvedValue(ok({ results: loose }))
		const w = mount(CnNotesTab, { props: tabProps })
		await flush(w)
		expect(w.vm.canReply).toBe(false)
		expect(w.find('[data-testid="cn-note-reply-action"]').exists()).toBe(false)
		w.vm.newNoteText = 'plain'
		const calls = []
		global.fetch = jest.fn((url, init = {}) => {
			calls.push(init.body ? JSON.parse(init.body) : null)
			return Promise.resolve(ok({ id: 'x', results: loose }))
		})
		await w.vm.addNote()
		expect(calls.find((b) => b && b.message)).toEqual({ message: 'plain' })
	})

	it('quotes the parent of a reply that is far from it', async () => {
		const many = [{ id: 'a', parentId: null, author: 'anna', message: 'The original question about the plan', created: '2026-01-01T01:00:00Z' }]
		for (let i = 0; i < 7; i++) {
			many.push({ id: `m${i}`, parentId: 'a', author: 'x', message: `later ${i}`, created: `2026-01-01T0${2 + i}:00:00Z` })
		}
		global.fetch = jest.fn().mockResolvedValue(ok({ results: many }))
		const w = mount(CnNotesTab, { props: tabProps })
		await flush(w)
		const rows = w.vm.threadRows(w.vm.threads[0])
		// Replies sit under the note, so only one many places below it needs the quote.
		expect(rows[1].quote).toBe('')
		expect(rows[5].quote).toBe('')
		expect(rows[6].quote).toBe('The original question about the plan')
		expect(rows[7].quote).toBe('The original question about the plan')
	})

	it('a note that mentions a group emits mentionedGroupIds beside the user ids', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce(ok({ results: [] }))
			.mockResolvedValueOnce(ok({ id: 'n9' }))
			.mockResolvedValue(ok({ results: [] }))
		const w = mount(CnNotesTab, { props: tabProps })
		await flush(w)
		w.vm.newNoteText = 'please look @"group/planning" and @jan'
		await w.vm.addNote()
		await flush(w)
		expect(w.emitted('mention')[0][0]).toEqual({
			objectId: 'T1',
			register: 'tasks',
			schema: 'task',
			noteId: 'n9',
			mentionedUserIds: ['jan'],
			mentionedGroupIds: ['planning'],
		})
	})

	it('a note that mentions only a group still emits', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce(ok({ results: [] }))
			.mockResolvedValueOnce(ok({ id: 'n9' }))
			.mockResolvedValue(ok({ results: [] }))
		const w = mount(CnNotesTab, { props: tabProps })
		await flush(w)
		w.vm.newNoteText = '@"group/planning"'
		await w.vm.addNote()
		await flush(w)
		expect(w.emitted('mention')[0][0].mentionedUserIds).toEqual([])
		expect(w.emitted('mention')[0][0].mentionedGroupIds).toEqual(['planning'])
	})

	it('renders a group mention as a group chip', async () => {
		global.fetch = jest.fn().mockResolvedValue(ok({ results: [{ id: 'g1', parentId: null, author: 'anna', message: 'cc @"group/planning"', created: '2026-01-01T09:00:00Z' }] }))
		const w = mount(CnNotesTab, { props: tabProps })
		await flush(w)
		expect(w.get('[data-testid="cn-note-group-chip"]').text()).toBe('Group planning')
	})
})

describe('CnNotesCard replies', () => {
	const cardProps = { registerId: 'tasks', schemaId: 'task', objectId: 'T1' }
	const stubs = { CnDetailCard: { template: '<div><slot /><slot name="footer" /></div>' }, CnUserActionMenu: { template: '<span><slot /></span>' } }

	afterEach(() => {
		delete global.fetch
	})

	it('groups a reply under its note and offers Reply naming the author', async () => {
		global.fetch = jest.fn().mockResolvedValue(ok({ results: withParent }))
		const w = mount(CnNotesCard, { props: cardProps, global: { stubs } })
		await flush(w)
		const threads = w.findAll('.cn-notes-card__thread')
		expect(threads).toHaveLength(2)
		const withReply = threads.find((t) => t.text().includes('I do'))
		expect(withReply.text()).toContain('Who takes this?')
		expect(withReply.findAll('.cn-notes-card__note--reply')).toHaveLength(1)
		expect(w.vm.replyAria(withParent[2])).toBe('Reply to Chris')
	})

	it('posts parentId when replying, then clears the reply', async () => {
		const posts = []
		global.fetch = jest.fn((url, init = {}) => {
			if (init.method === 'POST') {
				posts.push(JSON.parse(init.body))
			}
			return Promise.resolve(ok(init.method === 'POST' ? { id: 'n5' } : { results: withParent }))
		})
		const w = mount(CnNotesCard, { props: cardProps, global: { stubs } })
		await flush(w)
		w.vm.replyTo = withParent[2]
		w.vm.newNoteText = 'me too'
		await w.vm.submitNote()
		await flush(w)
		expect(posts[0]).toEqual({ message: 'me too', parentId: 'n1' })
		expect(w.vm.replyTo).toBeNull()
	})

	it('no Reply when the response has no parentId key', async () => {
		global.fetch = jest.fn().mockResolvedValue(ok({ results: loose }))
		const w = mount(CnNotesCard, { props: cardProps, global: { stubs } })
		await flush(w)
		expect(w.vm.canReply).toBe(false)
		expect(w.find('[data-testid="cn-notes-card-reply"]').exists()).toBe(false)
	})

	it('a mention of a group emits the group ids', async () => {
		global.fetch = jest.fn((url, init = {}) => Promise.resolve(ok(init.method === 'POST' ? { id: 'n6' } : { results: [] })))
		const w = mount(CnNotesCard, { props: cardProps, global: { stubs } })
		await flush(w)
		w.vm.newNoteText = '@"group/planning" please'
		await w.vm.submitNote()
		await flush(w)
		expect(w.emitted('mention')[0][0]).toMatchObject({ noteId: 'n6', mentionedUserIds: [], mentionedGroupIds: ['planning'] })
	})
})
