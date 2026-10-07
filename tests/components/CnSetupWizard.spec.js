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
const { shallowMount, mount, flushPromises } = require('@vue/test-utils')
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
const { __resetSetupStatusCacheForTests } = require('../../src/composables/useSetupStatus.js')

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

	describe('a run-action step starts itself (no manual "Run" click needed)', () => {
		it('auto-runs on mount when the wizard resumes straight onto the step', async () => {
			axios.post.mockResolvedValue({ data: { success: true, message: 'Seeded' } })
			shallowMount(CnSetupWizard, {
				propsData: { appId: 'procest', steps, completedStepIds: ['region'] },
			})
			await flushPromises()
			expect(axios.post).toHaveBeenCalledWith('/index.php/apps/procest/api/setup/action/seed')
		})

		it('does not auto-run again once the server already reports it done', async () => {
			shallowMount(CnSetupWizard, {
				propsData: { appId: 'procest', steps, completedStepIds: ['region', 'seed'] },
			})
			await flushPromises()
			expect(axios.post).not.toHaveBeenCalled()
		})

		it('auto-runs on navigating forward onto the step', async () => {
			axios.post.mockResolvedValue({ data: { success: true } })
			const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'procest', steps } })
			await flushPromises()
			axios.post.mockClear()
			wrapper.vm.onStepChange({ stepId: 'seed', stepIndex: 2, direction: 'next' })
			await flushPromises()
			expect(axios.post).toHaveBeenCalledWith('/index.php/apps/procest/api/setup/action/seed')
		})

		it('does not start a second run while one is already in flight', async () => {
			let resolvePost
			axios.post.mockReturnValue(new Promise((resolve) => {
				resolvePost = resolve
			}))
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: { appId: 'procest', steps, completedStepIds: ['region'] },
			})
			// Let the auto-run reach its (mocked, still-pending) axios.post call
			// without resolving it — `running.seed` stays true meanwhile.
			await flushPromises()
			expect(axios.post).toHaveBeenCalledTimes(1)
			expect(wrapper.vm.running.seed).toBe(true)
			wrapper.vm.onStepChange({ stepId: 'seed', stepIndex: 2, direction: 'jump' })
			expect(axios.post).toHaveBeenCalledTimes(1)
			resolvePost({ data: { success: true } })
			await flushPromises()
		})
	})

	describe('the dialog title names the app', () => {
		it('falls back to the generic dialogTitle default when no appName is given', () => {
			const wrapper = shallowMount(CnSetupWizard, { propsData: { appId: 'procest', steps } })
			expect(wrapper.vm.resolvedDialogTitle).toBe(wrapper.vm.dialogTitle)
		})

		it('becomes "Set up {appName}" once appName is set', () => {
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: { appId: 'procest', steps, appName: 'Open Register' },
			})
			expect(wrapper.vm.resolvedDialogTitle).toBe('Set up Open Register')
		})

		it('a caller-supplied dialogTitle still wins when there is no appName', () => {
			const wrapper = shallowMount(CnSetupWizard, {
				propsData: { appId: 'procest', steps, dialogTitle: 'Bespoke title' },
			})
			expect(wrapper.vm.resolvedDialogTitle).toBe('Bespoke title')
		})
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

		it('starts at step one when only LATER steps are done, not earlier ones', () => {
			// An app whose install-time repair step pre-satisfies `seed` reports it
			// done on the very first visit, before anyone has opened the wizard.
			// Nothing before the outstanding `region` step is finished, so there is
			// nothing to resume past and the welcome step must still be shown.
			expect(mountWizard(['seed']).vm.initialStepId).toBe('')
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

	// An app reports a destructive on-demand step (learniq's "Remove the
	// example data") as done on purpose, so the auto-run never fires it. The
	// summary then read that `done` as "this happened" and ticked a removal
	// nobody ran. `onDemand: true` makes the tick mean "ran in this session".
	describe('on-demand run-action steps (onDemand: true)', () => {
		const onDemandSteps = [
			{ id: 'welcome', type: 'info', title: 'Hi' },
			{ id: 'seed', type: 'run-action', action: 'seed', title: 'Load the example data' },
			{ id: 'wipe', type: 'run-action', action: 'wipe', title: 'Remove the example data', onDemand: true },
			{ id: 'done', type: 'summary', title: 'All set' },
		]
		const mountWizard = (completedStepIds = []) => shallowMount(CnSetupWizard, {
			propsData: { appId: 'learniq', steps: onDemandSteps, completedStepIds },
		})
		const recap = (wrapper, id) => wrapper.vm.summaryItems.find((i) => i.id === id)

		it('is not ticked in the summary when the server reports it done but it did not run', () => {
			const wrapper = mountWizard(['seed', 'wipe'])
			expect(recap(wrapper, 'wipe').done).toBe(false)
			expect(recap(wrapper, 'wipe').notRun).toBe(true)
			expect(recap(wrapper, 'wipe').value).toBe('Not run')
		})

		it('is ticked in the summary once its action succeeded in this session', async () => {
			axios.post.mockResolvedValue({ data: { success: true, message: 'Removed' } })
			const wrapper = mountWizard(['seed', 'wipe'])
			await wrapper.vm.runAction(onDemandSteps[2])
			expect(recap(wrapper, 'wipe').done).toBe(true)
			expect(recap(wrapper, 'wipe').notRun).toBe(false)
		})

		it('is not ticked after a failed run', async () => {
			axios.post.mockRejectedValue({ response: { data: { message: 'Nope' } } })
			const wrapper = mountWizard(['seed', 'wipe'])
			await wrapper.vm.runAction(onDemandSteps[2])
			expect(recap(wrapper, 'wipe').done).toBe(false)
		})

		it('never auto-runs, even when the server reports it not done', async () => {
			const wrapper = mountWizard(['seed'])
			await flushPromises()
			wrapper.vm.onStepChange({ stepId: 'wipe', stepIndex: 2, direction: 'next' })
			await flushPromises()
			expect(axios.post).not.toHaveBeenCalled()
		})

		it('is never the step a resumed wizard opens on', () => {
			expect(mountWizard(['seed']).vm.initialStepId).toBe('')
		})

		it('leaves steps without the flag as they were: a server-done step is ticked', () => {
			const wrapper = mountWizard(['seed', 'wipe'])
			expect(recap(wrapper, 'seed').done).toBe(true)
			expect(recap(wrapper, 'seed').notRun).toBe(false)
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

describe('CnSetupWizard — a choice offered as cards', () => {
	const cardStep = {
		id: 'example-set',
		type: 'choice',
		display: 'cards',
		optionsSource: 'profiles',
		configKey: 'example_profile',
		multiple: true,
		title: 'Which kind of organisation is this for?',
	}
	const profiles = [
		{ id: 'none', label: 'None', description: 'Plants nothing.' },
		{ id: 'municipality', label: 'Municipality', description: 'A council and its committees.', objectCount: 170 },
		{ id: 'generated', label: 'Every schema, generated values', description: 'From the schemas themselves.', objectCount: 0 },
	]

	beforeEach(() => {
		__resetSetupStatusCacheForTests()
		axios.get.mockReset()
		axios.post.mockReset()
		axios.get.mockResolvedValue({ data: { version: 1, completed: true, profiles, steps: {} } })
	})

	const mountWizard = async (step = cardStep) => {
		const wrapper = mount(CnSetupWizard, { propsData: { appId: 'decidiq', steps: [step] } })
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		return wrapper
	}

	it('reads its options from the app\'s own setup status document', async () => {
		const wrapper = await mountWizard()
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/decidiq/api/setup/status')
		const options = wrapper.vm.optionsFor(cardStep)
		expect(options.map((o) => o.value)).toEqual(['none', 'municipality', 'generated'])
		expect(options[1].description).toBe('A council and its committees.')
	})

	it('turns a set\'s object count into the one stat a card shows, and omits an unknown one', async () => {
		const wrapper = await mountWizard()
		const options = wrapper.vm.optionsFor(cardStep)
		expect(options[1].stats).toEqual([{ label: 'Objects', value: 170 }])
		expect(options[2].stats).toBeUndefined()
		expect(options[0].stats).toBeUndefined()
	})

	it('renders a card grid instead of a dropdown', async () => {
		const wrapper = await mountWizard()
		expect(wrapper.find('.cn-choice-cards').exists()).toBe(true)
		expect(wrapper.findAll('.cn-choice-cards__option')).toHaveLength(3)
		expect(wrapper.text()).toContain('A council and its committees.')
	})

	it('keeps the dropdown for a choice that does not ask for cards', async () => {
		const wrapper = await mountWizard({ ...cardStep, display: undefined })
		expect(wrapper.find('.cn-choice-cards').exists()).toBe(false)
	})

	it('collects several picks and POSTs them as a list', async () => {
		const wrapper = await mountWizard()
		const inputs = wrapper.findAll('.cn-choice-cards__input')
		await inputs[1].trigger('change')
		await inputs[2].trigger('change')
		expect(wrapper.vm.scalarChoice(cardStep)).toEqual(['municipality', 'generated'])

		axios.post.mockResolvedValue({ data: { success: true } })
		expect(await wrapper.vm.validateStep('example-set')).toBe(true)
		expect(axios.post).toHaveBeenCalledWith(
			'/index.php/apps/decidiq/api/setup/config',
			{ example_profile: ['municipality', 'generated'] },
		)
	})

	it('recaps the picked sets by label, not by id', async () => {
		const wrapper = await mountWizard()
		await wrapper.findAll('.cn-choice-cards__input')[1].trigger('change')
		const recap = wrapper.vm.summaryItems.find((i) => i.id === 'example-set')
		expect(recap.value).toBe('Municipality')
		expect(recap.done).toBe(true)
	})

	it('offers a way through that does not depend on the button label', async () => {
		// The labels are translated; an e2e that clicks "Next" passes in English
		// and times out in Dutch, reporting a broken dialog rather than a
		// missing string.
		const wrapper = await mountWizard()
		expect(wrapper.find('[data-testid="cn-wizard-next"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-wizard-cancel"]').exists()).toBe(true)
	})

	it('never asks for setup status when no step declares an option source', () => {
		axios.get.mockClear()
		shallowMount(CnSetupWizard, { propsData: { appId: 'decidiq', steps } })
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('offers nothing rather than crashing when the status document has no such key', async () => {
		axios.get.mockResolvedValue({ data: { version: 1, completed: true, steps: {} } })
		const wrapper = await mountWizard()
		expect(wrapper.vm.optionsFor(cardStep)).toEqual([])
		expect(wrapper.find('.cn-choice-cards').exists()).toBe(true)
	})
})

describe('CnSetupWizard — a dataset card loads itself (loadAction)', () => {
	const loadStep = {
		id: 'demo-data',
		type: 'choice',
		display: 'cards',
		optionsSource: 'datasets',
		configKey: 'demo_dataset',
		loadAction: 'load-demo-data',
		title: 'Load example data?',
	}
	const datasets = [
		{ id: 'none', label: 'None, I will set this up myself' },
		{ id: 'demo', label: 'Example data', description: 'A worked CRM.' },
	]

	beforeEach(() => {
		__resetSetupStatusCacheForTests()
		axios.get.mockReset()
		axios.post.mockReset()
		axios.get.mockResolvedValue({ data: { version: 1, completed: true, datasets, steps: {} } })
	})

	const mountWizard = async (step = loadStep) => {
		const wrapper = mount(CnSetupWizard, { propsData: { appId: 'pipelinq', steps: [step] } })
		await flushPromises()
		await wrapper.vm.$nextTick()
		return wrapper
	}

	it('gives every card except "none" its own Load button', async () => {
		const wrapper = await mountWizard()
		const cells = wrapper.findAll('.cn-choice-cards__cell')
		expect(cells).toHaveLength(2)
		expect(cells[0].find('[data-testid="cn-setup-load-dataset"]').exists()).toBe(false)
		expect(cells[1].find('[data-testid="cn-setup-load-dataset"]').exists()).toBe(true)
	})

	it('renders no Load button for a cards step without loadAction', async () => {
		const wrapper = await mountWizard({ ...loadStep, loadAction: undefined })
		expect(wrapper.find('[data-testid="cn-setup-load-dataset"]').exists()).toBe(false)
		expect(wrapper.find('.cn-choice-cards__actions').exists()).toBe(false)
	})

	it('posts the card\'s dataset, spins while it runs, then shows the result on that card', async () => {
		let settle
		axios.post.mockImplementation(() => new Promise((resolve) => {
			settle = resolve
		}))
		const wrapper = await mountWizard()
		const cell = () => wrapper.findAll('.cn-choice-cards__cell')[1]
		await cell().find('[data-testid="cn-setup-load-dataset"]').trigger('click')
		await flushPromises()

		expect(axios.post).toHaveBeenCalledWith(
			'/index.php/apps/pipelinq/api/setup/action/load-demo-data',
			{ dataset: 'demo' },
		)
		expect(wrapper.vm.isDatasetLoading(loadStep, { value: 'demo' })).toBe(true)
		expect(cell().find('[data-testid="cn-setup-load-dataset"]').attributes('disabled')).toBeDefined()

		settle({ data: { success: true, message: 'Seeded 262 objects.' } })
		await flushPromises()

		expect(wrapper.vm.isDatasetLoading(loadStep, { value: 'demo' })).toBe(false)
		expect(cell().find('[data-testid="cn-setup-load-result"]').text()).toBe('Seeded 262 objects.')
		expect(wrapper.vm.scalarChoice(loadStep)).toBe('demo')
		const evt = wrapper.emitted('action-result')[0][0]
		expect(evt).toMatchObject({ stepId: 'demo-data', action: 'load-demo-data', dataset: 'demo', success: true })
	})

	it('shows a failed load as an error on the card and does not select it', async () => {
		axios.post.mockRejectedValue({ response: { data: { message: 'No dataset is called "demo".' } } })
		const wrapper = await mountWizard()
		await wrapper.findAll('.cn-choice-cards__cell')[1].find('[data-testid="cn-setup-load-dataset"]').trigger('click')
		await flushPromises()
		const result = wrapper.findAll('.cn-choice-cards__cell')[1].find('[data-testid="cn-setup-load-result"]')
		expect(result.text()).toBe('No dataset is called "demo".')
		expect(result.classes()).toContain('cn-setup-load-result--error')
		expect(wrapper.vm.hasChoice(loadStep)).toBe(false)
	})

	it('records "None" through the choice, never through the load action', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const wrapper = await mountWizard()
		await wrapper.findAll('.cn-choice-cards__input')[0].trigger('change')
		expect(await wrapper.vm.validateStep('demo-data')).toBe(true)
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/setup/config', { demo_dataset: 'none' })
	})

	it('never loads the "none" card even when asked directly', async () => {
		const wrapper = await mountWizard()
		await wrapper.vm.loadDataset(loadStep, { value: 'none', label: 'None' })
		expect(axios.post).not.toHaveBeenCalled()
	})
})

describe('CnSetupWizard — dependencies are checked before any step', () => {
	const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')
	const depSteps = [
		{ id: 'welcome', type: 'info', title: 'Hi' },
		{ id: 'seed', type: 'run-action', action: 'seed' },
		{ id: 'invoices', type: 'run-action', action: 'link-invoices', requires: ['shillinq'], title: 'Link invoices' },
		{ id: 'done', type: 'summary', title: 'Done' },
	]

	beforeEach(() => {
		__resetAppStatusCacheForTests()
		axios.post.mockReset()
		axios.post.mockResolvedValue({ data: { success: true } })
		global.OC = { appswebroots: { openregister: '/apps/openregister' } }
	})

	afterEach(() => {
		delete global.OC
	})

	it('replaces the steps with the missing required app and disables Next', async () => {
		global.OC = { appswebroots: {} }
		const wrapper = mount(CnSetupWizard, {
			propsData: { appId: 'pipelinq', steps: depSteps, dependencies: ['openregister'] },
		})
		await flushPromises()
		expect(wrapper.vm.dependencyBlocked).toBe(true)
		expect(wrapper.vm.wizardSteps.map((s) => s.id)).toEqual(['cn-setup-dependencies'])
		expect(wrapper.find('[data-testid="cn-setup-dependencies"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-leaf-dependency-openregister"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-wizard-next"]').attributes('disabled')).toBeDefined()
		// No step action runs behind the gate.
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('reads the dependencies from the injected manifest when no prop is passed', async () => {
		global.OC = { appswebroots: {} }
		const wrapper = mount(CnSetupWizard, {
			propsData: { appId: 'pipelinq', steps: depSteps },
			global: { provide: { cnManifest: { dependencies: ['openregister'] } } },
		})
		await flushPromises()
		expect(wrapper.vm.dependencyBlocked).toBe(true)
	})

	it('shows the steps when every required app is there, and lists a missing optional one', async () => {
		const wrapper = mount(CnSetupWizard, {
			propsData: {
				appId: 'pipelinq',
				steps: depSteps,
				dependencies: ['openregister', { id: 'forms', name: 'Forms', required: false }],
			},
		})
		await flushPromises()
		expect(wrapper.vm.dependencyBlocked).toBe(false)
		expect(wrapper.vm.wizardSteps.map((s) => s.id)).toEqual(['welcome', 'seed', 'done'])
		const note = wrapper.find('[data-testid="cn-setup-optional-dependencies"]')
		expect(note.exists()).toBe(true)
		expect(note.text()).toContain('Forms')
		expect(wrapper.find('[data-testid="cn-wizard-next"]').attributes('disabled')).toBeUndefined()
	})

	it('skips a step whose required app is absent and says so in the summary', async () => {
		const wrapper = mount(CnSetupWizard, {
			propsData: { appId: 'pipelinq', steps: depSteps, dependencies: ['openregister'] },
		})
		await flushPromises()
		expect(wrapper.vm.setupSteps.map((s) => s.id)).not.toContain('invoices')
		const recap = wrapper.vm.summaryItems.find((i) => i.id === 'invoices')
		expect(recap).toMatchObject({ done: false, notRun: true, value: 'Skipped, needs shillinq' })
	})

	it('does not block on a REQUIRED step whose app is absent', async () => {
		// The status side (useSetupStatus) counts this step as not applicable;
		// the wizard must agree and neither offer it nor wait for it.
		const steps = depSteps.map((s) => (s.id === 'invoices' ? { ...s, required: true } : s))
		const wrapper = mount(CnSetupWizard, {
			propsData: { appId: 'pipelinq', steps, dependencies: ['openregister'] },
		})
		await flushPromises()
		expect(wrapper.vm.wizardSteps.map((s) => s.id)).toEqual(['welcome', 'seed', 'done'])
		expect(wrapper.vm.summaryItems.find((i) => i.id === 'invoices')).toMatchObject({ notRun: true, value: 'Skipped, needs shillinq' })
	})

	it('offers that step once its app is present', async () => {
		global.OC = { appswebroots: { openregister: '/a', shillinq: '/b' } }
		const wrapper = mount(CnSetupWizard, {
			propsData: { appId: 'pipelinq', steps: depSteps, dependencies: ['openregister'] },
		})
		await flushPromises()
		expect(wrapper.vm.setupSteps.map((s) => s.id)).toContain('invoices')
	})
})
