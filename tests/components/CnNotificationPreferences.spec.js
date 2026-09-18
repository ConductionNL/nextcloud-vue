/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * One screen where a person chooses what notifies them.
 *
 * Every case here guards the same failure, which is the one this screen exists
 * to prevent: SHOWING A SETTING THAT DOES NOT APPLY. Somebody switches a
 * notification off, keeps receiving it, and nothing on the page ever said why.
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) =>
		String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

const { mount } = require('@vue/test-utils')
const CnNotificationPreferences = require('../../src/components/CnNotificationPreferences/CnNotificationPreferences.vue').default

const EVENTS = [
	{ id: 'term-expires', label: 'Term expires', group: 'terms', groupLabel: 'Terms', appDefault: true },
	{ id: 'assigned', label: 'Assigned to you', group: 'work', groupLabel: 'Work', appDefault: false },
]
const CHANNELS = [
	{ id: 'mail', label: 'Mail', configured: true },
	{ id: 'sms', label: 'SMS', configured: false, unconfiguredReason: 'No SMS gateway is set up' },
]

/**
 * Mount the screen.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountScreen(props = {}) {
	return mount(CnNotificationPreferences, {
		props: { events: EVENTS, channels: CHANNELS, ...props },
	})
}

/**
 * One cell's toggle.
 *
 * @param {object} wrapper The wrapper.
 * @param {string} eventId The event.
 * @param {string} channelId The channel.
 * @return {object} The input.
 */
function toggle(wrapper, eventId, channelId) {
	return wrapper.find(`[data-testid="cn-np-toggle"][data-event="${eventId}"][data-channel="${channelId}"]`)
}

describe('the matrix', () => {
	it('is a real table, with row and column headers', () => {
		// A grid of checkboxes with no headers is unreadable to a screen
		// reader: every cell is "checkbox, checked" with no way to know which
		// event or which channel.
		const wrapper = mountScreen()

		expect(wrapper.find('caption').exists()).toBe(true)
		expect(wrapper.findAll('th[scope="col"]').length).toBeGreaterThan(0)
		expect(wrapper.findAll('th[scope="row"]').length).toBe(EVENTS.length)
	})

	it('names each toggle with its event and its channel', () => {
		expect(toggle(mountScreen(), 'term-expires', 'mail').attributes('aria-label'))
			.toContain('Term expires over Mail')
	})

	it('groups the events and collapses a group', async () => {
		const wrapper = mountScreen()
		const groups = wrapper.findAll('[data-testid="cn-np-group"]')

		expect(groups.map((group) => group.attributes('data-group'))).toEqual(['terms', 'work'])
		expect(groups[0].attributes('aria-expanded')).toBe('true')

		await groups[0].trigger('click')

		expect(wrapper.findAll('[data-testid="cn-np-group"]')[0].attributes('aria-expanded')).toBe('false')
	})
})

describe('where a value came from', () => {
	it('says it follows the app default', () => {
		const wrapper = mountScreen()

		expect(wrapper.find('[data-testid="cn-np-cell"][data-event="term-expires"][data-channel="mail"]').text())
			.toContain('Follows the app default')
	})

	it('says it follows the group', () => {
		const wrapper = mountScreen({ groupValues: { 'term-expires': { mail: false } } })
		const cell = wrapper.find('[data-testid="cn-np-cell"][data-event="term-expires"][data-channel="mail"]')

		expect(cell.attributes('data-level')).toBe('group')
		expect(cell.text()).toContain('Follows your group')
	})

	it('says it is the choice of the reader, and a personal false is a choice', () => {
		// The bug a truthiness check makes: switching something off reads as
		// never having chosen, and the group default switches it back on.
		const wrapper = mountScreen({
			groupValues: { 'term-expires': { mail: true } },
			personalValues: { 'term-expires': { mail: false } },
		})
		const cell = wrapper.find('[data-testid="cn-np-cell"][data-event="term-expires"][data-channel="mail"]')

		expect(cell.attributes('data-level')).toBe('personal')
		expect(toggle(wrapper, 'term-expires', 'mail').element.checked).toBe(false)
	})
})

