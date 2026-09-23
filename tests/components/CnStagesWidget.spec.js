/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStagesWidget: the record's stages as a placeable widget, where clicking a
 * stage moves the record there, and where a guard that blocks a move still
 * blocks it.
 *
 * The widget speaks OpenRegister's lifecycle contract, the same one
 * `CnLifecycleActions` speaks: `/available-actions` says what is reachable and
 * `/transition` performs the move. These specs pin that the timeline renders
 * that contract rather than a second vocabulary of its own.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	// Substitutes `{id}` the way the real one does, so a spec asserting on the
	// url asserts on the url a browser would request.
	generateUrl: jest.fn((path, params) => (params ? path.replace(/\{(\w+)\}/g, (_, k) => params[k]) : path)),
}))

import axios from '@nextcloud/axios'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnStagesWidget from '../../src/components/CnStagesWidget/CnStagesWidget.vue'
import CnTransitionInputDialog from '../../src/dialogs/CnTransitionInputDialog.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

/**
 * Drain promises and re-renders.
 *
 * @return {Promise<void>} Resolves once settled.
 */
async function flush() {
	for (let i = 0; i < 12; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

// A case type's statuses as dossiq's blueprint answers them: unordered, with
// `order`, one of them final, and the result types alongside.
const BLUEPRINT = {
	statusTypes: [
		{ id: 'st-done', name: 'Afgehandeld', description: 'Closed', order: 3, isFinal: true },
		{ id: 'st-new', name: 'Ontvangen', description: 'Received', order: 1, isFinal: false },
		{ id: 'st-work', name: 'In behandeling', description: 'In progress', order: 2, isFinal: false },
	],
}

const STAGES_ENDPOINT = {
	url: '/apps/dossiq/api/case-types/@object.caseType/blueprint',
	path: 'statusTypes',
	labelField: 'name',
	descriptionField: 'description',
	orderField: 'order',
	finalField: 'isFinal',
}

const LIFECYCLE = { kind: 'lifecycle' }

/**
 * Answer `/available-actions` with these actions, and the stage blueprint.
 *
 * @param {Array<object>} actions The allowed actions.
 * @return {void}
 */
function allowActions(actions) {
	axios.get.mockImplementation((url) => {
		if (url.includes('available-actions')) {
			return Promise.resolve({ data: { actions } })
		}
		if (url.includes('blueprint')) {
			return Promise.resolve({ data: BLUEPRINT })
		}
		return Promise.reject(new Error('unexpected GET ' + url))
	})
}

/**
 * Mount the widget on a detail page bound to `record`.
 *
 * @param {object} content The widget config.
 * @param {object} [record] The bound record.
 * @return {object} The wrapper.
 */
function mountWidget(content, record = { id: 'case-1', caseType: 'ct-1', status: 'st-new' }) {
	const context = ref({ objectId: 'case-1', object: record, register: 'dossiq', schema: 'case' })
	const wrapper = mount(CnStagesWidget, {
		props: { content },
		global: { provide: { cnObjectContext: context } },
	})
	wrapper.context = context
	return wrapper
}

/**
 * An axios-shaped rejection.
 *
 * Axios throws an Error carrying `response`, so the fixture is an Error too.
 * A bare object also trips `prefer-promise-reject-errors`, and the rule is
 * right: a rejection that is not an Error carries no stack, so a spec that
 * fails on it reports nothing about where it came from.
 *
 * @param {number} [status] The HTTP status.
 * @param {object} [data] The response body.
 * @return {Error} The rejection.
 */
function axiosError(status, data) {
	const error = new Error(`Request failed with status code ${status}`)
	error.response = { status, ...(data !== undefined ? { data } : {}) }
	return error
}

/**
 * The stage node for a stage id.
 *
 * @param {object} wrapper The widget wrapper.
 * @param {string} id The stage id.
 * @return {object} The node wrapper.
 */
function stageNode(wrapper, id) {
	return wrapper.findAll('.cn-timeline-stages__stage')
		.find((node) => node.find(`[data-testid="cn-stages-widget-stage-${id}"]`).exists())
}

const labels = (wrapper) => wrapper.findAll('.cn-timeline-stages__label').map((n) => n.text())

beforeAll(() => {
	// CnTimelineStages scrolls the current stage into view; jsdom has no layout.
	Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
	// tests/setup.js installs ONE jest.fn as global.fetch, and spyOn on a mock
	// returns that same mock, so its calls would carry over between tests.
	if (jest.isMockFunction(global.fetch)) {
		global.fetch.mockReset()
	}
	invalidateEndpointSourceCache()
	axios.get.mockReset()
	axios.post.mockReset()
	axios.put.mockReset()
})

afterEach(() => {
	jest.restoreAllMocks()
})

describe('CnStagesWidget: the stage list', () => {
	it('reads the stages from an endpoint named by the record, in order', async () => {
		allowActions([])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT })
		await flush()

		expect(axios.get).toHaveBeenCalledWith('/apps/dossiq/api/case-types/ct-1/blueprint', expect.anything())
		expect(labels(w)).toEqual(['Ontvangen', 'In behandeling', 'Afgehandeld'])
		expect(w.text()).toContain('Received')
	})

	it('reads the stages from an OpenRegister query with a record token in the filter', async () => {
		const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({ results: BLUEPRINT.statusTypes, total: 3 }),
		})
		const w = mountWidget({
			currentField: 'status',
			stagesSource: { register: 'dossiq', schema: 'statusType', filter: { caseType: '@object.caseType' }, orderBy: 'order', labelField: 'name' },
		})
		await flush()

		const url = decodeURIComponent(String(fetchSpy.mock.calls[0][0]))
		expect(url).toContain('/objects/dossiq/statusType')
		expect(url).toContain('caseType=ct-1')
		expect(labels(w)).toEqual(['Ontvangen', 'In behandeling', 'Afgehandeld'])
	})

	it('marks the record’s current stage, and the stages before it as done', async () => {
		allowActions([])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT }, { id: 'case-1', caseType: 'ct-1', status: 'st-work' })
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-current')).toBe('step')
		expect(stageNode(w, 'st-new').classes()).toContain('cn-timeline-stages__stage--completed')
		expect(stageNode(w, 'st-done').classes()).toContain('cn-timeline-stages__stage--upcoming')
	})

	it('is read only without a transition, and asks for no actions', async () => {
		allowActions([])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT })
		await flush()

		expect(stageNode(w, 'st-work').attributes('tabindex')).toBeUndefined()
		expect(axios.get.mock.calls.some(([url]) => url.includes('available-actions'))).toBe(false)
		await stageNode(w, 'st-work').trigger('click')
		expect(axios.post).not.toHaveBeenCalled()
	})
})

