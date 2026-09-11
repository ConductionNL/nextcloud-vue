/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStagesWidget: the record's stages as a placeable widget, where clicking a
 * stage moves the record there, and where a guard that blocks a move still
 * blocks it.
 *
 * The widget it replaces on dossiq's case page had one button per allowed
 * move, showed the reason a guard refused one, and asked for a comment and a
 * result before closing the case. These specs pin that each of those survives
 * the move to a generic, configured widget.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => p),
}))

import axios from '@nextcloud/axios'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnStagesWidget from '../../src/components/CnStagesWidget/CnStagesWidget.vue'
import CnStageMoveDialog from '../../src/dialogs/CnStageMoveDialog.vue'
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
	resultTypes: [
		{ id: 'rt-granted', name: 'Toegekend' },
		{ id: 'rt-refused', name: 'Afgewezen' },
	],
}

const STAGES_ENDPOINT = {
	url: '/apps/dossiq/api/case-types/@object.caseType/blueprint',
	path: 'statusTypes',
	labelField: 'name',
	descriptionField: 'description',
	orderField: 'order',
	finalField: 'isFinal',
	resultsPath: 'resultTypes',
}

const AVAILABILITY = {
	url: '/apps/dossiq/api/case/@objectId/available-transitions',
	path: 'transitions',
	stageField: 'toStatus',
	moveField: 'id',
	allowedField: 'guardsPassed',
	reasonField: 'failedGuards.0.failureMessage',
}

const ENDPOINT_TRANSITION = {
	kind: 'endpoint',
	url: '/apps/dossiq/api/case/@objectId/transition',
	bodyKey: 'transitionId',
	resultKey: 'resultTypeId',
	errorField: 'failedGuards.0.failureMessage',
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
		answerGets({ '/case-types/ct-1/blueprint': BLUEPRINT })
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
		expect(url).toContain('_order[order]=asc')
		expect(labels(w)).toEqual(['Ontvangen', 'In behandeling', 'Afgehandeld'])
	})

	it('waits for the record before querying with a record token', async () => {
		const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
		mountWidget({
			currentField: 'status',
			stagesSource: { register: 'dossiq', schema: 'statusType', filter: { caseType: '@object.caseType' } },
		}, null)
		await flush()

		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it('marks the record’s current stage, and the stages before it as done', async () => {
		answerGets({ blueprint: BLUEPRINT })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT }, { id: 'case-1', caseType: 'ct-1', status: 'st-work' })
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-current')).toBe('step')
		expect(stageNode(w, 'st-new').classes()).toContain('cn-timeline-stages__stage--completed')
		expect(stageNode(w, 'st-done').classes()).toContain('cn-timeline-stages__stage--upcoming')
	})

	it('is read only without a transition', async () => {
		answerGets({ blueprint: BLUEPRINT })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT })
		await flush()

		expect(stageNode(w, 'st-work').attributes('tabindex')).toBeUndefined()
		await stageNode(w, 'st-work').trigger('click')
		expect(axios.post).not.toHaveBeenCalled()
	})
})

