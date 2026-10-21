/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings section declared as fields: it reads the app's settings, draws
 * the fields in columns, and saves them with one Save, which is on only while
 * something changed. A secret is replace-only, a failing field says why, and
 * the section says whether it saved. CnSettingsField is the shared field
 * CnSettingsPage renders too.
 *
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-section-declared-as-fields-reads-and-saves-the-apps-settings
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-one-save-per-section-with-a-dirty-state
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-failing-field-says-why
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-secret-is-replace-only
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnSettingsField from '../../src/components/CnSettingsField/CnSettingsField.vue'
import CnSettingsFieldsSection from '../../src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))

const TEXT = { props: ['modelValue', 'label', 'type', 'placeholder', 'error'], emits: ['update:modelValue'], template: '<label class="text">{{ label }}<input :type="type || \'text\'" :value="modelValue" :placeholder="placeholder" :aria-invalid="error ? \'true\' : null" @input="$emit(\'update:modelValue\', $event.target.value)"></label>' }
const STUBS = {
	NcTextField: TEXT,
	NcTextArea: TEXT,
	NcSelect: { props: ['modelValue', 'options', 'inputLabel'], emits: ['update:modelValue'], template: '<div class="select" :data-input-label="inputLabel" :data-options="JSON.stringify(options)" :data-value="modelValue && modelValue.value"></div>' },
	NcCheckboxRadioSwitch: { props: ['modelValue', 'type'], emits: ['update:modelValue'], template: '<label class="switch" :data-type="type"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>' },
	NcSettingsSection: { props: ['name'], template: '<section class="settings-section"><h2>{{ name }}</h2><slot /></section>' },
	NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
	NcButton: { props: ['disabled', 'type'], template: '<button class="button" :type="type || \'button\'" :disabled="disabled"><slot /></button>' },
}

const FIELDS = [
	{ key: 'baseUrl', label: 'Server address', required: true, pattern: '^https://', patternMessage: 'Starts with https://', hint: 'The address of the service.' },
	{ key: 'apiKey', label: 'API key', type: 'secret' },
	{ key: 'mode', label: 'Mode', type: 'select', options: [{ value: 'live', label: 'Live' }, { value: 'test', label: 'Test' }] },
	{ key: 'retries', label: 'Retries', type: 'number', min: 0, max: 5 },
	{ key: 'enabled', label: 'Enabled', type: 'switch' },
	{ key: 'notes', label: 'Notes', type: 'textarea', wide: true },
]

/**
 * @param {object} props Extra props.
 * @return {Promise<object>}
 */
async function mountSection(props = {}) {
	const wrapper = mount(CnSettingsFieldsSection, {
		props: { appId: 'myapp', name: 'Connection', fields: FIELDS, columns: 2, ...props },
		global: { stubs: STUBS },
	})
	await flushPromises()
	return wrapper
}

const input = (wrapper, key) => wrapper.find(`[data-testid="cn-settings-field-${key}"] input, [data-testid="cn-settings-field-${key}"] textarea`)
const save = (wrapper) => wrapper.find('[data-testid="cn-settings-fields-save"]')