describe('CnStagesWidget: reachability comes from the lifecycle', () => {
	// THE ABSENCE OF AN ACTION IS THE GUARD. OpenRegister answers
	// /available-actions already filtered to the record's current state, so
	// there is no flag to read, no field mapping to get backwards, and no
	// config that can turn the guard off. It fails closed by construction.
	it('offers only the stages an action reaches', async () => {
		allowActions([{ action: 'start', to: 'st-work', requires: null, description: null }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/objects/case-1/available-actions')
		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBeUndefined()
		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBe('true')
	})

	// REACHABLE, NOT PRINTED. It used to be printed beside the stage, which on a
	// case with three stages ahead of it meant one generic sentence rendered
	// three times over and once more under the strip. It is now one hover or one
	// click away, and still in the stage's accessible name, so no route to it is
	// lost: what goes is the repetition.
	it('says why a stage cannot be chosen, on hover and in the accessible name', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		const reason = w.find('[data-testid="cn-stages-widget-reason-st-done"]')
		expect(reason.text()).toBe('Not reachable from the current stage')
		// The screen-reader node sits INSIDE the stage, so it is part of what a
		// screen reader announces for it.
		expect(reason.classes()).toContain('cn-stages-widget__sr-only')
		expect(stageNode(w, 'st-done').text()).toContain('Not reachable from the current stage')
		// And the pointer route: a mouse-over reveals the same sentence.
		expect(stageNode(w, 'st-done').attributes('title')).toBe('Not reachable from the current stage')
	})

	// ONE COPY, NOT TWO. The strip printed the sentence beside every unreachable
	// stage AND repeated it below the list, which is what a real case page looked
	// like: the same words four times on one card.
	it('prints the reason nowhere twice', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(w.findAll('.cn-stages-widget__reason')).toHaveLength(0)
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		// After the click the sentence is on screen exactly once, under the strip.
		expect(w.findAll('.cn-stages-widget__reason')).toHaveLength(0)
		expect(w.findAll('[data-testid="cn-stages-widget-blocked"]')).toHaveLength(1)
	})

	it('uses the app’s own words for an unreachable stage when it gave any', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const w = mountWidget({
			currentField: 'status',
			stagesEndpoint: STAGES_ENDPOINT,
			transition: LIFECYCLE,
			unreachableReason: 'Not possible from here',
		})
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-reason-st-done"]').text()).toBe('Not possible from here')
	})

	it('shows what a reachable move says about itself', async () => {
		allowActions([{ action: 'close', to: 'st-done', description: 'Closes the case.' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		const note = w.find('[data-testid="cn-stages-widget-reason-st-done"]')
		expect(note.text()).toBe('Closes the case.')
		expect(note.classes()).toContain('cn-stages-widget__reason')
	})

	// A PHP CLASS NAME IS NOT COPY. `requires` is the guard's
	// dependency-injection tag, copied verbatim out of the schema annotation by
	// OpenRegister, and it used to be concatenated onto the visible note. Every
	// transition in the fleet that declares a guard showed it.
	it('never puts what the move requires on screen', async () => {
		allowActions([{
			action: 'close',
			to: 'st-done',
			description: 'Closes the case.',
			requires: 'OCA\\Dossiq\\Lifecycle\\BezwaarDeadlineGuard',
		}])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-reason-st-done"]').text()).toBe('Closes the case.')
		expect(w.text()).not.toContain('OCA')
		expect(w.text()).not.toContain('BezwaarDeadlineGuard')
	})

	// The 107 transitions across the fleet that declare a guard and NO
	// description. The class name was the entire note there, so the fix has to
	// leave nothing behind rather than an empty element under the stage.
	it('renders no note at all for a move whose only annotation is its guard', async () => {
		allowActions([{ action: 'enable', to: 'st-done', requires: 'OCA\\Hermiq\\Lifecycle\\AiFeatureDpoAckGuard' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-reason-st-done"]').exists()).toBe(false)
		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBeUndefined()
		expect(w.text()).not.toContain('AiFeatureDpoAckGuard')
	})
})

// OFFERED AND REFUSED IS A THIRD ANSWER. Before `blocked`, a move was either in
// the list or absent, so "this move exists, you cannot take it right now, and
// here is why" had nowhere to live and arrived as the generic widget-level
// "not reachable from the current stage", which is a claim about the process
// rather than about this record.
describe('CnStagesWidget: a move that is offered but refused', () => {
	const BLOCKED = {
		action: 'beslissen',
		to: 'st-done',
		blocked: true,
		description: 'The decision document is missing.',
	}

	it('disables the stage and carries the guard’s own reason', async () => {
		allowActions([BLOCKED])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBe('true')
		const reason = w.find('[data-testid="cn-stages-widget-reason-st-done"]')
		expect(reason.text()).toBe('The decision document is missing.')
		// Hover, and the accessible name of the stage. The click route is its
		// own test below.
		expect(stageNode(w, 'st-done').attributes('title')).toBe('The decision document is missing.')
		expect(reason.classes()).toContain('cn-stages-widget__sr-only')
	})

	// THE COLOUR IS THE POINT. A refused stage used to render in exactly the grey
	// of a stage that is merely further down the process, so the one the person
	// was aiming at was the faintest thing on the strip.
	it('marks the refused stage so it looks refused', async () => {
		allowActions([BLOCKED])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(stageNode(w, 'st-done').classes()).toContain('cn-timeline-stages__stage--blocked')
		// And not by colour alone: the indicator carries a mark as well.
		expect(stageNode(w, 'st-done').find('.cn-timeline-stages__alert').exists()).toBe(true)
	})

	// AND ONLY THAT STAGE. st-work has no action leading to it, which is a claim
	// about the process rather than a refusal about this record. If everything is
	// orange, nothing reads as refused.
	it('leaves a stage that is merely unreachable uncoloured', async () => {
		allowActions([BLOCKED])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBe('true')
		expect(stageNode(w, 'st-work').classes()).not.toContain('cn-timeline-stages__stage--blocked')
		expect(stageNode(w, 'st-work').find('.cn-timeline-stages__alert').exists()).toBe(false)
	})

	// NOR THE STAGE THE RECORD IS ON. A refusal painted on the place the record
	// already sits says no to a move nobody is making.
	it('never colours the current stage as refused', async () => {
		allowActions([BLOCKED])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(stageNode(w, 'st-new').attributes('aria-current')).toBe('step')
		expect(stageNode(w, 'st-new').classes()).not.toContain('cn-timeline-stages__stage--blocked')
		expect(stageNode(w, 'st-new').attributes('title')).toBeUndefined()
	})

	// A FAILED READ IS NOT A REFUSAL. It is the case where nobody answered, and
	// dressing it in the refusal colour would present a broken request as a
	// policy decision.
	it('does not colour a stage when the availability read failed', async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) {
				return Promise.resolve({ data: BLUEPRINT })
			}
			return Promise.reject(axiosError(500))
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-actions-error"]').exists()).toBe(true)
		expect(stageNode(w, 'st-work').classes()).not.toContain('cn-timeline-stages__stage--blocked')
		expect(stageNode(w, 'st-done').classes()).not.toContain('cn-timeline-stages__stage--blocked')
	})

	// The click still REFUSES THE MOVE, and still answers. The colour replaced
	// the printed sentence, not the behaviour behind it.
	it('still refuses the move and still says why when the refused stage is clicked', async () => {
		allowActions([BLOCKED])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		await stageNode(w, 'st-done').trigger('click')
		await flush()

		expect(axios.post).not.toHaveBeenCalled()
		expect(stageNode(w, 'st-new').attributes('aria-current')).toBe('step')
		const said = w.find('[data-testid="cn-stages-widget-blocked"]')
		expect(said.text()).toBe('The decision document is missing.')
		expect(said.attributes('role')).toBe('status')
	})

	// The keyboard route to the same answer, because a tooltip reaches neither a
	// keyboard nor a touch screen.
	it('answers an Enter on the refused stage too', async () => {
		allowActions([BLOCKED])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		await stageNode(w, 'st-done').trigger('keydown', { key: 'Enter' })
		await flush()

		expect(axios.post).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-stages-widget-blocked"]').text())
			.toBe('The decision document is missing.')
	})

	// The three refusals are three different claims and must not read alike.
	it('reads differently from an unreachable stage and from a failed read', async () => {
		allowActions([BLOCKED])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		// Blocked: the app's reason. Unreachable: the widget's wording. And no
		// claim at all that the availability read failed.
		expect(w.find('[data-testid="cn-stages-widget-reason-st-done"]').text())
			.toBe('The decision document is missing.')
		expect(w.find('[data-testid="cn-stages-widget-reason-st-work"]').text())
			.toBe('Not reachable from the current stage')
		expect(w.find('[data-testid="cn-stages-widget-actions-error"]').exists()).toBe(false)
	})

	it('says something when the blocked stage is clicked, rather than nothing', async () => {
		allowActions([BLOCKED])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-blocked"]').exists()).toBe(false)
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-blocked"]').text())
			.toBe('The decision document is missing.')
		expect(axios.post).not.toHaveBeenCalled()
	})

	// A guard that refuses without saying why still has to produce a sentence:
	// a dimmed stage that explains nothing is what this whole branch exists to
	// stop.
	it('falls back to its own words when the guard gave no reason', async () => {
		allowActions([{ action: 'beslissen', to: 'st-done', blocked: true }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-reason-st-done"]').text())
			.toBe('This move is not possible right now')
	})

	// FAILS CLOSED TWICE. The strip disables the stage, and the move method
	// refuses it as well, so no path through the component POSTs a transition a
	// guard has already refused.
	it('refuses the move even when the click arrives some other way', async () => {
		allowActions([BLOCKED])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		w.vm.onStageClick({ stage: { id: 'st-done' } })
		await flush()

		expect(axios.post).not.toHaveBeenCalled()
	})

	// A blocked move is still a move, so the stage is NOT absent from the
	// process: it keeps its place and only loses its click.
	it('leaves the stages an action really does reach alone', async () => {
		allowActions([BLOCKED, { action: 'start', to: 'st-work', description: 'Start work.' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBeUndefined()
		expect(w.find('[data-testid="cn-stages-widget-reason-st-work"]').text()).toBe('Start work.')
	})
})

describe('CnStagesWidget: before the allowed moves are known', () => {
	// NOT READ YET IS NOT "NO MOVES ALLOWED". Collapsing the two would leave
	// the strip clickable for the length of one request.
	it('blocks every stage until the actions have been read', async () => {
		let release
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) {
				return Promise.resolve({ data: BLUEPRINT })
			}
			return new Promise((resolve) => {
				release = () => resolve({ data: { actions: [{ action: 'start', to: 'st-work' }] } })
			})
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBe('true')
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()

		release()
		await flush()
		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBeUndefined()
	})

	it('blocks every stage when the lifecycle answers nothing at all', async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) {
				return Promise.resolve({ data: BLUEPRINT })
			}
			return Promise.reject(new Error('404'))
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBe('true')
		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBe('true')
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
	})
})

describe('CnStagesWidget: moving the record', () => {
	it('posts the action to the transition endpoint', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/objects/case-1/transition', { action: 'start' })
		expect(stageNode(w, 'st-work').attributes('aria-current')).toBe('step')
		expect(w.emitted('moved')[0][0]).toEqual({ stage: 'st-work', action: 'start' })
	})

	it('announces the move on the page refresh channel', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		axios.post.mockResolvedValue({ data: {} })
		const heard = jest.fn()
		subscribe('cn:page:refresh', heard)
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()
		unsubscribe('cn:page:refresh', heard)

		expect(heard).toHaveBeenCalled()
	})

	it('re-reads the allowed actions for the stage the record is now on', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()
		const before = axios.get.mock.calls.filter(([url]) => url.includes('available-actions')).length

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		expect(axios.get.mock.calls.filter(([url]) => url.includes('available-actions')).length).toBeGreaterThan(before)
	})

	it('shows OpenRegister’s refusal and stays on the stage', async () => {
		allowActions([{ action: 'close', to: 'st-done' }])
		axios.post.mockRejectedValue(axiosError(403, { error: 'Only a coordinator may close a case.' }))
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		await stageNode(w, 'st-done').trigger('click')
		await flush()

		const error = w.find('[data-testid="cn-stages-widget-error"]')
		expect(error.text()).toBe('Only a coordinator may close a case.')
		// A REFUSED POST IS AN ERROR CARD, not a warning: the server said no to
		// something that was attempted, where a warning is a move not offered in
		// the first place. `role="alert"` is no longer asserted here because the
		// card is no longer a paragraph of ours; NcNoteCard gives every `error`
		// card `role="alert"` itself, and the stub in tests/__mocks__ renders no
		// role at all, so asserting it here would only test the stub.
		expect(error.attributes('type')).toBe('error')
		expect(error.classes()).toContain('NcNoteCard')
		expect(stageNode(w, 'st-new').attributes('aria-current')).toBe('step')
		expect(w.emitted('moved')).toBeUndefined()
	})

	it('does nothing when the current stage is clicked', async () => {
		allowActions([{ action: 'back', to: 'st-new' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		await stageNode(w, 'st-new').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('drops the local stage once the re-read record agrees', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(w.vm.movedTo).toBe('st-work')

		w.context.value = { ...w.context.value, object: { id: 'case-1', caseType: 'ct-1', status: 'st-work' } }
		await flush()

		expect(w.vm.movedTo).toBeNull()
		expect(stageNode(w, 'st-work').attributes('aria-current')).toBe('step')
	})

	// A 200 IS NOT PROOF THE RECORD MOVED. A re-read record is authoritative
	// whatever it says, so a call the server accepted without moving anything
	// no longer leaves the strip claiming a stage forever.
	it('drops the local stage when the re-read record did not move after all', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(w.vm.movedTo).toBe('st-work')

		w.context.value = { ...w.context.value, object: { id: 'case-1', caseType: 'ct-1', status: 'st-new' } }
		await flush()

		expect(w.vm.movedTo).toBeNull()
		expect(stageNode(w, 'st-new').attributes('aria-current')).toBe('step')
	})
})

describe('CnStagesWidget: a transition that needs input', () => {
	const withInputs = [{
		action: 'close',
		to: 'st-done',
		inputs: [{ field: 'resultType', required: true }, { field: 'comment', required: false }],
	}]

	// ONE DIALOG, ONE INPUT VOCABULARY. `inputs` is what the schema declares
	// and what CnLifecycleActions already collects, so the timeline collects it
	// with the same dialog rather than a second one of its own.
	it('opens the shared transition dialog and sends nothing yet', async () => {
		allowActions(withInputs)
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		await stageNode(w, 'st-done').trigger('click')
		await flush()

		const dialog = w.findComponent(CnTransitionInputDialog)
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('transition').inputs).toEqual(withInputs[0].inputs)
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('posts the action with what the dialog collected', async () => {
		allowActions(withInputs)
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		w.findComponent(CnTransitionInputDialog).vm.$emit('confirm', { resultType: 'granted', comment: 'All in order.' })
		await flush()

		expect(axios.post).toHaveBeenCalledWith(
			'/apps/openregister/api/objects/case-1/transition',
			{ action: 'close', data: { resultType: 'granted', comment: 'All in order.' } },
		)
		expect(stageNode(w, 'st-done').attributes('aria-current')).toBe('step')
	})

	it('sends nothing when the dialog is cancelled', async () => {
		allowActions(withInputs)
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		w.findComponent(CnTransitionInputDialog).vm.$emit('close')
		await flush()

		expect(w.findComponent(CnTransitionInputDialog).exists()).toBe(false)
		expect(axios.post).not.toHaveBeenCalled()
		expect(stageNode(w, 'st-new').attributes('aria-current')).toBe('step')
	})

	it('posts straight away for an action that declares no inputs', async () => {
		allowActions([{ action: 'start', to: 'st-work', inputs: [] }])
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		expect(w.findComponent(CnTransitionInputDialog).exists()).toBe(false)
		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/objects/case-1/transition', { action: 'start' })
	})
})

describe('CnStagesWidget: what the strip says while it works', () => {
	// A MOVE INVALIDATES THE LIST THAT MADE IT. `busy` clears the moment the
	// POST resolves, and until the fresh action list lands the old one
	// describes the stage the record has LEFT.
	it('keeps every stage blocked until the fresh action list lands', async () => {
		allowActions([{ action: 'start', to: 'st-work' }, { action: 'close', to: 'st-done' }])
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		let release
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) {
				return Promise.resolve({ data: BLUEPRINT })
			}
			return new Promise((resolve) => {
				release = () => resolve({ data: { actions: [] } })
			})
		})

		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)

		// The POST resolved, but the fresh action list has not arrived, so the
		// list in hand still describes st-new. Nothing is clickable against it.
		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBe('true')
		await stageNode(w, 'st-done').trigger('click')
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)

		release()
		await flush()
		// And the focus stops survived the whole window.
		expect(stageNode(w, 'st-done').attributes('tabindex')).toBeDefined()
	})

	// NOT-A-MOVE IS NOT BLOCKED. The current stage carries `aria-current` and
	// nothing else: marking it disabled told a screen reader "you may not go
	// here" about the place the record already is.
	it('does not announce the current stage as blocked', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		const current = stageNode(w, 'st-new')
		expect(current.attributes('aria-current')).toBe('step')
		expect(current.attributes('aria-disabled')).toBeUndefined()
		expect(current.classes()).not.toContain('cn-timeline-stages__stage--disabled')
	})

	// A MOVE IN FLIGHT MUST NOT EAT THE FOCUS STOPS. `clickable` drives the
	// roving tabindex, so flipping it off while busy dropped a keyboard user's
	// focus to `body` with nothing to restore it to.
	it('keeps every focus stop while a move is running, and marks them busy', async () => {
		allowActions([{ action: 'start', to: 'st-work' }, { action: 'close', to: 'st-done' }])
		let settle
		axios.post.mockImplementation(() => new Promise((resolve) => {
			settle = () => resolve({ data: {} })
		}))
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		const before = w.findAll('.cn-timeline-stages__stage').map((n) => n.attributes('tabindex'))
		await stageNode(w, 'st-work').trigger('click')
		await nextTick()

		expect(w.vm.busy).toBe(true)
		expect(w.attributes('aria-busy')).toBe('true')
		expect(w.findAll('.cn-timeline-stages__stage').map((n) => n.attributes('tabindex'))).toEqual(before)
		expect(before.some((t) => t === '0')).toBe(true)
		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBe('true')

		await stageNode(w, 'st-done').trigger('click')
		expect(axios.post).toHaveBeenCalledTimes(1)

		settle()
		await flush()
	})
})

