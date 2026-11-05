// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * The key under which a detail widget host provides its card's notices (the
 * manifest's `notices` plus what its actions answered) to the card that
 * draws them (CnWidgetWrapper, CnDetailCard).
 */
export const WIDGET_NOTICES = 'cnWidgetNotices'

/** The variants a notice takes. */
const VARIANTS = ['info', 'warning', 'error', 'success']

/** The optional keys a server notice may carry over. */
const PASSED_KEYS = ['role', 'layout', 'icon', 'actions', 'link']

/**
 * @param {unknown} value A value.
 * @return {string} The value when it is a string, else ''.
 */
function stringOr(value) {
	return typeof value === 'string' ? value : ''
}

/**
 * Normalise a notice from a server answer: `{ variant?, role?, title?, text?, actions? }`.
 * A notice without a title and a text is no notice.
 *
 * @param {unknown} raw The `notice` of a response body.
 * @param {string} fallbackVariant The variant when the answer names none.
 * @return {object|null} The notice, or null.
 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-an-action-answer-becomes-a-notice-in-its-card
 */
export function normalizeNotice(raw, fallbackVariant) {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return null
	}
	const title = stringOr(raw.title)
	const text = stringOr(raw.text) || stringOr(raw.message)
	if (title === '' && text === '') {
		return null
	}
	const notice = { variant: VARIANTS.includes(raw.variant) ? raw.variant : fallbackVariant, title, text }
	PASSED_KEYS.filter((key) => raw[key] !== undefined).forEach((key) => {
		notice[key] = raw[key]
	})
	notice.dismissible = raw.dismissible !== false
	return notice
}

/**
 * @param {{ok: boolean, data?: unknown, error?: unknown}} outcome A call outcome.
 * @return {object|null} The response body, success or refusal.
 */
function outcomeBody(outcome) {
	if (!outcome) {
		return null
	}
	const body = outcome.ok ? outcome.data : outcome.error && outcome.error.response && outcome.error.response.data
	return body && typeof body === 'object' ? body : null
}

/**
 * The card notice an action's outcome asks for, or null when it asks for
 * none and the toast stays.
 *
 * The server asks by putting `notice` in its answer (success or refusal);
 * the manifest asks with `noticeInline: true` on the action, which turns a
 * refusal into an error notice in the server's words and a success into a
 * success notice with the action's `successMessage`. `noticeInline: 'error'`
 * asks for the refusal only; a success keeps its toast.
 *
 * @param {object} action The dispatched action.
 * @param {{ok: boolean, data?: unknown, error?: unknown}} outcome The call outcome.
 * @param {{successText?: string, errorText?: string}} [texts] The texts the toast would have shown.
 * @return {object|null} The notice.
 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-an-action-answer-becomes-a-notice-in-its-card
 */
export function noticeFromOutcome(action, outcome, texts = {}) {
	const ok = Boolean(outcome && outcome.ok)
	const body = outcomeBody(outcome)
	const fromServer = body ? normalizeNotice(body.notice, ok ? 'success' : 'error') : null
	if (fromServer) {
		return fromServer
	}
	const inline = action ? action.noticeInline : undefined
	if (inline !== true && !(inline === 'error' && !ok)) {
		return null
	}
	const text = ok ? texts.successText : texts.errorText
	return text ? { variant: ok ? 'success' : 'error', text, dismissible: true } : null
}

/**
 * The event-bus channel a component raises a page notice on, for a result
 * that belongs to the page rather than to a card: a dialog that moved a
 * selection (`{ notice }`), or one card of a detail page (`{ notice, widgetId }`).
 */
export const PAGE_NOTICE_CHANNEL = 'cn:page:notice'
