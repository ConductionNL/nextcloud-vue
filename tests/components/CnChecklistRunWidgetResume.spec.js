/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChecklistRunWidget as board DqInspectie draws a run in progress: it opens
 * at the page of the last answered question (`startAt: "lastAnswered"`), a
 * question answered so that its photo rule does not apply shows no photo
 * control, and the note label is 14px semibold.
 *
 * @spec openspec/changes/checklist-run-resumes-at-last-answer/specs/checklist-run-resumes-at-last-answer/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))
jest.mock('../../src/composables/useHeldFileUpload.js', () => ({ __esModule: true, uploadHeldFiles: jest.fn() }))

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import { nextTick } from 'vue'
import CnChecklistRunWidget from '../../src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue'
import { fetchReferenceObjects } from '../../src/utils/boardReferenceColumns.js'

const item = (n, photoRequired = 'nooit') => ({ id: `i${n}`, order: n, label: `Question ${n}`, responseType: 'yes_no_na', photoRequired })

const RUN = {
	id: 'run-7',
	templateSnapshot: {
		name: 'Fire safety',
		sections: [{ order: 1, name: 'Escape routes', items: [item(1), item(2), item(3, 'if_no'), item(4, 'if_no'), item(5), item(6)] }],
	},
	responses: [
		{ itemId: 'i1', value: 'ja' },
		{ itemId: 'i2', value: 'ja' },
		{ itemId: 'i3', value: 'nee', comment: 'Bikes in the hall' },
		{ itemId: 'i4', value: 'ja' },
	],
	photos: [],
}

const CONTENT = {
	record: { register: 'app', schema: 'run', filter: { status: 'in_execution' } },
	questionsPath: 'templateSnapshot.sections',
	itemsKey: 'items',
	fields: { id: 'id', text: 'label', type: 'responseType', photoRequired: 'photoRequired' },
	photoRequiredValues: { nooit: 'never', if_no: { whenAnswer: 'nee' } },
	choiceValues: { yes: 'ja', no: 'nee', na: 'nvt' },
	answersPath: 'responses',
	answerKey: 'itemId',
	answerFields: { value: 'value', note: 'comment', photos: 'photos' },
	recordPhotosField: 'photos',
	pageSize: 2,
}

/** Let the reads settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

/**
 * Mount the run on a page without a record.
 *
 * @param {object} content The content.
 * @return {object} The wrapper.
 */
function mountRun(content) {
	return mount(CnChecklistRunWidget, {
		props: { content },
		global: { stubs: { NcLoadingIcon: true } },
		attachTo: document.body,
	})
}

const position = (w) => w.find('[data-testid="cn-checklist-run-position"]').text()
const photoTitles = (w) => w.findAll('[data-testid="cn-checklist-run-photos"]').map((p) => p.find('strong').text())

describe('CnChecklistRunWidget resumes as drawn', () => {
	beforeEach(() => {
		fetchReferenceObjects.mockReset()
		globalThis.OC = { ...(globalThis.OC || {}), getCurrentUser: () => ({ uid: 'pieter' }) }
	})

	it('opens at the page of the last answered question with startAt lastAnswered', async () => {
		fetchReferenceObjects.mockResolvedValue([RUN])
		const w = mountRun({ ...CONTENT, startAt: 'lastAnswered' })
		await flush()
		expect(position(w)).toMatch(/^Question 3 of 6/)
		w.unmount()
	})

	it('opens at the first page with startAt lastAnswered when nothing is answered', async () => {
		fetchReferenceObjects.mockResolvedValue([{ ...RUN, responses: [] }])
		const w = mountRun({ ...CONTENT, startAt: 'lastAnswered' })
		await flush()
		expect(position(w)).toMatch(/^Question 1 of 6/)
		w.unmount()
	})

	it('shows no photo control for a question answered so its photo rule does not apply', async () => {
		fetchReferenceObjects.mockResolvedValue([RUN])
		const w = mountRun({ ...CONTENT, startAt: 'lastAnswered' })
		await flush()
		// i3 is answered "nee" and needs its photo; i4 is answered "ja".
		expect(photoTitles(w)).toHaveLength(1)
		await w.findAll('[data-testid="cn-checklist-run-choice"]').filter((r) => r.element.value === 'nee')[1].setValue(true)
		expect(photoTitles(w)).toHaveLength(2)
		w.unmount()
	})

	it('keeps the photo control of an unanswered question and of one that holds photos', async () => {
		const held = { ...RUN, responses: [...RUN.responses.slice(0, 3), { itemId: 'i4', value: 'ja', photos: [12] }] }
		fetchReferenceObjects.mockResolvedValue([held])
		const w = mountRun({ ...CONTENT, startAt: 'lastAnswered' })
		await flush()
		expect(photoTitles(w)).toHaveLength(2)
		w.unmount()
		fetchReferenceObjects.mockResolvedValue([{ ...RUN, responses: RUN.responses.slice(0, 2) }])
		const open = mountRun({ ...CONTENT, startAt: 'firstOpen' })
		await flush()
		expect(position(open)).toMatch(/^Question 3 of 6/)
		expect(photoTitles(open)).toHaveLength(2)
		open.unmount()
	})

	it('sets the note label at 14px semibold, over a theme label weight', () => {
		const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue'), 'utf8')
		const css = sfc.replace(/\/\*[\s\S]*?\*\//g, '')
		const at = css.indexOf('\n.cn-checklist-run__note-label {')
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('font-size: 14px')
		expect(body).toContain('font-weight: 600 !important')
	})
})
