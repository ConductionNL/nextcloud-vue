/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChecklistRunWidget as board LqLlToetsMaken draws a timed run: the time left
 * follows the record's deadline, the saved line, and a button that finishes from
 * any page.
 *
 * @spec openspec/changes/checklist-run-deadline/specs/checklist-run-deadline/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), patch: jest.fn(), put: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))
jest.mock('../../src/composables/useHeldFileUpload.js', () => ({ __esModule: true, uploadHeldFiles: jest.fn() }))

import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnChecklistRunWidget from '../../src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue'

const NOW = new Date(2026, 9, 8, 10, 0, 0).getTime()
const inSeconds = (seconds) => new Date(NOW + seconds * 1000).toISOString()

const question = (n, required = false) => ({ id: `q${n}`, order: n, text: `Question ${n}`, type: 'text', required })

const CONTENT = {
	questionsPath: 'questions',
	fields: { id: 'id', text: 'text', type: 'type', required: 'required' },
	answersPath: 'answers',
	answerKey: 'question',
	answerFields: { value: 'value' },
	allowNote: false,
	allowPhotos: false,
	deadlineField: 'deadlineAt',
}

/**
 * @param {object} [content] Content on top of the base.
 * @param {object} [record] Fields on top of the record.
 * @return {object} The mounted run.
 */
function mountRun(content = {}, record = {}) {
	return mount(CnChecklistRunWidget, {
		props: {
			content: { ...CONTENT, ...content },
			objectId: 'run-1',
			register: 'app',
			schema: 'run',
			objectData: {
				id: 'run-1',
				questions: [question(1), question(2, true), question(3)],
				answers: [],
				deadlineAt: inSeconds(1122),
				...record,
			},
		},
		global: { stubs: { NcLoadingIcon: true, NcButton: { props: ['disabled', 'type'], emits: ['click'], template: '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' } } },
		attachTo: document.body,
	})
}

const timeLeft = (w) => w.find('[data-testid="cn-checklist-run-time-left"]')
const saved = (w) => w.find('[data-testid="cn-checklist-run-saved"]')
const position = (w) => w.find('[data-testid="cn-checklist-run-position"]').text()
const nextButton = (w) => w.find('[data-testid="cn-checklist-run-next"]')
const submitButton = (w) => w.find('[data-testid="cn-checklist-run-submit"]')
const live = (w) => w.find('.cn-checklist-run__live').text()

/**
 * Move the clock and let the timer and its saves run.
 *
 * @param {number} ms The milliseconds.
 * @return {Promise<void>}
 */
async function advance(ms) {
	jest.advanceTimersByTime(ms)
	await flushPromises()
	await nextTick()
}

