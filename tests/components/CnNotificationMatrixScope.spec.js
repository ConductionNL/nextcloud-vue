/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A preference narrowed to one kind of case, a digest, and a test send.
 *
 * The failures these guard are all the same shape as the rest of this screen:
 * a setting that looks right and is not in force. A scoped row that silently
 * replaced the global one would stop notifying somebody about every other
 * domain. A scoped row read as "no" when nobody answered it would do the same.
 * A digest that held an urgent event would delay the one notification that
 * could not wait. And a test send that reported nothing would read as proof
 * the channel works.
 *
 * @spec openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

const { mount } = require('@vue/test-utils')
const CnNotificationMatrix = require('../../src/components/CnNotificationMatrix/CnNotificationMatrix.vue').default

const EVENTS = [
	{ id: 'term-expires', label: 'Term expires', group: 'terms', groupLabel: 'Terms', appDefault: false },
	{ id: 'assigned', label: 'Assigned to you', group: 'terms', groupLabel: 'Terms', appDefault: false, immediate: true },
]
const CHANNELS = [
	{ id: 'mail', label: 'Mail', configured: true },
	{ id: 'push', label: 'Push', configured: true },
	{ id: 'sms', label: 'SMS', configured: false, unconfiguredReason: 'No SMS gateway is set up' },
]
const SCOPE_CHOICES = [
	{ id: 'bezwaar', label: 'Objections' },
	{ id: 'wob', label: 'Information requests' },
]

/**
 * Mount the screen.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountScreen(props = {}) {
	return mount(CnNotificationMatrix, {
		props: { events: EVENTS, channels: CHANNELS, scopeChoices: SCOPE_CHOICES, ...props },
	})
}

/**
 * One cell's toggle, on one row.
 *
 * @param {object} wrapper The wrapper.
 * @param {string} eventId The event.
 * @param {string} channelId The channel.
 * @param {string} scope The scope, the empty string for the global row.
 * @return {object} The input.
 */
function toggle(wrapper, eventId, channelId, scope = '') {
	return wrapper.find(`[data-testid="cn-nm-toggle"][data-event="${eventId}"][data-channel="${channelId}"][data-scope="${scope}"]`)
}

describe('a row narrowed to one kind of case', () => {
	it('puts the scoped rows under the global one, in that order', () => {
		// The global row first, because it is the one somebody widens back to.
		const wrapper = mountScreen({
			scopedValues: { 'term-expires': { mail: { bezwaar: true } } },
		})

		const rows = wrapper.findAll('[data-testid="cn-nm-row"][data-event="term-expires"]')
		expect(rows.map((row) => row.attributes('data-scope'))).toEqual(['', 'bezwaar'])
	})

	it('names the scope, so the row is not just an indent', () => {
		const wrapper = mountScreen({
			scopedValues: { 'term-expires': { mail: { bezwaar: true } } },
		})

		expect(wrapper.find('[data-testid="cn-nm-scope-label"]').text()).toBe('Objections')
	})

	it('lets the narrower row win where it applies', () => {
		const wrapper = mountScreen({
			personalValues: { 'term-expires': { mail: false } },
			scopedValues: { 'term-expires': { mail: { bezwaar: true } } },
		})

		expect(toggle(wrapper, 'term-expires', 'mail', 'bezwaar').element.checked).toBe(true)
	})

	it('leaves the global row alone when a scope is set, which is the control', () => {
		// A scope that replaced the global row would silence every other
		// domain the moment somebody narrowed one.
		const wrapper = mountScreen({
			personalValues: { 'term-expires': { mail: false } },
			scopedValues: { 'term-expires': { mail: { bezwaar: true } } },
		})

		expect(toggle(wrapper, 'term-expires', 'mail', '').element.checked).toBe(false)
	})

	it('says a scoped cell nobody answered follows the row above', () => {
		// The checkbox shows the same state either way, so an unanswered
		// narrower question is invisible unless the screen says so.
		const wrapper = mountScreen({
			personalValues: { 'term-expires': { mail: true, push: true } },
			scopedValues: { 'term-expires': { mail: { bezwaar: false } } },
		})

		const cells = wrapper.findAll('[data-testid="cn-nm-cell"][data-event="term-expires"][data-scope="bezwaar"]')
		const push = cells.find((cell) => cell.attributes('data-channel') === 'push')
		expect(push.find('[data-testid="cn-nm-source"]').text()).toBe('Follows the row above')
	})

	it('names the scope in the accessible name of a scoped toggle', () => {
		// Indentation is invisible to a screen reader: without this, two
		// checkboxes for the same event and channel are indistinguishable.
		const wrapper = mountScreen({
			scopedValues: { 'term-expires': { mail: { bezwaar: true } } },
		})

		expect(toggle(wrapper, 'term-expires', 'mail', 'bezwaar').attributes('aria-label'))
			.toBe('Term expires over Mail, for Objections')
	})

	it('emits the scope that was changed, not the global row', async () => {
		const wrapper = mountScreen({
			scopedValues: { 'term-expires': { mail: { bezwaar: false } } },
		})

		const input = toggle(wrapper, 'term-expires', 'mail', 'bezwaar')
		input.element.checked = true
		await input.trigger('change')

		expect(wrapper.emitted().change[0][0]).toEqual({
			eventId: 'term-expires',
			channelId: 'mail',
			scope: 'bezwaar',
			value: true,
		})
	})
})

