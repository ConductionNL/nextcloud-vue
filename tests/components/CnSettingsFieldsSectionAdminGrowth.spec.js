/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Three growths an admin page needs to be declared as fields: an action that
 * opens a page (`href`) or asks first (`confirm`, with static `params`), a
 * secret that can be removed (`clearable`), and key-to-value rows whose value
 * is chosen from OpenRegister objects (`valueSource`).
 *
 * @spec openspec/changes/settings-fields-admin-growth/specs/settings-fields-section/spec.md#requirement-an-action-can-open-a-page-or-ask-first
 * @spec openspec/changes/settings-fields-admin-growth/specs/settings-fields-section/spec.md#requirement-a-stored-secret-can-be-removed
 * @spec openspec/changes/settings-fields-admin-growth/specs/settings-fields-section/spec.md#requirement-a-pairs-value-can-be-chosen-from-objects
 */
import axios from '@nextcloud/axios'
import { showConfirmation } from '@nextcloud/dialogs'
import { flushPromises, mount } from '@vue/test-utils'
import CnSettingsFieldsSection from '../../src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))

const TEXT = { props: ['modelValue', 'label', 'type', 'placeholder', 'error', 'disabled'], emits: ['update:modelValue'], template: '<label class="text">{{ label }}<input :type="type || \'text\'" :value="modelValue" :disabled="disabled" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)"></label>' }
const STUBS = {
	NcTextField: TEXT,
	NcTextArea: TEXT,
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'inputLabel', 'multiple'], emits: ['update:modelValue'], template: '<div class="select" :data-label="inputLabel" :data-options="(options || []).map((o) => o.label).join(\'|\')" :data-value="modelValue ? modelValue.label : \'\'"></div>' },
	NcCheckboxRadioSwitch: { props: ['modelValue', 'type', 'value'], emits: ['update:modelValue'], template: '<label class="switch"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>' },
	NcSettingsSection: { props: ['name'], template: '<section class="settings-section"><h2>{{ name }}</h2><slot /></section>' },
	NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
	NcButton: { props: ['disabled', 'type', 'ariaLabel', 'href', 'target'], emits: ['click'], template: '<a v-if="href" class="button" :href="href" :target="target"><slot /></a><button v-else class="button" :type="type || \'button\'" :aria-label="ariaLabel" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
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

beforeEach(() => {
	axios.get.mockReset()
	axios.request.mockReset()
	showConfirmation.mockReset()
})

describe('an action field', () => {
	it('with href is a link to the page and posts nothing', async () => {
		axios.get.mockResolvedValue({ data: {} })
		const wrapper = await mountSection({
			fields: [{ key: 'openExports', label: 'Open the exports', type: 'action', href: '/apps/myapp/exports' }],
		})

		const link = field(wrapper, 'openExports').find('a')
		expect(link.exists()).toBe(true)
		expect(link.attributes('href')).toContain('/apps/myapp/exports')
		expect(axios.request).not.toHaveBeenCalled()
	})

	it('with confirm asks first and posts its params only after a yes', async () => {
		axios.get.mockResolvedValue({ data: {} })
		axios.request.mockResolvedValue({ data: { message: 'Rotated.' } })
		const wrapper = await mountSection({
			fields: [{ key: 'rotate', label: 'Rotate key', type: 'action', url: '/apps/myapp/api/key/rotate', confirm: 'Rotate the key?', params: { confirm: 'true' } }],
		})

		showConfirmation.mockResolvedValueOnce(false)
		await field(wrapper, 'rotate').find('button').trigger('click')
		await flushPromises()
		expect(axios.request).not.toHaveBeenCalled()

		showConfirmation.mockResolvedValueOnce(true)
		await field(wrapper, 'rotate').find('button').trigger('click')
		await flushPromises()
		expect(showConfirmation).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Rotate the key?' }))
		expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({ url: '/apps/myapp/api/key/rotate', method: 'post', data: { confirm: 'true' } }))
		expect(field(wrapper, 'rotate').text()).toContain('Rotated.')
	})
})

describe('a clearable secret', () => {
	const TOKEN = { key: 'token', label: 'Token', type: 'secret', setKey: 'tokenSet', clearable: true, clearKey: 'clearToken' }

	it('offers removal only while a value is stored, and sends the clear key on save', async () => {
		axios.get.mockResolvedValue({ data: { tokenSet: true } })
		axios.request.mockResolvedValue({ data: {} })
		const wrapper = await mountSection({ fields: [TOKEN] })

		const toggle = wrapper.find('[data-testid="cn-settings-field-clear-token"] input')
		expect(toggle.exists()).toBe(true)
		await toggle.setValue(true)
		expect(field(wrapper, 'token').find('input[type="password"]').attributes('disabled')).toBeDefined()
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({ data: { clearToken: true } }))
		expect(wrapper.find('[data-testid="cn-settings-field-clear-token"]').exists()).toBe(false)
	})

	it('without clearKey sends an empty value, and shows no removal when nothing is stored', async () => {
		axios.get.mockResolvedValueOnce({ data: { apiKey: '' } })
		const empty = await mountSection({ fields: [{ key: 'apiKey', label: 'API key', type: 'secret', clearable: true }] })
		expect(empty.find('[data-testid="cn-settings-field-clear-apiKey"]').exists()).toBe(false)

		axios.get.mockResolvedValueOnce({ data: { apiKey: 'stored' } })
		axios.request.mockResolvedValue({ data: {} })
		const wrapper = await mountSection({ fields: [{ key: 'apiKey', label: 'API key', type: 'secret', clearable: true }] })
		await wrapper.find('[data-testid="cn-settings-field-clear-apiKey"] input').setValue(true)
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({ data: { apiKey: '' } }))
	})
})