describe('CnStagesWidget: the field opt-in', () => {
	const FIELD = { kind: 'field' }

	/**
	 * Mount bound to a record whose id may live only in `@self`.
	 *
	 * @param {object} record The bound record.
	 * @param {object} context The object context, which may carry no id.
	 * @return {object} The wrapper.
	 */
	function mountWithContext(record, context) {
		const ctx = ref({ ...context, object: record })
		const wrapper = mount(CnStagesWidget, {
			props: { content: { currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: FIELD } },
			global: { provide: { cnObjectContext: ctx } },
		})
		wrapper.context = ctx
		return wrapper
	}

	// The field path is an EXPLICIT opt-in for a schema with no lifecycle, so
	// it asks OpenRegister nothing and offers every stage.
	it('asks for no actions and offers every stage', async () => {
		allowActions([])
		const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({ id: 'case-1', status: 'st-work' }),
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: FIELD })
		await flush()

		expect(axios.get.mock.calls.some(([url]) => url.includes('available-actions'))).toBe(false)
		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBeUndefined()

		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(fetchSpy.mock.calls.some(([, i]) => i && i.method === 'PUT')).toBe(true)
	})

	// A POST WHERE A PUT WAS MEANT CREATES A DUPLICATE AND REPORTS SUCCESS.
	// `saveObject` picks its verb on the presence of `id` alone, and an
	// OpenRegister record carries its id in `@self`.
	it('reads the id out of the @self envelope when the context carries none', async () => {
		allowActions([])
		const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({ id: 'case-1', status: 'st-work' }),
		})
		const w = mountWithContext(
			{ '@self': { id: 'case-1' }, caseType: 'ct-1', status: 'st-new' },
			{ objectId: '', register: 'dossiq', schema: 'case' },
		)
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		const put = fetchSpy.mock.calls.find(([, i]) => i && i.method === 'PUT')
		expect(put).toBeDefined()
		expect(fetchSpy.mock.calls.some(([, i]) => i && i.method === 'POST')).toBe(false)
		expect(String(put[0])).toContain('/objects/dossiq/case/case-1')
	})

	it('refuses the move rather than creating a duplicate when there is no id at all', async () => {
		allowActions([])
		const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) })
		const w = mountWithContext(
			{ caseType: 'ct-1', status: 'st-new' },
			{ objectId: '', register: 'dossiq', schema: 'case' },
		)
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		expect(fetchSpy.mock.calls.some(([, i]) => i && (i.method === 'POST' || i.method === 'PUT'))).toBe(false)
		expect(w.find('[data-testid="cn-stages-widget-error"]').text())
			.toBe('Cannot move: this record has no id, so the move would create a duplicate instead of updating it.')
		expect(w.emitted('moved')).toBeUndefined()
	})

	// OpenRegister REFUSES {}, [] and null on an object property, and says so
	// by rejecting the whole write.
	it('omits @self and the empty shapes OpenRegister refuses', async () => {
		allowActions([])
		const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({ id: 'case-1', status: 'st-work' }),
		})
		const w = mountWithContext(
			{
				'@self': { id: 'case-1', schema: 'case' },
				id: 'case-1',
				caseType: 'ct-1',
				status: 'st-new',
				applicant: {},
				documents: [],
				closedAt: null,
				reference: 'Z-2026-1',
			},
			{ objectId: 'case-1', register: 'dossiq', schema: 'case' },
		)
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		const [, init] = fetchSpy.mock.calls.find(([, i]) => i && i.method === 'PUT')
		const body = JSON.parse(init.body)
		expect(body).not.toHaveProperty('@self')
		expect(body).not.toHaveProperty('applicant')
		expect(body).not.toHaveProperty('closedAt')
		// An empty LIST travels: emptying it was a decision, and dropping it is
		// only safe if this PUT replaces rather than merges.
		expect(body.documents).toEqual([])
		expect(body).toMatchObject({ id: 'case-1', status: 'st-work', caseType: 'ct-1', reference: 'Z-2026-1' })
	})

	// A TYPO MUST NOT SELECT A MODE NOBODY ASKED FOR. An unrecognised kind
	// reads as read-only, which is the safe end of that mistake.
	it('is read only for a transition kind it does not know', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: { kind: 'lifecyle' } })
		await flush()

		expect(stageNode(w, 'st-work').attributes('tabindex')).toBeUndefined()
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
	})
})

