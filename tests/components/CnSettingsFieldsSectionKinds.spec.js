/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The field kinds beyond plain values: a field that depends on another, a
 * switch stored as text, radio choices with a line each, a list edited one
 * entry per line, a secret whose stored state has its own key, a status
 * note, a heading and an action button; and the section options savedMessage,
 * reloadAfterSave, autoSave and bare.
 *
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-field-can-depend-on-another
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-status-note-and-an-action-sit-between-the-fields
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnSettingsFieldsSection from '../../src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))

const TEXT = { props: ['modelValue', 'label', 'type', 'placeholder', 'error'], emits: ['update:modelValue'], template: '<label class="text">{{ label }}<input :type="type || \'text\'" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)"></label>' }
const STUBS = {
	NcTextField: TEXT,
	NcTextArea: { ...TEXT, template: '<label class="text">{{ label }}<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea></label>' },
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'inputLabel'], template: '<div class="select"></div>' },
	NcCheckboxRadioSwitch: { props: ['modelValue', 'type', 'value'], emits: ['update:modelValue'], template: '<label class="switch" :data-type="type" :data-checked="type === \'radio\' ? String(modelValue === value) : String(!!modelValue)"><input type="checkbox" :checked="type === \'radio\' ? modelValue === value : modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>' },
	NcSettingsSection: { props: ['name'], template: '<section class="settings-section"><h2>{{ name }}</h2><slot /></section>' },
	NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
	NcButton: { props: ['disabled', 'type'], emits: ['click'], template: '<button class="button" :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
}

/**
 * @param {object} props The section's props.
 * @return {Promise<object>}
 */
async function mountSection(props) {
	const wrapper = mount(CnSettingsFieldsSection, {
		props: { appId: 'myapp', name: 'Section', ...props },
		global: { stubs: STUBS },
	})
	await flushPromises()
	return wrapper
}

const field = (wrapper, key) => wrapper.find(`[data-testid="cn-settings-field-${key}"]`)
/**
 * Submit the section's form and let its requests settle.
 *
 * @param {object} wrapper The mounted section.
 * @return {Promise<void>}
 */
async function submit(wrapper) {
	await wrapper.find('form').trigger('submit')
	await flushPromises()
}

