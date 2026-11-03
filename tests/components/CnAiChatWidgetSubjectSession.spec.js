/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An `ai-chat` widget with `content.openSubjectSession` opens the user's latest
 * session about the page's record, with its pending approvals
 * (DqZaakAssistent: the question, the answer and "Voorstel: taak aanmaken").
 *
 * @spec openspec/changes/ai-chat-opens-the-subject-session/specs/ai-companion/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		post: jest.fn(),
	},
}))

jest.mock('@microsoft/fetch-event-source', () => ({
	__esModule: true,
	fetchEventSource: jest.fn(),
}))

const axios = require('@nextcloud/axios').default
const CnAiChatWidget = require('../../src/components/CnAiCompanion/CnAiChatWidget.vue').default
const CnAiCompanion = require('../../src/components/CnAiCompanion/CnAiCompanion.vue').default
const { useAiChatStream } = require('../../src/composables/useAiChatStream.js')
const { __resetAppInstalledCacheForTests } = require('../../src/utils/appInstalled.js')

const CASE = '710d44a4-0000-4000-8000-000000000001'
const SESSION = 'b1f0c0de-0000-4000-8000-000000000002'
const APPROVAL = {
	id: 'ap-1',
	kind: 'tool-access',
	title: 'Voorstel: taak aanmaken',
	app: 'dossiq',
	reach: 'write',
	reason: 'Taak Offerte beoordelen voor Pieter Jansen, klaar op 10 okt.',
	agentId: 'agent-1',
	resolveUrl: '/index.php/apps/hermiq/api/agents/agent-1/tool-access-requests/ap-1',
}
const TURNS = [
	{ role: 'user', content: 'Welke documenten moeten nog beoordeeld?' },
	{ role: 'assistant', content: 'Drie documenten staan nog op te beoordelen.' },
]

/**
 * Answer the health probe, the session list and the messages of SESSION.
 *
 * @param {object} [answers] Overrides: `sessions` (the list's results) or `sessionsError`.
 */
function backend(answers = {}) {
	axios.get.mockImplementation((url) => {
		if (url.endsWith('/chat/health')) {
			return Promise.resolve({ status: 200, data: { status: 'ok' } })
		}
		if (url.endsWith('/sessions')) {
			if (answers.sessionsError) {
				return Promise.reject(Object.assign(new Error('down'), { response: { status: 500 } }))
			}
			return Promise.resolve({ status: 200, data: { results: answers.sessions ?? [] } })
		}
		if (url.endsWith(`/${SESSION}/messages`)) {
			return Promise.resolve({ status: 200, data: { results: TURNS, pendingApprovals: [APPROVAL] } })
		}
		return Promise.reject(new Error(`unexpected GET ${url}`))
	})
}

/**
 * Mount the widget on a page about CASE.
 *
 * @param {object} content The widget's content.
 * @return {object} The wrapper.
 */
function mountOnCase(content) {
	return mount(CnAiChatWidget, {
		propsData: { content },
		provide: { cnAiContext: { appId: 'dossiq', pageKind: 'detail', objectUuid: CASE } },
	})
}

/**
 * The URLs of every GET made so far.
 *
 * @return {Array<string>} The URLs.
 */
function requested() {
	return axios.get.mock.calls.map((call) => call[0])
}

let savedAppsWebRoots
beforeEach(() => {
	jest.clearAllMocks()
	savedAppsWebRoots = window.OC.appswebroots
	window.OC.appswebroots = { hermiq: '/apps/hermiq' }
	__resetAppInstalledCacheForTests()
	window.__cnAiCompanionPrimary = null
})
afterEach(() => {
	window.OC.appswebroots = savedAppsWebRoots
	__resetAppInstalledCacheForTests()
	window.__cnAiCompanionPrimary = null
})

