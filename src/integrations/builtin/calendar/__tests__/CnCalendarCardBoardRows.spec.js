/**
 * CnCalendarCard in the board look on a detail page (DqZaakTaken
 * "Afspraken"): each meeting is a ruled row with its title, one meta line
 * (when, where, who) and its status at the end, and "Open in Calendar" is a
 * link under the rows rather than a card footer.
 *
 * @spec openspec/changes/board-deck-calendar-rows/specs/integrations/spec.md
 */

const { flushPromises, mount } = require('@vue/test-utils')

jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const CnCalendarCard = require('../CnCalendarCard.vue').default

const EVENT = { id: 'e1', summary: 'Toelichting stukken', dtstart: '2026-10-14T10:00:00', dtend: '2026-10-14T10:30:00', location: 'stadskantoor, balie 3', attendees: [{ name: 'Sanne de Vries' }], status: 'TENTATIVE' }

function mountCard(look) {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [EVENT] }) })
	return mount(CnCalendarCard, {
		props: { register: 'reg', schema: 'case', objectId: 'c-1', surface: 'detail-page' },
		global: { provide: { cnLook: look }, stubs: { NcLoadingIcon: true } },
	})
}

describe('CnCalendarCard board rows', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('draws the meeting as a row with its meta line and status, and the link under the rows', async () => {
		const w = mountCard('board')
		await flushPromises()
		const row = w.find('.cn-calendar-card__row')
		expect(row.find('.cn-calendar-card__row-icon').exists()).toBe(false)
		const meta = row.find('[data-testid="cn-calendar-card-meta"]').text()
		expect(meta).toContain('stadskantoor, balie 3')
		expect(meta).toContain('Sanne de Vries')
		expect(row.find('[data-testid="cn-calendar-card-status"]').text()).toBe('Tentative')
		expect(w.find('[data-testid="cn-calendar-card-open"]').exists()).toBe(true)
		expect(w.find('.cn-detail-card__footer').exists()).toBe(false)
		w.unmount()
	})

	it('keeps the icon rows and the footer in the Nextcloud look', async () => {
		const w = mountCard('nextcloud')
		await flushPromises()
		expect(w.find('.cn-calendar-card__row-icon').exists()).toBe(true)
		expect(w.find('.cn-detail-card__footer').exists()).toBe(true)
		w.unmount()
	})
})
