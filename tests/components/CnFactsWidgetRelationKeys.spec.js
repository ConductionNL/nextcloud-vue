import { emit as busEmit } from '@nextcloud/event-bus'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The facts widget draws the relation boards' side cards
 * (screens-relation-pages): contact details as links, a masked BSN with
 * Show, copy, row icons, a lead (DigiD, KvK, the main contact), address lines
 * in the normal ink, constant text, an action and a header action.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnFactsWidget, { FACTS_REVEAL_CHANNEL } from '../../src/components/CnFactsWidget/CnFactsWidget.vue'

jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const PERSON = {
	id: 'p-1',
	name: 'Sanne de Vries',
	bsn: '123457609',
	email: 's.devries@example.nl',
	phone: '06 12 34 56 78',
	website: 'buurtoost.nl',
	address: { street: 'Parkstraat', number: '24', postcode: '3311 AB', city: 'Zuiddrecht' },
	kvkNumber: '40481234',
	legalForm: 'Vereniging',
	mainContact: { name: 'Sanne de Vries', role: 'Secretaris' },
}

function mountFacts(content, { dispatch } = {}) {
	return mount(CnFactsWidget, {
		props: { content, objectData: PERSON, objectId: 'p-1' },
		global: {
			provide: { cnTranslate: (key) => key, ...(dispatch ? { cnDispatchAction: dispatch } : {}) },
			stubs: { CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' } },
		},
	})
}

describe('CnFactsWidget relation keys', () => {
	it('draws email, phone and url rows as links, and drops an empty one', () => {
		const w = mountFacts({ fields: [
			{ label: 'E-mail', path: 'email', format: 'email' },
			{ label: 'Telefoon', path: 'phone', format: 'phone' },
			{ label: 'Website', path: 'website', format: 'url' },
			{ label: 'Fax', path: 'fax', format: 'phone' },
		] })
		const links = w.findAll('.cn-facts-widget__value-link')
		expect(links.map((a) => a.attributes('href'))).toEqual(['mailto:s.devries@example.nl', 'tel:0612345678', 'https://buurtoost.nl'])
		expect(links[2].attributes('target')).toBe('_blank')
		expect(w.find('[data-testid="cn-fact-fax"]').exists()).toBe(false)
	})

	it('masks a value, shows it on Show and reports the reveal', async () => {
		const w = mountFacts({ fields: [{ label: 'BSN', path: 'bsn', format: 'masked', reveal: true }] })
		const row = w.find('[data-testid="cn-fact-bsn"]')
		expect(row.find('dd').text()).toContain('*****7609')
		expect(row.find('dd').text()).not.toContain('123457609')
		await w.find('[data-testid="cn-fact-reveal-bsn"]').trigger('click')
		expect(w.find('[data-testid="cn-fact-bsn"] dd').text()).toContain('123457609')
		expect(w.find('[data-testid="cn-fact-reveal-bsn"]').exists()).toBe(false)
		expect(w.emitted('reveal')[0][0]).toEqual({ path: 'bsn' })
		expect(busEmit).toHaveBeenCalledWith(FACTS_REVEAL_CHANNEL, expect.objectContaining({ path: 'bsn', objectId: 'p-1' }))
	})

	it('a masked row without reveal has no Show button', () => {
		const w = mountFacts({ fields: [{ label: 'BSN', path: 'bsn', format: 'masked' }] })
		expect(w.find('[data-testid="cn-fact-reveal-bsn"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-fact-bsn"] dd').text()).toBe('*****7609')
	})

	it('copies the raw value', async () => {
		const writeText = jest.fn().mockResolvedValue(undefined)
		Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText }, configurable: true })
		const w = mountFacts({ fields: [{ label: 'Telefoon', path: 'phone', format: 'phone', copy: true }] })
		await w.find('[data-testid="cn-fact-copy-phone"]').trigger('click')
		expect(writeText).toHaveBeenCalledWith('06 12 34 56 78')
	})

	it('draws an icon in place of the label, keeping the label for a screen reader', () => {
		const w = mountFacts({ fields: [{ icon: 'EmailOutline', label: 'E-mail', path: 'mainContact.name' }] })
		const dt = w.find('[data-testid="cn-fact-mainContact-name"] dt')
		expect(dt.find('.icon').attributes('data-name')).toBe('EmailOutline')
		expect(dt.find('.hidden-visually').text()).toBe('E-mail')
	})

	it('draws a lead with an icon tile, a title with a label and a subtitle with a constant', () => {
		const w = mountFacts({ fields: [{ as: 'lead', key: 'kvk', icon: 'OfficeBuildingOutline', title: [{ path: 'kvkNumber', label: 'KVK' }], subtitle: ['legalForm', { text: 'Handelsregister' }] }] })
		const lead = w.find('[data-testid="cn-fact-kvk"]')
		expect(lead.find('.cn-facts-widget__lead-title').text()).toBe('KVK 40481234')
		expect(lead.find('.cn-facts-widget__lead-subtitle').text()).toBe('Vereniging · Handelsregister')
		expect(lead.find('.icon').attributes('data-name')).toBe('OfficeBuildingOutline')
	})

	it('draws a lead with initials, and none when its title is empty', () => {
		const w = mountFacts({ fields: [
			{ as: 'lead', key: 'main', initialsPath: 'mainContact.name', title: 'mainContact.name', subtitle: 'mainContact.role' },
			{ as: 'lead', key: 'none', icon: 'Shield', title: 'nobody' },
		] })
		expect(w.find('[data-testid="cn-fact-main"] .cn-facts-widget__lead-tile').text()).toBe('SV')
		expect(w.find('[data-testid="cn-fact-none"]').exists()).toBe(false)
	})

	it('draws address lines in the normal ink and a constant note', () => {
		const w = mountFacts({ fields: [
			{ as: 'text', key: 'street', parts: ['address.street', 'address.number'], separator: ' ' },
			{ as: 'text', key: 'city', parts: ['address.postcode', 'address.city'], separator: ' ' },
			{ as: 'line', key: 'note', text: 'Het tonen van het BSN wordt gelogd.' },
		] })
		expect(w.find('[data-testid="cn-fact-street"]').classes()).toContain('cn-facts-widget__text')
		expect(w.find('[data-testid="cn-fact-street"]').text()).toBe('Parkstraat 24')
		expect(w.find('[data-testid="cn-fact-city"]').text()).toBe('3311 AB Zuiddrecht')
		expect(w.find('[data-testid="cn-fact-note"]').text()).toBe('Het tonen van het BSN wordt gelogd.')
	})

	it('dispatches the action with the record tokens resolved', async () => {
		const dispatch = jest.fn()
		const w = mountFacts({ fields: [{ label: 'E-mail', path: 'email' }], action: { label: 'Contact vastleggen', icon: 'PhoneLog', type: 'open-form', schema: 'moment', props: { contact: '@objectId' } } }, { dispatch })
		const button = w.find('[data-testid="cn-facts-action"]')
		expect(button.text()).toBe('Contact vastleggen')
		await button.trigger('click')
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-form', props: { contact: 'p-1' } }))
	})

	it('reports the header action through the header event', async () => {
		const dispatch = jest.fn()
		const w = mountFacts({ fields: [{ label: 'E-mail', path: 'email' }], headerAction: { label: 'Toevoegen', icon: 'Plus', type: 'open-form', props: { owner: '@objectId' } } }, { dispatch })
		await nextTick()
		const header = w.emitted('header').at(-1)[0]
		expect(header.action.label).toBe('Toevoegen')
		header.action.run()
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ props: { owner: 'p-1' } }))
	})

	it('leaves an entry without the new keys as it was', () => {
		const w = mountFacts({ fields: [{ label: 'E-mail', path: 'email' }, { as: 'line', parts: ['name'] }] })
		expect(w.find('.cn-facts-widget__value-link').exists()).toBe(false)
		expect(w.find('[data-testid="cn-fact-email"] dd').text()).toBe('s.devries@example.nl')
		expect(w.find('.cn-facts-widget__line').text()).toBe('Sanne de Vries')
		expect(w.find('[data-testid="cn-facts-action"]').exists()).toBe(false)
		expect(w.emitted('header').at(-1)[0].action).toBe(null)
	})
})
