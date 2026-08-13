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

	describe('resuming from server state (completedStepIds)', () => {
		const mountWizard = (completedStepIds) => shallowMount(CnSetupWizard, {
			propsData: { appId: 'procest', steps, completedStepIds },
		})

		it('starts at step one on a fresh setup so the welcome step is seen', () => {
			// '' = CnWizardDialog's own first-step default, i.e. the `info` step.
			expect(mountWizard([]).vm.initialStepId).toBe('')
		})

		it('resumes at the first unmet actionable step when returning', () => {
			expect(mountWizard(['region']).vm.initialStepId).toBe('seed')
		})

		it('falls back to step one when every actionable step is done', () => {
			expect(mountWizard(['region', 'seed']).vm.initialStepId).toBe('')
		})

		it('skips info/summary steps when resuming', () => {
			const withSummary = [...steps, { id: 'done', type: 'summary', title: 'All set' }]
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: { appId: 'procest', steps: withSummary, completedStepIds: ['region'] },
			})
			expect(wrapper.vm.initialStepId).toBe('seed')
		})

		it('treats a server-done step as done without local state', () => {
			const wrapper = mountWizard(['seed'])
			expect(wrapper.vm.isServerDone('seed')).toBe(true)
			expect(wrapper.vm.isStepDone('seed')).toBe(true)
			expect(wrapper.vm.summaryItems.find((i) => i.id === 'region').done).toBe(false)
		})

		it('marks a server-done choice as done in the summary', () => {
			expect(mountWizard(['region']).vm.summaryItems.find((i) => i.id === 'region').done).toBe(true)
		})
	})

	describe('validateStep', () => {
		it('blocks a required choice with nothing picked and nothing persisted', async () => {
			const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'procest', steps } })
			await expect(wrapper.vm.validateStep('region')).resolves.toBe('Please make a selection to continue.')
			expect(axios.post).not.toHaveBeenCalled()
		})

		it('lets a back-navigated, server-done required choice pass without re-POSTing', async () => {
			// choiceModel is session-local, so a resumed-past step reads blank even
			// though the value is already persisted — don't force a re-pick.
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: { appId: 'procest', steps, completedStepIds: ['region'] },
			})
			await expect(wrapper.vm.validateStep('region')).resolves.toBe(true)
			expect(axios.post).not.toHaveBeenCalled()
		})

		it('persists and advances once a choice is picked', async () => {
			axios.post.mockResolvedValue({ data: {} })
			const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'procest', steps } })
			wrapper.vm.onChoice(steps[1], { value: 'nl', label: 'NL' })
			await expect(wrapper.vm.validateStep('region')).resolves.toBe(true)
			expect(axios.post).toHaveBeenCalledWith('/index.php/apps/procest/api/setup/config', { legal_region: 'nl' })
		})

		it('allows an optional choice to be skipped', async () => {
			const optional = [{ id: 'flavour', type: 'choice', configKey: 'flavour', options: [] }]
			const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'procest', steps: optional } })
			await expect(wrapper.vm.validateStep('flavour')).resolves.toBe(true)
		})
	})
})
