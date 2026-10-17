/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChecklistRunWidget: a checklist answered a page of questions at a time
 * (board DqInspectie), answers saved one record per question through the
 * object API or an app action, photos through the object's file upload.
 *
 * @spec openspec/changes/checklist-run-widget/specs/checklist-run-widget/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))
jest.mock('../../src/composables/useHeldFileUpload.js', () => ({ __esModule: true, uploadHeldFiles: jest.fn() }))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnChecklistRunWidget from '../../src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue'
import { uploadHeldFiles } from '../../src/composables/useHeldFileUpload.js'
import { fetchReferenceObjects } from '../../src/utils/boardReferenceColumns.js'

const QUESTIONS = [
	{ id: 'q2', text: 'Do the emergency lights work?', type: 'yes_no', position: 2 },
	{ id: 'q1', text: 'Are the escape routes clear?', type: 'yes_no_na', required: true, position: 1 },
	{ id: 'q3', text: 'Which extinguisher type?', type: 'choice', options: ['Foam', { value: 'co2', label: 'CO2' }], position: 3 },
]

const CONTENT = {
	questions: { register: 'app', schema: 'question', filter: { checklist: '@object.checklist' }, orderField: 'position' },
	answers: {
		register: 'app',
		schema: 'answer',
		filter: { run: '@objectId' },
		questionField: 'question',
		valueField: 'answer',
		noteField: 'note',
		photosField: 'photos',
		create: { run: '@objectId' },
	},
	caption: '{title} version {version}',
}

const RUN = { id: 'run-1', checklist: 'fire', title: 'Fire safety', version: 3 }

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountRun(content = CONTENT, provide = {}) {
	return mount(CnChecklistRunWidget, {
		props: { content, objectId: 'run-1', objectData: RUN },
		global: { provide, stubs: { NcLoadingIcon: true } },
		attachTo: document.body,
	})
}

const legends = (w) => w.findAll('legend').map((l) => l.text().replace(/\s+/g, ' '))

beforeEach(() => {
	fetchReferenceObjects.mockReset()
	axios.post.mockReset()
	axios.patch.mockReset()
	uploadHeldFiles.mockReset()
	fetchReferenceObjects.mockImplementation(async ({ schema }) => (schema === 'question' ? QUESTIONS : []))
	axios.post.mockResolvedValue({ data: { id: 'ans-new' } })
	axios.patch.mockResolvedValue({ data: {} })
	uploadHeldFiles.mockResolvedValue({ uploaded: 1, failed: [], attached: { photos: ['ref-1'] } })
})

