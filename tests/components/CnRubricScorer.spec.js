/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRubricScorer — the `rubric-scorer` widget (abstract-rubric-scorer).
 *
 * Guarded: one fieldset and legend per criterion; stored scores preselected
 * and totalled; one save writes the scores, the total and the note; the submit
 * transition follows the save; requireAll holds the submit back and says how
 * many are left; createIfMissing finds or creates the scored record; a
 * read-only state disables every control; a refusal shows the server's words.
 *
 * @spec openspec/changes/abstract-rubric-scorer/specs/rubric-scorer/spec.md
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()
var mockPost = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
		patch: (...args) => mockPatch(...args),
		post: (...args) => mockPost(...args),
	},
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url, params = {}) => `/index.php${url.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? key)}`,
}))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { LIBRARY_WIDGET_KEYS } from '../../src/utils/libraryWidgetKeys.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnRubricScorer/index.js'

const CnRubricScorer = require('../../src/components/CnRubricScorer/CnRubricScorer.vue').default

/**
 * Let pending promises settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const BASE = '/index.php/apps/openregister/api/objects/school'

const rubric = {
	id: 'rub-1',
	name: 'Essay',
	criteria: [
		{ criterionId: 'arg', label: 'Argument', weight: 2, levels: [{ levelId: 'weak', label: 'Weak', points: 1 }, { levelId: 'strong', label: 'Strong', points: 4 }] },
		{ criterionId: 'style', label: 'Style', weight: 1, levels: [{ levelId: 'poor', label: 'Poor', points: 0 }, { levelId: 'good', label: 'Good', points: 2 }] },
	],
}

const submission = { id: 'sub-1', assignmentId: 'as-1', rubricId: 'rub-1', lifecycle: 'submitted', rubricScores: [{ criterionId: 'arg', levelId: 'strong', points: 4 }] }

const MARKING = {
	rubric: { register: 'school', schema: 'rubric', id: '@object.rubricId' },
	field: 'rubricScores',
	totalField: 'proposedGrade',
	note: { field: 'feedback', label: 'Feedback' },
	submitAction: { transition: 'return', label: 'Return to the learner' },
	requireAll: true,
	readOnlyWhen: { field: 'lifecycle', in: ['returned'] },
}

/**
 * Mount the scorer on a record.
 *
 * @param {object} content The widget content.
 * @param {object} [object] The page object.
 * @return {object} The wrapper.
 */
function mountScorer(content, object = submission) {
	mockGet.mockImplementation((url) => (url === `${BASE}/rubric/rub-1`
		? Promise.resolve({ data: rubric })
		: Promise.reject(new Error(`unexpected GET ${url}`))))
	return mount(CnRubricScorer, {
		props: { content, objectData: object, objectId: object.id, register: 'school', schema: 'submission' },
	})
}

/**
 * Pick a level.
 *
 * @param {object} wrapper The wrapper.
 * @param {string} levelId The level.
 * @return {Promise<void>}
 */
async function pick(wrapper, levelId) {
	await wrapper.find(`input[type="radio"][value="${levelId}"]`).setValue(true)
}

/**
 * The button with this text.
 *
 * @param {object} wrapper The wrapper.
 * @param {string} text The text.
 * @return {object|undefined} The button.
 */
function button(wrapper, text) {
	return wrapper.findAll('.NcButton').find((b) => b.text() === text)
}