describe('CnStagesWidget: moving the record', () => {
	it('saves the record with the clicked stage through the object store (field transition)', async () => {
		answerGets({ blueprint: BLUEPRINT })
		const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({ id: 'case-1', caseType: 'ct-1', status: 'st-work' }),
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: { kind: 'field' } })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		const [url, init] = fetchSpy.mock.calls.find(([, i]) => i && i.method === 'PUT')
		expect(String(url)).toContain('/objects/dossiq/case/case-1')
		expect(JSON.parse(init.body)).toMatchObject({ id: 'case-1', status: 'st-work', caseType: 'ct-1' })
		expect(stageNode(w, 'st-work').attributes('aria-current')).toBe('step')
		expect(w.emitted('moved')[0][0]).toEqual({ stage: 'st-work', move: 'st-work' })
	})

	it('sends the move to the transition endpoint with the move id (endpoint transition)', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': { transitions: [{ id: 'tr-1', toStatus: 'st-work', guardsPassed: true, failedGuards: [] }] },
		})
		axios.post.mockResolvedValue({ data: { status: 'st-work' } })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		expect(axios.post).toHaveBeenCalledWith('/apps/dossiq/api/case/case-1/transition', { transitionId: 'tr-1' })
		expect(stageNode(w, 'st-work').attributes('aria-current')).toBe('step')
	})

	it('announces the move on the page refresh channel', async () => {
		answerGets({ blueprint: BLUEPRINT })
		axios.post.mockResolvedValue({ data: {} })
		const heard = jest.fn()
		subscribe('cn:page:refresh', heard)
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: { kind: 'endpoint', url: '/api/move/@objectId' } })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()
		unsubscribe('cn:page:refresh', heard)

		expect(axios.post).toHaveBeenCalledWith('/api/move/case-1', { stage: 'st-work' })
		expect(heard).toHaveBeenCalled()
	})

	it('drops the local stage once the re-read record agrees', async () => {
		answerGets({ blueprint: BLUEPRINT })
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: { kind: 'endpoint', url: '/api/move' } })
		await flush()
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(w.vm.movedTo).toBe('st-work')

		w.context.value = { ...w.context.value, object: { id: 'case-1', caseType: 'ct-1', status: 'st-work' } }
		await flush()

		expect(w.vm.movedTo).toBeNull()
		expect(stageNode(w, 'st-work').attributes('aria-current')).toBe('step')
	})

	it('shows the server’s reason and stays on the stage when the move is refused', async () => {
		answerGets({ blueprint: BLUEPRINT })
		axios.post.mockRejectedValue({ response: { status: 409, data: { error: 'Transition is not available', failedGuards: [{ failureMessage: 'A decision document is missing.' }] } } })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: ENDPOINT_TRANSITION })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		const error = w.find('[data-testid="cn-stages-widget-error"]')
		expect(error.text()).toBe('A decision document is missing.')
		expect(error.attributes('role')).toBe('alert')
		expect(stageNode(w, 'st-new').attributes('aria-current')).toBe('step')
		expect(w.emitted('moved')).toBeUndefined()
	})

	it('does nothing when the current stage is clicked', async () => {
		answerGets({ blueprint: BLUEPRINT })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: { kind: 'endpoint', url: '/api/move' } })
		await flush()

		await stageNode(w, 'st-new').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
	})
})

describe('CnStagesWidget: guards', () => {
	const guarded = {
		transitions: [
			{ id: 'tr-1', toStatus: 'st-work', guardsPassed: false, failedGuards: [{ type: 'requiredDocument', failureMessage: 'Upload the application form first.' }] },
		],
	}

	it('renders a blocked stage disabled with its reason visible', async () => {
		answerGets({ blueprint: BLUEPRINT, 'available-transitions': guarded })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()

		const node = stageNode(w, 'st-work')
		expect(node.attributes('aria-disabled')).toBe('true')
		const reason = w.find('[data-testid="cn-stages-widget-reason-st-work"]')
		expect(reason.text()).toBe('Upload the application form first.')
		expect(reason.classes()).toContain('cn-stages-widget__reason')
	})

	it('sends nothing when a blocked stage is clicked', async () => {
		answerGets({ blueprint: BLUEPRINT, 'available-transitions': guarded })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await stageNode(w, 'st-work').trigger('keydown', { key: 'Enter' })
		await flush()

		expect(axios.post).not.toHaveBeenCalled()
		expect(w.findComponent(CnStageMoveDialog).exists()).toBe(false)
	})

	it('renders a stage the answer does not list disabled, with the reason for screen readers', async () => {
		answerGets({ blueprint: BLUEPRINT, 'available-transitions': guarded })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()

		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBe('true')
		const reason = w.find('[data-testid="cn-stages-widget-reason-st-done"]')
		expect(reason.text()).toBe('Not reachable from the current stage')
		expect(reason.classes()).toContain('cn-stages-widget__sr-only')
	})

	it('blocks every move when the availability read fails', async () => {
		answerGets({ blueprint: BLUEPRINT, 'available-transitions': new Error('500') })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-availability-error"]').exists()).toBe(true)
		// ASSERT THE REASON, NOT ONLY THE SILENCE. `moves` is null whenever the
		// read failed, so the disabled-because-unknown branch produces exactly
		// the same "no POST" as this one, and the test passed either way. This
		// sentence is written in the failed branch and nowhere else.
		expect(w.find('[data-testid="cn-stages-widget-reason-st-work"]').text())
			.toBe('Could not check whether this stage can be reached')
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('lets an open route win over a blocked one to the same stage', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': {
				transitions: [
					{ id: 'tr-a', toStatus: 'st-work', guardsPassed: false, failedGuards: [{ failureMessage: 'No.' }] },
					{ id: 'tr-b', toStatus: 'st-work', guardsPassed: true },
				],
			},
		})
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/apps/dossiq/api/case/case-1/transition', { transitionId: 'tr-b' })
	})
})

