/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A turn carries its scope (one document or folder) in the request body, and
 * an answer keeps the sources it cites, live and when a session is reloaded.
 */
jest.mock('@microsoft/fetch-event-source', () => ({ __esModule: true, fetchEventSource: jest.fn() }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))

const { fetchEventSource } = require('@microsoft/fetch-event-source')
const axios = require('@nextcloud/axios').default
const { useAiChatStream } = require('../../src/composables/useAiChatStream.js')

const SOURCES = [
	{ type: 'file', name: 'offerte.pdf', file_id: 7, page: 3 },
	{ type: 'object', name: 'Client Acme' },
]

function streamFrames(events) {
	fetchEventSource.mockImplementation(async (_url, options) => {
		await options.onopen({ ok: true, status: 200 })
		for (const evt of events) {
			options.onmessage(evt)
		}
	})
}

const final = (extra) => ({ event: 'final', data: JSON.stringify({ done: true, fullText: 'Done [1]', ...extra }) })

function sentBody() {
	return JSON.parse(fetchEventSource.mock.calls[0][1].body)
}

describe('useAiChatStream scope and sources', () => {
	beforeEach(() => jest.clearAllMocks())

	it('sends the scope in the body', async () => {
		streamFrames([final({})])
		const stream = useAiChatStream(null)
		await stream.send('When is delivery?', { scope: { type: 'file', fileId: 7 } })
		expect(sentBody().scope).toEqual({ type: 'file', fileId: 7 })
	})

	it('leaves the scope out of an unscoped turn', async () => {
		streamFrames([final({})])
		const stream = useAiChatStream(null)
		await stream.send('Hi', { scope: null })
		expect(sentBody()).not.toHaveProperty('scope')
	})

	it('keeps the sources of the final frame in citation order', async () => {
		streamFrames([final({ sources: SOURCES })])
		const stream = useAiChatStream(null)
		await stream.send('When is delivery?')
		expect(stream.state.messages[1].sources).toEqual(SOURCES)
	})

	it('adds no sources key to an answer without sources', async () => {
		streamFrames([final({ sources: [] })])
		const stream = useAiChatStream(null)
		await stream.send('Hi')
		expect(stream.state.messages[1]).not.toHaveProperty('sources')
	})

	it('keeps the sources when a session is reloaded', async () => {
		axios.get.mockResolvedValue({ data: { results: [
			{ role: 'user', content: 'When is delivery?' },
			{ role: 'assistant', content: 'In May [1].', sources: SOURCES },
		] } })
		const stream = useAiChatStream(null)
		await stream.loadConversation('c-1')
		expect(stream.state.messages[0]).not.toHaveProperty('sources')
		expect(stream.state.messages[1].sources).toEqual(SOURCES)
	})
})
