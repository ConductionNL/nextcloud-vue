/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/notes-on-a-file/tasks.md#task-2
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnNotesCard from '../../src/components/CnNotesCard/CnNotesCard.vue'

const REPORT = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:response><d:propstat><d:prop>
<oc:id>7</oc:id><oc:message>Check with finance</oc:message><oc:actorId>ruben</oc:actorId><oc:actorDisplayName>Ruben</oc:actorDisplayName><oc:creationDateTime>Wed, 07 Oct 2026 10:00:00 GMT</oc:creationDateTime>
</d:prop></d:propstat></d:response></d:multistatus>`

const stubs = { CnDetailCard: { template: '<div><slot /><slot name="footer" /></div>' }, NcButton: true, NcLoadingIcon: true, CnUserActionMenu: true }
const mountCard = (props) => shallowMount(CnNotesCard, { props, global: { stubs } })

beforeEach(() => {
	global.OC = { currentUser: 'ruben', requestToken: 't' }
	global.fetch = jest.fn(async (url, init) => {
		if (init && init.method === 'REPORT') {
			return { ok: true, status: 207, text: async () => REPORT }
		}
		return { ok: true, status: 200, json: async () => ({ results: [] }), text: async () => '' }
	})
})
afterEach(() => {
	delete global.OC
})

describe('CnNotesCard with a file source', () => {
	it('lists the file comments from the comments DAV endpoint, not the object endpoint', async () => {
		const w = mountCard({ fileId: '42' })
		await flushPromises()
		expect(w.vm.isFileSource).toBe(true)
		const urls = fetch.mock.calls.map((c) => c[0])
		expect(urls.every((u) => u.includes('/remote.php/dav/comments/files/42'))).toBe(true)
		expect(urls.some((u) => u.includes('/openregister/'))).toBe(false)
		expect(w.vm.allNotes.map((n) => n.message)).toEqual(['Check with finance'])
	})

	it('adds a note as a file comment and reloads', async () => {
		const w = mountCard({ fileId: 42 })
		await flushPromises()
		w.vm.newNoteText = 'Check with finance before assigning'
		await w.vm.submitNote()
		const post = fetch.mock.calls.find((c) => c[1] && c[1].method === 'POST')
		expect(post[0]).toContain('/remote.php/dav/comments/files/42')
		expect(JSON.parse(post[1].body).message).toBe('Check with finance before assigning')
		expect(w.emitted('note-added')).toBeTruthy()
	})

	it('deletes through the comments endpoint', async () => {
		const w = mountCard({ fileId: 42 })
		await flushPromises()
		await w.vm.confirmDelete({ id: '7' })
		const del = fetch.mock.calls.find((c) => c[1] && c[1].method === 'DELETE')
		expect(del[0]).toContain('/remote.php/dav/comments/files/42/7')
		expect(w.vm.allNotes).toHaveLength(0)
	})

	it('shows no notes and no add field when Nextcloud refuses', async () => {
		global.fetch = jest.fn(async () => ({ ok: false, status: 403, text: async () => '' }))
		const w = mountCard({ fileId: 42 })
		await flushPromises()
		expect(w.vm.unavailable).toBe(true)
		expect(w.find('.cn-notes-card__add-form').exists()).toBe(false)
		expect(w.find('.cn-notes-card__note').exists()).toBe(false)
	})

	it('keeps the object source when object props are given, even with a fileId', async () => {
		const w = mountCard({ fileId: 42, registerId: 'r', schemaId: 's', objectId: 'o' })
		await flushPromises()
		expect(w.vm.isFileSource).toBe(false)
		expect(fetch.mock.calls[0][0]).toContain('/objects/r/s/o/notes')
		expect(fetch.mock.calls.some((c) => c[0].includes('/remote.php/dav/comments'))).toBe(false)
	})
})