describe('CnStagesWidget: a stage that cannot be chosen answers the click', () => {
	// A CLICK THAT DOES NOTHING READS AS BROKEN. CnTimelineStages emits no
	// `stage-click` for a disabled stage, by design, so the widget hears
	// `stage-blocked` instead and answers with the reason. Before this, a
	// pointer user clicked and learned nothing, ever.
	it('shows the reason on screen when a blocked stage is clicked', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-blocked"]').exists()).toBe(false)
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		const said = w.find('[data-testid="cn-stages-widget-blocked"]')
		expect(said.text()).toBe('Not reachable from the current stage')
		expect(said.attributes('role')).toBe('status')
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('answers a keyboard activation of a blocked stage too', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		await stageNode(w, 'st-done').trigger('keydown', { key: 'Enter' })
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-blocked"]').text()).toBe('Not reachable from the current stage')
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('uses the app’s own words when it gave any', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const w = mountWidget({
			currentField: 'status',
			stagesEndpoint: STAGES_ENDPOINT,
			transition: LIFECYCLE,
			unreachableReason: 'Not possible from here',
		})
		await flush()
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-blocked"]').text()).toBe('Not possible from here')
	})

	it('clears what it said once a real move starts', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()
		await stageNode(w, 'st-done').trigger('click')
		await flush()
		expect(w.find('[data-testid="cn-stages-widget-blocked"]').exists()).toBe(true)

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-blocked"]').exists()).toBe(false)
	})
})