describe('CnStagesWidget: the confirm step', () => {
	it('moves at once when nothing is declared', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': { transitions: [{ id: 'tr-1', toStatus: 'st-work', guardsPassed: true }] },
		})
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		expect(w.findComponent(CnStageMoveDialog).exists()).toBe(false)
		expect(axios.post).toHaveBeenCalledTimes(1)
	})

	it('asks for a comment first when the move declares one, and sends it', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': { transitions: [{ id: 'tr-1', toStatus: 'st-work', guardsPassed: true, requiresComment: 'required' }] },
		})
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		const dialog = w.findComponent(CnStageMoveDialog)
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('commentMode')).toBe('required')
		expect(dialog.props('stageLabel')).toBe('In behandeling')
		expect(axios.post).not.toHaveBeenCalled()

		dialog.vm.$emit('confirm', { comment: 'Documents are complete.' })
		await flush()

		expect(axios.post).toHaveBeenCalledWith('/apps/dossiq/api/case/case-1/transition', { transitionId: 'tr-1', comment: 'Documents are complete.' })
		expect(w.findComponent(CnStageMoveDialog).exists()).toBe(false)
	})

	it('asks for a result when the target stage closes the record, and sends it', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': { transitions: [{ id: 'tr-close', toStatus: 'st-done', guardsPassed: true }] },
		})
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION }, { id: 'case-1', caseType: 'ct-1', status: 'st-work' })
		await flush()

		await stageNode(w, 'st-done').trigger('click')
		await flush()

		const dialog = w.findComponent(CnStageMoveDialog)
		expect(dialog.props('resultRequired')).toBe(true)
		expect(dialog.props('resultOptions')).toEqual([{ id: 'rt-granted', label: 'Toegekend' }, { id: 'rt-refused', label: 'Afgewezen' }])

		dialog.vm.$emit('confirm', { result: 'rt-granted' })
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/apps/dossiq/api/case/case-1/transition', { transitionId: 'tr-close', resultTypeId: 'rt-granted' })
	})

	it('keeps the dialog open and shows the refusal inside it', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': { transitions: [{ id: 'tr-1', toStatus: 'st-work', requiresComment: true }] },
		})
		axios.post.mockRejectedValue({ response: { data: { error: 'Could not execute transition' } } })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()
		await stageNode(w, 'st-work').trigger('click')
		await flush()

		w.findComponent(CnStageMoveDialog).vm.$emit('confirm', {})
		await flush()

		const dialog = w.findComponent(CnStageMoveDialog)
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('error')).toBe('Could not execute transition')
		expect(w.find('[data-testid="cn-stages-widget-error"]').exists()).toBe(false)
	})

	it('makes no move when the dialog is cancelled', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': { transitions: [{ id: 'tr-1', toStatus: 'st-work', requiresComment: 'optional' }] },
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()
		await stageNode(w, 'st-work').trigger('click')
		await flush()

		w.findComponent(CnStageMoveDialog).vm.$emit('close')
		await flush()

		expect(w.findComponent(CnStageMoveDialog).exists()).toBe(false)
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('confirms every move when set to always, with an optional comment', async () => {
		answerGets({ blueprint: BLUEPRINT })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: ENDPOINT_TRANSITION, confirm: 'always' })
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await flush()

		expect(w.findComponent(CnStageMoveDialog).props('commentMode')).toBe('optional')
		expect(axios.post).not.toHaveBeenCalled()
	})
})

