/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card says where its item is installed, as larpinq's store draws
 * "Geïnstalleerd in De Zuiderlanden": the engine answers a search with
 * `installed` (slug to target ids) and the card names the targets by label.
 *
 * @spec openspec/changes/store-installed-in/specs/store-page/spec.md#requirement-a-card-says-where-its-item-is-installed
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('@nextcloud/dialogs', () => ({ showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const worlds = [{ id: 'w1', label: 'De Zuiderlanden' }, { id: 'w2', label: 'Nevelkust' }]
const cards = [{ slug: 'skills', title: 'Fantasy basisregels' }, { slug: 'effects', title: 'Effecten' }]

function answer(searchBody, installBody = { success: true, components: [] }) {
	global.fetch = jest.fn((url) => Promise.resolve({
		ok: true,
		json: () => Promise.resolve(url.endsWith('/install') ? installBody : searchBody),
	}))
}

async function mountPage(props = {}) {
	const w = mount(CnStorePage, { props: { app: 'larpinq', targets: worlds, ...props } })
	await flushPromises()
	return w
}

const lineOf = (w, index) => w.findAll('[data-testid="store-results"] > li')[index].find('[data-testid="store-card-installed-in"]')

describe('CnStorePage installed in', () => {
	it('names the targets an item is installed into by their labels', async () => {
		answer({ outcome: 'ok', cards, installed: { skills: ['w1', 'w2'] } })
		const w = await mountPage()
		expect(lineOf(w, 0).text()).toBe('Installed in De Zuiderlanden, Nevelkust')
		expect(lineOf(w, 1).exists()).toBe(false)
	})

	it('draws the line on the board look too', async () => {
		answer({ outcome: 'ok', cards, installed: { skills: ['w1'] } })
		const w = await mountPage({ cnLook: 'board' })
		expect(w.find('[data-testid="store-card-installed-in"]').text()).toBe('Installed in De Zuiderlanden')
	})

	it('falls back to the id for a target it has no label for, and skips an install without target', async () => {
		answer({ outcome: 'ok', cards, installed: { skills: ['', 'w9'], effects: [''] } })
		const w = await mountPage()
		expect(lineOf(w, 0).text()).toBe('Installed in w9')
		expect(lineOf(w, 1).exists()).toBe(false)
	})

	it('reads nothing from an engine that does not report it, or reports it malformed', async () => {
		answer({ outcome: 'ok', cards })
		expect((await mountPage()).find('[data-testid="store-card-installed-in"]').exists()).toBe(false)
		answer({ outcome: 'ok', cards, installed: ['skills'] })
		expect((await mountPage()).find('[data-testid="store-card-installed-in"]').exists()).toBe(false)
		answer({ outcome: 'ok', cards, installed: { skills: 'w1' } })
		expect((await mountPage()).find('[data-testid="store-card-installed-in"]').exists()).toBe(false)
	})

	it('says where an item went right after a whole install', async () => {
		answer({ outcome: 'ok', cards, installed: { skills: ['w1'] } })
		const w = await mountPage()
		w.vm.targetId = 'w2'
		await w.vm.install(cards[0])
		await flushPromises()
		expect(lineOf(w, 0).text()).toBe('Installed in De Zuiderlanden, Nevelkust')
	})

	it('does not claim an install that was refused in part', async () => {
		answer({ outcome: 'ok', cards }, { success: false, components: [{ schema: 'effect', status: 'refused' }] })
		const w = await mountPage()
		await w.vm.install(cards[1])
		await flushPromises()
		expect(lineOf(w, 1).exists()).toBe(false)
	})
})
