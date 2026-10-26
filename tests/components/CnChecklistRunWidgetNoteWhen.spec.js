/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChecklistRunWidget `noteWhen`: the note field shows under a question only
 * once its answer is one of the named values, or when it already holds a note
 * (board DqInspectie: a note under "Nee", none under "Ja").
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))
jest.mock('../../src/composables/useHeldFileUpload.js', () => ({ __esModule: true, uploadHeldFiles: jest.fn() }))

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnChecklistRunWidget from '../../src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue'
import { fetchReferenceObjects } from '../../src/utils/boardReferenceColumns.js'

const QUESTIONS = [{ id: 'q1', text: 'Are the escape routes clear?', type: 'yes_no_na', position: 1 }]
const CONTENT = {
	questions: { register: 'app', schema: 'question', orderField: 'position' },
	answers: { register: 'app', schema: 'answer', filter: { run: '@objectId' }, questionField: 'question', valueField: 'answer', noteField: 'note' },
}

/** Let the reads settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

/**
 * Mount the run.
 *
 * @param {object} content The content.
 * @return {object} The wrapper.
 */
function mountRun(content) {
	return mount(CnChecklistRunWidget, {
		props: { content, objectId: 'run-1', objectData: { id: 'run-1' } },
		global: { stubs: { NcLoadingIcon: true } },
		attachTo: document.body,
	})
}

const note = (w) => w.find('[data-testid="cn-checklist-run-note"]')

describe('CnChecklistRunWidget noteWhen', () => {
	beforeEach(() => {
		fetchReferenceObjects.mockReset()
	})

	it('shows the note only once the answer asks for one', async () => {
		fetchReferenceObjects.mockImplementation(async ({ schema }) => (schema === 'question' ? QUESTIONS : []))
		const w = mountRun({ ...CONTENT, noteWhen: { answers: ['no'] } })
		await flush()
		expect(note(w).exists()).toBe(false)
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[0].setValue(true)
		expect(note(w).exists()).toBe(false)
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[1].setValue(true)
		expect(note(w).exists()).toBe(true)
		w.unmount()
	})

	it('keeps a note that is already there, whatever the answer', async () => {
		fetchReferenceObjects.mockImplementation(async ({ schema }) => (schema === 'question' ? QUESTIONS : [{ id: 'a1', question: 'q1', answer: 'yes', note: 'Checked' }]))
		const w = mountRun({ ...CONTENT, noteWhen: { answers: ['no'] } })
		await flush()
		expect(note(w).element.value).toBe('Checked')
		w.unmount()
	})

	it('shows the note on every question without noteWhen', async () => {
		fetchReferenceObjects.mockImplementation(async ({ schema }) => (schema === 'question' ? QUESTIONS : []))
		const w = mountRun(CONTENT)
		await flush()
		expect(note(w).exists()).toBe(true)
		w.unmount()
	})
})
