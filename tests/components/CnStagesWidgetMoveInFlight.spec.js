/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStagesWidget while a move is in flight. A transition POST can take
 * seconds, and a strip that shows nothing until it returns reads as one that
 * never moved: testers reloaded the page and moved the case again. The
 * clicked stage shows a loading indicator, the others stay disabled, the move
 * is announced as it starts, and an input dialog stays open and busy until
 * the move has landed.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((path, params) => (params ? path.replace(/\{(\w+)\}/g, (_, k) => params[k]) : path)),
}))

import axios from '@nextcloud/axios'
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

const BLUEPRINT = {
	statusTypes: [
		{ id: 'st-new', name: 'Ontvangen', order: 1 },
		{ id: 'st-work', name: 'In behandeling', order: 2 },
		{ id: 'st-done', name: 'Afgehandeld', order: 3, isFinal: true },
	],
}

const CONTENT = {
	currentField: 'status',
	stagesEndpoint: {
		url: '/apps/dossiq/api/case-types/@object.caseType/blueprint',
		path: 'statusTypes',
		labelField: 'name',
		orderField: 'order',
	},
	transition: { kind: 'lifecycle' },
}

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
 * A POST that resolves only when the test says so.
 *
 * @return {{settle: Function, fail: Function}} The handles.
 */
function holdPost() {
	const handles = {}
	axios.post.mockImplementation(() => new Promise((resolve, reject) => {
		handles.settle = () => resolve({ data: {} })
		handles.fail = (error) => reject(error)
	}))
	return handles
}

/**
 * Mount the widget on a detail page bound to a case in its first stage.
 *
 * @return {object} The wrapper.
 */
function mountWidget() {
	const context = ref({
		objectId: 'case-1',
		object: { id: 'case-1', caseType: 'ct-1', status: 'st-new' },
		register: 'dossiq',
		schema: 'case',
	})
	return mount(CnStagesWidget, {
		props: { content: CONTENT },
		global: { provide: { cnObjectContext: context } },
	})
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

/**
 * The polite live region under the strip.
 *
 * @param {object} wrapper The widget wrapper.
 * @return {string} What it says.
 */
function liveRegion(wrapper) {
	return wrapper.find('[aria-live="polite"]').text()
}

beforeAll(() => {
	Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
	invalidateEndpointSourceCache()
	axios.get.mockReset()
	axios.post.mockReset()
})

describe('CnStagesWidget: a move in flight', () => {
	it('shows a loading indicator on the clicked stage only, and marks it busy', async () => {
		allowActions([{ action: 'start', to: 'st-work' }, { action: 'close', to: 'st-done' }])
		const post = holdPost()
		const w = mountWidget()
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await nextTick()

		const moving = w.findAll('[data-testid="cn-stages-widget-moving"]')
		expect(moving).toHaveLength(1)
		expect(stageNode(w, 'st-work').find('[data-testid="cn-stages-widget-moving"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-stages-widget-stage-st-work"]').attributes('aria-busy')).toBe('true')
		expect(stageNode(w, 'st-done').attributes('aria-disabled')).toBe('true')

		post.settle()
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-moving"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-stages-widget-stage-st-work"]').attributes('aria-busy')).toBeUndefined()
	})

	it('announces the move as it starts and again when it lands', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const post = holdPost()
		const w = mountWidget()
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await nextTick()
		expect(liveRegion(w)).toBe('Moving to In behandeling')

		post.settle()
		await flush()
		expect(liveRegion(w)).toBe('Moved to In behandeling')
	})

	it('clears the indicator and announces the refusal when the move fails', async () => {
		allowActions([{ action: 'start', to: 'st-work' }])
		const post = holdPost()
		const w = mountWidget()
		await flush()

		await stageNode(w, 'st-work').trigger('click')
		await nextTick()
		const error = new Error('Request failed with status code 422')
		error.response = { status: 422, data: { message: 'Not now.' } }
		post.fail(error)
		await flush()

		expect(w.find('[data-testid="cn-stages-widget-moving"]').exists()).toBe(false)
		expect(w.vm.busy).toBe(false)
		expect(liveRegion(w)).toBe(w.vm.moveError)
	})
})

describe('CnStagesWidget: the input dialog while the move runs', () => {
	const withInputs = [{ action: 'close', to: 'st-done', inputs: [{ field: 'resultType', required: true }] }]

	it('stays open and busy until the move lands, then closes', async () => {
		allowActions(withInputs)
		const post = holdPost()
		const w = mountWidget()
		await flush()
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		w.findComponent(CnTransitionInputDialog).vm.$emit('confirm', { resultType: 'granted' })
		await flush()

		const dialog = w.findComponent(CnTransitionInputDialog)
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('busy')).toBe(true)
		expect(axios.post).toHaveBeenCalledTimes(1)

		post.settle()
		await flush()
		expect(w.findComponent(CnTransitionInputDialog).exists()).toBe(false)
	})

	it('keeps the dialog open with the refusal in it when the move is refused', async () => {
		allowActions(withInputs)
		const post = holdPost()
		const w = mountWidget()
		await flush()
		await stageNode(w, 'st-done').trigger('click')
		await flush()

		w.findComponent(CnTransitionInputDialog).vm.$emit('confirm', { resultType: 'granted' })
		await flush()
		const error = new Error('Request failed with status code 400')
		error.response = { status: 400, data: { message: 'Pick another result.', fields: ['resultType'] } }
		post.fail(error)
		await flush()

		const dialog = w.findComponent(CnTransitionInputDialog)
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('busy')).toBe(false)
		expect(dialog.props('error')).not.toBe('')
		expect(dialog.props('fieldErrors')).toEqual(['resultType'])
		expect(w.find('[data-testid="cn-stages-widget-error"]').exists()).toBe(false)
	})
})
