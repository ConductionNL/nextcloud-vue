/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `CnQuietHours` reads and saves OpenRegister's per-user delivery window, and
 * `CnNotificationPreferences` shows it only when the app turns it on.
 *
 * @spec openspec/changes/notification-quiet-hours-block/specs/notification-preferences/spec.md#requirement-the-notification-pane-can-show-quiet-hours-from-openregisters-delivery-window
 */

jest.mock('@nextcloud/l10n', () => ({
	getLanguage: () => 'en',
	translate: (app, text) => String(text),
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), put: jest.fn() },
}))

const axios = require('@nextcloud/axios').default
const { flushPromises, mount } = require('@vue/test-utils')
const CnQuietHours = require('../../src/components/CnQuietHours/CnQuietHours.vue').default
const CnNotificationPreferences = require('../../src/components/CnNotificationPreferences/CnNotificationPreferences.vue').default

const WINDOW = '/apps/openregister/api/notification-delivery-window'
const PREFS = '/apps/openregister/api/notification-preferences'

const stubs = {
	NcAppSettingsSection: { template: '<section><slot /></section>' },
	NcButton: { template: '<button class="save" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
	NcCheckboxRadioSwitch: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template: '<label class="switch" :data-checked="String(modelValue)" @click="$emit(\'update:modelValue\', !modelValue)"><slot /></label>',
	},
	NcTextField: {
		props: ['modelValue', 'label', 'error'],
		emits: ['update:modelValue'],
		template: '<input class="field" :aria-label="label" :data-error="String(error)" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
	},
	NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
	NcEmptyContent: { props: ['name'], template: '<div class="empty">{{ name }}</div>' },
	NcLoadingIcon: { template: '<span class="loading" />' },
	CnNotificationMatrix: { template: '<div />' },
}

/**
 * Mount the block after its first read.
 *
 * @return {Promise<object>} The wrapper.
 */
async function mountBlock() {
	const wrapper = mount(CnQuietHours, { global: { stubs } })
	await flushPromises()
	return wrapper
}

/**
 * The two time fields, start first.
 *
 * @param {object} wrapper The block.
 * @return {Array<object>} The start and end inputs.
 */
function fields(wrapper) {
	return wrapper.findAll('input.field')
}

/**
 * A rejected axios call with a status and body.
 *
 * @param {number} status The HTTP status.
 * @param {object} data The body.
 * @return {Promise<never>} The rejection.
 */
function answer(status, data = {}) {
	return Promise.reject(Object.assign(new Error(String(status)), { response: { status, data } }))
}