describe('CnSettingsFieldsSection', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.request.mockReset()
		axios.get.mockResolvedValue({ data: { baseUrl: 'https://api.example.org', apiKey: 'stored-secret', mode: 'live', retries: 3, enabled: true, notes: '' } })
		axios.request.mockResolvedValue({ data: {} })
	})

	it('reads the app\'s settings endpoint and fills the fields, never the secret', async () => {
		const wrapper = await mountSection()
		expect(axios.get.mock.calls[0][0]).toContain('/apps/myapp/api/settings')
		expect(input(wrapper, 'baseUrl').element.value).toBe('https://api.example.org')
		expect(input(wrapper, 'apiKey').element.value).toBe('')
		expect(input(wrapper, 'apiKey').attributes('placeholder')).toBe('Stored. Type a new value to replace it.')
		expect(wrapper.find('[data-testid="cn-settings-field-mode"] .select').attributes('data-value')).toBe('live')
		expect(wrapper.find('[data-testid="cn-settings-field-mode"] .select').attributes('data-input-label')).toBe('Mode')
		expect(wrapper.find('.cn-settings-fields__grid').classes()).toContain('cn-settings-fields__grid--2')
		expect(wrapper.find('[data-testid="cn-settings-field-notes"]').classes()).toContain('cn-settings-fields__field--wide')
		expect(wrapper.text()).toContain('The address of the service.')
	})

	it('reads a configured url and a nested values path', async () => {
		axios.get.mockResolvedValue({ data: { settings: { baseUrl: 'https://x.example' } } })
		const wrapper = await mountSection({ url: '/apps/other/api/config', valuesPath: 'settings' })
		expect(axios.get.mock.calls[0][0]).toContain('/apps/other/api/config')
		expect(input(wrapper, 'baseUrl').element.value).toBe('https://x.example')
	})

	it('reads a flat map with dotted keys by the key as written, then as a path', async () => {
		axios.get.mockResolvedValue({ data: { config: { 'integration.brk.mode': 'live', integration: { woz: { mode: 'test' } } } } })
		const wrapper = await mountSection({
			valuesPath: 'config',
			fields: [{ key: 'integration.brk.mode', label: 'BRK mode' }, { key: 'integration.woz.mode', label: 'WOZ mode' }],
		})
		expect(input(wrapper, 'integration.brk.mode').element.value).toBe('live')
		expect(input(wrapper, 'integration.woz.mode').element.value).toBe('test')
		await input(wrapper, 'integration.brk.mode').setValue('test')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request.mock.calls[0][0].data).toEqual({ 'integration.brk.mode': 'test' })
	})

	it('reads a dotted key as written from a field\'s own target too', async () => {
		axios.get.mockResolvedValue({ data: { 'integration.brk.baseUrl': 'https://brk.example' } })
		const wrapper = await mountSection({ fields: [{ key: 'brk', label: 'BRK address', url: '/apps/other/settings', valuePath: 'integration.brk.baseUrl' }] })
		expect(input(wrapper, 'brk').element.value).toBe('https://brk.example')
	})

	it('enables Save only while something changed, and says so', async () => {
		const wrapper = await mountSection()
		expect(save(wrapper).attributes('disabled')).toBeDefined()
		expect(wrapper.find('[data-testid="cn-settings-fields-dirty"]').exists()).toBe(false)
		await input(wrapper, 'baseUrl').setValue('https://api2.example.org')
		expect(save(wrapper).attributes('disabled')).toBeUndefined()
		expect(wrapper.find('[data-testid="cn-settings-fields-dirty"]').text()).toBe('Unsaved changes')
	})

	it('saves the changed fields in one PUT, leaving out an untouched secret', async () => {
		const wrapper = await mountSection()
		await input(wrapper, 'baseUrl').setValue('https://api2.example.org')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request).toHaveBeenCalledTimes(1)
		const call = axios.request.mock.calls[0][0]
		expect(call.method).toBe('put')
		expect(call.url).toContain('/apps/myapp/api/settings')
		expect(call.data).toEqual({ baseUrl: 'https://api2.example.org' })
		expect(wrapper.find('[data-testid="cn-settings-fields-notice"]').text()).toBe('Saved.')
		expect(wrapper.find('[data-testid="cn-settings-fields-notice"]').attributes('data-type')).toBe('success')
		expect(save(wrapper).attributes('disabled')).toBeDefined()
		expect(wrapper.emitted('saved')[0][0]).toEqual(call.data)
	})

	it('sends a typed secret once, then shows it as stored again', async () => {
		axios.get.mockResolvedValue({ data: { baseUrl: 'https://a.example' } })
		const wrapper = await mountSection()
		expect(input(wrapper, 'apiKey').attributes('placeholder')).toBe('')
		await input(wrapper, 'apiKey').setValue('new-secret')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request.mock.calls[0][0].data.apiKey).toBe('new-secret')
		expect(input(wrapper, 'apiKey').element.value).toBe('')
		expect(input(wrapper, 'apiKey').attributes('placeholder')).toBe('Stored. Type a new value to replace it.')
	})

	it('marks a failing field, says why, and sends nothing', async () => {
		const wrapper = await mountSection()
		await input(wrapper, 'baseUrl').setValue('http://plain.example')
		await input(wrapper, 'retries').setValue('9')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-settings-field-error-baseUrl"]').text()).toBe('Starts with https://')
		expect(wrapper.find('[data-testid="cn-settings-field-error-retries"]').text()).toBe('Retries must be at most 5.')
		expect(input(wrapper, 'baseUrl').attributes('aria-invalid')).toBe('true')
		expect(wrapper.find('[data-testid="cn-settings-fields-notice"]').text()).toBe('Check the marked fields.')
		await input(wrapper, 'baseUrl').setValue('')
		await wrapper.find('form').trigger('submit')
		expect(wrapper.find('[data-testid="cn-settings-field-error-baseUrl"]').text()).toBe('Server address is required.')
	})

	it('says why a save failed', async () => {
		axios.request.mockRejectedValue({ response: { status: 500, data: { message: 'Database is read-only' } } })
		const wrapper = await mountSection()
		await input(wrapper, 'baseUrl').setValue('https://api3.example.org')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		const notice = wrapper.find('[data-testid="cn-settings-fields-notice"]')
		expect(notice.attributes('data-type')).toBe('error')
		expect(notice.text()).toContain('Database is read-only')
		expect(wrapper.emitted('save-error')).toHaveLength(1)
	})
})

