/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * card-state-notices: an action's answer lands in the card it ran from as a
 * notice when the answer carries `notice` or the action sets `noticeInline`;
 * otherwise the toast stays.
 *
 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-an-action-answer-becomes-a-notice-in-its-card
 */

import axios from '@nextcloud/axios'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'
import { normalizeNotice, noticeFromOutcome } from '../../src/utils/cardNotices.js'

jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), put: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const cancel = { type: 'api-call', url: '/apps/dossiq/api/tasks/7/cancel', errorMessage: '' }
const refusal = {
	response: {
		status: 409,
		data: {
			message: 'Annuleren geweigerd',
			notice: { variant: 'error', title: 'Annuleren geweigerd voor Documenten beoordelen:', text: 'de engine staat annuleren niet toe zolang de stap Beoordeling loopt.' },
		},
	},
}

describe('noticeFromOutcome', () => {
	it('takes the notice the server answered, refusal or success', () => {
		expect(noticeFromOutcome(cancel, { ok: false, error: refusal })).toEqual({
			variant: 'error',
			title: 'Annuleren geweigerd voor Documenten beoordelen:',
			text: 'de engine staat annuleren niet toe zolang de stap Beoordeling loopt.',
			dismissible: true,
		})
		const partial = noticeFromOutcome(cancel, { ok: true, data: { notice: { title: '2 zaken verplaatst.', text: '1 zonder al zijn acties.', variant: 'warning', actions: [{ label: 'Bekijken', action: { type: 'refresh' } }] } } })
		expect(partial.variant).toBe('warning')
		expect(partial.actions).toHaveLength(1)
	})

	it('without a notice in the answer, only noticeInline asks for one', () => {
		expect(noticeFromOutcome(cancel, { ok: false, error: { response: { data: { message: 'Nee' } } } }, { errorText: 'Nee' })).toBeNull()
		expect(noticeFromOutcome({ ...cancel, noticeInline: true }, { ok: false, error: {} }, { errorText: 'Nee' })).toEqual({ variant: 'error', text: 'Nee', dismissible: true })
		expect(noticeFromOutcome({ ...cancel, noticeInline: true }, { ok: true, data: {} }, { successText: 'Taak afgerond.' })).toEqual({ variant: 'success', text: 'Taak afgerond.', dismissible: true })
	})

	it('noticeInline error asks for the refusal only', () => {
		expect(noticeFromOutcome({ ...cancel, noticeInline: 'error' }, { ok: false, error: {} }, { errorText: 'Nee' })).toEqual({ variant: 'error', text: 'Nee', dismissible: true })
		expect(noticeFromOutcome({ ...cancel, noticeInline: 'error' }, { ok: true, data: {} }, { successText: 'Gelukt' })).toBeNull()
	})

	it('normalizeNotice drops a notice with no words and an unknown variant', () => {
		expect(normalizeNotice({ variant: 'error' }, 'info')).toBeNull()
		expect(normalizeNotice({ variant: 'loud', text: 'x' }, 'info').variant).toBe('info')
		expect(normalizeNotice({ text: 'x', dismissible: false }, 'info').dismissible).toBe(false)
	})
})

describe('dispatchAction api-call with showNotice', () => {
	beforeEach(() => {
		showSuccess.mockReset()
		showError.mockReset()
		axios.post.mockReset()
	})

	it('puts a refusal envelope in the card instead of a toast', async () => {
		axios.post.mockRejectedValue(refusal)
		const showNotice = jest.fn()
		await dispatchAction(cancel, { showNotice })
		await flush()
		expect(showNotice).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Annuleren geweigerd voor Documenten beoordelen:' }))
		expect(showError).not.toHaveBeenCalled()
	})

	it('keeps the toast when the answer carries no notice', async () => {
		axios.post.mockRejectedValue({ response: { data: { message: 'Server zegt nee' } } })
		const showNotice = jest.fn()
		await dispatchAction(cancel, { showNotice })
		await flush()
		expect(showNotice).not.toHaveBeenCalled()
		expect(showError).toHaveBeenCalledWith('Server zegt nee')
	})

	it('noticeInline turns a success into a success notice', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const showNotice = jest.fn()
		await dispatchAction({ ...cancel, noticeInline: true, successMessage: 'Taak afgerond. U blijft op de zaak.' }, { showNotice })
		await flush()
		expect(showNotice).toHaveBeenCalledWith({ variant: 'success', text: 'Taak afgerond. U blijft op de zaak.', dismissible: true })
		expect(showSuccess).not.toHaveBeenCalled()
	})

	it('without showNotice the envelope still toasts', async () => {
		axios.post.mockRejectedValue(refusal)
		await dispatchAction(cancel, {})
		await flush()
		expect(showError).toHaveBeenCalledWith('Annuleren geweigerd')
	})
})
