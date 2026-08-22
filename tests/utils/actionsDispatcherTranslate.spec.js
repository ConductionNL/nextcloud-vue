/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The manifest-authored `successMessage` / `errorMessage` of an `api-call`
 * (and of an `agent` run) are English source strings per ADR-007, so the
 * dispatcher runs them through the host translate function the rendering
 * surface hands it as `context.translate` — the same `cnTranslate` CnAppRoot
 * provides to the page chrome.
 *
 * The no-op control matters most: with NO translate function, or a catalogue
 * that lacks the key, the toast text must be byte-identical to what shipped
 * before. Server-supplied error messages are DATA and are never translated.
 */

import { showSuccess, showError } from '@nextcloud/dialogs'
import axios from '@nextcloud/axios'
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))
jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	showSuccess: jest.fn(),
	showError: jest.fn(),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn(), put: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const dict = {
	'Lead approved': 'Lead goedgekeurd',
	'Could not approve the lead': 'Goedkeuren mislukt',
	'Run queued': 'Run in de wachtrij',
}
const translate = (key) => dict[key] ?? key

const apiCall = {
	id: 'approve',
	type: 'api-call',
	url: '/apps/hrmq/api/leads/1/approve',
	successMessage: 'Lead approved',
	errorMessage: 'Could not approve the lead',
}

describe('dispatchAction — api-call toast translation', () => {
	beforeEach(() => {
		showSuccess.mockReset()
		showError.mockReset()
		axios.post.mockReset()
		axios.put.mockReset()
	})

	it('translates successMessage through context.translate', async () => {
		axios.post.mockResolvedValue({ data: {} })
		dispatchAction(apiCall, { translate })
		await flush()
		expect(showSuccess).toHaveBeenCalledWith('Lead goedgekeurd')
	})

	it('translates errorMessage through context.translate', async () => {
		axios.post.mockRejectedValue(new Error('boom'))
		dispatchAction(apiCall, { translate })
		await flush()
		expect(showError).toHaveBeenCalledWith('Goedkeuren mislukt')
	})

	it('renders the raw source string when no translate fn is given (no-op control)', async () => {
		axios.post.mockResolvedValue({ data: {} })
		dispatchAction(apiCall, {})
		await flush()
		expect(showSuccess).toHaveBeenCalledWith('Lead approved')

		axios.post.mockRejectedValue(new Error('boom'))
		dispatchAction(apiCall, {})
		await flush()
		expect(showError).toHaveBeenCalledWith('Could not approve the lead')
	})

	it('renders the raw source string when the catalogue lacks the key (no-op control)', async () => {
		axios.post.mockResolvedValue({ data: {} })
		dispatchAction(apiCall, { translate: (key) => key })
		await flush()
		expect(showSuccess).toHaveBeenCalledWith('Lead approved')
	})

	it('leaves the library default untouched when the action declares no message', async () => {
		axios.post.mockResolvedValue({ data: {} })
		dispatchAction({ id: 'x', type: 'api-call', url: '/apps/hrmq/api/x' }, { translate })
		await flush()
		expect(showSuccess).toHaveBeenCalledWith('Action completed.')
	})

	it('never translates a server-supplied error message', async () => {
		axios.post.mockRejectedValue({ response: { data: { error: 'Lead approved' } } })
		dispatchAction(
			{ id: 'x', type: 'api-call', url: '/apps/hrmq/api/x' },
			{ translate },
		)
		await flush()
		// The server string is data — it reaches the toast verbatim, NOT
		// through the catalogue (which would have turned it into Dutch).
		expect(showError).toHaveBeenCalledWith('Lead approved')
	})
})

describe('dispatchAction — agent toast translation', () => {
	beforeEach(() => {
		showSuccess.mockReset()
		showError.mockReset()
		axios.post.mockReset()
	})

	it('translates the agent successMessage through context.translate', async () => {
		axios.post.mockResolvedValue({ data: {} })
		dispatchAction(
			{ id: 'run', type: 'agent', agent: 'triage', successMessage: 'Run queued' },
			{ translate, tokenCtx: { objectId: '1', register: 'r', schema: 's' } },
		)
		await flush()
		expect(showSuccess).toHaveBeenCalledWith('Run in de wachtrij')
	})

	it('renders the raw agent successMessage without a translate fn (no-op control)', async () => {
		axios.post.mockResolvedValue({ data: {} })
		dispatchAction(
			{ id: 'run', type: 'agent', agent: 'triage', successMessage: 'Run queued' },
			{ tokenCtx: { objectId: '1', register: 'r', schema: 's' } },
		)
		await flush()
		expect(showSuccess).toHaveBeenCalledWith('Run queued')
	})
})