describe('CnStagesWidget: a failed read is not a policy decision', () => {
	/**
	 * Answer `/available-actions` with a status, and the blueprint normally.
	 *
	 * @param {number} status The HTTP status to fail with.
	 * @return {void}
	 */
	function failActionsWith(status) {
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) {
				return Promise.resolve({ data: BLUEPRINT })
			}
			return Promise.reject(axiosError(status))
		})
	}

	// A 500 IS NOT AN ANSWER. Swallowing it into an empty list made every stage
	// disabled with the reason "not reachable from the current stage", which
	// states confidently something nobody checked.
	it('says the guard could not be checked, rather than claiming every stage is unreachable', async () => {
		failActionsWith(500)
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-actions-error"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-stages-widget-reason-st-work"]').text())
			.toBe('Could not check whether this stage can be reached')
		expect(w.find('[data-testid="cn-stages-widget-reason-st-work"]').text())
			.not.toBe('Not reachable from the current stage')
	})

	it('blocks every move when the read failed', async () => {
		failActionsWith(500)
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBe('true')
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
	})

	// A 404 IS AN ANSWER: the schema declares no lifecycle. That is "no moves",
	// not "something broke", so it must not raise the failure notice.
	it('treats a missing lifecycle as no moves, not as a failure', async () => {
		failActionsWith(404)
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-actions-error"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-stages-widget-reason-st-work"]').text())
			.toBe('Not reachable from the current stage')
	})
})

