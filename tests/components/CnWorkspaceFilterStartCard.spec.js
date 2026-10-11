/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnWorkspaceFilterWidget start card (abstract-start-card): `layout: "start"`
 * draws a title and a guidance line beside the control; `objectSource` makes
 * the control an OpenRegister object picker that writes the picked id into the
 * workspace and selects the first object when nothing is chosen; `link` sits
 * after the control. Without the keys the widget renders as before.
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p, params) => {
		let out = p
		for (const [k, v] of Object.entries(params || {})) {
			out = out.replace(`{${k}}`, v)
		}
		return `/nc${out}`
	}),
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnWorkspaceFilterWidget from '../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const ResourceSelectStub = {
	name: 'CnResourceSelect',
	props: ['register', 'schema', 'labelField', 'modelValue', 'placeholder', 'preload', 'clearable', 'allowCreate', 'ariaLabelCombobox'],
	emits: ['update:modelValue'],
	template: '<div class="resource-select-stub" />',
}

/**
 * Mount the widget.
 *
 * @param {object} content The content.
 * @param {object} workspace The workspace ref.
 * @return {object} The wrapper.
 */
function mountWidget(content, workspace = ref({})) {
	return mount(CnWorkspaceFilterWidget, {
		props: { content },
		global: {
			provide: { cnWorkspaceContext: workspace, cnTranslate: (key) => `T(${key})` },
			stubs: {
				CnResourceSelect: ResourceSelectStub,
				NcSelect: true,
				NcCheckboxRadioSwitch: true,
				RouterLink: { props: ['to'], template: '<a class="stub-link" :data-to="JSON.stringify(to)"><slot /></a>' },
			},
		},
	})
}

const START = {
	layout: 'start',
	title: 'Start a contact',
	description: 'Find the client on the line or at the desk.',
	writes: '@workspace.selectedClient',
	objectSource: { register: 'crm', schema: 'client', labelField: 'name', placeholder: 'Name, phone or e-mail' },
	link: { label: 'See an example', route: { name: 'Help' } },
}

describe('CnWorkspaceFilterWidget start card', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('draws the title and guidance beside the control, translated', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		const w = mountWidget(START)
		await flush()
		expect(w.classes()).toContain('cn-workspace-filter-widget--start')
		expect(w.find('.cn-workspace-filter-widget__title').text()).toBe('T(Start a contact)')
		expect(w.find('.cn-workspace-filter-widget__description').text()).toBe('T(Find the client on the line or at the desk.)')
		const link = w.find('[data-testid="cn-workspace-filter-link"]')
		expect(link.text()).toBe('T(See an example)')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'Help' })
	})

	it('renders an object picker over the source, labelled for assistive tech', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		const w = mountWidget(START)
		await flush()
		const picker = w.findComponent(ResourceSelectStub)
		expect(picker.props('register')).toBe('crm')
		expect(picker.props('schema')).toBe('client')
		expect(picker.props('labelField')).toBe('name')
		expect(picker.props('placeholder')).toBe('T(Name, phone or e-mail)')
		expect(picker.props('ariaLabelCombobox')).toBe('T(Start a contact)')
	})

	it('selects the first object when nothing is chosen, and writes the pick into the workspace', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 'c-1', name: 'M. de Graaf' }] } })
		const workspace = ref({})
		const w = mountWidget(START, workspace)
		await flush()
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/objects/crm/client', { params: { _limit: 1 } })
		expect(workspace.value.selectedClient).toBe('c-1')

		w.findComponent(ResourceSelectStub).vm.$emit('update:modelValue', 'c-2')
		await w.vm.$nextTick()
		expect(workspace.value.selectedClient).toBe('c-2')
		expect(w.emitted('change').at(-1)).toEqual([{ key: 'selectedClient', value: 'c-2' }])
	})

	it('keeps a selection that is already in the workspace, without a read', async () => {
		const workspace = ref({ selectedClient: 'c-9' })
		const w = mountWidget(START, workspace)
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(w.findComponent(ResourceSelectStub).props('modelValue')).toBe('c-9')
	})

	it('selects nothing when the first read fails', async () => {
		axios.get.mockRejectedValue(new Error('500'))
		const workspace = ref({})
		mountWidget(START, workspace)
		await flush()
		expect(workspace.value.selectedClient).toBeUndefined()
	})

	it('renders as before without the start keys', async () => {
		const w = mountWidget({ writes: 'queue', options: [{ value: 'a', label: 'A' }] })
		await flush()
		expect(w.classes()).not.toContain('cn-workspace-filter-widget--start')
		expect(w.find('.cn-workspace-filter-widget__title').exists()).toBe(false)
		expect(w.findComponent(ResourceSelectStub).exists()).toBe(false)
		expect(w.find('[data-testid="cn-workspace-filter-link"]').exists()).toBe(false)
	})
})