describe('CnStagesWidget: the guard answer has a lifetime', () => {
	const openToWork = {
		transitions: [
			{ id: 'tr-work', toStatus: 'st-work', guardsPassed: true, failedGuards: [] },
			{ id: 'tr-close', toStatus: 'st-done', guardsPassed: true, failedGuards: [] },
		],
	}

	// A MOVE INVALIDATES THE MAP THAT MADE IT. `busy` clears the moment the
	// POST resolves, while the endpoint engine holds the PREVIOUS answer until
	// its refetch lands. In that window the widget rendered the old stage's
	// guard map against the new current stage, fully clickable, and a click
	// POSTed a move the server had just closed.
	it('keeps every stage blocked until the fresh availability answer lands', async () => {
		answerGets({ blueprint: BLUEPRINT, 'available-transitions': openToWork })
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()

		// Hold the refetch open, so the window under test stays open.
		let releaseAvailability
		axios.get.mockImplementation((url) => {
			if (url.includes('blueprint')) return Promise.resolve({ data: BLUEPRINT })
			return new Promise((resolve) => { releaseAvailability = () => resolve({ data: { transitions: [] } }) })
		})

		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)

		// The move landed and the strip is no longer busy, but the answer in
		// hand describes st-new, the stage the record has left.
		expect(w.vm.busy).toBe(false)
		expect(w.vm.awaitingGuards).toBe(true)
		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBe('true')
		await stageNode(w, 'st-done').trigger('click')
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)

		releaseAvailability()
		await flush()
		expect(w.vm.awaitingGuards).toBe(false)
	})

	// A 200 IS NOT PROOF THE RECORD MOVED. `movedTo` used to be cleared only
	// when the record's stage CHANGED, so a server that accepted the call and
	// left the status alone left the strip claiming a stage the record never
	// reached, for good, while availability described the real one.
	it('drops the local stage when the re-read record did not move after all', async () => {
		answerGets({ blueprint: BLUEPRINT })
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: { kind: 'endpoint', url: '/api/move' } })
		await flush()
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(w.vm.movedTo).toBe('st-work')

		// The page re-read the case and it is still on st-new.
		w.context.value = { ...w.context.value, object: { id: 'case-1', caseType: 'ct-1', status: 'st-new' } }
		await flush()

		expect(w.vm.movedTo).toBeNull()
		expect(stageNode(w, 'st-new').attributes('aria-current')).toBe('step')
		expect(stageNode(w, 'st-work').attributes('aria-current')).toBeUndefined()
	})

	// A GUARD THAT CANNOT BE READ MUST BLOCK. Reading "configured" as "has a
	// url" meant a typo in the key removed the guard entirely: every stage
	// clickable, nothing logged, nothing on screen.
	it('blocks every move when the availability block names no url', async () => {
		answerGets({ blueprint: BLUEPRINT })
		const w = mountWidget({
			currentField: 'status',
			stagesEndpoint: STAGES_ENDPOINT,
			availability: { uri: '/apps/dossiq/api/case/@objectId/available-transitions', path: 'transitions' },
			transition: ENDPOINT_TRANSITION,
		})
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBe('true')
		expect(w.find('[data-testid="cn-stages-widget-reason-st-work"]').text())
			.toBe('Could not check whether this stage can be reached')
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('leaves a widget with no availability block alone', async () => {
		answerGets({ blueprint: BLUEPRINT })
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: ENDPOINT_TRANSITION })
		await flush()

		expect(stageNode(w, 'st-work').attributes('aria-disabled')).toBeUndefined()
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(axios.post).toHaveBeenCalled()
	})
})

