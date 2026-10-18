/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A choice step's `default` preselects that option (board DqInstellen,
 * step 4: "Example data" is chosen when the step opens). A step the server
 * already holds a value for is left alone, so Next does not overwrite it.
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { mount, shallowMount, flushPromises } = require('@vue/test-utils')
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
const CnChoiceCards = require('../../src/components/CnChoiceCards/CnChoiceCards.vue').default
const { __resetSetupStatusCacheForTests } = require('../../src/composables/useSetupStatus.js')
const schema = require('../../src/schemas/app-manifest-v2.schema.json')

const options = [
	{ value: 'none', label: 'None, I will start empty' },
	{ value: 'demo', label: 'Example data' },
]
const step = { id: 'examples', type: 'choice', display: 'cards', configKey: 'example_data', title: 'Example data', default: 'demo', options }

describe('CnSetupWizard choice default', () => {
	beforeEach(() => {
		__resetSetupStatusCacheForTests()
		axios.get.mockReset()
		axios.post.mockReset()
		axios.get.mockResolvedValue({ data: { version: 1, completed: true, steps: {} } })
		axios.post.mockResolvedValue({ data: { success: true } })
	})

	it('preselects the default option on a cards step', async () => {
		const wrapper = mount(CnSetupWizard, { propsData: { appId: 'dossiq', steps: [step] } })
		await flushPromises()
		expect(wrapper.findComponent(CnChoiceCards).props('modelValue')).toBe('demo')
		expect(wrapper.vm.hasChoice(step)).toBe(true)
	})

	it('preselects the default option object on a select step', () => {
		const select = { ...step, display: 'select' }
		const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'dossiq', steps: [select] } })
		expect(wrapper.vm.choiceModel.examples).toEqual({ value: 'demo', label: 'Example data' })
		expect(wrapper.vm.scalarChoice(select)).toBe('demo')
	})

	it('saves the default on Next without a click', async () => {
		const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'dossiq', steps: [{ ...step, required: true }] } })
		const result = await wrapper.vm.validateStep('examples')
		expect(result).toBe(true)
		expect(axios.post.mock.calls[0][1]).toEqual({ example_data: 'demo' })
	})

	it('leaves a step the server already completed alone', () => {
		const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'dossiq', steps: [step], completedStepIds: ['examples'] } })
		expect(wrapper.vm.hasChoice(step)).toBe(false)
	})

	it('accepts default in the manifest schema', () => {
		expect(schema.properties.setup.properties.steps.items.properties.default).toBeDefined()
	})
})
