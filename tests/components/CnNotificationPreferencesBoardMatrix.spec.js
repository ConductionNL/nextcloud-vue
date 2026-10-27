/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the notification pane draws the events as a matrix of
 * channels (PqPersoonlijk "Meldingen": Melding / In Nextcloud / Per e-mail),
 * not the switch tiles of the Nextcloud look, and a cell writes the row's
 * channels back to OpenRegister.
 *
 * @spec openspec/changes/notification-preferences-board-matrix/specs/notification-preferences-board-matrix/spec.md
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => String(text),
	getLanguage: () => 'nl',
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), put: jest.fn() },
}))

const axios = require('@nextcloud/axios').default
const { flushPromises, mount } = require('@vue/test-utils')
const CnNotificationPreferences = require('../../src/components/CnNotificationPreferences/CnNotificationPreferences.vue').default

const STUBS = {
	NcAppSettingsSection: { template: '<section><slot /></section>' },
	NcButton: { template: '<button><slot /></button>' },
	NcCheckboxRadioSwitch: { props: ['modelValue'], template: '<label class="switch"><slot /></label>' },
	NcEmptyContent: { props: ['name'], template: '<div class="empty">{{ name }}</div>' },
	NcLoadingIcon: true,
	CnNotificationMatrix: { name: 'CnNotificationMatrix', props: ['events', 'channels'], emits: ['change'], template: '<div class="matrix-stub" />' },
}

const RESULTS = [
	{ schema: 'lead', schemaTitle: 'Lead', application: 'pipelinq', notification: 'leadAssigned', enabled: true, channels: ['notification'], availableChannels: ['notification', 'email'], source: 'schema-default' },
]

async function mountPane(look) {
	axios.get.mockResolvedValue({ data: { results: RESULTS } })
	const wrapper = mount(CnNotificationPreferences, { global: { provide: { cnLook: look, cnAppId: 'pipelinq' }, stubs: STUBS } })
	await flushPromises()
	return wrapper
}

describe('CnNotificationPreferences in the board look', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.put.mockReset()
	})

	it('draws the matrix with a column per channel, not switch tiles', async () => {
		const wrapper = await mountPane('board')
		const matrix = wrapper.findComponent({ name: 'CnNotificationMatrix' })
		expect(matrix.exists()).toBe(true)
		expect(matrix.props('channels').map((c) => c.label)).toEqual(['In Nextcloud', 'By email'])
		expect(wrapper.findAll('.switch')).toHaveLength(0)
	})

	it('keeps the switch tiles in the Nextcloud look', async () => {
		const wrapper = await mountPane('nextcloud')
		expect(wrapper.findComponent({ name: 'CnNotificationMatrix' }).exists()).toBe(false)
		expect(wrapper.findAll('.switch')).toHaveLength(1)
	})

	it('writes a cell as the row\'s channels', async () => {
		const wrapper = await mountPane('board')
		axios.put.mockResolvedValue({ data: {} })
		const matrix = wrapper.findComponent({ name: 'CnNotificationMatrix' })
		const eventId = matrix.props('events')[0].id
		matrix.vm.$emit('change', { eventId, channelId: 'email', value: true })
		await flushPromises()
		expect(axios.put).toHaveBeenCalledWith('/apps/openregister/api/notification-preferences', expect.objectContaining({
			schema: 'lead',
			notification: 'leadAssigned',
			enabled: true,
			channels: ['notification', 'email'],
		}))
	})
})