describe('CnChecklistRunWidget', () => {
	it('lists the questions with the filter resolved and shows the first one, in order, with its position', async () => {
		const w = mountRun()
		await flush()
		expect(fetchReferenceObjects).toHaveBeenCalledWith({ register: 'app', schema: 'question', filter: { checklist: 'fire' }, limit: 500 })
		expect(fetchReferenceObjects).toHaveBeenCalledWith({ register: 'app', schema: 'answer', filter: { run: 'run-1' }, limit: 500 })
		expect(legends(w)).toEqual(['Are the escape routes clear? * (required)'])
		expect(w.findAll('[data-testid="cn-checklist-run-choice"]')).toHaveLength(3)
		expect(w.find('[data-testid="cn-checklist-run-position"]').text()).toBe('Question 1 of 3 · Fire safety version 3')
		w.unmount()
	})

	it('keeps a required question until it is answered', async () => {
		const w = mountRun()
		await flush()
		await w.find('form').trigger('submit')
		await flush()
		expect(w.find('[data-testid="cn-checklist-run-missing"]').exists()).toBe(true)
		expect(legends(w)[0]).toContain('escape routes')
		expect(axios.post).not.toHaveBeenCalled()
		w.unmount()
	})

	it('creates the answer with the create fields on Next, moves on and puts focus on the position', async () => {
		const w = mountRun()
		await flush()
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[1].setValue(true)
		await w.find('[data-testid="cn-checklist-run-note"]').setValue('Door blocked')
		await w.find('form').trigger('submit')
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/objects/app/answer', { run: 'run-1', question: 'q1', answer: 'no', note: 'Door blocked' })
		expect(legends(w)).toEqual(['Do the emergency lights work?'])
		expect(document.activeElement?.getAttribute('data-testid')).toBe('cn-checklist-run-position')
		expect(w.find('[data-testid="cn-checklist-run-progress"]').attributes('aria-valuenow')).toBe('1')
		w.unmount()
	})

	it('prefills an existing answer and updates it, sending its held photo with the stored ones kept', async () => {
		fetchReferenceObjects.mockImplementation(async ({ schema }) => (schema === 'question'
			? QUESTIONS
			: [{ id: 'ans-1', question: 'q1', answer: 'yes', note: '', photos: ['old-ref'] }]))
		const w = mountRun()
		await flush()
		const radios = w.findAll('[data-testid="cn-checklist-run-choice"]')
		expect(radios[0].element.checked).toBe(true)
		await radios[1].setValue(true)
		const photo = new File(['x'], 'exit.jpg', { type: 'image/jpeg' })
		const input = w.find('[data-testid="cn-checklist-run-photo-input"]')
		Object.defineProperty(input.element, 'files', { value: [photo] })
		await input.trigger('change')
		expect(w.findAll('[data-testid="cn-checklist-run-photo"]').map((p) => p.text())).toEqual(['exit.jpg'])
		await w.find('form').trigger('submit')
		await flush()
		expect(axios.patch).toHaveBeenCalledWith('/apps/openregister/api/objects/app/answer/ans-1', { question: 'q1', answer: 'no', note: '' })
		expect(uploadHeldFiles).toHaveBeenCalledWith({ register: 'app', schema: 'answer', objectId: 'ans-1', held: { photos: [photo] }, kept: { photos: ['old-ref'] } })
		w.unmount()
	})

	it('hands each answer to saveAction instead, and draws no photo control then', async () => {
		const dispatch = jest.fn(async () => undefined)
		const content = { ...CONTENT, saveAction: { type: 'handler', handler: 'saveAnswer', args: ['@objectId'] } }
		const w = mountRun(content, { cnDispatchAction: dispatch })
		await flush()
		expect(w.find('[data-testid="cn-checklist-run-photos"]').exists()).toBe(false)
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[2].setValue(true)
		await w.find('form').trigger('submit')
		await flush()
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ handler: 'saveAnswer', args: ['run-1', { questionId: 'q1', value: 'na', note: '' }] }))
		expect(axios.post).not.toHaveBeenCalled()
		w.unmount()
	})

	it('shows pageSize questions per page and finishes on the last page', async () => {
		const dispatch = jest.fn(async () => undefined)
		const w = mountRun({ ...CONTENT, pageSize: 2, finishAction: { type: 'handler', handler: 'closeRun' } }, { cnDispatchAction: dispatch })
		await flush()
		expect(legends(w)).toHaveLength(2)
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[0].setValue(true)
		await w.find('form').trigger('submit')
		await flush()
		expect(legends(w)).toEqual(['Which extinguisher type?'])
		expect(w.findAll('[data-testid="cn-checklist-run-choice"]').map((c) => c.element.value)).toEqual(['Foam', 'co2'])
		expect(w.find('[data-testid="cn-checklist-run-next"]').text()).toBe('Finish')
		await w.find('form').trigger('submit')
		await flush()
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ handler: 'closeRun' }))
		expect(w.emitted('finished')[0][0]).toEqual({ answered: 1, total: 3 })
		w.unmount()
	})

	it('reads nothing while a filter token is unresolved', async () => {
		const w = mount(CnChecklistRunWidget, { props: { content: CONTENT, objectId: '', objectData: null }, global: { stubs: { NcLoadingIcon: true } } })
		await flush()
		expect(fetchReferenceObjects).not.toHaveBeenCalled()
		w.unmount()
	})
})

