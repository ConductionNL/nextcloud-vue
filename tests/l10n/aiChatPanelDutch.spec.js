/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every string the AI chat panel translates has a Dutch and an English entry.
 * DqZaakAssistent r36 showed the empty chat in English ("Ask me anything about
 * what you are viewing.") under the Dutch notice beside it.
 *
 * @spec openspec/changes/ai-chat-panel-dutch/specs/ai-chat-companion/spec.md#requirement-the-chat-panel-reads-in-dutch
 */
import fs from 'fs'
import path from 'path'

const root = path.join(__dirname, '../..')
const sfc = fs.readFileSync(path.join(root, 'src/components/CnAiCompanion/CnAiChatPanel.vue'), 'utf8')
const keys = [...new Set([...sfc.matchAll(/cnTranslate\('((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, '\'')))]
const catalogue = (lang) => JSON.parse(fs.readFileSync(path.join(root, `l10n/${lang}.json`), 'utf8')).translations

describe('CnAiChatPanel strings', () => {
	it('finds the panel strings', () => {
		expect(keys.length).toBeGreaterThan(20)
	})

	it.each(['nl', 'en'])('has every panel string in %s', (lang) => {
		const strings = catalogue(lang)
		expect(keys.filter((key) => !(key in strings))).toEqual([])
	})
})