describe('a channel an administrator has forced', () => {
	it('is locked, and says who forced it and why', async () => {
		// The whole point. A toggle the person can move which then does
		// nothing is worse than a locked one, because they believe they acted.
		const wrapper = mountScreen({
			personalValues: { 'term-expires': { mail: false } },
			forcedValues: {
				'term-expires': {
					mail: { value: true, by: 'Gemeente Amsterdam', reason: 'Wettelijke kennisgeving' },
				},
			},
		})

		const input = toggle(wrapper, 'term-expires', 'mail')
		expect(input.element.checked).toBe(true)
		expect(input.attributes('disabled')).toBeDefined()

		const cell = wrapper.find('[data-testid="cn-np-cell"][data-event="term-expires"][data-channel="mail"]')
		expect(cell.attributes('data-level')).toBe('forced')
		expect(cell.text()).toContain('Gemeente Amsterdam')
		expect(cell.text()).toContain('Wettelijke kennisgeving')
	})

	it('emits nothing if a forced cell is somehow toggled', async () => {
		// The disabled attribute is a rendering. This is the rule.
		const wrapper = mountScreen({
			forcedValues: { 'term-expires': { mail: { value: true, by: 'Beheer' } } },
		})

		await toggle(wrapper, 'term-expires', 'mail').trigger('change')

		expect(wrapper.emitted().change).toBeUndefined()
	})

	it('leaves every other cell editable, which is the control', async () => {
		// A screen that locked everything would pass the tests above and be
		// read-only.
		const wrapper = mountScreen({
			forcedValues: { 'term-expires': { mail: { value: true, by: 'Beheer' } } },
		})

		const input = toggle(wrapper, 'assigned', 'mail')
		expect(input.attributes('disabled')).toBeUndefined()

		input.element.checked = true
		await input.trigger('change')

		expect(wrapper.emitted().change[0][0]).toEqual({
			eventId: 'assigned',
			channelId: 'mail',
			value: true,
		})
	})
})

describe('a channel that cannot carry this', () => {
	it('says the instance has not configured it', () => {
		const wrapper = mountScreen()

		expect(wrapper.find('[data-testid="cn-np-channel-unusable"]').text())
			.toBe('No SMS gateway is set up')
		expect(toggle(wrapper, 'term-expires', 'sms').attributes('disabled')).toBeDefined()
	})

	it('says the RULE when the platform refused it, not that it is missing', () => {
		// An internal notice to an outside recipient is a rule working
		// correctly. "Not available" would send somebody to fix a
		// configuration that is already right.
		const wrapper = mountScreen({
			refusals: {
				'term-expires': {
					mail: { reason: 'An internal notice is not sent to an external recipient' },
				},
			},
		})

		const cell = wrapper.find('[data-testid="cn-np-cell"][data-event="term-expires"][data-channel="mail"]')
		expect(cell.text()).toContain('internal notice is not sent to an external recipient')
		expect(toggle(wrapper, 'term-expires', 'mail').attributes('disabled')).toBeDefined()
	})

	it('puts the reason in the accessible name too', () => {
		// A disabled checkbox with no name is a dead end for a screen reader.
		const wrapper = mountScreen({
			refusals: { 'term-expires': { mail: { reason: 'Not for this recipient' } } },
		})

		expect(toggle(wrapper, 'term-expires', 'mail').attributes('aria-label'))
			.toContain('Not for this recipient')
	})
})

describe('the admin screen', () => {
	it('says a person who has chosen keeps their choice', () => {
		// So an administrator is not surprised when somebody does not get
		// what they set.
		const wrapper = mountScreen({ adminMode: true })

		expect(wrapper.find('[data-testid="cn-np-admin-note"]').text()).toContain('keeps it')
	})

	it('says nothing of the sort on the personal screen', () => {
		expect(mountScreen().find('[data-testid="cn-np-admin-note"]').exists()).toBe(false)
	})
})

describe('an event the app always sends straight away', () => {
	it('says so on the row', () => {
		const wrapper = mountScreen({
			events: [{ ...EVENTS[0], immediate: true }],
		})

		expect(wrapper.find('[data-testid="cn-np-immediate"]').text()).toContain('never held')
	})
})
