/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The AI chat companion speaks the user's language even where no app provides
 * a translator. hermiq mounts it on every Nextcloud page outside its own,
 * without CnAppRoot, so the button read "Open AI chat" on Dutch settings pages
 * (COMPDIFF r24 DqInstellingen, DqVthInstellingen, DqBeheerinstellingen, ...)
 * while the library's catalogue holds "AI-chat openen". Without an injected
 * `cnTranslate` the companion's parts now use the library's own strings, and
 * the companion registers the library catalogue if the page never did.
 *
 * @spec openspec/changes/ai-companion-library-translate/specs/ai-companion-library-translate/spec.md
 */

const mockRegister = jest.fn()
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => (app === 'nextcloud-vue' && text === 'Open AI chat' ? 'AI-chat openen' : text),
	translatePlural: (app, s, p, n) => (n === 1 ? s : p),
	getLanguage: () => 'nl',
	register: (...a) => mockRegister(...a),
}))

const { mount } = require('@vue/test-utils')
const CnAiFloatingButton = require('../../src/components/CnAiCompanion/CnAiFloatingButton.vue').default
const { libraryTranslate } = require('../../src/utils/libraryTranslate.js')

describe('the AI companion without a host translator', () => {
	it('registers the library catalogue on first use when the page did not', () => {
		expect(libraryTranslate('Open AI chat')).toBe('AI-chat openen')
		expect(mockRegister).toHaveBeenCalledWith('nextcloud-vue', expect.any(Object))
	})

	it('names the button with the library string', () => {
		const w = mount(CnAiFloatingButton)
		expect(w.find('[data-testid="cn-ai-fab"]').attributes('aria-label')).toBe('AI-chat openen')
	})

	it('keeps a host translator when one is provided', () => {
		const w = mount(CnAiFloatingButton, { global: { provide: { cnTranslate: (k) => `host:${k}` } } })
		expect(w.find('[data-testid="cn-ai-fab"]').attributes('aria-label')).toBe('host:Open AI chat')
	})

	it.each(['CnAiChatPanel', 'CnAiInput', 'CnAiMessageList', 'CnAiHistoryList', 'CnAiAgentPicker', 'CnAiRecentSessions'])('%s defaults to the library translator', (name) => {
		const source = require('fs').readFileSync(require('path').join(__dirname, `../../src/components/CnAiCompanion/${name}.vue`), 'utf8')
		expect(source).toContain('cnTranslate: { default: () => libraryTranslate },')
	})
})