describe('CnQuietHours', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.put.mockReset()
	})

	it('fills the fields from the stored window', async () => {
		axios.get.mockResolvedValue({ data: { enabled: true, start: '21:30', end: '06:45', timezone: 'Europe/Amsterdam' } })
		const wrapper = await mountBlock()

		expect(axios.get).toHaveBeenCalledWith(WINDOW)
		expect(wrapper.find('label.switch').attributes('data-checked')).toBe('true')
		expect(fields(wrapper)[0].element.value).toBe('21:30')
		expect(fields(wrapper)[1].element.value).toBe('06:45')
		expect(wrapper.text()).toContain('This applies to every app that sends notifications through Open Register.')
	})

	it('saves the window with the browser time zone', async () => {
		axios.get.mockResolvedValue({ data: { enabled: false } })
		axios.put.mockResolvedValue({ data: { enabled: true, start: '22:00', end: '07:00', timezone: 'Europe/Amsterdam' } })
		const wrapper = await mountBlock()

		await wrapper.find('label.switch').trigger('click')
		await fields(wrapper)[0].setValue('22:00')
		await fields(wrapper)[1].setValue('07:00')
		await wrapper.find('button.save').trigger('click')
		await flushPromises()

		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
		expect(axios.put).toHaveBeenCalledWith(WINDOW, { enabled: true, start: '22:00', end: '07:00', timezone: zone })
		expect(wrapper.emitted('saved')).toHaveLength(1)
		expect(wrapper.find('.note').exists()).toBe(false)
	})

	it('sends enabled false when quiet hours are switched off', async () => {
		axios.get.mockResolvedValue({ data: { enabled: true, start: '22:00', end: '07:00' } })
		axios.put.mockResolvedValue({ data: { enabled: false } })
		const wrapper = await mountBlock()

		await wrapper.find('label.switch').trigger('click')
		await wrapper.find('button.save').trigger('click')
		await flushPromises()

		expect(axios.put).toHaveBeenCalledWith(WINDOW, { enabled: false })
		expect(wrapper.find('label.switch').attributes('data-checked')).toBe('false')
	})

	it('shows OpenRegister\'s message on a 422 and keeps what was typed', async () => {
		axios.get.mockResolvedValue({ data: { enabled: false } })
		axios.put.mockImplementation(() => answer(422, { error: 'end must differ from start' }))
		const wrapper = await mountBlock()

		await wrapper.find('label.switch').trigger('click')
		await fields(wrapper)[1].setValue('06:59')
		await wrapper.find('button.save').trigger('click')
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-quiet-hours-error"]').text()).toBe('end must differ from start')
		expect(fields(wrapper)[1].element.value).toBe('06:59')
		expect(fields(wrapper)[1].attributes('data-error')).toBe('true')
	})

	it('says quiet hours are not enforced yet on a 404, values kept', async () => {
		axios.get.mockImplementation(() => answer(404))
		axios.put.mockImplementation(() => answer(404))
		const wrapper = await mountBlock()
		expect(wrapper.find('[data-testid="cn-quiet-hours-unsupported"]').exists()).toBe(true)

		await wrapper.find('label.switch').trigger('click')
		await fields(wrapper)[0].setValue('23:00')
		await wrapper.find('button.save').trigger('click')
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-quiet-hours-unsupported"]').text())
			.toContain('Your Nextcloud does not enforce quiet hours yet.')
		expect(fields(wrapper)[0].element.value).toBe('23:00')
	})

	it('says saving failed on any other answer', async () => {
		axios.get.mockResolvedValue({ data: { enabled: false } })
		axios.put.mockImplementation(() => answer(500))
		const wrapper = await mountBlock()

		await wrapper.find('button.save').trigger('click')
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-quiet-hours-failed"]').text()).toBe('Saving failed. Try again.')
	})
})

describe('CnNotificationPreferences quiet hours', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockImplementation((url) => Promise.resolve({ data: url === PREFS ? { results: [] } : { enabled: false } }))
	})

	/**
	 * Mount the pane with what a CnAppRoot ancestor would provide.
	 *
	 * @param {object} provide The injections.
	 * @param {object} props The pane's props.
	 * @return {Promise<object>} The wrapper.
	 */
	async function mountPane(provide = {}, props = {}) {
		const wrapper = mount(CnNotificationPreferences, { props, global: { provide, stubs } })
		await flushPromises()
		return wrapper
	}

	it('leaves the block out by default', async () => {
		const wrapper = await mountPane({ cnAppId: 'learniq' })
		expect(wrapper.find('[data-testid="cn-quiet-hours"]').exists()).toBe(false)
		expect(axios.get).not.toHaveBeenCalledWith(WINDOW)
	})

	it('shows the block when CnAppRoot turns it on, even with no notifications', async () => {
		const wrapper = await mountPane({ cnAppId: 'learniq', cnQuietHours: true })
		expect(wrapper.find('[data-testid="cn-quiet-hours"]').exists()).toBe(true)
		expect(axios.get).toHaveBeenCalledWith(WINDOW)
	})

	it('lets the prop win over the injected choice', async () => {
		const wrapper = await mountPane({ cnQuietHours: true }, { quietHours: false })
		expect(wrapper.find('[data-testid="cn-quiet-hours"]').exists()).toBe(false)
	})
})
