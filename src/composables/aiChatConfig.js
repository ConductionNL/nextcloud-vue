/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * aiChatConfig — single configuration point for the AI Chat Companion backend.
 *
 * The `CnAiCompanion` widget talks to a Nextcloud app that owns the chat/agent
 * engine over HTTP (`/index.php/apps/{chatAppId}/api/...`). Historically the
 * backend app id was hardcoded as `openregister` in four call sites across
 * three files (`useAiChatStream.js`, `CnAiCompanion.vue`, `CnAiHistoryDialog.vue`).
 * Per hydra ADR-034 "Amendment 2026-07-05" the agent engine is moving out of
 * OpenRegister and into Hermiq, so the backend the widget targets must become a
 * single configurable point rather than four hardcoded strings.
 *
 * This module is that point:
 * - `DEFAULT_CHAT_APP_ID` is the default backend app id.
 * - The `chatXxxUrl(appId)` builders derive every widget HTTP path from an app
 *   id, so switching backends is a single value change (a prop, or this default).
 *
 * DEFAULT VALUE — `hermiq`, the agent engine's canonical home (ADR-034 §Amendment
 * 2026-07-05 "Default flip" + SPECTR-NEXTCLOUD-PLAN.md §7.4 step 5, executed by
 * the `chat-appid-default-flip` change):
 *   Both flip prerequisites have shipped — Hermiq's engine port is merged on
 *   hermiq `development` (gated on the `hermiq`.`engine.enabled` app config),
 *   and OpenRegister keeps `/api/chat/*` + `/api/agents` answering through a
 *   compat window with deprecation headers and an optional proxy-to-hermiq
 *   (openregister#305).
 *
 *   Deployments still riding the OR compat window can keep the widget on the
 *   old backend by passing `:chat-app-id="'openregister'"` to `CnAppRoot`.
 *   Note the widget fails closed either way: if the configured backend's
 *   `/api/chat/health` probe does not answer 2xx (e.g. Hermiq not installed or
 *   no LLM provider configured), the AI icon simply does not render.
 */

/**
 * Default chat/agent backend app id the AI Chat Companion targets.
 *
 * @type {string}
 */
export const DEFAULT_CHAT_APP_ID = 'hermiq'

/**
 * Base API path for a chat backend app.
 *
 * @param {string} [appId] Backend app id. Falls back to {@link DEFAULT_CHAT_APP_ID}
 *   when empty/nullish so a mis-wired prop never produces `/apps//api`.
 * @return {string} e.g. `/index.php/apps/hermiq/api`
 */
export function chatApiBase(appId = DEFAULT_CHAT_APP_ID) {
	return `/index.php/apps/${appId || DEFAULT_CHAT_APP_ID}/api`
}

/**
 * SSE streaming endpoint (`POST`).
 *
 * @param {string} [appId] Backend app id.
 * @return {string}
 */
export function chatStreamUrl(appId) {
	return `${chatApiBase(appId)}/chat/stream`
}

/**
 * Non-streaming fallback endpoint (`POST`).
 *
 * @param {string} [appId] Backend app id.
 * @return {string}
 */
export function chatSendUrl(appId) {
	return `${chatApiBase(appId)}/chat/send`
}

/**
 * Health probe endpoint (`GET`). The widget renders nothing on non-2xx.
 *
 * @param {string} [appId] Backend app id.
 * @return {string}
 */
export function chatHealthUrl(appId) {
	return `${chatApiBase(appId)}/chat/health`
}

/**
 * File attachment upload endpoint (`POST`, multipart/form-data, field `file`).
 * Returns `{ path, name }` on success (200); rejects with 400 + `{ error }`
 * for oversized (>20000 bytes) or non-UTF-8-decodable files. The returned
 * `{ path, name }` is what the chat send/stream request body's `attachments`
 * array carries — see `useAiChatStream.js`.
 *
 * @param {string} [appId] Backend app id.
 * @return {string}
 */
export function attachmentsUrl(appId) {
	return `${chatApiBase(appId)}/chat/attachments`
}

/**
 * Conversation list endpoint (`GET`).
 *
 * @param {string} [appId] Backend app id.
 * @return {string}
 */
export function conversationsUrl(appId) {
	return `${chatApiBase(appId)}/conversations`
}

/**
 * Messages of a single conversation (`GET`).
 *
 * @param {string} [appId] Backend app id.
 * @param {string} conversationUuid Conversation UUID to load.
 * @return {string}
 */
export function conversationMessagesUrl(appId, conversationUuid) {
	return `${chatApiBase(appId)}/conversations/${conversationUuid}/messages`
}

/**
 * Single conversation endpoint (`GET`/`PATCH`/`DELETE`) — used by the History
 * UI to rename a conversation and set its description (both backends' Conversation
 * controller accept `title` and `metadata` on PATCH; `metadata.description` is
 * where the free-text description is stored since the conversation schema has
 * no dedicated description column).
 *
 * @param {string} [appId] Backend app id.
 * @param {string} conversationUuid Conversation UUID.
 * @return {string}
 */
export function conversationUrl(appId, conversationUuid) {
	return `${chatApiBase(appId)}/conversations/${conversationUuid}`
}

/**
 * Agent list endpoint (`GET`) — used by the agent picker shown when starting
 * a new conversation.
 *
 * @param {string} [appId] Backend app id.
 * @return {string}
 */
export function agentsUrl(appId) {
	return `${chatApiBase(appId)}/agents`
}

/**
 * On-instance transcription (`POST`, multipart `audio`).
 *
 * ⚠️ NOT Nextcloud's `core:audio2text` TaskProcessing endpoint, and the
 * difference is not stylistic: that one takes a FILE ID, so a dictated sentence
 * would first have to be written into the user's Files and then polled for.
 * That leaves three-second audio clips in somebody's Documents folder and pays
 * plumbing latency on every utterance. The backend app answers this
 * synchronously with the transcript, and both paths meet at the same speech
 * service underneath.
 *
 * @param {string} [appId] Backend app id.
 * @return {string}
 */
export function speechTranscriptionsUrl(appId) {
	return `${chatApiBase(appId)}/speech/transcriptions`
}

/**
 * On-instance synthesis (`POST`), returning audio bytes.
 *
 * @param {string} [appId] Backend app id.
 * @return {string}
 */
export function speechSynthesisUrl(appId) {
	return `${chatApiBase(appId)}/speech/speech`
}

/**
 * Whether on-instance speech can actually be performed (`GET`).
 *
 * 🔴 ASKED, NEVER ASSUMED. A backend can advertise speech it cannot perform —
 * Nextcloud offered `core:audio2text` for months on an instance whose speech
 * service was unreachable, and nobody found out until one was attempted. Here
 * the stakes are higher than a failed transcription: the alternative engine is
 * the browser's, which in Chrome means Google's servers, so believing a wrong
 * answer can send audio off-instance for an agent configured never to do that.
 *
 * @param {string} [appId] Backend app id.
 * @return {string}
 */
export function speechCapabilitiesUrl(appId) {
	return `${chatApiBase(appId)}/speech/capabilities`
}

/**
 * Normalize a raw conversation object (the shape returned by the
 * `conversationsUrl()` / `conversationUrl()` endpoints) into the flat shape the
 * AI Chat Companion's recent-sessions and history UI consume: a `title`, a
 * `description` read from `metadata.description` (the free-text field the
 * History UI's rename/describe control writes), the raw `metadata` object
 * (preserved so a rename PATCH never drops unrelated metadata keys, e.g. the
 * archive marker), and both timestamp fields.
 *
 * @param {object} raw Raw conversation object from the conversations API.
 * @return {{uuid: string, title: string, description: string, metadata: object, updatedAt: (string|undefined), createdAt: (string|undefined)}}
 */
export function normalizeConversation(raw) {
	const source = raw || {}
	const metadata = (source.metadata && typeof source.metadata === 'object') ? source.metadata : {}
	return {
		uuid: source.uuid || source.id,
		title: source.title || '',
		description: (typeof metadata.description === 'string') ? metadata.description : '',
		metadata,
		updatedAt: source.updatedAt || source.updated || source.created,
		createdAt: source.createdAt || source.created,
	}
}