// HISTORY EXPLAINS ITSELF. On a live case the first stage sat under a green,
// completed circle carrying "Not possible from the current status", which reads
// as something having gone wrong with something that already happened.
describe('CnStagesWidget: a stage the record has already passed', () => {
	/** The record has moved on: it sits on the second of three stages. */
	const ON_SECOND = { id: 'case-1', caseType: 'ct-1', status: 'st-work' }

	it('says nothing about a stage that is behind the record', async () => {
		allowActions([{ action: 'close', to: 'st-done' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE }, ON_SECOND)
		await flush()

		expect(stageNode(w, 'st-new').classes()).toContain('cn-timeline-stages__stage--completed')
		expect(w.find('[data-testid="cn-stages-widget-reason-st-new"]').exists()).toBe(false)
		expect(stageNode(w, 'st-new').attributes('title')).toBeUndefined()
	})

	it('says nothing about it under a configured wording either', async () => {
		allowActions([{ action: 'close', to: 'st-done' }])
		const w = mountWidget({
			currentField: 'status',
			stagesEndpoint: STAGES_ENDPOINT,
			transition: LIFECYCLE,
			unreachableReason: 'Niet mogelijk vanaf de huidige status',
		}, ON_SECOND)
		await flush()

		expect(w.text()).not.toContain('Niet mogelijk vanaf de huidige status')
	})

	// AND IT IS STILL SILENT WHEN NOTHING COULD BE READ. The card says the read
	// failed, once; a stage the record has left does not repeat it.
	it('says nothing about it when the availability read failed', async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) {
				return Promise.resolve({ data: BLUEPRINT })
			}
			return Promise.reject(axiosError(500))
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE }, ON_SECOND)
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-actions-error"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-stages-widget-reason-st-new"]').exists()).toBe(false)
	})

	// A PAST STAGE AN ACTION REACHES IS A REOPEN, and that is a move like any
	// other: it keeps its click and its note. Silence is for the stages nothing
	// leads back to, not for every stage behind the record.
	it('leaves a past stage an action reaches alone', async () => {
		allowActions([{ action: 'reopen', to: 'st-new', description: 'Reopen the case.' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE }, ON_SECOND)
		await flush()

		expect(stageNode(w, 'st-new').attributes('aria-disabled')).toBeUndefined()
		expect(w.find('[data-testid="cn-stages-widget-reason-st-new"]').text()).toBe('Reopen the case.')
	})
})