describe('CnChecklistRunWidget with the questions and answers inside the open record', () => {
	const RECORD_RUN = {
		id: 'run-9',
		templateVersion: 3,
		templateSnapshot: {
			name: 'Fire safety',
			sections: [
				{ order: 2, name: 'Extinguishers', items: [{ id: 'i3', order: 1, label: 'How many extinguishers?', responseType: 'getal' }] },
				{
					order: 1,
					name: 'Escape routes',
					items: [
						{ id: 'i2', order: 2, label: 'Which door type?', responseType: 'meerkeuze', choices: ['Fire door', 'Plain door'] },
						{ id: 'i1', order: 1, label: 'Are the escape routes clear?', responseType: 'yes_no_na', required: true },
					],
				},
			],
		},
		responses: [{ itemId: 'i1', value: 'ja', comment: 'Checked', photos: [11] }],
		photos: [{ id: 11 }],
	}

	const RECORD_CONTENT = {
		questionsPath: 'templateSnapshot.sections',
		itemsKey: 'items',
		fields: { id: 'id', text: 'label', type: 'responseType', options: 'choices', required: 'required', help: 'helpText' },
		typeMap: { yes_no_na: 'yes_no_na', text: 'text', getal: 'number', meerkeuze: 'choice', photo: 'photo', meting: 'number' },
		choiceValues: { yes: 'ja', no: 'nee', na: 'nvt' },
		answersPath: 'responses',
		answerKey: 'itemId',
		answerFields: { value: 'value', number: 'numericValue', choice: 'choice', note: 'comment', photos: 'photos', at: 'respondedAt' },
		recordPhotosField: 'photos',
		caption: '{templateSnapshot.name} version {templateVersion}',
	}

	function mountRecord(content = RECORD_CONTENT) {
		return mount(CnChecklistRunWidget, {
			props: { content, objectId: 'run-9', objectData: RECORD_RUN, register: 'app', schema: 'run' },
			global: { stubs: { NcLoadingIcon: true } },
			attachTo: document.body,
		})
	}

	it('reads the questions off the record, groups and items both in order, with the mapped types and stored values', async () => {
		const w = mountRecord()
		await flush()
		expect(fetchReferenceObjects).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-checklist-run-position"]').text()).toBe('Question 1 of 3 · Fire safety version 3')
		expect(w.find('[data-testid="cn-checklist-run-group"]').text()).toBe('Escape routes')
		expect(legends(w)[0]).toContain('Are the escape routes clear?')
		const radios = w.findAll('[data-testid="cn-checklist-run-choice"]')
		expect(radios.map((r) => r.element.value)).toEqual(['ja', 'nee', 'nvt'])
		expect(radios[0].element.checked).toBe(true)
		expect(w.find('[data-testid="cn-checklist-run-note"]').element.value).toBe('Checked')
		w.unmount()
	})

	it('writes the changed answers into the record\'s array with one update, by type', async () => {
		const w = mountRecord({ ...RECORD_CONTENT, pageSize: 3 })
		await flush()
		expect(w.find('[data-testid="cn-checklist-run-number"]').exists()).toBe(true)
		await w.findAll('[data-testid="cn-checklist-run-choice"]')[1].setValue(true)
		const choice = w.findAll('[data-testid="cn-checklist-run-choice"]').find((r) => r.element.value === 'Fire door')
		await choice.setValue(true)
		await w.find('[data-testid="cn-checklist-run-number"]').setValue('4')
		await w.find('form').trigger('submit')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
		expect(axios.patch).toHaveBeenCalledTimes(1)
		const [url, body] = axios.patch.mock.calls[0]
		expect(url).toBe('/apps/openregister/api/objects/app/run/run-9')
		const byItem = Object.fromEntries(body.responses.map((r) => [r.itemId, r]))
		expect(byItem.i1).toEqual(expect.objectContaining({ value: 'nee', comment: 'Checked', photos: [11] }))
		expect(byItem.i2).toEqual(expect.objectContaining({ choice: 'Fire door' }))
		expect(byItem.i3).toEqual(expect.objectContaining({ numericValue: 4 }))
		expect(typeof byItem.i3.respondedAt).toBe('string')
		w.unmount()
	})

	it('uploads a photo to the record\'s own files and puts its reference into the answer', async () => {
		uploadHeldFiles.mockResolvedValue({ uploaded: 1, failed: [], attached: { photos: [{ id: 11 }, { id: 42 }] } })
		const w = mountRecord()
		await flush()
		const photo = new File(['x'], 'route.jpg', { type: 'image/jpeg' })
		const input = w.find('[data-testid="cn-checklist-run-photo-input"]')
		Object.defineProperty(input.element, 'files', { value: [photo] })
		await input.trigger('change')
		await w.find('form').trigger('submit')
		await flush()
		expect(uploadHeldFiles).toHaveBeenCalledWith({ register: 'app', schema: 'run', objectId: 'run-9', held: { photos: [photo] }, kept: { photos: [{ id: 11 }] } })
		const body = axios.patch.mock.calls[0][1]
		expect(body.responses.find((r) => r.itemId === 'i1').photos).toEqual([11, 42])
		w.unmount()
	})
})
