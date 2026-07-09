/**
 * Tests for CnSetupWizard — abstract first-time setup wizard (ADR-042).
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { shallowMount } = require('@vue/test-utils')
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default

const steps = [
	{ id: 'welcome', type: 'info', title: 'Hi' },
	{ id: 'region', type: 'choice', configKey: 'legal_region', required: true, options: [{ value: 'nl', label: 'NL' }] },
	{ id: 'seed', type: 'run-action', action: 'seed' },
]

describe('CnSetupWizard', () => {
	beforeEach(() => {
		axios.post.mockReset()
	})

	it('maps manifest steps to wizard steps, required → not optional', () => {
		const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'procest', steps } })
		expect(wrapper.vm.wizardSteps.map((s) => s.id)).toEqual(['welcome', 'region', 'seed'])
		expect(wrapper.vm.wizardSteps.find((s) => s.id === 'region').optional).toBe(false)
		expect(wrapper.vm.wizardSteps.find((s) => s.id === 'welcome').optional).toBe(true)
	})

	it('run-action POSTs to /api/setup/action/{id} and emits action-result', async () => {
		axios.post.mockResolvedValue({ data: { success: true, message: 'Seeded' } })
		const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'procest', steps } })
		await wrapper.vm.runAction({ id: 'seed', action: 'seed' })
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/procest/api/setup/action/seed')
		const evt = wrapper.emitted('action-result')[0][0]
		expect(evt).toMatchObject({ stepId: 'seed', action: 'seed', success: true })
	})

	it('saveConfig POSTs the patch to /api/setup/config', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'procest', steps } })
		await wrapper.vm.saveConfig({ legal_region: 'nl' })
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/procest/api/setup/config', { legal_region: 'nl' })
	})

	it('surfaces a server error message on a failed action without throwing', async () => {
		axios.post.mockRejectedValue({ response: { data: { message: 'Not allowed' } } })
		const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'procest', steps } })
		await wrapper.vm.runAction({ id: 'seed', action: 'seed' })
		expect(wrapper.vm.actionResult.seed).toMatchObject({ success: false, message: 'Not allowed' })
	})
})