// MESSAGES ARE NOTE CARDS, not loose prose under the strip. A coloured sentence
// with nothing around it reads as part of the record rather than as a message
// about it, which is how it looked on a live case.
describe('CnStagesWidget: how the widget says something', () => {
	it('answers a refused stage with a warning card', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		const said = w.find('[data-testid="cn-stages-widget-blocked"]')
		expect(said.classes()).toContain('NcNoteCard')
		// WARNING, the level Ruben named: a move that cannot be made is not a
		// broken instance.
		expect(said.attributes('type')).toBe('warning')
		// NcNoteCard gives a warning card `role="note"`, which is announced to
		// nobody, and this card is the answer to a click.
		expect(said.attributes('role')).toBe('status')
	})

	// A FAILED READ IS THE ONE THAT IS ACTUALLY BROKEN, so it is the one that
	// gets the error level. If it wore the warning colour, a guarded record and
	// an unreachable server would look like the same situation.
	it('reports a failed availability read as an error card', async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) {
				return Promise.resolve({ data: BLUEPRINT })
			}
			return Promise.reject(axiosError(500))
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		const failed = w.find('[data-testid="cn-stages-widget-actions-error"]')
		expect(failed.classes()).toContain('NcNoteCard')
		expect(failed.attributes('type')).toBe('error')
	})

	it('reports stages it could not load as an error card', async () => {
		axios.get.mockRejectedValue(axiosError(500))
		global.fetch.mockRejectedValue(new Error('nope'))
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		const failed = w.find('[data-testid="cn-stages-widget-load-error"]')
		expect(failed.exists()).toBe(true)
		expect(failed.attributes('type')).toBe('error')
	})
})