describe('CnSettingsFieldsSection with fields of several apps', () => {
	const MIXED = [
		{ key: 'orgName', label: 'Organisation name', url: '/apps/theming-app/settings/theming', valuePath: 'name', saveKey: 'name' },
		{ key: 'appName', label: 'App name for staff' },
		{ key: 'theme', label: 'Theme', type: 'select', url: '/apps/theming-app/settings/theming', valuePath: 'tokenSet', saveUrl: '/apps/theming-app/settings/tokenset', saveKey: 'tokenSet', options: ['default', 'municipality'] },
		{ key: 'logo', label: 'Logo', type: 'image', url: '/apps/theming-app/settings/theming', valuePath: 'logoUrl', initialsFrom: 'orgName', uploadUrl: '/apps/theming/ajax/uploadImage', uploadParams: { key: 'logo' }, uploadField: 'image', uploadValuePath: 'data.url' },
	]

	beforeEach(() => {
		axios.get.mockReset()
		axios.request.mockReset()
		axios.post = jest.fn()
		axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('theming-app') ? { name: 'Zuiddrecht', tokenSet: 'default', logoUrl: '' } : { appName: 'Dossiq' } }))
		axios.request.mockResolvedValue({ data: {} })
	})

	it('reads each field from its own target, once per target', async () => {
		const wrapper = await mountSection({ fields: MIXED })
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(input(wrapper, 'orgName').element.value).toBe('Zuiddrecht')
		expect(input(wrapper, 'appName').element.value).toBe('Dossiq')
		expect(wrapper.find('[data-testid="cn-settings-field-theme"] .select').attributes('data-value')).toBe('default')
		expect(wrapper.find('[data-testid="cn-settings-field-image-logo"]').text()).toBe('Z')
	})

	it('saves one request per target with that target\'s changed fields under their save keys', async () => {
		const wrapper = await mountSection({ fields: MIXED })
		await input(wrapper, 'orgName').setValue('Gemeente Zuiddrecht')
		await input(wrapper, 'appName').setValue('Zaken')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		const calls = axios.request.mock.calls.map(([call]) => call)
		expect(calls).toHaveLength(2)
		expect(calls.find((call) => call.url.includes('/apps/theming-app/settings/theming'))).toMatchObject({ method: 'post', data: { name: 'Gemeente Zuiddrecht' } })
		expect(calls.find((call) => call.url.includes('/apps/myapp/api/settings'))).toMatchObject({ method: 'put', data: { appName: 'Zaken' } })
		expect(calls.some((call) => call.url.includes('tokenset'))).toBe(false)
		expect(wrapper.find('[data-testid="cn-settings-field-image-logo"]').text()).toBe('GZ')
	})

	it('names the fields of a target that failed and keeps them unsaved', async () => {
		axios.request.mockImplementation((call) => (call.url.includes('theming-app') ? Promise.reject({ response: { status: 403, data: { message: 'Admins only' } } }) : Promise.resolve({ data: {} })))
		const wrapper = await mountSection({ fields: MIXED })
		await input(wrapper, 'orgName').setValue('X')
		await input(wrapper, 'appName').setValue('Y')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		const notice = wrapper.find('[data-testid="cn-settings-fields-notice"]')
		expect(notice.attributes('data-type')).toBe('error')
		expect(notice.text()).toContain('Organisation name: Admins only')
		expect(wrapper.find('[data-testid="cn-settings-fields-dirty"]').exists()).toBe(true)
		axios.request.mockClear()
		axios.request.mockResolvedValue({ data: {} })
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		expect(axios.request.mock.calls.map(([call]) => call.data)).toEqual([{ name: 'X' }])
	})

	it('reads and saves through OCS and adds static save params', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/ocs/') ? { ocs: { data: { capabilities: { theming: { name: 'Zuiddrecht' } } } } } : { appName: 'Dossiq' } }))
		const fields = [
			{ key: 'orgName', label: 'Organisation name', url: '/ocs/v2.php/cloud/capabilities?format=json', valuePath: 'ocs.data.capabilities.theming.name', saveUrl: '/apps/theming/ajax/updateStylesheet', saveKey: 'value', saveParams: { setting: 'name' } },
			{ key: 'appName', label: 'App name' },
		]
		const wrapper = await mountSection({ fields })
		const ocsCall = axios.get.mock.calls.find(([url]) => url.includes('/ocs/'))
		expect(ocsCall[0]).not.toContain('index.php')
		expect(ocsCall[1]).toEqual({ headers: { 'OCS-APIRequest': 'true' } })
		expect(input(wrapper, 'orgName').element.value).toBe('Zuiddrecht')
		await input(wrapper, 'orgName').setValue('Gemeente Zuiddrecht')
		await wrapper.find('form').trigger('submit')
		await flushPromises()
		const call = axios.request.mock.calls[0][0]
		expect(call.url).toContain('/apps/theming/ajax/updateStylesheet')
		expect(call.method).toBe('post')
		expect(call.data).toEqual({ setting: 'name', value: 'Gemeente Zuiddrecht' })
		expect(call.headers).toBeUndefined()
	})

	it('leaves a field whose target could not be read out, and says so', async () => {
		axios.get.mockImplementation((url) => (url.includes('theming-app') ? Promise.reject({ response: { status: 404, data: { message: 'Not installed' } } }) : Promise.resolve({ data: { appName: 'Dossiq' } })))
		const wrapper = await mountSection({ fields: MIXED })
		expect(wrapper.find('[data-testid="cn-settings-field-error-orgName"]').text()).toContain('Not installed')
		expect(input(wrapper, 'appName').element.value).toBe('Dossiq')
	})

	it('uploads an image at once and shows the new one', async () => {
		axios.post.mockResolvedValue({ data: { data: { url: '/apps/theming/image/logo?v=2' } } })
		const wrapper = await mountSection({ fields: MIXED })
		const file = new File(['x'], 'logo.png', { type: 'image/png' })
		const fileInput = wrapper.find('[data-testid="cn-settings-field-logo"] input[type="file"]')
		Object.defineProperty(fileInput.element, 'files', { value: [file] })
		await fileInput.trigger('change')
		await flushPromises()
		const [url, body] = axios.post.mock.calls[0]
		expect(url).toContain('/apps/theming/ajax/uploadImage')
		expect(body.get('key')).toBe('logo')
		expect(body.get('image')).toBe(file)
		expect(wrapper.find('[data-testid="cn-settings-field-image-logo"] img').attributes('src')).toBe('/apps/theming/image/logo?v=2')
		expect(wrapper.find('[data-testid="cn-settings-fields-dirty"]').exists()).toBe(false)
	})
})

