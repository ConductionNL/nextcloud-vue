/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the matrix draws the grid DqPersoonlijkeInstellingen draws
 * ("Melding | In Nextcloud | Per e-mail", a checkbox per cell) and keeps every
 * feature: the bundling, its time and the test send per channel sit in a
 * disclosure under the grid, and why a cell is set is still said.
 *
 * @spec openspec/changes/notification-matrix-board-grid/specs/notification-matrix/spec.md
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

const { mount } = require('@vue/test-utils')
const CnNotificationMatrix = require('../../src/components/CnNotificationMatrix/CnNotificationMatrix.vue').default

const EVENTS = [
	{ id: 'assigned', label: 'A case is assigned to me', group: 'cases', groupLabel: 'Cases', appDefault: true },
	{ id: 'term', label: 'A term ends within 3 days', group: 'cases', groupLabel: 'Cases', appDefault: true },
]
const CHANNELS = [
	{ id: 'nextcloud', label: 'In Nextcloud', configured: true },
	{ id: 'mail', label: 'By email', configured: true },
]

function mountScreen(look, props = {}) {
	return mount(CnNotificationMatrix, {
		props: { events: EVENTS, channels: CHANNELS, ...props },
		global: { provide: { cnLook: look } },
	})
}

describe('CnNotificationMatrix in the board look', () => {
	it('keeps the channel headers to the channel names', () => {
		const wrapper = mountScreen('board')
		const headers = wrapper.findAll('[data-testid="cn-nm-channel-header"]')
		expect(headers.map((h) => h.text())).toEqual(['In Nextcloud', 'By email'])
		expect(wrapper.find('thead [data-testid="cn-nm-digest-mode"]').exists()).toBe(false)
		expect(wrapper.find('thead [data-testid="cn-nm-test-send"]').exists()).toBe(false)
		expect(wrapper.classes()).toContain('cn-notification-matrix--board')
	})

	it('offers the bundling, its time and the test send per channel below the grid', () => {
		const wrapper = mountScreen('board', { digest: { mail: { mode: 'daily', timeOfDay: '08:00' } } })
		const below = wrapper.find('[data-testid="cn-nm-channel-settings"]')
		expect(below.exists()).toBe(true)
		expect(below.element.tagName).toBe('DETAILS')
		expect(below.find('[data-testid="cn-nm-digest-mode"][data-channel="mail"]').exists()).toBe(true)
		expect(below.find('[data-testid="cn-nm-digest-time"][data-channel="mail"]').exists()).toBe(true)
		expect(below.find('[data-testid="cn-nm-test-send"][data-channel="nextcloud"]').exists()).toBe(true)
	})

	it('still says why a cell is set, to assistive technology', () => {
		const wrapper = mountScreen('board')
		const input = wrapper.find('[data-testid="cn-nm-toggle"][data-event="assigned"][data-channel="mail"]')
		const source = wrapper.find(`#${input.attributes('aria-describedby')}`)
		expect(source.exists()).toBe(true)
		expect(source.classes()).toContain('hidden-visually')
		expect(source.text()).not.toBe('')
	})

	it('keeps a forced cell\'s reason visible', () => {
		const wrapper = mountScreen('board', {
			forcedValues: { assigned: { mail: { value: true, by: 'Beheer', reason: 'Verplicht' } } },
		})
		const cell = wrapper.find('[data-testid="cn-nm-cell"][data-event="assigned"][data-channel="mail"]')
		const source = cell.find('[data-testid="cn-nm-source"]')
		expect(source.classes()).not.toContain('hidden-visually')
		expect(source.text()).toContain('Beheer')
	})
})

describe('CnNotificationMatrix in the Nextcloud look', () => {
	it('keeps the controls in the channel headers and no disclosure', () => {
		const wrapper = mountScreen('nextcloud')
		expect(wrapper.find('thead [data-testid="cn-nm-digest-mode"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-nm-channel-settings"]').exists()).toBe(false)
		expect(wrapper.classes()).not.toContain('cn-notification-matrix--board')
	})
})