describe('CnStagesWidget: what the strip says while it works', () => {
	// NOT-A-MOVE IS NOT BLOCKED. The current stage used to carry
	// `aria-disabled="true"` alongside `aria-current="step"`, plus the disabled
	// class and a not-allowed cursor, which told a screen reader "you may not
	// go here" about the place the record already is.
	it('does not announce the current stage as blocked', async () => {
		answerGets({ blueprint: BLUEPRINT })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: { kind: 'endpoint', url: '/api/move' } })
		await flush()

		const current = stageNode(w, 'st-new')
		expect(current.attributes('aria-current')).toBe('step')
		expect(current.attributes('aria-disabled')).toBeUndefined()
		expect(current.classes()).not.toContain('cn-timeline-stages__stage--disabled')
		expect(w.find('[data-testid="cn-stages-widget-reason-st-new"]').exists()).toBe(false)
	})

	// A MOVE IN FLIGHT MUST NOT EAT THE FOCUS STOPS. `clickable` drives the
	// roving tabindex, so flipping it off while busy removed every stage's
	// tabindex and dropped a keyboard user's focus to `body`, with nothing to
	// restore it to.
	it('keeps every focus stop while a move is running, and marks them busy', async () => {
		answerGets({ blueprint: BLUEPRINT })
		let settle
		axios.post.mockImplementation(() => new Promise((resolve) => { settle = () => resolve({ data: {} }) }))
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: { kind: 'endpoint', url: '/api/move' } })
		await flush()

		const before = w.findAll('.cn-timeline-stages__stage').map((n) => n.attributes('tabindex'))
		await stageNode(w, 'st-work').trigger('click')
		await nextTick()

		expect(w.vm.busy).toBe(true)
		expect(w.attributes('aria-busy')).toBe('true')
		expect(w.findAll('.cn-timeline-stages__stage').map((n) => n.attributes('tabindex'))).toEqual(before)
		expect(before.some((t) => t === '0')).toBe(true)
		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBe('true')

		// A second click while the first is in flight sends nothing.
		await stageNode(w, 'st-done').trigger('click')
		expect(axios.post).toHaveBeenCalledTimes(1)

		settle()
		await flush()
	})
})

describe('CnStagesWidget: the field transition writes a record OpenRegister accepts', () => {
	/**
	 * Mount bound to a record whose id lives only in the `@self` envelope.
	 *
	 * @param {object} record The bound record.
	 * @param {object} context The object context, which may carry no id.
	 * @return {object} The wrapper.
	 */
	function mountWithContext(record, context) {
		const ctx = ref({ ...context, object: record })
		const wrapper = mount(CnStagesWidget, {
			props: { content: { currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, transition: { kind: 'field' } } },
			global: { provide: { cnObjectContext: ctx } },
		})
		wrapper.context = ctx
		return wrapper
	}

	// A POST WHERE A PUT WAS MEANT CREATES A DUPLICATE AND REPORTS SUCCESS.
	// `saveObject` picks its verb on the presence of `id` alone, and an
	// OpenRegister record carries its id in `@self`.
	it('reads the id out of the @self envelope when the context carries none', async () => {
		answerGets({ blueprint: BLUEPRINT })
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
		answerGets({ blueprint: BLUEPRINT })
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
		expect(stageNode(w, 'st-new').attributes('aria-current')).toBe('step')
	})

	// OpenRegister REFUSES {}, [] and null on an object property. Sending the
	// record straight back meant a case carrying one empty object property
	// could not change its stage at all, on the registry's DEFAULT transition.
	it('omits @self and the empty shapes OpenRegister refuses', async () => {
		answerGets({ blueprint: BLUEPRINT })
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
		expect(body).not.toHaveProperty('documents')
		expect(body).not.toHaveProperty('closedAt')
		expect(body).toMatchObject({ id: 'case-1', status: 'st-work', caseType: 'ct-1', reference: 'Z-2026-1' })
	})
})