describe('CnSettingsFieldsSection field kinds', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.request.mockReset()
		axios.request.mockResolvedValue({ data: {} })
	})

	it('shows a field only while its visibleWhen holds, and does not check a hidden one', async () => {
		axios.get.mockResolvedValue({ data: { type: 'local', url: '' } })
		const wrapper = await mountSection({
			fields: [
				{ key: 'type', label: 'Type', type: 'radio', options: [{ value: 'local', label: 'Local' }, { value: 'cloud', label: 'Cloud' }] },
				{ key: 'url', label: 'Address', required: true, visibleWhen: { key: 'type', equals: 'cloud' } },
				{ key: 'name', label: 'Name' },
			],
		})
		expect(field(wrapper, 'url').exists()).toBe(false)
		await field(wrapper, 'name').find('input').setValue('x')
		await submit(wrapper)
		expect(axios.request).toHaveBeenCalledTimes(1)

		await field(wrapper, 'type').find('[data-testid="cn-settings-field-option-type-cloud"] input').trigger('change')
		expect(field(wrapper, 'url').exists()).toBe(true)
	})

	it('reads a switch stored as "0" as off and saves its trueValue', async () => {
		axios.get.mockResolvedValue({ data: { auto: '0' } })
		const wrapper = await mountSection({ fields: [{ key: 'auto', label: 'Auto', type: 'switch', trueValue: '1', falseValue: '0' }] })
		expect(field(wrapper, 'auto').find('.switch').attributes('data-checked')).toBe('false')
		await field(wrapper, 'auto').find('input').setChecked(true)
		await submit(wrapper)
		expect(axios.request.mock.calls[0][0].data).toEqual({ auto: '1' })
	})

	it('uses the default for a stored empty value', async () => {
		axios.get.mockResolvedValue({ data: { days: '' } })
		const wrapper = await mountSection({ fields: [{ key: 'days', label: 'Days', type: 'number', default: 28 }] })
		expect(field(wrapper, 'days').find('input').element.value).toBe('28')
	})

	it('draws radio options with their descriptions', async () => {
		axios.get.mockResolvedValue({ data: { menu: 'full' } })
		const wrapper = await mountSection({
			fields: [{ key: 'menu', label: 'Menu', type: 'radio', options: [{ value: 'simple', label: 'Simple', description: 'Nine entries.' }, { value: 'full', label: 'Full', description: 'Every entry.' }] }],
		})
		expect(field(wrapper, 'menu').find('legend').text()).toBe('Menu')
		expect(field(wrapper, 'menu').find('[data-testid="cn-settings-field-option-menu-full"]').attributes('data-checked')).toBe('true')
		expect(field(wrapper, 'menu').text()).toContain('Nine entries.')
		await field(wrapper, 'menu').find('[data-testid="cn-settings-field-option-menu-simple"] input').trigger('change')
		await submit(wrapper)
		expect(axios.request.mock.calls[0][0].data).toEqual({ menu: 'simple' })
	})

	it('edits a JSON list one entry per line and saves it back as JSON without repeats', async () => {
		axios.get.mockResolvedValue({ data: { words: '["klacht","media"]' } })
		const wrapper = await mountSection({ fields: [{ key: 'words', label: 'Words', type: 'lines', saveAs: 'json' }] })
		const area = field(wrapper, 'words').find('textarea')
		expect(area.element.value).toBe('klacht\nmedia')
		await area.setValue('klacht\n\nmedia\nklacht\n advocaat ')
		await submit(wrapper)
		expect(axios.request.mock.calls[0][0].data).toEqual({ words: '["klacht","media","advocaat"]' })
	})

	it('says a secret is stored from its setKey', async () => {
		axios.get.mockResolvedValue({ data: { token: '', tokenSet: true } })
		const wrapper = await mountSection({ fields: [{ key: 'token', label: 'Token', type: 'secret', setKey: 'tokenSet' }] })
		expect(field(wrapper, 'token').find('input').attributes('placeholder')).toBe('Stored. Type a new value to replace it.')
	})

	it('refuses a fraction in an integer field', async () => {
		axios.get.mockResolvedValue({ data: { days: 3 } })
		const wrapper = await mountSection({ fields: [{ key: 'days', label: 'Days', type: 'number', integer: true }] })
		await field(wrapper, 'days').find('input').setValue('2.5')
		await submit(wrapper)
		expect(axios.request).not.toHaveBeenCalled()
		expect(field(wrapper, 'days').text()).toContain('Days must be a whole number.')
	})

	it('shows a status note from its textMap with the values read, in its tone, and hides an empty one', async () => {
		axios.get.mockResolvedValue({ data: { userId: 'bot', usable: false, reason: 'disabled', group: 'svc' } })
		const fields = [
			{ key: 'reason', type: 'status', textMap: { disabled: '{userId} is disabled; it must be in {group}.', '*': '' }, toneMap: { '*': 'warning' }, visibleWhen: { key: 'usable', equals: false } },
			{ key: 'userId', label: 'User' },
		]
		const wrapper = await mountSection({ fields })
		const note = wrapper.find('[data-testid="cn-settings-field-status-reason"]')
		expect(note.text()).toBe('bot is disabled; it must be in svc.')
		expect(note.attributes('data-type')).toBe('warning')

		axios.get.mockResolvedValue({ data: { userId: 'bot', usable: true, reason: null } })
		const usable = await mountSection({ fields })
		expect(usable.find('[data-testid="cn-settings-field-status-reason"]').exists()).toBe(false)
	})

	it('draws a heading and never saves a status, heading or action', async () => {
		axios.get.mockResolvedValue({ data: { note: 'x', name: 'a' } })
		const wrapper = await mountSection({
			fields: [
				{ key: 'h', label: 'Features', type: 'heading' },
				{ key: 'note', type: 'status', text: 'Read only' },
				{ key: 'name', label: 'Name' },
			],
		})
		expect(field(wrapper, 'h').find('h3').text()).toBe('Features')
		await field(wrapper, 'name').find('input').setValue('b')
		await submit(wrapper)
		expect(axios.request.mock.calls[0][0].data).toEqual({ name: 'b' })
	})

	it('runs an action and shows the server\'s sentence, as an error when okPath reads false', async () => {
		axios.get.mockResolvedValue({ data: { host: 'imap.example' } })
		axios.request.mockResolvedValueOnce({ data: { healthy: false, message: 'Model not reachable' } })
		const wrapper = await mountSection({
			fields: [
				{ key: 'host', label: 'Host' },
				{ key: 'test', label: 'Test connection', type: 'action', url: '/apps/myapp/api/health', send: ['host'], okPath: 'healthy' },
			],
		})
		await wrapper.find('[data-testid="cn-settings-field-action-test"]').trigger('click')
		await flushPromises()
		const call = axios.request.mock.calls[0][0]
		expect(call.method).toBe('post')
		expect(call.url).toContain('/apps/myapp/api/health')
		expect(call.data).toEqual({ host: 'imap.example' })
		const result = wrapper.find('[data-testid="cn-settings-field-action-result-test"]')
		expect(result.text()).toBe('Model not reachable')
		expect(result.attributes('data-type')).toBe('error')
	})

	it('shows a failed action\'s refusal sentence', async () => {
		axios.get.mockResolvedValue({ data: {} })
		axios.request.mockRejectedValueOnce({ message: 'Request failed', response: { data: { error: 'no_mailbox', message: 'No mailbox is set up.' } } })
		const wrapper = await mountSection({ fields: [{ key: 'test', label: 'Test', type: 'action', url: '/x' }] })
		await wrapper.find('[data-testid="cn-settings-field-action-test"]').trigger('click')
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-settings-field-action-result-test"]').text()).toBe('No mailbox is set up.')
	})

	it('fills a field with a random value from a fill action', async () => {
		axios.get.mockResolvedValue({ data: { secret: '' } })
		const wrapper = await mountSection({
			fields: [
				{ key: 'secret', label: 'Secret', type: 'password' },
				{ key: 'generate', label: 'Generate', type: 'action', fill: { key: 'secret', bytes: 16 } },
			],
		})
		await wrapper.find('[data-testid="cn-settings-field-action-generate"]').trigger('click')
		await flushPromises()
		expect(field(wrapper, 'secret').find('input').element.value).toMatch(/^[0-9a-f]{32}$/)
		expect(axios.request).not.toHaveBeenCalled()
	})

	it('shows the refusal sentence of a refused save rather than its rule code', async () => {
		axios.get.mockResolvedValue({ data: { readers: '' } })
		axios.request.mockRejectedValueOnce({ message: 'Request failed', response: { data: { error: 'readers_missing', message: 'Name an existing group first.' } } })
		const wrapper = await mountSection({ fields: [{ key: 'readers', label: 'Readers' }] })
		await field(wrapper, 'readers').find('input').setValue('nobody')
		await submit(wrapper)
		expect(wrapper.find('[data-testid="cn-settings-fields-notice"]').text()).toBe('The settings could not be saved: Name an existing group first.')
	})

	it('says its savedMessage with the values read again after the save', async () => {
		axios.get.mockResolvedValueOnce({ data: { userId: 'old' } }).mockResolvedValue({ data: { userId: 'bot' } })
		const wrapper = await mountSection({ fields: [{ key: 'userId', label: 'User' }], reloadAfterSave: true, savedMessage: 'Jobs now save as {userId}.' })
		await field(wrapper, 'userId').find('input').setValue('bot')
		await submit(wrapper)
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(wrapper.find('[data-testid="cn-settings-fields-notice"]').text()).toBe('Jobs now save as bot.')
	})

	it('saves each change at once with autoSave, without a Save button', async () => {
		jest.useFakeTimers()
		axios.get.mockResolvedValue({ data: { enabled: true } })
		const wrapper = await mountSection({ autoSave: true, fields: [{ key: 'enabled', label: 'On', type: 'switch' }] })
		expect(wrapper.find('[data-testid="cn-settings-fields-save"]').exists()).toBe(false)
		await field(wrapper, 'enabled').find('input').setChecked(false)
		jest.runAllTimers()
		await flushPromises()
		expect(axios.request.mock.calls[0][0].data).toEqual({ enabled: false })
		jest.useRealTimers()
	})

	it('sends every field with saveAll, for an endpoint that replaces the record', async () => {
		axios.get.mockResolvedValue({ data: { enabled: true, hour: 9 } })
		const wrapper = await mountSection({ saveAll: true, fields: [{ key: 'enabled', label: 'On', type: 'switch' }, { key: 'hour', label: 'Hour', type: 'number' }] })
		await field(wrapper, 'enabled').find('input').setChecked(false)
		await submit(wrapper)
		expect(axios.request.mock.calls[0][0].data).toEqual({ enabled: false, hour: 9 })
	})

	it('folds the hints and foldable notes behind one button with hintsToggle', async () => {
		axios.get.mockResolvedValue({ data: {} })
		const wrapper = await mountSection({
			hintsToggle: true,
			fields: [
				{ key: 'about', type: 'status', text: 'What this mailbox is for.', foldable: true },
				{ key: 'folder', label: 'Folder', hint: 'The folder intake reads.' },
			],
		})
		const toggle = wrapper.find('[data-testid="cn-settings-fields-hints-toggle"]')
		expect(toggle.text()).toBe('Show the explanations')
		expect(wrapper.text()).not.toContain('The folder intake reads.')
		expect(wrapper.find('[data-testid="cn-settings-field-status-about"]').exists()).toBe(false)
		await toggle.trigger('click')
		expect(wrapper.text()).toContain('The folder intake reads.')
		expect(wrapper.find('[data-testid="cn-settings-field-status-about"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-settings-fields-hints-toggle"]').text()).toBe('Hide the explanations')
	})

	it('reads a status note from its own url', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('accounts') ? { available: false } : {} }))
		const wrapper = await mountSection({
			fields: [{ key: 'mail', type: 'status', url: '/apps/myapp/api/accounts', valuePath: 'available', textMap: { false: 'Install Mail first.', '*': '' }, tone: 'warning' }],
		})
		expect(wrapper.find('[data-testid="cn-settings-field-status-mail"]').text()).toBe('Install Mail first.')
	})

	it('selects a sourced option whose id is a number while the stored value is text', async () => {
		const options = [{ id: 3, name: 'Zaken', email: 'zaken@example.org' }, { id: 4, name: 'Team' }]
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ accounts: options }) }))
		axios.get.mockResolvedValue({ data: { account: '3' } })
		const wrapper = await mountSection({ fields: [{ key: 'account', label: 'Account', type: 'select', optionsUrl: '/apps/myapp/api/accounts', optionsPath: 'accounts', optionLabel: 'name', optionValue: 'id', optionDetail: 'email' }] })
		await flushPromises()
		const select = wrapper.findComponent({ name: 'NcSelect' })
		expect(select.props('modelValue')).toEqual({ label: 'Zaken (zaken@example.org)', value: 3 })
		expect(select.props('options')[1]).toEqual({ label: 'Team', value: 4 })
	})

	it('hands its detailed description to the card', async () => {
		axios.get.mockResolvedValue({ data: {} })
		const wrapper = await mountSection({ detailedDescription: 'Leave the address empty to stay offline.', fields: [{ key: 'x', label: 'X' }] })
		expect(wrapper.find('.cn-settings-section__description-text').text()).toBe('Leave the address empty to stay offline.')
	})

	it('draws no card with bare', async () => {
		axios.get.mockResolvedValue({ data: {} })
		const wrapper = await mountSection({ bare: true, fields: [{ key: 'x', label: 'X' }] })
		expect(wrapper.find('.settings-section').exists()).toBe(false)
		expect(wrapper.find('h2').exists()).toBe(false)
		expect(field(wrapper, 'x').exists()).toBe(true)
	})
})
