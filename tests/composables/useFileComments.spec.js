/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/notes-on-a-file/tasks.md#task-1
 */
import { parseFileComments, useFileComments } from '../../src/composables/useFileComments.js'

const REPORT_XML = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
 <d:response><d:href>/remote.php/dav/comments/files/42/7</d:href><d:propstat><d:prop>
  <oc:id>7</oc:id><oc:message>Check with finance</oc:message><oc:actorId>ruben</oc:actorId>
  <oc:actorDisplayName>Ruben</oc:actorDisplayName><oc:creationDateTime>Wed, 07 Oct 2026 10:00:00 GMT</oc:creationDateTime><oc:isUnread>false</oc:isUnread>
 </d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>
 <d:response><d:href>/remote.php/dav/comments/files/42/8</d:href><d:propstat><d:prop>
  <oc:id>8</oc:id><oc:message>Done</oc:message><oc:actorId>anna</oc:actorId><oc:actorDisplayName>Anna</oc:actorDisplayName>
  <oc:creationDateTime>Wed, 07 Oct 2026 11:00:00 GMT</oc:creationDateTime><oc:isUnread>true</oc:isUnread>
 </d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>
</d:multistatus>`

const ok = (text = '') => ({ ok: true, status: 200, text: async () => text })

beforeEach(() => {
	global.fetch = jest.fn()
	global.OC = { currentUser: 'ruben', requestToken: 'tok' }
})
afterEach(() => {
	delete global.OC
})

describe('parseFileComments', () => {
	it('parses the multistatus into the shared note shape', () => {
		const notes = parseFileComments(REPORT_XML)
		expect(notes).toHaveLength(2)
		expect(notes[0]).toMatchObject({ id: '7', message: 'Check with finance', actorId: 'ruben', actorDisplayName: 'Ruben', isOwn: true, isUnread: false })
		expect(notes[1]).toMatchObject({ id: '8', isOwn: false, isUnread: true })
	})
})

describe('useFileComments', () => {
	it('lists with a REPORT carrying an oc:filter-comments body', async () => {
		fetch.mockResolvedValue(ok(REPORT_XML))
		const notes = await useFileComments(42).list({ limit: 20, offset: 40 })
		const [url, init] = fetch.mock.calls[0]
		expect(url).toContain('/remote.php/dav/comments/files/42')
		expect(init.method).toBe('REPORT')
		expect(init.body).toContain('<oc:filter-comments')
		expect(init.body).toContain('<oc:limit>20</oc:limit>')
		expect(init.body).toContain('<oc:offset>40</oc:offset>')
		expect(notes.map((n) => n.id)).toEqual(['7', '8'])
	})

	it('adds with a POST of actorType, verb and message', async () => {
		fetch.mockResolvedValue(ok())
		await useFileComments('42').add('Hello')
		const [url, init] = fetch.mock.calls[0]
		expect(url).toContain('/remote.php/dav/comments/files/42')
		expect(init.method).toBe('POST')
		expect(JSON.parse(init.body)).toEqual({ actorType: 'users', verb: 'comment', message: 'Hello' })
	})

	it('deletes with a DELETE on the comment', async () => {
		fetch.mockResolvedValue(ok())
		await useFileComments(42).remove(7)
		const [url, init] = fetch.mock.calls[0]
		expect(url).toContain('/remote.php/dav/comments/files/42/7')
		expect(init.method).toBe('DELETE')
	})

	it('counts the comments', async () => {
		fetch.mockResolvedValue(ok(REPORT_XML))
		expect(await useFileComments(42).count()).toBe(2)
	})

	it('rejects with the status when Nextcloud refuses', async () => {
		fetch.mockResolvedValue({ ok: false, status: 403, text: async () => '' })
		await expect(useFileComments(42).list()).rejects.toMatchObject({ status: 403 })
	})
})
