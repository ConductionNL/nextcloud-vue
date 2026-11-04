/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A checklist run stores where each answer was given (board DqInspectie
 * "Locatie bij elk antwoord").
 *
 * @spec openspec/changes/checklist-run-location/specs/checklist-run-location/spec.md#requirement-an-answer-carries-where-it-was-given
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnChecklistRunWidget from '../../src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue'
import { fetchReferenceObjects } from '../../src/utils/boardReferenceColumns.js'
import { captureLocation } from '../../src/utils/captureLocation.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))
jest.mock('../../src/composables/useHeldFileUpload.js', () => ({ __esModule: true, uploadHeldFiles: jest.fn() }))
jest.mock('../../src/utils/captureLocation.js', () => ({ __esModule: true, captureLocation: jest.fn() }))

const QUESTIONS = [
	{ id: 'q1', text: 'Clear?', type: 'yes_no', position: 1 },
	{ id: 'q2', text: 'Lights?', type: 'yes_no', position: 2 },
]

const CONTENT = {
	questions: { register: 'app', schema: 'question', orderField: 'position' },
	answers: { register: 'app', schema: 'answer', filter: { run: '@objectId' }, questionField: 'question', valueField: 'answer', create: { run: '@objectId' } },
	captureLocation: { field: 'location', goodAccuracy: 50 },
}

const FIX = { lat: 52, lng: 5, accuracy: 12, at: '2026-10-06T10:52:00Z' }

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

async function mountRun(content = CONTENT, answers = []) {
	fetchReferenceObjects.mockImplementation(async ({ schema }) => (schema === 'question' ? QUESTIONS : answers))
	const w = mount(CnChecklistRunWidget, {
		props: { content, objectId: 'run-1', objectData: { id: 'run-1' } },
		global: { stubs: { NcLoadingIcon: true } },
		attachTo: document.body,
	})
	await flush()
	return w
}

async function answerAndGoOn(w) {
	await w.find('[data-testid="cn-checklist-run-choice"]').setValue(true)
	await flush()
	await w.find('form').trigger('submit')
	await flush()
}

describe('CnChecklistRunWidget captureLocation', () => {
	beforeEach(() => {
		axios.post.mockReset()
		axios.patch.mockReset()
		captureLocation.mockReset()
		axios.post.mockResolvedValue({ data: { id: 'a-1' } })
		axios.patch.mockResolvedValue({ data: {} })
	})

	it('asks the device once when an answer changes and stores the fix', async () => {
		captureLocation.mockResolvedValue(FIX)
		const w = await mountRun()
		expect(captureLocation).not.toHaveBeenCalled()
		await w.find('[data-testid="cn-checklist-run-choice"]').setValue(true)
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[1].setValue(true)
		await flush()
		expect(captureLocation).toHaveBeenCalledTimes(1)
		expect(w.find('[data-testid="cn-geo-capture-line"]').text()).toContain('±12 m')
		await w.find('form').trigger('submit')
		await flush()
		expect(axios.post.mock.calls[0][1].location).toEqual({ ...FIX, low: false })
	})

	it('waits for the device before saving the page', async () => {
		let answer
		captureLocation.mockReturnValue(new Promise((resolve) => {
			answer = resolve
		}))
		const w = await mountRun()
		await answerAndGoOn(w)
		expect(axios.post).not.toHaveBeenCalled()
		answer(FIX)
		await flush()
		expect(axios.post.mock.calls[0][1].location).toMatchObject({ lat: 52 })
	})

	it('marks a rough fix low, and saves without a fix, holding nothing', async () => {
		captureLocation.mockResolvedValueOnce({ ...FIX, accuracy: 200 })
		const rough = await mountRun()
		await answerAndGoOn(rough)
		expect(axios.post.mock.calls[0][1].location.low).toBe(true)

		axios.post.mockClear()
		captureLocation.mockResolvedValueOnce(null)
		const none = await mountRun()
		await answerAndGoOn(none)
		expect(axios.post.mock.calls[0][1].location).toEqual({ low: true })
		expect(none.find('[data-testid="cn-checklist-run-question"]').text()).toContain('Lights?')
	})

	it('shows a stored place again and does not ask the device', async () => {
		const w = await mountRun(CONTENT, [{ id: 'a-1', question: 'q1', answer: 'yes', location: { ...FIX, low: false } }])
		expect(w.find('[data-testid="cn-geo-capture-line"]').text()).toContain('±12 m')
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[1].setValue(true)
		await flush()
		expect(captureLocation).not.toHaveBeenCalled()
	})

	it('writes the place into an answer on the open record', async () => {
		captureLocation.mockResolvedValue(FIX)
		const content = {
			questionsPath: 'sections',
			itemsKey: 'items',
			answersPath: 'answers',
			recordRegister: 'app',
			recordSchema: 'run',
			captureLocation: { field: 'location' },
		}
		fetchReferenceObjects.mockResolvedValue([])
		const w = mount(CnChecklistRunWidget, {
			props: { content, objectId: 'run-1', register: 'app', schema: 'run', objectData: { id: 'run-1', sections: [{ items: [{ id: 'q1', text: 'Clear?', type: 'yes_no' }] }] } },
			global: { stubs: { NcLoadingIcon: true } },
			attachTo: document.body,
		})
		await flush()
		await answerAndGoOn(w)
		expect(axios.patch.mock.calls[0][1].answers[0].location).toMatchObject({ lat: 52, low: false })
	})

	it('never asks the device without the key', async () => {
		const { captureLocation: _off, ...plain } = CONTENT
		const w = await mountRun(plain)
		await answerAndGoOn(w)
		expect(captureLocation).not.toHaveBeenCalled()
		expect(axios.post.mock.calls[0][1]).not.toHaveProperty('location')
	})
})