describe('CnSettingsField', () => {
	it('labels a select through NcSelect and reads sourced options', async () => {
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [{ id: 7, title: 'Register A' }, { id: 8, title: 'Register B' }] }) }))
		const wrapper = mount(CnSettingsField, {
			props: { field: { key: 'register', label: 'Register', type: 'select', optionsUrl: '/apps/openregister/api/registers', optionLabel: 'title', optionValue: 'id' }, modelValue: 8 },
			global: { stubs: STUBS },
		})
		await flushPromises()
		const select = wrapper.find('.select')
		expect(select.attributes('data-input-label')).toBe('Register')
		expect(JSON.parse(select.attributes('data-options'))).toEqual([{ label: 'Register A', value: 7 }, { label: 'Register B', value: 8 }])
		expect(select.attributes('data-value')).toBe('8')
	})

	it('draws a boolean as a checkbox and a switch as a switch, as CnSettingsPage did', () => {
		const make = (type) => mount(CnSettingsField, { props: { field: { key: 'on', label: 'On', type } }, global: { stubs: STUBS } })
		expect(make('boolean').find('.switch').attributes('data-type')).toBe('checkbox')
		expect(make('switch').find('.switch').attributes('data-type')).toBe('switch')
	})

	it('ties its hint or error to the control', () => {
		const wrapper = mount(CnSettingsField, { props: { field: { key: 'x', label: 'X' }, hint: 'A hint', error: '' }, global: { stubs: { ...STUBS, NcTextField: { inheritAttrs: false, template: '<input v-bind="$attrs">' } } } })
		const hint = wrapper.find('.cn-settings-field__hint')
		expect(wrapper.find('input').attributes('aria-describedby')).toBe(hint.attributes('id'))
	})
})