describe('adding a scope from the row', () => {
	it('offers the scopes this row does not have yet', async () => {
		const wrapper = mountScreen({
			scopedValues: { 'term-expires': { mail: { bezwaar: true } } },
		})

		const select = wrapper.find('[data-testid="cn-nm-add-scope"][data-event="term-expires"]')
		const values = select.findAll('option').map((option) => option.attributes('value'))
		expect(values).toEqual(['', 'wob'])
	})

	it('emits which row was narrowed, and to what', async () => {
		const wrapper = mountScreen()

		const select = wrapper.find('[data-testid="cn-nm-add-scope"][data-event="term-expires"]')
		select.element.value = 'wob'
		await select.trigger('change')

		expect(wrapper.emitted()['add-scope'][0][0]).toEqual({ eventId: 'term-expires', scope: 'wob' })
	})

	it('emits nothing when the placeholder is chosen', async () => {
		const wrapper = mountScreen()

		const select = wrapper.find('[data-testid="cn-nm-add-scope"][data-event="term-expires"]')
		select.element.value = ''
		await select.trigger('change')

		expect(wrapper.emitted()['add-scope']).toBeUndefined()
	})

	it('offers nothing when the host configured no scopes', () => {
		const wrapper = mountScreen({ scopeChoices: [] })

		expect(wrapper.find('[data-testid="cn-nm-add-scope"]').exists()).toBe(false)
	})
})

describe('the catalogue decides what is listed', () => {
	it('does not render a row for an event the catalogue no longer has', () => {
		// A switch for something that can no longer happen is a lie. The store
		// drops the row on the next write; the screen never shows it.
		const wrapper = mountScreen({
			personalValues: { 'retired-event': { mail: true } },
			scopedValues: { 'retired-event': { mail: { bezwaar: true } } },
		})

		expect(wrapper.find('[data-testid="cn-nm-row"][data-event="retired-event"]').exists()).toBe(false)
		expect(wrapper.findAll('[data-testid="cn-nm-row"]').length).toBe(2)
	})
})

describe('the admin screen', () => {
	it('says a person\'s own value wins, so an administrator is not surprised', () => {
		const wrapper = mountScreen({ adminMode: true })

		expect(wrapper.find('[data-testid="cn-nm-admin-note"]').text())
			.toContain('Somebody who has set their own value keeps it')
	})

	it('says nothing of the sort on a person\'s own screen, which is the control', () => {
		const wrapper = mountScreen()

		expect(wrapper.find('[data-testid="cn-nm-admin-note"]').exists()).toBe(false)
	})
})

