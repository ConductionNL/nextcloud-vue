/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Attachments and attachment notices survive on the messages: the sent
 * question keeps what was attached, the answer keeps what its `final` frame
 * (or the JSON fallback) carries.
 */
jest.mock('@microsoft/fetch-event-source', () => ({ __esModule: true, fetchEventSource: jest.fn() }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))

const { fetchEventSource } = require('@microsoft/fetch-event-source')
const axios = require('@nextcloud/axios').default
const { useAiChatStream } = require('../../src/composables/useAiChatStream.js')

const IMAGE = { fileId: 42, name: 'green-roof.png', mimeType: 'image/png', size: 1234 }
const NOTICE = 'This model does not read PDFs directly. hermiq used the text of offerte-2026.pdf instead.'

function streamFrames(events) {
	fetchEventSource.mockImplementation(async (_url, options) => {
		await options.onopen({ ok: true, status: 200 })
		for (const evt of events) {
			options.onmessage(evt)
		}
	})
}

const final = (extra) => ({ event: 'final', data: JSON.stringify({ done: true, fullText: 'Done', ...extra }) })

describe('useAiChatStream attachments', () => {
	beforeEach(() => jest.clearAllMocks())

	it('keeps the attachments of a sent message on the question', async () => {
		streamFrames([final({})])
		const stream = useAiChatStream(null)
		const sent = [{ path: '/offerte.pdf', name: 'offerte.pdf', fileId: 7 }]
		await stream.send('When is delivery?', { attachments: sent })
		expect(stream.state.messages[0].attachments).toEqual(sent)
		expect(stream.state.messages[1].attachments).toBeUndefined()
	})

	it('keeps attachments and notices from the final frame', async () => {
		streamFrames([final({ attachments: [IMAGE], attachmentNotices: [NOTICE] })])
		const stream = useAiChatStream(null)
		await stream.send('Create an image of a green roof')
		const answer = stream.state.messages[1]
		expect(answer.attachments).toEqual([IMAGE])
		expect(answer.attachmentNotices).toEqual([NOTICE])
	})

	it('ignores attachment fields that are not arrays', async () => {
		streamFrames([final({ attachments: 'x', attachmentNotices: { a: 1 } })])
		const stream = useAiChatStream(null)
		await stream.send('Hi')
		expect(stream.state.messages[1]).not.toHaveProperty('attachments')
		expect(stream.state.messages[1]).not.toHaveProperty('attachmentNotices')
	})

	it('keeps them on the JSON fallback path too', async () => {
		fetchEventSource.mockImplementation(async (_url, options) => {
			await options.onopen({ ok: false, status: 404 })
		})
		axios.post.mockResolvedValue({ data: { content: 'Done', attachments: [IMAGE], attachmentNotices: [NOTICE] }, status: 200 })
		const stream = useAiChatStream(null)
		await stream.send('Hi')
		const answer = stream.state.messages.find((m) => m.role === 'assistant')
		expect(answer.attachments).toEqual([IMAGE])
		expect(answer.attachmentNotices).toEqual([NOTICE])
	})
})
