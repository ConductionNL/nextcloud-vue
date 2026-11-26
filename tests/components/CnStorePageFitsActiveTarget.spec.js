/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The store list narrows to the items that fit the active target, as larpinq's
 * store draws "Past bij: De Zuiderlanden", and an install starts on that target.
 *
 * @spec openspec/changes/store-fits-active-target/specs/store-page/spec.md#requirement-the-list-narrows-to-the-items-that-fit-the-active-target
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('@nextcloud/dialogs', () => ({ showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const worlds = [{ id: 'w1', label: 'De Zuiderlanden' }, { id: 'w2', label: 'Nevelkust' }]
const cards = [
	{ slug: 'skills', title: 'Fantasy basisregels' },
	{ slug: 'theme', title: 'Thema Nevelkust' },
	{ slug: 'templates', title: 'Karakterbladsjablonen' },
	{ slug: 'spells', title: 'Spreuken' },
]
const installed = { skills: ['w1'], theme: ['w2'], templates: [''] }

function answer(searchBody, installBody = { success: true, components: [] }) {
	global.fetch = jest.fn((url) => Promise.resolve({
		ok: true,
		json: () => Promise.resolve(url.endsWith('/install') ? installBody : searchBody),
	}))
}

async function mountPage(props = {}, workspace = undefined, look = undefined) {
	const provide = {
		...(workspace === undefined ? {} : { cnWorkspaceContext: workspace }),
		...(look === undefined ? {} : { cnLook: look }),
	}
	const w = mount(CnStorePage, { props: { app: 'larpinq', targets: worlds, ...props }, global: { provide } })
	await flushPromises()
	return w
}

const titles = (w) => w.findAll('[data-testid="store-results"] > li').map((li) => li.text())
const shows = (w, title) => titles(w).some((text) => text.includes(title))

describe('CnStorePage fits the active target', () => {
	it('hides an item installed only into another target, and names the filter', async () => {
		answer({ outcome: 'ok', cards, installed })
		const w = await mountPage({ activeTarget: 'w1' })
		expect(shows(w, 'Fantasy basisregels')).toBe(true)
		expect(shows(w, 'Karakterbladsjablonen')).toBe(true)
		expect(shows(w, 'Spreuken')).toBe(true)
		expect(shows(w, 'Thema Nevelkust')).toBe(false)
		expect(w.find('[data-testid="store-fits-target"]').text()).toBe('Fits: De Zuiderlanden')
	})

	it('shows every item again when the user clears the filter', async () => {
		answer({ outcome: 'ok', cards, installed })
		const w = await mountPage({ activeTarget: 'w1' })
		await w.find('[data-testid="store-fits-target-clear"]').trigger('click')
		expect(titles(w)).toHaveLength(4)
		expect(w.find('[data-testid="store-active-filters"]').exists()).toBe(false)
	})

	it('reads the active target from a workspace token, plain or as a ref', async () => {
		answer({ outcome: 'ok', cards, installed })
		let w = await mountPage({ activeTarget: '@workspace.activeWorld?' }, { activeWorld: 'w2' })
		expect(shows(w, 'Thema Nevelkust')).toBe(true)
		expect(shows(w, 'Fantasy basisregels')).toBe(false)
		expect(w.find('[data-testid="store-fits-target"]').text()).toBe('Fits: Nevelkust')
		w = await mountPage({ activeTarget: '@workspace.activeWorld' }, { value: { activeWorld: 'w1' } })
		expect(shows(w, 'Thema Nevelkust')).toBe(false)
	})

	it('shows every item and no filter without an active target', async () => {
		answer({ outcome: 'ok', cards, installed })
		for (const w of [
			await mountPage(),
			await mountPage({ activeTarget: '@workspace.activeWorld?' }, {}),
			await mountPage({ activeTarget: '@workspace.activeWorld?' }),
			await mountPage({ activeTarget: '@config.world' }),
		]) {
			expect(titles(w)).toHaveLength(4)
			expect(w.find('[data-testid="store-active-filters"]').exists()).toBe(false)
		}
	})

	it('names an unknown active target by its id', async () => {
		answer({ outcome: 'ok', cards, installed })
		const w = await mountPage({ activeTarget: 'w9' })
		expect(w.find('[data-testid="store-fits-target"]').text()).toBe('Fits: w9')
		expect(shows(w, 'Fantasy basisregels')).toBe(false)
		expect(shows(w, 'Spreuken')).toBe(true)
	})

	it('narrows the board look too, under the chosen lens', async () => {
		answer({ outcome: 'ok', cards: cards.map((card) => ({ ...card, installed: card.slug !== 'spells' })), installed })
		const w = await mountPage({ activeTarget: 'w1' }, undefined, 'board')
		expect(w.vm.isBoardLook).toBe(true)
		w.vm.lens = 'installed'
		await flushPromises()
		expect(w.vm.visibleCards.map((card) => card.slug)).toEqual(['skills', 'templates'])
	})

	it('starts the install picker on the active target; a picked target wins', async () => {
		answer({ outcome: 'ok', cards, installed: {} })
		const w = await mountPage({ activeTarget: 'w2' })
		expect(w.vm.selectedTarget.id).toBe('w2')
		await w.vm.install(cards[3])
		await flushPromises()
		const installCall = global.fetch.mock.calls.find(([url]) => url.endsWith('/install'))
		expect(JSON.parse(installCall[1].body).target).toBe('w2')
		w.vm.targetId = 'w1'
		expect(w.vm.selectedTarget.id).toBe('w1')
	})
})
