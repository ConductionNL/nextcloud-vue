/**
 * CnDeckCard in the board look on a detail page (DqZaakTaken "Kaarten"):
 * each linked card is a ruled row with its title, one meta line (board,
 * list, assignees) and its first label at the end, with "Open Deck" under
 * the rows, instead of the mini-kanban.
 *
 * @spec openspec/changes/board-deck-calendar-rows/specs/integrations/spec.md
 */

const { flushPromises, mount } = require('@vue/test-utils')
const CnDeckCard = require('../CnDeckCard.vue').default

const CARD = { cardId: 7, boardId: 2, cardTitle: 'Lakken offerte lantaarnpalen', boardTitle: 'Woo en informatie', stackTitle: 'Deze week', assignedUsers: [{ participant: { uid: 'lars', displayname: 'Lars de Koning' } }], labels: [{ id: 1, title: 'Bezig' }] }

function mountCard(look) {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [CARD] }) })
	return mount(CnDeckCard, {
		props: { register: 'reg', schema: 'case', objectId: 'c-1', surface: 'detail-page' },
		global: { provide: { cnLook: look } },
	})
}

describe('CnDeckCard board rows', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('draws the linked card as a row with board, list and assignee, its label at the end, and Open Deck', async () => {
		const w = mountCard('board')
		await flushPromises()
		expect(w.find('.cn-deck-card__kanban').exists()).toBe(false)
		const row = w.find('[data-testid="cn-deck-card-row"]')
		expect(row.text()).toContain('Lakken offerte lantaarnpalen')
		const meta = row.find('[data-testid="cn-deck-card-meta"]').text()
		expect(meta).toContain('Woo en informatie')
		expect(meta).toContain('Deze week')
		expect(meta).toContain('Lars de Koning')
		expect(row.find('[data-testid="cn-deck-card-label"]').text()).toBe('Bezig')
		expect(w.find('[data-testid="cn-deck-card-open"]').attributes('href')).toBe('/index.php/apps/deck')
		w.unmount()
	})

	it('keeps the mini-kanban in the Nextcloud look', async () => {
		const w = mountCard('nextcloud')
		await flushPromises()
		expect(w.find('.cn-deck-card__kanban').exists()).toBe(true)
		w.unmount()
	})
})
