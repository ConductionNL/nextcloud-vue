/**
 * The Credentials section copy in the user and admin settings dialogs.
 *
 * Every app's settings dialog shows this intro through CnAppRoot, so an
 * em-dash here is an em-dash in pipelinq, dossiq and the rest of the fleet.
 * The Conduction voice bans them (voice.md section 8). These pin the copy to
 * the voice and to the Dutch catalogue, so a rewrite cannot drop the
 * translation without a red test.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

const fs = require('fs')
const path = require('path')

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }))

const CnCredentials = require('../../src/components/CnCredentials/CnCredentials.vue').default
const en = require('../../l10n/en.json').translations
const nl = require('../../l10n/nl.json').translations

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnCredentials/CnCredentials.vue'), 'utf8')

/**
 * The intro text for one scope, read through the component's own computed.
 *
 * @param {string} scope `personal` or `organisation`.
 * @return {string} The intro text.
 */
function intro(scope) {
	return CnCredentials.computed.introText.call({ scope })
}

describe('CnCredentials copy follows the Conduction voice', () => {
	it.each(['personal', 'organisation'])('🔴 the %s intro has no em-dash', (scope) => {
		expect(intro(scope)).not.toMatch(/—|--/)
	})

	it('🔴 no translated string in the component carries an em-dash', () => {
		const strings = [...source.matchAll(/t\('nextcloud-vue',\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1])
		expect(strings.length).toBeGreaterThan(10)
		expect(strings.filter((s) => s.includes('—'))).toEqual([])
	})

	it.each(['personal', 'organisation'])('the %s intro has an English and a Dutch entry', (scope) => {
		const key = intro(scope)
		expect(en[key]).toBe(key)
		expect(nl[key]).toBeTruthy()
		expect(nl[key]).not.toBe(key)
		expect(nl[key]).not.toMatch(/—/)
	})

	it.each(['personal', 'organisation'])('every sentence of the %s intro stays under 16 words', (scope) => {
		const sentences = intro(scope).split(/(?<=\.)\s+/)
		for (const sentence of sentences) {
			expect(sentence.split(/\s+/).length).toBeLessThan(16)
		}
	})
})
