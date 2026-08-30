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

	describe('step titles follow the user language (ADR-057)', () => {
		// manifest.setup.steps[].title is authored in English as the canonical
		// source, exactly like the schema property titles this component already
		// routes through cnTranslate for FIELD labels. The step titles were the
		// one place still rendering the manifest string verbatim, so an
		// nl-locale user saw translated field labels above untranslated step
		// headings.
		it('resolves a step title through the injected cnTranslate', () => {
			const seen = []
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: {
					appId: 'procest',
					steps: [{ id: 'region', type: 'info', title: 'Choose your region' }],
				},
				provide: {
					cnTranslate: (key) => {
						seen.push(key)
						return key === 'Choose your region' ? 'Kies uw regio' : key
					},
				},
			})

			expect(wrapper.vm.stepTitle({ id: 'region', title: 'Choose your region' })).toBe('Kies uw regio')
			expect(seen).toContain('Choose your region')
		})

		it('falls back to the step id when a step declares no title', () => {
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: { appId: 'procest', steps: [{ id: 'region', type: 'info' }] },
			})

			expect(wrapper.vm.stepTitle({ id: 'region' })).toBe('region')
		})

		it('defaults to identity with no CnAppRoot ancestor, so standalone use still renders', () => {
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: { appId: 'procest', steps: [{ id: 'region', type: 'info', title: 'Region' }] },
			})

			expect(wrapper.vm.stepTitle({ id: 'region', title: 'Region' })).toBe('Region')
		})

		// 🔴 THE HEADING WAS TRANSLATED AND EVERYTHING AROUND IT WAS NOT.
		// `step.body` rendered verbatim in four places and the tab strip used
		// `s.title` raw, so a Dutch instance showed "Welkom" over an English
		// paragraph, between translated Cancel and Next buttons. The app could
		// not fix it from its side: decidiq shipped correct Dutch for exactly
		// these strings in l10n/nl.json and the component never asked for them.
		it('resolves a step body through the injected cnTranslate', () => {
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: {
					appId: 'decidiq',
					steps: [{ id: 'welcome', type: 'info', title: 'Welcome', body: 'A short setup.' }],
				},
				provide: {
					cnTranslate: (key) => (key === 'A short setup.' ? 'Een korte installatie.' : key),
				},
			})

			expect(wrapper.vm.stepBody({ body: 'A short setup.' })).toBe('Een korte installatie.')
		})

		it('returns an empty body rather than undefined, so a bodyless step renders nothing', () => {
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: { appId: 'decidiq', steps: [{ id: 'welcome', type: 'info' }] },
			})

			expect(wrapper.vm.stepBody({ id: 'welcome' })).toBe('')
			expect(wrapper.vm.stepBody(undefined)).toBe('')
		})

		it('translates the tab-strip labels, not just the heading inside the step', () => {
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: {
					appId: 'decidiq',
					steps: [{ id: 'welcome', type: 'info', title: 'Welcome' }],
				},
				provide: {
					cnTranslate: (key) => (key === 'Welcome' ? 'Welkom' : key),
				},
			})

			expect(wrapper.vm.wizardSteps[0].label).toBe('Welkom')
		})

		it('translates a choice option LABEL and leaves its VALUE alone', () => {
			// The value is what `scalarChoice()` reads and what reaches
			// POST /api/setup/config, so translating it would change what gets
			// stored. Only the label a person reads is translated.
			const step = {
				id: 'example-set',
				type: 'choice',
				title: 'Which kind of organisation is this for?',
				options: [
					{ value: 'municipality', label: 'Municipality' },
					{ value: 'works-council', label: 'Works council' },
				],
			}
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: { appId: 'decidiq', steps: [step] },
				provide: {
					cnTranslate: (key) => (key === 'Municipality' ? 'Gemeente' : key),
				},
			})

			const options = wrapper.vm.optionsFor(step)
			expect(options[0].label).toBe('Gemeente')
			expect(options[0].value).toBe('municipality')
			expect(options[1].label).toBe('Works council')
			expect(options[1].value).toBe('works-council')
		})
	})
})