describe('an ai-chat widget that opens the session about the record', () => {
	it('opens the latest session about the case, with its turns and its pending proposal', async () => {
		backend({ sessions: [{ uuid: SESSION, metadata: { subject: { objectUuid: CASE, appId: 'dossiq' } } }] })
		const wrapper = mountOnCase({ chatAppId: 'hermiq', openSubjectSession: true })
		await flushPromises()

		const list = axios.get.mock.calls.find((call) => call[0].endsWith('/sessions'))
		expect(list[1]).toEqual({ params: { subject: CASE, limit: 1 } })
		const stream = wrapper.findComponent(CnAiCompanion).vm.stream
		expect(stream.state.conversationUuid).toBe(SESSION)
		expect(stream.state.messages.map((m) => m.content)).toEqual(TURNS.map((m) => m.content))
		expect(stream.state.pendingApprovals).toEqual([APPROVAL])
		expect(wrapper.find('[data-testid="cn-ai-approval-allow-ap-1"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-ai-panel-approvals"]').text()).toContain('Voorstel: taak aanmaken')
	})

	it('reads a subject the backend serialises at the top level too', async () => {
		backend({ sessions: [{ uuid: SESSION, subject: { objectUuid: CASE } }] })
		const wrapper = mountOnCase({ openSubjectSession: true })
		await flushPromises()
		expect(wrapper.findComponent(CnAiCompanion).vm.stream.state.conversationUuid).toBe(SESSION)
	})

	it('starts an empty thread when the user has no session about the case', async () => {
		backend({ sessions: [] })
		const wrapper = mountOnCase({ openSubjectSession: true })
		await flushPromises()
		const stream = wrapper.findComponent(CnAiCompanion).vm.stream
		expect(stream.state.conversationUuid).toBeNull()
		expect(stream.state.messages).toEqual([])
		expect(requested().some((url) => url.endsWith('/messages'))).toBe(false)
	})

	it('starts an empty thread when the session list fails', async () => {
		backend({ sessionsError: true })
		jest.spyOn(console, 'info').mockImplementation(() => {})
		const wrapper = mountOnCase({ openSubjectSession: true })
		await flushPromises()
		const stream = wrapper.findComponent(CnAiCompanion).vm.stream
		expect(stream.state.conversationUuid).toBeNull()
		expect(stream.state.messages).toEqual([])
	})

	it('does not open a session about another record (a backend without the filter)', async () => {
		backend({ sessions: [{ uuid: SESSION, metadata: { subject: { objectUuid: 'another-case' } } }] })
		const wrapper = mountOnCase({ openSubjectSession: true })
		await flushPromises()
		expect(wrapper.findComponent(CnAiCompanion).vm.stream.state.conversationUuid).toBeNull()
		expect(requested().some((url) => url.endsWith('/messages'))).toBe(false)
	})

	it('does not open a session without a subject', async () => {
		backend({ sessions: [{ uuid: SESSION, metadata: {} }] })
		const wrapper = mountOnCase({ openSubjectSession: true })
		await flushPromises()
		expect(wrapper.findComponent(CnAiCompanion).vm.stream.state.conversationUuid).toBeNull()
	})

	it('makes no session request without the flag', async () => {
		backend({ sessions: [{ uuid: SESSION, metadata: { subject: { objectUuid: CASE } } }] })
		const wrapper = mountOnCase({ chatAppId: 'hermiq' })
		await flushPromises()
		expect(requested().some((url) => url.includes('/sessions'))).toBe(false)
		expect(wrapper.findComponent(CnAiCompanion).vm.stream.state.messages).toEqual([])
	})

	it('makes no session request on a page that names no record', async () => {
		backend({ sessions: [{ uuid: SESSION, metadata: { subject: { objectUuid: CASE } } }] })
		mount(CnAiChatWidget, {
			propsData: { content: { openSubjectSession: true } },
			provide: { cnAiContext: { appId: 'dossiq', pageKind: 'index' } },
		})
		await flushPromises()
		expect(requested().some((url) => url.includes('/sessions'))).toBe(false)
	})
})

describe('loadConversation keeps the pending approvals', () => {
	it('sets the approvals the messages response carries', async () => {
		axios.get.mockResolvedValue({ data: { results: TURNS, pendingApprovals: [APPROVAL] } })
		const stream = useAiChatStream(null)
		await stream.loadConversation(SESSION)
		expect(stream.state.pendingApprovals).toEqual([APPROVAL])
	})

	it('clears the approvals of the previous conversation when the response carries none', async () => {
		axios.get.mockResolvedValue({ data: { results: TURNS } })
		const stream = useAiChatStream(null)
		stream.state.pendingApprovals = [APPROVAL]
		await stream.loadConversation(SESSION)
		expect(stream.state.pendingApprovals).toEqual([])
	})
})
