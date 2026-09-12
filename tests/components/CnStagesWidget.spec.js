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
		if (url.includes('available-actions')) return Promise.resolve({ data: { actions } })
		if (url.includes('blueprint')) return Promise.resolve({ data: BLUEPRINT })
		return Promise.reject(new Error('unexpected GET ' + url))
	})
}

/**
 * Answer the GET reads by url.
 *
 * @param {object} answers Url fragment to response body.
 * @return {void}
 */
function answerGets(answers) {
	axios.get.mockImplementation((url) => {
		const hit = Object.keys(answers).find((fragment) => url.includes(fragment))
		if (!hit) return Promise.reject(new Error('unexpected GET ' + url))
		const body = answers[hit]
		return body instanceof Error ? Promise.reject(body) : Promise.resolve({ data: body })
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
	if (jest.isMockFunction(global.fetch)) global.fetch.mockReset()
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

	it('says why a stage cannot be chosen, for a screen reader', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		const reason = w.find('[data-testid="cn-stages-widget-reason-st-done"]')
		expect(reason.text()).toBe('Not reachable from the current stage')
		expect(reason.classes()).toContain('cn-stages-widget__sr-only')
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
		allowActions([{ action: 'close', to: 'st-done', description: 'Closes the case.', requires: 'A decision document.' }])
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		const note = w.find('[data-testid="cn-stages-widget-reason-st-done"]')
		expect(note.text()).toBe('Closes the case. A decision document.')
		expect(note.classes()).toContain('cn-stages-widget__reason')
	})

	// NOT READ YET IS NOT "NO MOVES ALLOWED". Collapsing the two would leave
	// the strip clickable for the length of one request.
	it('blocks every stage until the actions have been read', async () => {
		let release
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) return Promise.resolve({ data: BLUEPRINT })
			return new Promise((resolve) => { release = () => resolve({ data: { actions: [{ action: 'start', to: 'st-work' }] } }) })
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
			if (url.includes('blueprint')) return Promise.resolve({ data: BLUEPRINT })
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
		axios.post.mockRejectedValue({ response: { status: 403, data: { error: 'Only a coordinator may close a case.' } } })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: LIFECYCLE })
		await flush()

		await stageNode(w, 'st-done').trigger('click')
		await flush()

		const error = w.find('[data-testid="cn-stages-widget-error"]')
		expect(error.text()).toBe('Only a coordinator may close a case.')
		expect(error.attributes('role')).toBe('alert')
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
			if (url.includes('blueprint')) return Promise.resolve({ data: BLUEPRINT })
			return new Promise((resolve) => { release = () => resolve({ data: { actions: [] } }) })
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
		axios.post.mockImplementation(() => new Promise((resolve) => { settle = () => resolve({ data: {} }) }))
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
			ok: true, json: async () => ({ id: 'case-1', status: 'st-work' }),
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
			ok: true, json: async () => ({ id: 'case-1', status: 'st-work' }),
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
			ok: true, json: async () => ({ id: 'case-1', status: 'st-work' }),
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
		expect(body).not.toHaveProperty('documents')
		expect(body).not.toHaveProperty('closedAt')
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
