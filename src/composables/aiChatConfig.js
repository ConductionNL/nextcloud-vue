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
 * DEFAULT VALUE — deliberately `openregister`, NOT `hermiq` (see ADR-034 §Amendment
 * 2026-07-05 "Default flip" + SPECTR-NEXTCLOUD-PLAN.md §7.4 step 5):
 *   The amendment sequences the flip so consuming apps keep working across the
 *   move. Hermiq's chat backend ships behind a default-OFF feature flag, and
 *   OpenRegister keeps `/api/chat/*` + `/api/agents` as a 308/proxy compat shim
 *   for >= 1 release (a separate openregister change). Until BOTH the Hermiq
 *   engine flag is live AND the OR compat proxy exists, the safe default that
 *   points at a backend which actually answers today is `openregister`.
 *
 *   This change makes the backend OVERRIDABLE now (via the `chatAppId` prop on
 *   CnAppRoot / CnAiCompanion). Flipping the default to `hermiq` is then a
 *   ONE-LINE change here, to be landed on the coordinated `@conduction/nextcloud-vue`
 *   beta bump once Hermiq's engine (hermiq#13, merged) is enabled by default and
 *   the OR compat proxy change has shipped. Deployments that want to point at
 *   Hermiq before the coordinated default flip can already do so today by passing
 *   `:chat-app-id="'hermiq'"` to `CnAppRoot`.
 */

/**
 * Default chat/agent backend app id the AI Chat Companion targets.
 *
 * @type {string}
 */
export const DEFAULT_CHAT_APP_ID = 'openregister'

/**
 * Base API path for a chat backend app.
 *
 * @param {string} [appId] Backend app id. Falls back to {@link DEFAULT_CHAT_APP_ID}
 *   when empty/nullish so a mis-wired prop never produces `/apps//api`.
 * @return {string} e.g. `/index.php/apps/openregister/api`
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
