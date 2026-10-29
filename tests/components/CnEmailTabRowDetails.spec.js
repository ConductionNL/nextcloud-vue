/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A linked mail with details reads as DqZaakEmail draws it: "From Sanne de
 * Vries · 5 Oct 09:15 · 1 attachment · linked automatically via het
 * Woo-postvak" under the subject, an outgoing mail as "To Lars de Koning",
 * and a pill for its archive copy ("Archived as PDF") or else "Linked".
 *
 * @spec openspec/changes/linked-mail-row-details/specs/linked-mail-row-details/spec.md
 */
const { flushPromises, mount } = require('@vue/test-utils')

jest.mock('../../src/utils/userDisplayName.js', () => ({
	userDisplayName: (uid) => (uid === 'pieter' ? 'Pieter Jansen' : String(uid)),
}))

const { formatBoardDate, formatTimeOfDay } = require('../../src/utils/boardDate.js')
const CnEmailTab = require('../../src/integrations/builtin/email/CnEmailTab.vue').default

const DAY = 86400000
const recent = new Date(Date.now() - 2 * DAY)
const old = new Date(Date.now() - 200 * DAY)

const INBOUND = {
	id: 1,
	subject: 'Aanvulling op Woo-verzoek 2026-0110',
	sender: 'sanne.devries@zuiddrecht.example',
	senderName: 'Sanne de Vries',
	mailDate: recent.toISOString(),
	linkedBy: 'pieter',
	details: { direction: 'inbound', recipientName: null, attachmentCount: 1, linkedVia: 'mailbox', archivedAs: 'pdf', mailboxName: 'het Woo-postvak' },
}
const OUTBOUND = {
	id: 2,
	subject: 'Vraag aan Mobiliteit en verkeer over de stukken',
	sender: 'pieter.jansen@zuiddrecht.example',
	senderName: 'Pieter Jansen',
	mailDate: recent.toISOString(),
	linkedBy: 'pieter',
	details: { direction: 'outbound', recipientName: 'Lars de Koning', attachmentCount: 0, linkedVia: 'manual', archivedAs: 'pdf', mailboxName: null },
}
const FROM_FILE = {
	id: 3,
	subject: 'Planning aanleg verlichting',
	sender: 'planning@vanwijk.zuiddrecht.example',
	senderName: 'Aannemersbedrijf Van Wijk',
	mailDate: old.toISOString(),
	linkedBy: 'pieter',
	details: { direction: 'inbound', recipientName: null, attachmentCount: 2, linkedVia: 'file', archivedAs: null, mailboxName: null },
}
const PLAIN = { id: 4, subject: 'Zonder details', sender: 'iemand@zuiddrecht.example', mailDate: recent.toISOString() }

beforeEach(() => {
	global.fetch = jest.fn(() => Promise.resolve({
		ok: true,
		json: () => Promise.resolve({ items: [INBOUND, OUTBOUND, FROM_FILE, PLAIN], total: 4 }),
	}))
})

afterEach(() => {
	delete global.fetch
})

/**
 * @return {Promise<object[]>} The four mounted list items.
 */
async function items() {
	const wrapper = mount(CnEmailTab, { props: { objectId: 'c1', register: 'dossiq', schema: 'case' } })
	await flushPromises()
	return wrapper.findAll('.cn-email-tab__item')
}

describe('CnEmailTab row details', () => {
	it('reads an incoming mail from its sender, with the date, attachments, mailbox and archive pill', async () => {
		const [item] = await items()
		const when = formatBoardDate(recent) + ' ' + formatTimeOfDay(recent)
		expect(item.find('.cn-email-tab__sender').text()).toBe(`From Sanne de Vries · ${when} · 1 attachment · linked automatically via het Woo-postvak`)
		expect(item.find('.cn-email-tab__date').exists()).toBe(false)
		const pill = item.find('.cn-email-tab__pill')
		expect(pill.text()).toBe('Archived as PDF')
		expect(pill.classes()).toContain('cn-email-tab__pill--archived')
	})

	it('reads an outgoing mail to its recipient, linked by a person, on the outgoing tile', async () => {
		const [, item] = await items()
		const when = formatBoardDate(recent) + ' ' + formatTimeOfDay(recent)
		expect(item.find('.cn-email-tab__sender').text()).toBe(`To Lars de Koning · ${when} · linked by Pieter Jansen`)
		expect(item.find('.cn-email-tab__avatar').classes()).toContain('cn-email-tab__avatar--outbound')
	})

	it('drops the time on an older mail and pills a mail without an archive copy as linked', async () => {
		const [, , item] = await items()
		expect(item.find('.cn-email-tab__sender').text()).toBe(`From Aannemersbedrijf Van Wijk · ${formatBoardDate(old)} · 2 attachments · from a saved mail file`)
		const pill = item.find('.cn-email-tab__pill')
		expect(pill.text()).toBe('Linked')
		expect(pill.classes()).not.toContain('cn-email-tab__pill--archived')
		expect(item.find('.cn-email-tab__avatar').classes()).not.toContain('cn-email-tab__avatar--outbound')
	})

	it('keeps a mail without details as it was: the sender, the date on the right, no pill', async () => {
		const [, , , item] = await items()
		expect(item.find('.cn-email-tab__sender').text()).toBe('iemand@zuiddrecht.example')
		expect(item.find('.cn-email-tab__date').exists()).toBe(true)
		expect(item.find('.cn-email-tab__pill').exists()).toBe(false)
	})
})
