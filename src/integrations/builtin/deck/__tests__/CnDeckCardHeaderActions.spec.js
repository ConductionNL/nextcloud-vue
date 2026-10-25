/**
 * CnDeckCard `headerActions` (DqZaakTaken "Kaarten": "Bestaande kaart
 * koppelen" and "Nieuwe kaart" in the title row): on a detail page with an
 * object, the card offers the Deck tab's link and create flows and reloads
 * after either.
 *
 * @spec openspec/changes/deck-card-header-actions/specs/deck-card/spec.md
 */

const { flushPromises, mount } = require('@vue/test-utils')
const CnDeckCard = require('../CnDeckCard.vue').default

const PROPS = { register: 'reg', schema: 'case', objectId: 'obj-1', surface: 'detail-page' }

function ok(body = { results: [] }) {
	return { ok: true, status: 200, json: () => Promise.resolve(body) }
}

describe('CnDeckCard headerActions', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue(ok())
	})

	afterEach(() => {
		delete global.fetch
	})

	it('draws no buttons by default', async () => {
		const w = mount(CnDeckCard, { props: PROPS })
		await flushPromises()
		expect(w.find('[data-testid="cn-deck-card-link"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-deck-card-create"]').exists()).toBe(false)
		w.unmount()
	})

	it('draws link and create in the order given, only on a detail page', async () => {
		const w = mount(CnDeckCard, { props: { ...PROPS, headerActions: ['link', 'create'] } })
		await flushPromises()
		const buttons = w.findAll('[data-testid^="cn-deck-card-"]').filter((b) => ['cn-deck-card-link', 'cn-deck-card-create'].includes(b.attributes('data-testid')))
		expect(buttons.map((b) => b.attributes('data-testid'))).toEqual(['cn-deck-card-link', 'cn-deck-card-create'])
		await w.setProps({ surface: 'user-dashboard' })
		expect(w.find('[data-testid="cn-deck-card-link"]').exists()).toBe(false)
		w.unmount()
	})

	it('links a picked card through the deck endpoint and reloads', async () => {
		const w = mount(CnDeckCard, { props: { ...PROPS, headerActions: ['link'] } })
		await flushPromises()
		global.fetch.mockClear()
		await w.vm.onLink({ cardId: 7 })
		await flushPromises()
		expect(global.fetch.mock.calls[0][0]).toContain('/objects/reg/case/obj-1/deck')
		expect(global.fetch.mock.calls[0][1].method).toBe('POST')
		expect(global.fetch.mock.calls[1][0]).toContain('/integrations/deck')
		w.unmount()
	})

	it('creates a card through the deck endpoint and reloads', async () => {
		const w = mount(CnDeckCard, { props: { ...PROPS, headerActions: ['create'] } })
		await flushPromises()
		global.fetch.mockClear()
		await w.vm.onCreate({ boardId: 1, stackId: 2, title: 'Offerte' })
		await flushPromises()
		expect(global.fetch.mock.calls[0][0]).toContain('/objects/reg/case/obj-1/deck/new')
		expect(global.fetch.mock.calls[1][0]).toContain('/integrations/deck')
		w.unmount()
	})
})
