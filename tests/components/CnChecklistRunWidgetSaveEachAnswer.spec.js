/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChecklistRunWidget with `saveEachAnswer`: an answer saves a moment after
 * it is given, without Next. Changes in quick succession save once, a save
 * never runs twice at the same time, and without the option nothing saves
 * until the user moves on.
 *
 * @spec openspec/changes/checklist-run-save-each-answer/specs/checklist-run-widget/spec.md#requirement-a-run-can-save-each-answer-as-it-is-given
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))
jest.mock('../../src/composables/useHeldFileUpload.js', () => ({ __esModule: true, uploadHeldFiles: jest.fn() }))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnChecklistRunWidget from '../../src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue'
import { fetchReferenceObjects } from '../../src/utils/boardReferenceColumns.js'

const QUESTIONS = [
	{ id: 'q1', text: 'Are the escape routes clear?', type: 'yes_no', position: 1 },
	{ id: 'q2', text: 'Do the emergency lights work?', type: 'yes_no', position: 2 },
]

const CONTENT = {
	questions: { register: 'app', schema: 'question', filter: {}, orderField: 'position' },
	answers: { register: 'app', schema: 'answer', filter: { run: '@objectId' }, questionField: 'question', valueField: 'answer', noteField: 'note', create: { run: '@objectId' } },
	savedText: 'Your answers are saved',
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await wait(0)
		await nextTick()
	}
}

function mountRun(extra = {}) {
	return mount(CnChecklistRunWidget, {
		props: { content: { ...CONTENT, ...extra }, objectId: 'run-1', objectData: { id: 'run-1' } },
		global: { stubs: { NcLoadingIcon: true } },
		attachTo: document.body,
	})
}

beforeEach(() => {
	fetchReferenceObjects.mockReset()
	axios.post.mockReset()
	axios.patch.mockReset()
	fetchReferenceObjects.mockImplementation(async ({ schema }) => (schema === 'question' ? QUESTIONS : []))
	axios.post.mockResolvedValue({ data: { id: 'ans-new' } })
	axios.patch.mockResolvedValue({ data: {} })
})

describe('CnChecklistRunWidget saveEachAnswer', () => {
	it('🔴 saves an answer after the wait, without Next, and says it is saved', async () => {
		const w = mountRun({ saveEachAnswer: 20 })
		await flush()
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[1].setValue(true)
		expect(axios.post).not.toHaveBeenCalled()
		await wait(40)
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/objects/app/answer', { run: 'run-1', question: 'q1', answer: 'no', note: '' })
		expect(w.find('[data-testid="cn-checklist-run-saved"]').text()).toBe('Your answers are saved')
		w.unmount()
	})

	it('saves changes in quick succession once, with the last value', async () => {
		const w = mountRun({ saveEachAnswer: 30 })
		await flush()
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[1].setValue(true)
		await w.find('[data-testid="cn-checklist-run-note"]').setValue('Door')
		await w.find('[data-testid="cn-checklist-run-note"]').setValue('Door blocked')
		await wait(60)
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post.mock.calls[0][1]).toEqual({ run: 'run-1', question: 'q1', answer: 'no', note: 'Door blocked' })
		w.unmount()
	})

	it('🔴 does not create the answer twice when the user moves on during a save', async () => {
		let release
		axios.post.mockImplementationOnce(() => new Promise((resolve) => {
			release = () => resolve({ data: { id: 'ans-new' } })
		}))
		const w = mountRun({ saveEachAnswer: 0 })
		await flush()
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[0].setValue(true)
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)
		await w.find('form').trigger('submit')
		await flush()
		release()
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(w.findAll('legend').map((l) => l.text())).toEqual(['Do the emergency lights work?'])
		w.unmount()
	})

	it('saves a pending answer when the widget goes away', async () => {
		const w = mountRun({ saveEachAnswer: 1000 })
		await flush()
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[0].setValue(true)
		w.unmount()
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)
	})

	it('keeps saving on Next only without the option', async () => {
		const w = mountRun()
		await flush()
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[0].setValue(true)
		await wait(900)
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
		await w.find('form').trigger('submit')
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)
		w.unmount()
	})
})