describe('CnRubricScorer', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockPost.mockReset()
	})

	it('registers `rubric-scorer` as a content-only library widget', () => {
		expect(getWidgetTypeEntry('rubric-scorer').renderer).toBe(CnRubricScorer)
		expect(isContentOnlyWidgetDef({ type: 'rubric-scorer' })).toBe(true)
		expect(LIBRARY_WIDGET_KEYS).toContain('rubric-scorer')
	})

	it('draws one fieldset and legend per criterion, with one radio group each', async () => {
		const wrapper = mountScorer(MARKING)
		await flush()
		const fieldsets = wrapper.findAll('fieldset')
		expect(fieldsets).toHaveLength(2)
		expect(fieldsets[0].find('legend').text()).toContain('Argument')
		const names = new Set(wrapper.findAll('input[type="radio"]').map((r) => r.attributes('name')))
		expect(names.size).toBe(2)
		expect(fieldsets[1].text()).toContain('Good')
		expect(fieldsets[1].text()).toContain('2 points')
	})

	it('preselects the stored scores and totals them', async () => {
		const wrapper = mountScorer(MARKING)
		await flush()
		expect(wrapper.find('input[value="strong"]').element.checked).toBe(true)
		expect(wrapper.find('.cn-rubric-scorer__total').text()).toContain('4 of 6')
	})

	it('holds the submit back until every criterion is scored, and says how many are left', async () => {
		const wrapper = mountScorer(MARKING)
		await flush()
		expect(button(wrapper, 'Return to the learner').attributes('disabled')).toBeDefined()
		expect(wrapper.text()).toContain('1 criterion still to score')
		await pick(wrapper, 'good')
		expect(button(wrapper, 'Return to the learner').attributes('disabled')).toBeUndefined()
	})

	it('saves the scores, the total and the note in one PATCH, then runs the transition', async () => {
		mockPatch.mockResolvedValue({ data: { ...submission } })
		mockPost.mockResolvedValue({ data: {} })
		const wrapper = mountScorer(MARKING)
		await flush()
		await pick(wrapper, 'good')
		await wrapper.find('textarea').setValue('Well argued.')
		await button(wrapper, 'Return to the learner').trigger('click')
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPatch).toHaveBeenCalledWith(`${BASE}/submission/sub-1`, {
			rubricScores: [
				{ criterionId: 'arg', levelId: 'strong', points: 4 },
				{ criterionId: 'style', levelId: 'good', points: 2 },
			],
			proposedGrade: 6,
			feedback: 'Well argued.',
		})
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/sub-1/transition', { action: 'return' })
		expect(wrapper.emitted('saved')).toBeTruthy()
	})

	it('saves without the transition from the save button', async () => {
		mockPatch.mockResolvedValue({ data: { ...submission } })
		const wrapper = mountScorer(MARKING)
		await flush()
		await button(wrapper, 'Save').trigger('click')
		await flush()
		expect(mockPatch).toHaveBeenCalledTimes(1)
		expect(mockPost).not.toHaveBeenCalled()
	})

	it('shows the server refusal and keeps the choices', async () => {
		mockPatch.mockRejectedValue({ response: { data: { error: 'Marking has closed' } } })
		const wrapper = mountScorer(MARKING)
		await flush()
		await button(wrapper, 'Save').trigger('click')
		await flush()
		expect(wrapper.text()).toContain('Marking has closed')
		expect(wrapper.find('input[value="strong"]').element.checked).toBe(true)
	})

	it('disables every control in a read-only state', async () => {
		const wrapper = mountScorer(MARKING, { ...submission, lifecycle: 'returned' })
		await flush()
		expect(wrapper.findAll('input[type="radio"]').every((r) => r.element.disabled)).toBe(true)
		expect(button(wrapper, 'Save')).toBeUndefined()
	})

	it('creates the scored record when none exists yet, then submits it', async () => {
		const content = {
			rubric: { register: 'school', schema: 'rubric', id: '@object.rubricId' },
			field: 'rubricScores',
			totalField: 'totalScore',
			submitAction: { transition: 'submit', label: 'Submit' },
			createIfMissing: {
				register: 'school',
				schema: 'self-assessment',
				filter: { submissionId: '@objectId' },
				values: { submissionId: '@objectId', assignmentId: '@object.assignmentId' },
			},
		}
		mockGet.mockImplementation((url) => {
			if (url === `${BASE}/rubric/rub-1`) {
				return Promise.resolve({ data: rubric })
			}
			if (url === `${BASE}/self-assessment`) {
				return Promise.resolve({ data: { results: [], total: 0 } })
			}
			return Promise.reject(new Error(`unexpected GET ${url}`))
		})
		mockPost.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/self-assessment') ? { id: 'sa-1' } : {} }))
		const wrapper = mount(CnRubricScorer, {
			props: { content, objectData: { ...submission, rubricScores: [] }, objectId: 'sub-1', register: 'school', schema: 'submission' },
		})
		await flush()
		expect(mockGet).toHaveBeenCalledWith(`${BASE}/self-assessment`, { params: { submissionId: 'sub-1', _limit: 1 } })
		await pick(wrapper, 'weak')
		await button(wrapper, 'Submit').trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith(`${BASE}/self-assessment`, {
			submissionId: 'sub-1',
			assignmentId: 'as-1',
			rubricScores: [{ criterionId: 'arg', levelId: 'weak', points: 1 }],
			totalScore: 1,
		})
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/sa-1/transition', { action: 'submit' })
	})
})
