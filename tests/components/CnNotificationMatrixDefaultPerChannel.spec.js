/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An event's shipped default can differ per channel: e-mail is an opt-in
 * channel, off until a person switches it on (DqPersoonlijkeInstellingen).
 *
 * @spec openspec/changes/notification-matrix-default-per-channel/specs/notification-matrix/spec.md
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

const { mount } = require('@vue/test-utils')
const CnNotificationMatrix = require('../../src/components/CnNotificationMatrix/CnNotificationMatrix.vue').default

const CHANNELS = [
	{ id: 'nc-notification', label: 'In Nextcloud', configured: true },
	{ id: 'email', label: 'By email', configured: true },
]

/**
 * @param {Array<object>} events The events.
 * @return {Array<boolean>} Each checkbox's state, row by row.
 */
function checked(events) {
	const wrapper = mount(CnNotificationMatrix, {
		props: { events, channels: CHANNELS },
		global: { provide: { cnLook: 'board' } },
	})
	return wrapper.findAll('tbody input[type="checkbox"]').map((box) => box.element.checked)
}

describe('CnNotificationMatrix default per channel', () => {
	it('reads a per-channel default per column', () => {
		expect(checked([{ id: 'a', label: 'A', group: 'g', groupLabel: 'G', appDefault: { 'nc-notification': true, email: false } }])).toEqual([true, false])
	})

	it('still reads one boolean for every column', () => {
		expect(checked([{ id: 'a', label: 'A', group: 'g', groupLabel: 'G', appDefault: true }])).toEqual([true, true])
	})
})