describe('a pairs field with a valueSource', () => {
	it('chooses each value from the named objects and saves their ids', async () => {
		axios.get.mockImplementation((url) => Promise.resolve(url.includes('/api/objects/')
			? { data: { results: [{ id: 'c1', name: 'Group 1A' }, { id: 'c2', name: 'Group 2B' }], total: 2 } }
			: { data: { groupMaps: { som: { '1A': 'c1' } } } }))
		axios.request.mockResolvedValue({ data: {} })
		const wrapper = await mountSection({
			fields: [{ key: 'som', path: 'groupMaps.som', label: 'Groups from Somtoday', type: 'pairs', valueLabel: 'Group in the app', valueSource: { register: 'learniq', schema: 'cohort', labelField: 'name' } }],
		})

		expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/apps/openregister/api/objects/learniq/cohort'))
		const select = field(wrapper, 'som').find('.select')
		expect(select.attributes('data-options')).toBe('Group 1A|Group 2B')
		expect(select.attributes('data-value')).toBe('Group 1A')
		expect(select.attributes('data-label')).toBe('Group in the app')

		wrapper.findComponent({ name: 'NcSelect' }).vm.$emit('update:modelValue', { label: 'Group 2B', value: 'c2' })
		await wrapper.vm.$nextTick()
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({ data: { groupMaps: { som: { '1A': 'c2' } } } }))
	})

	it('says so when the source holds more objects than it read', async () => {
		axios.get.mockImplementation((url) => Promise.resolve(url.includes('/api/objects/')
			? { data: { results: [{ id: 'c1', name: 'Group 1A' }], total: 1200 } }
			: { data: { som: {} } }))
		const wrapper = await mountSection({
			fields: [{ key: 'som', label: 'Groups', type: 'pairs', valueSource: { register: 'learniq', schema: 'cohort', labelField: 'name' } }],
		})

		expect(wrapper.find('[data-testid="cn-settings-field-pairs-truncated-som"]').exists()).toBe(true)
	})
})

describe('a week-hours field', () => {
	const HOURS = { key: 'weekdays', path: 'openingHours.weekdays', label: 'Opening hours', type: 'week-hours', days: ['monday', 'saturday'] }

	it('draws a day per row, opens a closed day with default hours, and saves the whole week', async () => {
		axios.get.mockResolvedValue({ data: { openingHours: { weekdays: { monday: { opens: '08:00', closes: '17:00' }, saturday: null }, closedOnStudyDays: false } } })
		axios.request.mockResolvedValue({ data: {} })
		const wrapper = await mountSection({ fields: [HOURS], saveMethod: 'PUT' })

		const rows = field(wrapper, 'weekdays').findAll('[data-testid^="cn-settings-field-day-"]')
		expect(rows).toHaveLength(2)
		expect(field(wrapper, 'weekdays').findAll('input[type="time"]')).toHaveLength(2)

		await wrapper.find('[data-testid="cn-settings-field-day-saturday"] input[type="checkbox"]').setValue(true)
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
			method: 'put',
			data: { openingHours: { weekdays: { monday: { opens: '08:00', closes: '17:00' }, saturday: { opens: '08:00', closes: '17:00' } }, closedOnStudyDays: false } },
		}))
	})

	it('refuses a day that closes before it opens', async () => {
		axios.get.mockResolvedValue({ data: { openingHours: { weekdays: { monday: { opens: '17:00', closes: '08:00' }, saturday: null } } } })
		const wrapper = await mountSection({ fields: [HOURS] })

		await wrapper.find('[data-testid="cn-settings-field-day-saturday"] input[type="checkbox"]').setValue(true)
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(axios.request).not.toHaveBeenCalled()
		expect(field(wrapper, 'weekdays').text()).toContain('closes before it opens')
	})
})

describe('an action with reload', () => {
	it('reads the section again after it ran, so a status note shows the new state', async () => {
		axios.get
			.mockResolvedValueOnce({ data: { configured: false } })
			.mockResolvedValueOnce({ data: { configured: true, fingerprint: 'abc' } })
		axios.request.mockResolvedValue({ data: { fingerprint: 'abc' } })
		const wrapper = await mountSection({
			url: '/apps/myapp/api/key',
			fields: [
				{ key: 'configured', type: 'status', textMap: { true: 'Key {fingerprint}', '*': 'No key' } },
				{ key: 'rotate', label: 'Rotate', type: 'action', url: '/apps/myapp/api/key/rotate', reload: true },
			],
		})
		expect(field(wrapper, 'configured').text()).toContain('No key')

		await field(wrapper, 'rotate').find('button').trigger('click')
		await flushPromises()

		expect(field(wrapper, 'configured').text()).toContain('Key abc')
		expect(axios.get.mock.calls.map(([url]) => url)).toEqual(['/apps/myapp/api/key', '/apps/myapp/api/key'])
	})
})

describe('a status note with a date', () => {
	it('formats {name|date} as a date', async () => {
		axios.get.mockResolvedValue({ data: { signedAt: '2026-03-01T09:00:00+00:00' } })
		const wrapper = await mountSection({ fields: [{ key: 'signedNote', type: 'status', text: 'Signed on {signedAt|date}.' }] })

		const text = field(wrapper, 'signedNote').text()
		expect(text).not.toContain('T09:00')
		expect(text).toMatch(/2026/)
	})
})
