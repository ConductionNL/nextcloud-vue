/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The store page reads in the user's language: the manifest description goes
 * through the app's translate, the kind chips show labels and not ids, and
 * every text of the page has a Dutch catalogue entry. Launchpad's store page
 * showed "app-template", "Search the store" and an English description.
 *
 * @spec openspec/changes/screens-store-page-translations/specs/store-page/spec.md#requirement-the-store-page-reads-in-the-users-language
 */
import { flushPromises, mount } from '@vue/test-utils'

jest.mock('@nextcloud/auth', () => ({ __esModule: true, getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

const fs = require('fs')
const path = require('path')
const CnStorePage = require('../../src/components/CnStorePage/CnStorePage.vue').default
const en = require('../../l10n/en.json').translations
const nl = require('../../l10n/nl.json').translations

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnStorePage/CnStorePage.vue'), 'utf8')

async function mountPage(props = {}, translate = null) {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ outcome: 'ok', cards: [{ slug: 'x', title: 'X', kind: 'adapter', publisher: 'Conduction' }] }) }))
	const w = mount(CnStorePage, { props: { app: 'launchpad', ...props }, global: { provide: translate ? { cnTranslate: translate } : {} } })
	await flushPromises()
	return w
}

describe('CnStorePage translations', () => {
	it('every translated string of the page has an English and a Dutch entry', () => {
		const keys = [...new Set([...source.matchAll(/t\(\s*'nextcloud-vue',\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]))]
		expect(keys.length).toBeGreaterThan(20)
		expect(keys.filter((key) => en[key] !== key)).toEqual([])
		expect(keys.filter((key) => typeof nl[key] !== 'string' || nl[key] === '')).toEqual([])
		for (const key of ['Search the store', 'All kinds', 'Store', 'Install', 'App template']) {
			expect(nl[key]).not.toBe(key)
		}
		expect(keys.filter((key) => nl[key].includes('—'))).toEqual([])
	})

	it('shows labels on the kind chips, not ids', async () => {
		const w = await mountPage()
		const chips = ['all', 'app-template', 'adapter', 'source-template', 'configuration-template', 'agent-template'].map((kind) => w.find(`[data-testid="store-kind-${kind}"]`).text())
		expect(chips).toEqual(['All kinds', 'App template', 'Adapter', 'Source template', 'Configuration template', 'Agent template'])
	})

	it('names an app kind through the app catalogue, and lets the app rename a known kind', async () => {
		const words = { 'case-type': 'Zaaktype', adapter: 'Koppeling' }
		const w = await mountPage({ kinds: ['case-type', 'adapter', 'unnamed-kind'] }, (key) => words[key] || key)
		expect(w.find('[data-testid="store-kind-case-type"]').text()).toBe('Zaaktype')
		expect(w.find('[data-testid="store-kind-adapter"]').text()).toBe('Koppeling')
		expect(w.find('[data-testid="store-kind-unnamed-kind"]').text()).toBe('unnamed-kind')
	})

	it('runs the manifest description through the app translate', async () => {
		const w = await mountPage({ description: 'Templates and adapters for your start page.' }, (key) => (key === 'Templates and adapters for your start page.' ? 'Sjablonen en koppelingen voor je startpagina.' : key))
		expect(w.find('.cn-store-page__intro').text()).toBe('Sjablonen en koppelingen voor je startpagina.')
	})

	// @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-the-stores-own-items-read-in-the-users-language
	it('runs the built-in items through the app translate', async () => {
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ outcome: 'not_configured', cards: [] }) }))
		const words = { 'Objection procedure': 'Bezwaarprocedure', 'Intake, hearing and decision.': 'Intake, hoorzitting en besluit.' }
		const w = mount(CnStorePage, {
			props: { app: 'dossiq', builtIn: [{ slug: 'objection', title: 'Objection procedure', description: 'Intake, hearing and decision.' }] },
			global: { provide: { cnTranslate: (key) => words[key] || key } },
		})
		await flushPromises()
		const card = w.find('[data-testid="store-builtin"]')
		expect(card.find('.cn-store-page__card-title').text()).toBe('Bezwaarprocedure')
		expect(card.find('.cn-store-page__card-description').text()).toBe('Intake, hoorzitting en besluit.')
	})
})