describe('the digest', () => {
	it('offers off, daily and weekly per channel', () => {
		const wrapper = mountScreen()

		const select = wrapper.find('[data-testid="cn-nm-digest-mode"][data-channel="mail"]')
		expect(select.findAll('option').map((option) => option.attributes('value')))
			.toEqual(['off', 'daily', 'weekly'])
	})

	it('asks for a time of day only once something is being held', () => {
		const wrapper = mountScreen({ digest: { mail: { mode: 'off', timeOfDay: '' } } })

		expect(wrapper.find('[data-testid="cn-nm-digest-time"][data-channel="mail"]').exists()).toBe(false)
	})

	it('shows the time of day when the digest is on, which is the control', () => {
		const wrapper = mountScreen({ digest: { mail: { mode: 'daily', timeOfDay: '08:00' } } })

		expect(wrapper.find('[data-testid="cn-nm-digest-time"][data-channel="mail"]').element.value)
			.toBe('08:00')
	})

	it('emits the mode with the time it already had', async () => {
		// Changing the mode must not silently clear the time somebody chose.
		const wrapper = mountScreen({ digest: { mail: { mode: 'daily', timeOfDay: '08:00' } } })

		const select = wrapper.find('[data-testid="cn-nm-digest-mode"][data-channel="mail"]')
		select.element.value = 'weekly'
		await select.trigger('change')

		expect(wrapper.emitted()['digest-change'][0][0])
			.toEqual({ channelId: 'mail', mode: 'weekly', timeOfDay: '08:00' })
	})

	it('emits the time with the mode it already had', async () => {
		const wrapper = mountScreen({ digest: { mail: { mode: 'weekly', timeOfDay: '08:00' } } })

		const input = wrapper.find('[data-testid="cn-nm-digest-time"][data-channel="mail"]')
		input.element.value = '09:30'
		await input.trigger('change')

		expect(wrapper.emitted()['digest-change'][0][0])
			.toEqual({ channelId: 'mail', mode: 'weekly', timeOfDay: '09:30' })
	})

	it('says urgent events are not held, next to the digest that would hold them', () => {
		// The per-event badge names which ones. This says the rule where
		// somebody is deciding to switch batching on.
		const wrapper = mountScreen({ digest: { mail: { mode: 'daily', timeOfDay: '08:00' } } })

		expect(wrapper.find('[data-testid="cn-nm-digest-immediate-note"]').text())
			.toBe('Events marked as urgent are still sent straight away.')
	})

	it('names the urgent events on the rows themselves', () => {
		const wrapper = mountScreen()

		const badges = wrapper.findAll('[data-testid="cn-nm-immediate"]')
		expect(badges.length).toBe(1)
		expect(wrapper.find('[data-testid="cn-nm-row"][data-event="assigned"]').text())
			.toContain('never held for a digest')
	})

	it('offers no digest on a channel the instance cannot use', () => {
		const wrapper = mountScreen()

		expect(wrapper.find('[data-testid="cn-nm-digest-mode"][data-channel="sms"]').exists()).toBe(false)
	})
})

describe('the test send', () => {
	it('asks for one on the channel it was pressed on', async () => {
		const wrapper = mountScreen()

		await wrapper.find('[data-testid="cn-nm-test-send"][data-channel="mail"]').trigger('click')

		expect(wrapper.emitted()['test-send'][0][0]).toEqual({ channelId: 'mail' })
	})

	it('reports what happened, in the server\'s own words', () => {
		const wrapper = mountScreen({
			testResults: { mail: { ok: true, message: 'Sent to r@example.org' } },
		})

		const result = wrapper.find('[data-testid="cn-nm-test-result"][data-channel="mail"]')
		expect(result.text()).toBe('Sent to r@example.org')
		expect(result.attributes('data-ok')).toBe('true')
	})

	it('reports a refusal as a result with its reason, not as silence', () => {
		// A refusal is an answer. Reporting nothing would read as proof the
		// channel works.
		const wrapper = mountScreen({
			testResults: { mail: { ok: false, message: 'This kind never leaves the organisation' } },
		})

		const result = wrapper.find('[data-testid="cn-nm-test-result"][data-channel="mail"]')
		expect(result.text()).toBe('This kind never leaves the organisation')
		expect(result.attributes('data-ok')).toBe('false')
	})

	it('still says it failed when the server sent no sentence of its own', () => {
		const wrapper = mountScreen({ testResults: { mail: { ok: false, message: '' } } })

		expect(wrapper.find('[data-testid="cn-nm-test-result"][data-channel="mail"]').text())
			.toBe('The test did not arrive.')
	})

	it('says nothing before anybody has pressed it, which is the control', () => {
		const wrapper = mountScreen()

		expect(wrapper.find('[data-testid="cn-nm-test-result"]').exists()).toBe(false)
	})

	it('names the channel on the button, for somebody who cannot see the column', () => {
		const wrapper = mountScreen()

		expect(wrapper.find('[data-testid="cn-nm-test-send"][data-channel="mail"]').attributes('aria-label'))
			.toBe('Send a test over Mail')
	})
})