describe('CnChecklistRunWidget with a deadline', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		jest.setSystemTime(NOW)
		axios.patch.mockReset()
		axios.put.mockReset()
		axios.post.mockReset()
		const ok = { data: { answers: [] } }
		axios.patch.mockResolvedValue(ok)
		axios.put.mockResolvedValue(ok)
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('shows no timer, saved line or submit button unless asked', async () => {
		const w = mountRun({ deadlineField: undefined })
		await flushPromises()
		expect(timeLeft(w).exists()).toBe(false)
		expect(saved(w).exists()).toBe(false)
		expect(submitButton(w).exists()).toBe(false)
		expect(jest.getTimerCount()).toBe(0)
	})

	it('shows the time left from the record, as a timer that does not speak every second', async () => {
		const w = mountRun()
		await flushPromises()
		expect(timeLeft(w).text()).toBe('Time left: 18:42')
		expect(timeLeft(w).attributes('role')).toBe('timer')
		expect(timeLeft(w).attributes('aria-live')).toBe('off')
		await advance(2000)
		expect(timeLeft(w).text()).toBe('Time left: 18:40')
	})

	it('reads from the clock, so it stays right after the tab slept', async () => {
		const w = mountRun()
		await flushPromises()
		jest.setSystemTime(NOW + 600000)
		await advance(1000)
		expect(timeLeft(w).text()).toBe('Time left: 08:41')
	})

	it('takes its words from timeLeftText, and shows hours from an hour', async () => {
		const w = mountRun({ timeLeftText: 'Resterende tijd: {time}' }, { deadlineAt: inSeconds(3845) })
		await flushPromises()
		expect(timeLeft(w).text()).toBe('Resterende tijd: 1:04:05')
	})

	it('follows a wrong device clock through serverNowField', async () => {
		const w = mountRun({ serverNowField: 'serverTime' }, { serverTime: inSeconds(-600), deadlineAt: inSeconds(0) })
		await flushPromises()
		expect(timeLeft(w).text()).toBe('Time left: 10:00')
	})

	it('warns once at the warning mark and once at the last minute', async () => {
		const w = mountRun({}, { deadlineAt: inSeconds(302) })
		await flushPromises()
		expect(timeLeft(w).classes()).not.toContain('cn-checklist-run__time-left--warning')
		expect(live(w)).toBe('')
		await advance(3000)
		expect(timeLeft(w).classes()).toContain('cn-checklist-run__time-left--warning')
		expect(live(w)).toBe('Time left: 05:00')
		await advance(5000)
		expect(live(w)).toBe('Time left: 05:00')
		await advance(236000)
		expect(live(w)).toBe('Time left: 01:00')
	})

	it('saves the open answer and finishes at zero, with required questions open', async () => {
		const w = mountRun({}, { deadlineAt: inSeconds(3) })
		await flushPromises()
		await w.find('input[type="text"], textarea').setValue('late answer')
		await advance(3000)
		expect(axios.patch.mock.calls.length + axios.put.mock.calls.length).toBe(1)
		expect(w.emitted('finished')).toHaveLength(1)
		expect(w.emitted('finished')[0][0].reason).toBe('deadline')
		await advance(5000)
		expect(w.emitted('finished')).toHaveLength(1)
		expect(jest.getTimerCount()).toBe(0)
	})

	it('stays open when that save fails, says why, and finishes on the next try', async () => {
		axios.patch.mockRejectedValueOnce(new Error('offline'))
		axios.put.mockRejectedValueOnce(new Error('offline'))
		const w = mountRun({}, { deadlineAt: inSeconds(1) })
		await flushPromises()
		await w.find('input[type="text"], textarea').setValue('late answer')
		await advance(1000)
		expect(w.emitted('finished')).toBeUndefined()
		expect(w.find('[data-testid="cn-checklist-run-save-error"]').exists()).toBe(true)
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(w.emitted('finished')[0][0].reason).toBe('deadline')
	})

	it('finishes at once when the deadline passed before the page opened', async () => {
		const w = mountRun({}, { deadlineAt: inSeconds(-60) })
		await flushPromises()
		expect(timeLeft(w).text()).toBe('Time left: 00:00')
		expect(w.emitted('finished')).toHaveLength(1)
	})

	it('stops the timer on unmount', async () => {
		const w = mountRun()
		await flushPromises()
		w.unmount()
		expect(jest.getTimerCount()).toBe(0)
	})

	it('finishes a timed run once, and nothing moves after it', async () => {
		const w = mountRun({ submitLabel: 'Hand in' }, { questions: [question(1)] })
		await flushPromises()
		await submitButton(w).trigger('click')
		await flushPromises()
		await nextTick()
		expect(w.emitted('finished')[0][0].reason).toBe('user')
		expect(submitButton(w).attributes('disabled')).toBeDefined()
		await w.vm.finish()
		expect(w.emitted('finished')).toHaveLength(1)
		expect(jest.getTimerCount()).toBe(0)
	})

	describe('savedText', () => {
		it('says saved only while nothing is unsaved and something is answered', async () => {
			const w = mountRun({ savedText: 'Je antwoorden zijn opgeslagen' })
			await flushPromises()
			expect(saved(w).exists()).toBe(false)
			await w.find('input[type="text"], textarea').setValue('an answer')
			expect(saved(w).exists()).toBe(false)
			await w.find('form').trigger('submit')
			await flushPromises()
			await nextTick()
			expect(saved(w).text()).toBe('Je antwoorden zijn opgeslagen')
			expect(saved(w).attributes('role')).toBe('status')
		})

		it('does not say saved after a failed save', async () => {
			axios.patch.mockRejectedValue(new Error('offline'))
			axios.put.mockRejectedValue(new Error('offline'))
			const w = mountRun({ savedText: 'Saved' })
			await flushPromises()
			await w.find('input[type="text"], textarea').setValue('an answer')
			await w.find('form').trigger('submit')
			await flushPromises()
			await nextTick()
			expect(saved(w).exists()).toBe(false)
		})

		it('says saved for answers already in the record', async () => {
			const w = mountRun({ savedText: 'Saved' }, { answers: [{ question: 'q1', value: 'before' }] })
			await flushPromises()
			await nextTick()
			expect(saved(w).exists()).toBe(true)
		})
	})

	describe('submitLabel', () => {
		const answered = [{ question: 'q2', value: 'yes' }]

		it('finishes from the first page, saving what is open', async () => {
			const w = mountRun({ submitLabel: 'Toets inleveren' }, { answers: answered })
			await flushPromises()
			expect(submitButton(w).text()).toBe('Toets inleveren')
			await w.find('input[type="text"], textarea').setValue('an answer')
			await submitButton(w).trigger('click')
			await flushPromises()
			expect(axios.patch.mock.calls.length + axios.put.mock.calls.length).toBe(1)
			expect(w.emitted('finished')).toHaveLength(1)
		})

		it('opens the page of a required question without an answer', async () => {
			const w = mountRun({ submitLabel: 'Toets inleveren' })
			await flushPromises()
			await submitButton(w).trigger('click')
			await flushPromises()
			await nextTick()
			expect(w.emitted('finished')).toBeUndefined()
			expect(position(w)).toBe('Question 2 of 3')
		})

		it('leaves no Finish on the last page, and Enter there does not hand in', async () => {
			const w = mountRun({ submitLabel: 'Toets inleveren' }, { answers: answered, questions: [question(1)] })
			await flushPromises()
			expect(nextButton(w).exists()).toBe(false)
			await w.find('form').trigger('submit')
			await flushPromises()
			expect(w.emitted('finished')).toBeUndefined()
		})

		it('keeps Finish without it', async () => {
			const w = mountRun({ deadlineField: undefined }, { questions: [question(1)] })
			await flushPromises()
			expect(nextButton(w).text()).toBe('Finish')
			await w.find('form').trigger('submit')
			await flushPromises()
			expect(w.emitted('finished')[0][0]).toMatchObject({ reason: 'user' })
		})
	})
})
