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