describe('CnStagesWidget: a list being replaced is not a list', () => {
	// THE STALE LIST MUST STOP BEING AUTHORITATIVE AT THE START OF THE REFETCH,
	// not when the replacement lands. Our own move is covered by `busy`, but a
	// move made ELSEWHERE (a second widget, CnLifecycleActions on the same
	// page, another user plus a refresh) reaches the recordStageId watcher with
	// `busy` false, and the old list kept driving the strip.
	it('disables every stage while the actions are being re-read after an outside move', async () => {
		allowActions([{ action: 'start', to: 'st-work' }, { action: 'close', to: 'st-done' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()
		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBeUndefined()

		// Hold the refetch open, then move the record from elsewhere.
		let release
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) {
				return Promise.resolve({ data: BLUEPRINT })
			}
			return new Promise((resolve) => {
				release = () => resolve({ data: { actions: [{ action: 'reopen', to: 'st-new' }] } })
			})
		})
		w.context.value = { ...w.context.value, object: { id: 'case-1', caseType: 'ct-1', status: 'st-done' } }
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBe('true')
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()

		release()
		await flush()
		expect(stageNode(w, 'st-new').attributes('aria-disabled')).toBeUndefined()
	})

	// AND IT MUST NOT CLAIM ANYTHING WHILE IT IS UNKNOWN. An empty map and an
	// unread list both disable every stage, so the difference only shows in
	// what the stage SAYS: "not reachable" is a claim, and nobody has checked.
	it('says nothing about a stage while the list is unknown', async () => {
		let release
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) {
				return Promise.resolve({ data: BLUEPRINT })
			}
			return new Promise((resolve) => {
				release = () => resolve({ data: { actions: [] } })
			})
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBe('true')
		expect(w.find('[data-testid="cn-stages-widget-reason-st-work"]').exists()).toBe(false)

		release()
		await flush()

		// Now the list IS known, and an absent stage is genuinely unreachable.
		expect(w.find('[data-testid="cn-stages-widget-reason-st-work"]').text())
			.toBe('Not reachable from the current stage')
	})
})

describe('CnStagesWidget — an endpoint whose token never resolves', () => {
	// A record without the field the url names collapses the token, so the read
	// is blocked — which used to look like "still loading" and never ended.
	it('stops loading once the record is here without the field the url needs', async () => {
		allowActions([])
		const w = mountWidget(
			{ stagesEndpoint: STAGES_ENDPOINT, currentField: 'status', transition: LIFECYCLE },
			// A record, but no `caseType` — so the url can never be built.
			{ id: 'case-1', status: 'st-new' },
		)
		await flush()

		expect(w.vm.stagesPending).toBe(false)
		expect(w.find('.cn-stages-widget__loading').exists()).toBe(false)
		// It was never asked, so no request went out with an empty segment.
		expect(axios.get.mock.calls.every(([url]) => !url.includes('case-types//'))).toBe(true)
	})

	it('says the stages cannot be read rather than claiming there are none', async () => {
		allowActions([])
		const w = mountWidget(
			{ stagesEndpoint: STAGES_ENDPOINT, currentField: 'status', transition: LIFECYCLE },
			{ id: 'case-1', status: 'st-new' },
		)
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-unaddressable"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-stages-widget-empty"]').exists()).toBe(false)
	})

	it('keeps waiting while the record itself has not arrived', async () => {
		allowActions([])
		const w = mountWidget(
			{ stagesEndpoint: STAGES_ENDPOINT, currentField: 'status', transition: LIFECYCLE },
			null,
		)
		await flush()

		// Nothing is wrong yet: the url resolves when the record lands.
		expect(w.vm.stagesPending).toBe(true)
		expect(w.find('[data-testid="cn-stages-widget-unaddressable"]').exists()).toBe(false)
	})

	it('renders the stages once the record brings the field', async () => {
		allowActions([])
		const w = mountWidget(
			{ stagesEndpoint: STAGES_ENDPOINT, currentField: 'status', transition: LIFECYCLE },
			{ id: 'case-1', status: 'st-new' },
		)
		await flush()
		expect(w.vm.stages).toHaveLength(0)

		w.context.value = { ...w.context.value, object: { id: 'case-1', caseType: 'ct-1', status: 'st-new' } }
		await flush()

		expect(w.vm.stagesPending).toBe(false)
		expect(w.vm.stages.map((s) => s.id)).toEqual(['st-new', 'st-work', 'st-done'])
	})
})