describe('CnStagesWidget: what a move declares it needs is checked where it is sent', () => {
	// THE DIALOG'S DISABLED BUTTON IS NOT THE RULE, IT IS THE UI FOR THE RULE.
	// `performMove` used to take whatever the dialog handed it, so the guard
	// lived only where the button is drawn, and nothing enforced it on the path
	// that actually makes the request.
	it('sends nothing when a required comment is missing', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': { transitions: [{ id: 'tr-1', toStatus: 'st-work', requiresComment: 'required' }] },
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()
		await stageNode(w, 'st-work').trigger('click')
		await flush()
		expect(w.findComponent(CnStageMoveDialog).props('commentMode')).toBe('required')

		w.findComponent(CnStageMoveDialog).vm.$emit('confirm', { comment: '   ' })
		await flush()

		expect(axios.post).not.toHaveBeenCalled()
		const dialog = w.findComponent(CnStageMoveDialog)
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('error')).toBe('This move needs a comment')
		expect(w.emitted('moved')).toBeUndefined()
	})

	it('sends nothing when a required result is missing', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': { transitions: [{ id: 'tr-close', toStatus: 'st-done', requiresResult: 'required' }] },
		})
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		w.findComponent(CnStageMoveDialog).vm.$emit('confirm', {})
		await flush()

		expect(axios.post).not.toHaveBeenCalled()
		expect(w.findComponent(CnStageMoveDialog).props('error')).toBe('This move needs a result')
	})

	// An OPTIONAL comment is still optional. The re-check must not turn every
	// declaration into a requirement, which is the obvious way to overshoot.
	it('sends a move whose comment was only offered', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': { transitions: [{ id: 'tr-1', toStatus: 'st-work', requiresComment: 'optional' }] },
		})
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()
		await stageNode(w, 'st-work').trigger('click')
		await flush()

		w.findComponent(CnStageMoveDialog).vm.$emit('confirm', {})
		await flush()

		expect(axios.post).toHaveBeenCalledWith('/apps/dossiq/api/case/case-1/transition', { transitionId: 'tr-1' })
	})

	// A move declaring 'optional' must NOT force a result. Collapsed to a
	// boolean, `requiresResult: 'optional'` held the confirm until one was
	// picked.
	it('offers a result without requiring it when the move says optional', async () => {
		answerGets({
			blueprint: BLUEPRINT,
			'available-transitions': { transitions: [{ id: 'tr-close', toStatus: 'st-done', requiresResult: 'optional' }] },
		})
		axios.post.mockResolvedValue({ data: {} })
		const w = mountWidget({ currentField: 'status', stagesEndpoint: STAGES_ENDPOINT, availability: AVAILABILITY, transition: ENDPOINT_TRANSITION })
		await flush()
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		const dialog = w.findComponent(CnStageMoveDialog)
		expect(dialog.props('resultRequired')).toBe(false)
		expect(dialog.props('resultOptions')).toHaveLength(2)

		dialog.vm.$emit('confirm', {})
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/apps/dossiq/api/case/case-1/transition', { transitionId: 'tr-close' })
	})

	// A REQUIRED RESULT WITH NOTHING TO PICK IS A DEAD END: the dialog would
	// open with no picker and a confirm that can never be enabled. Say so at
	// the stage instead.
	it('blocks a move that needs a result when none is on offer', async () => {
		answerGets({
			blueprint: { statusTypes: BLUEPRINT.statusTypes },
			'available-transitions': { transitions: [{ id: 'tr-close', toStatus: 'st-done', requiresResult: 'required' }] },
		})
		const w = mountWidget({
			currentField: 'status',
			stagesEndpoint: { ...STAGES_ENDPOINT, resultsPath: '' },
			availability: AVAILABILITY,
			transition: ENDPOINT_TRANSITION,
		})
		await flush()

		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBe('true')
		expect(w.find('[data-testid="cn-stages-widget-reason-st-done"]').text())
			.toBe('This move needs a result, and none is on offer')
		await stageNode(w, 'st-done').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
		expect(w.findComponent(CnStageMoveDialog).exists()).toBe(false)
	})
})
