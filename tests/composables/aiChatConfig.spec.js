/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Tests for aiChatConfig.js — the single configuration point for the AI Chat
 * Companion backend app id + URL builders (chat-appid-flip,
 * chat-appid-default-flip).
 */

const {
	DEFAULT_CHAT_APP_ID,
	chatApiBase,
	chatStreamUrl,
	chatSendUrl,
	chatHealthUrl,
	conversationsUrl,
	conversationMessagesUrl,
} = require('../../src/composables/aiChatConfig.js')

describe('aiChatConfig', () => {
	it('defaults the chat backend to hermiq (the agent engine home per ADR-034 Amendment 2026-07-05)', () => {
		// Flipped from openregister by chat-appid-default-flip once both
		// prerequisites shipped: hermiq's engine port and OR's compat window
		// (openregister#305). openregister stays reachable as an explicit
		// chatAppId override during the compat window.
		expect(DEFAULT_CHAT_APP_ID).toBe('hermiq')
	})

	it('builds every widget URL against the default backend when no app id is passed', () => {
		expect(chatApiBase()).toBe('/index.php/apps/hermiq/api')
		expect(chatStreamUrl()).toBe('/index.php/apps/hermiq/api/chat/stream')
		expect(chatSendUrl()).toBe('/index.php/apps/hermiq/api/chat/send')
		expect(chatHealthUrl()).toBe('/index.php/apps/hermiq/api/chat/health')
		expect(conversationsUrl()).toBe('/index.php/apps/hermiq/api/conversations')
		expect(conversationMessagesUrl(undefined, 'c-1'))
			.toBe('/index.php/apps/hermiq/api/conversations/c-1/messages')
	})

	it('routes every widget URL to an overridden backend app id (openregister compat window)', () => {
		expect(chatApiBase('openregister')).toBe('/index.php/apps/openregister/api')
		expect(chatStreamUrl('openregister')).toBe('/index.php/apps/openregister/api/chat/stream')
		expect(chatSendUrl('openregister')).toBe('/index.php/apps/openregister/api/chat/send')
		expect(chatHealthUrl('openregister')).toBe('/index.php/apps/openregister/api/chat/health')
		expect(conversationsUrl('openregister')).toBe('/index.php/apps/openregister/api/conversations')
		expect(conversationMessagesUrl('openregister', 'c-2'))
			.toBe('/index.php/apps/openregister/api/conversations/c-2/messages')
	})

	it('falls back to the default when passed an empty/nullish app id (never /apps//api)', () => {
		expect(chatApiBase('')).toBe('/index.php/apps/hermiq/api')
		expect(chatStreamUrl(null)).toBe('/index.php/apps/hermiq/api/chat/stream')
	})
})
