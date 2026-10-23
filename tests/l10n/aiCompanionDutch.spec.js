/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The AI companion reads in the user's language on another app's page. Hermiq
 * mounts it on every Nextcloud page with no host providing `cnTranslate`, so
 * its button said "Open AI chat" where the Dq settings boards draw
 * "AI-chat openen". Runs the real @nextcloud/l10n.
 *
 * @spec openspec/changes/ai-companion-library-labels/specs/ai-chat-companion/spec.md#requirement-the-companion-reads-in-the-users-language-on-any-page
 */

import { flushPromises, mount } from '@vue/test-utils'
import CnAiCompanion from '../../src/components/CnAiCompanion/CnAiCompanion.vue'
import { __resetAppInstalledCacheForTests } from '../../src/utils/appInstalled.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ status: 200, data: { status: 'ok' } })), post: jest.fn() },
}))
jest.mock('@microsoft/fetch-event-source', () => ({ __esModule: true, fetchEventSource: jest.fn() }))

/**
 * The floating button's accessible name.
 *
 * @param {object} wrapper The mounted companion.
 * @return {string} Its aria-label.
 */
function buttonLabel(wrapper) {
	return wrapper.findComponent({ name: 'CnAiFloatingButton' }).find('[aria-label]').attributes('aria-label')
}

describe('the AI companion on another app\'s page', () => {
	beforeAll(() => {
		globalThis._nc_l10n_language = 'nl'
	})

	afterAll(() => {
		globalThis._nc_l10n_language = 'en'
	})

	beforeEach(() => {
		window.__cnAiCompanionPrimary = null
		window.OC.appswebroots = { hermiq: '/apps/hermiq' }
		__resetAppInstalledCacheForTests()
	})

	it('labels its button in Dutch without a host translate', async () => {
		const wrapper = mount(CnAiCompanion, { props: { chatAppId: 'hermiq' } })
		await flushPromises()
		expect(buttonLabel(wrapper)).toBe('AI-chat openen')
	})

	it('keeps a host\'s own translation and falls back to the library for the rest', async () => {
		const wrapper = mount(CnAiCompanion, {
			props: { chatAppId: 'hermiq' },
			global: { provide: { cnTranslate: (text) => (text === 'Open AI chat' ? 'Vraag het de assistent' : text) } },
		})
		await flushPromises()
		expect(buttonLabel(wrapper)).toBe('Vraag het de assistent')
	})

	it('falls back to the library when the host translate leaves the label as written', async () => {
		const wrapper = mount(CnAiCompanion, {
			props: { chatAppId: 'hermiq' },
			global: { provide: { cnTranslate: (text) => text } },
		})
		await flushPromises()
		expect(buttonLabel(wrapper)).toBe('AI-chat openen')
	})
})
