/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRedactionEditor: redact a record's documents (board DqLakken; dossiq's
 * DocumentRedactionDialog and CaseRedactionView, filinq's anonymisation).
 *
 * @spec openspec/changes/redaction-editor/specs/redaction-editor/spec.md#requirement-a-reviewer-redacts-a-records-documents
 */
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import CnRedactionEditor from '../../src/components/CnRedactionEditor/CnRedactionEditor.vue'
import { redactionSegments } from '../../src/utils/redactionSegments.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const BASE = '/apps/dossiq/api/cases/{recordId}/redactions'
const CONFIG = {
	urls: { list: BASE, detect: `${BASE}/{documentRef}/detect`, check: `${BASE}/{documentRef}/check`, redact: `${BASE}/{documentRef}/redact`, upload: `${BASE}/{documentRef}/upload` },
	typeLabels: { PERSON: 'Name', BSN: 'BSN' },
	groundsPath: 'weigeringsgronden',
}

const TEXT = 'Henk Visser (BSN 123456782) vroeg om de stukken.'

const STUBS = {
	NcButton: { props: ['pressed', 'disabled', 'variant', 'size'], emits: ['click', 'update:pressed'], template: '<button :disabled="disabled" :data-pressed="String(!!pressed)" @click="$emit(\'click\'); $emit(\'update:pressed\', !pressed)"><slot /></button>' },
	NcTextField: { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' },
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options'], emits: ['update:modelValue'], template: '<div class="select" />' },
}

/**
 * Mount the editor and let it read.
 *
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The editor.
 */
async function mountEditor() {
	const w = mount(CnRedactionEditor, { props: { recordId: 'z-82', config: CONFIG }, global: { stubs: STUBS } })
	await flushPromises()
	return w
}

/**
 * Press a passage's verdict button.
 *
 * @param {import('@vue/test-utils').VueWrapper} w The editor.
 * @param {number} at The passage.
 * @param {string} verdict The verdict.
 * @return {Promise<void>}
 */
async function judge(w, at, verdict) {
	await w.find(`[data-testid="cn-redaction-verdict-${at}-${verdict}"]`).trigger('click')
}

const recordButton = (w) => w.find('[data-testid="cn-redaction-record"]')

describe('CnRedactionEditor', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		emit.mockReset()
		axios.get.mockResolvedValue({ data: { documents: [{ documentRef: 'd1', title: 'Verzoek', weigeringsgronden: ['5.1.2e'] }, { documentRef: 'd2', title: 'Besluit', redactedDocumentRef: 'r2', redaction: { entities: [{ type: 'PERSON', value: 'Anouk' }] } }] } })
		axios.post.mockImplementation((url) => {
			if (url.endsWith('/detect')) {
				return Promise.resolve({ data: { text: TEXT, redaction: { entities: [{ type: 'PERSON', value: 'Henk Visser' }, { type: 'BSN', value: '123456782', locked: true }] } } })
			}
			if (url.endsWith('/redact')) {
				return Promise.resolve({ data: { redactedDocumentRef: 'r1', redaction: {} } })
			}
			return Promise.resolve({ data: {} })
		})
	})

	it('reads the documents, detects the passages and marks them in the text', async () => {
		const w = await mountEditor()
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/dossiq/api/cases/z-82/redactions')
		expect(axios.post.mock.calls[0][0]).toBe('/nc/apps/dossiq/api/cases/z-82/redactions/d1/detect')
		expect(w.find('[data-testid="cn-redaction-position"]').text()).toContain('Document 1 of 2')
		expect(w.find('.cn-redaction__mark--open').text()).toBe('Henk Visser')
		expect(w.find('.cn-redaction__mark--accept').text()).toBe('123456782')
		expect(w.find('[data-testid="cn-redaction-passage-0"]').text()).toContain('Name: "Henk Visser"')
		expect(w.find('[data-testid="cn-redaction-passage-0"]').text()).toContain('5.1.2e')
		expect(w.find('[data-testid="cn-redaction-passage-1"]').text()).toContain('Always redacted by rule')
		expect(w.find('[data-testid="cn-redaction-verdict-1-skip"]').exists()).toBe(false)
	})

	it('records only once every passage is judged, checking before the copy', async () => {
		const w = await mountEditor()
		expect(recordButton(w).attributes('disabled')).toBeDefined()
		await judge(w, 0, 'accept')
		expect(recordButton(w).attributes('disabled')).toBeUndefined()
		await recordButton(w).trigger('click')
		await flushPromises()
		const posts = axios.post.mock.calls.map((c) => c[0].split('/').pop())
		expect(posts).toEqual(['detect', 'check', 'redact'])
		expect(axios.post.mock.calls[1][1]).toEqual({ entities: [{ type: 'PERSON', value: 'Henk Visser' }, { type: 'BSN', value: '123456782', locked: true }] })
		expect(w.find('[data-testid="cn-redaction-notice"]').exists()).toBe(true)
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', { reason: 'redaction' })
		expect(w.emitted('recorded')[0][0]).toEqual({ documentRef: 'd1', redactedDocumentRef: 'r1' })
	})

	it('sends an adjusted and a hand-added passage, and leaves a skipped one out', async () => {
		const w = await mountEditor()
		await judge(w, 0, 'skip')
		await w.find('[data-testid="cn-redaction-add"]').trigger('click')
		w.find('[data-testid="cn-redaction-type-2"]').findComponent({ name: 'NcSelect' }).vm.$emit('update:modelValue', { id: 'PERSON' })
		await w.find('[data-testid="cn-redaction-value-2"]').setValue('Visser')
		await recordButton(w).trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[1][1].entities).toEqual([{ type: 'BSN', value: '123456782', locked: true }, { type: 'PERSON', source: 'officer', value: 'Visser' }])
	})

	it('shows a refusal in the server\'s words and keeps the upload', async () => {
		axios.post.mockImplementation((url) => (url.endsWith('/detect')
			? Promise.resolve({ data: { text: TEXT, redaction: { entities: [{ type: 'PERSON', value: 'Henk Visser' }] } } })
			: Promise.reject({ response: { data: { message: 'Nobody checked these passages.' } } })))
		const w = await mountEditor()
		await judge(w, 0, 'accept')
		await recordButton(w).trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-redaction-error"]').text()).toBe('Nobody checked these passages.')
		expect(w.find('[data-testid="cn-redaction-upload"]').exists()).toBe(true)
	})

	it('opens a recorded document with its passages agreed and no detection', async () => {
		const w = await mountEditor()
		await w.find('[data-testid="cn-redaction-next"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-redaction-done"]').exists()).toBe(true)
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(recordButton(w).attributes('disabled')).toBeDefined()
	})

	it('marks the longest passage where passages overlap', () => {
		expect(redactionSegments('Henk Visser en Henk', [{ value: 'Henk', verdict: 'skip' }, { value: 'Henk Visser', verdict: 'accept' }])).toEqual([
			{ text: 'Henk Visser', verdict: 'accept' },
			{ text: ' en ', verdict: null },
			{ text: 'Henk', verdict: 'skip' },
		])
	})
})
