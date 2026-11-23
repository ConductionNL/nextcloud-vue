/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnAiFeaturesWidget: a refusal is shown naming the feature and hermiq's gate,
 * a transport failure apart from it, a feature hermiq does not offer gets no
 * run, a failed read says the panel is incomplete, prompts are offered and
 * answered, and every suggestion ends in one oversight report.
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnAiFeaturesWidget from '../CnAiFeaturesWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/auth', () => ({ __esModule: true, getRequestToken: () => 'token' }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (path) => path }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const SUMMARY = { slug: 'document-summary', available: true, provider: 'Hermiq', residency: 'on-premise' }

const PROPS = {
	objectId: 'c-1',
	register: 'reg',
	schema: 'case',
	declaration: { typeField: 'caseType', typeSchema: 'caseType', field: 'aiFeatures', surface: 'case' },
	featuresEndpoint: '/apps/app/api/assistant/ai-features',
	featuresQueryKey: 'caseType[aiFeatures]',
	promptsEndpoint: '/apps/app/api/assistant/prompts',
	askEndpoint: '/apps/app/api/assistant/converse',
	decisionEndpoint: '/apps/app/api/ai/record-action',
	objectKey: 'caseId',
}

const stubs = {
	NcLoadingIcon: true,
	NcButton: { props: ['disabled', 'type', 'variant'], template: '<button v-bind="$attrs" :type="type || \'button\'" :disabled="disabled"><slot /></button>' },
	NcNoteCard: { props: ['type'], template: '<div class="note" v-bind="$attrs"><slot /></div>' },
	NcSelect: {
		props: ['options', 'modelValue', 'inputLabel', 'inputId'],
		emits: ['update:modelValue'],
		template: '<label><span>{{ inputLabel }}</span><select v-bind="$attrs" :id="inputId" @change="$emit(\'update:modelValue\', options.find((o) => o.id === $event.target.value) || null)"><option value="" /><option v-for="o in options" :key="o.id" :value="o.id">{{ o.label }}</option></select></label>',
	},
}

/**
 * Answer the reads: features and prompts as given, documents as one file.
 *
 * @param {object} answers `{features, prompts, featuresFail}`.
 */
function reads({ features = [SUMMARY], prompts = [], featuresFail = false } = {}) {
	axios.get.mockImplementation((url) => {
		if (url.endsWith('/objects/reg/case/c-1')) {
			return featuresFail ? Promise.reject(new Error('down')) : Promise.resolve({ data: { caseType: 'ct-1' } })
		}
		if (url.endsWith('/objects/reg/caseType/ct-1')) {
			return Promise.resolve({ data: { aiFeatures: Object.fromEntries(features.map((f) => [f.slug, 'case'])) } })
		}
		if (url.includes('/assistant/ai-features')) {
			return Promise.resolve({ data: { features } })
		}
		if (url.endsWith('/assistant/prompts')) {
			return Promise.resolve({ data: { prompts } })
		}
		if (url.endsWith('/files')) {
			return Promise.resolve({ data: { results: [{ id: 42, title: 'besluit.pdf' }] } })
		}
		return Promise.reject(new Error(`unexpected ${url}`))
	})
}

async function mountWidget(props = {}) {
	const wrapper = mount(CnAiFeaturesWidget, { props: { ...PROPS, ...props }, global: { stubs } })
	await flush()
	await flush()
	await flush()
	await wrapper.vm.$nextTick()
	return wrapper
}

const decisions = () => axios.post.mock.calls.filter(([url]) => url === '/apps/app/api/ai/record-action').map(([, body]) => body)

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
})

describe('CnAiFeaturesWidget', () => {
	it("renders a redaction refusal naming the feature and hermiq's gate", async () => {
		reads()
		axios.post.mockRejectedValue({ response: { status: 422, data: { error: 'The document is not redacted.', gate: 'redaction' } } })
		const wrapper = await mountWidget()
		await wrapper.find('select').setValue('42')
		await wrapper.find('form').trigger('submit')
		await flush()
		const note = wrapper.find('[data-testid="cn-ai-feature-refusal-document-summary"]')
		expect(note.text()).toContain('document-summary will not read a document that has not been redacted.')
		expect(note.text()).toContain('Gate: redaction')
	})

	it('labels the document picker', async () => {
		reads()
		const wrapper = await mountWidget()
		expect(wrapper.find('label').text()).toContain('Document')
	})

	it('refuses a run with no document before anything is sent', async () => {
		reads()
		const wrapper = await mountWidget()
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-ai-feature-refusal-document-summary"]').text()).toContain('no document was chosen')
	})

	it('shows a transport failure apart from a refusal', async () => {
		reads()
		axios.post.mockRejectedValue(new Error('Network Error'))
		const wrapper = await mountWidget()
		await wrapper.find('select').setValue('42')
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(wrapper.find('[data-testid="cn-ai-feature-failed-document-summary"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-ai-feature-refusal-document-summary"]').exists()).toBe(false)
	})

	it('offers no run for a feature hermiq does not offer, and reads no documents', async () => {
		reads({ features: [{ slug: 'triage', available: false }] })
		const wrapper = await mountWidget()
		expect(wrapper.find('form').exists()).toBe(false)
		expect(wrapper.text()).toContain('Unavailable: hermiq does not offer this feature here.')
		expect(axios.get.mock.calls.some(([url]) => url.endsWith('/files'))).toBe(false)
	})

	it('says the panel is incomplete when the features could not be read', async () => {
		reads({ featuresFail: true })
		const wrapper = await mountWidget()
		expect(wrapper.find('[data-testid="cn-ai-features-unreadable"]').exists()).toBe(true)
	})

	it("offers the prompts and shows the answer to one, or the assistant's refusal", async () => {
		reads({ features: [], prompts: [{ id: 'p-1', label: 'Vraag', prompt: 'Vraag?' }] })
		axios.post.mockResolvedValueOnce({ data: { reply: 'Ja.' } })
		const wrapper = await mountWidget()
		await wrapper.find('[data-testid="cn-ai-question-p-1"]').trigger('click')
		await flush()
		expect(axios.post.mock.calls[0]).toEqual(['/apps/app/api/assistant/converse', { caseId: 'c-1', message: 'Vraag?' }])
		expect(wrapper.find('[data-testid="cn-ai-question-answer"]').text()).toBe('Ja.')

		// The open answer is reported superseded first, then the question is asked.
		axios.post.mockResolvedValueOnce({ data: {} }).mockRejectedValueOnce({ response: { data: { error: 'Not now.' } } })
		await wrapper.find('[data-testid="cn-ai-question-p-1"]').trigger('click')
		await flush()
		expect(wrapper.find('[data-testid="cn-ai-question-failed"]').text()).toBe('Not now.')
	})

	it('renders no questions when none are offered', async () => {
		reads({ features: [] })
		const wrapper = await mountWidget()
		expect(wrapper.find('[data-testid="cn-ai-questions"]').exists()).toBe(false)
	})

	it('reports a used run output to the oversight trail', async () => {
		reads()
		axios.post.mockResolvedValue({ data: { output: 'Verleend.' } })
		const wrapper = await mountWidget()
		await wrapper.find('select').setValue('42')
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(wrapper.find('[data-testid="cn-ai-feature-output-document-summary"]').text()).toBe('Verleend.')
		await wrapper.find('[data-testid="cn-ai-feature-decision-document-summary-use"]').trigger('click')
		await flush()
		expect(decisions()).toHaveLength(1)
		expect(decisions()[0]).toMatchObject({ caseId: 'c-1', type: 'decision_support', userAction: 'accepted', suggestion: 'Verleend.', documentId: '42' })
	})

	it('reports an adapted answer with the version that was used', async () => {
		reads({ features: [], prompts: [{ id: 'p-1', label: 'Vraag', prompt: 'Vraag?' }] })
		axios.post.mockResolvedValue({ data: { reply: 'Ja.' } })
		const wrapper = await mountWidget()
		await wrapper.find('[data-testid="cn-ai-question-p-1"]').trigger('click')
		await flush()
		await wrapper.find('[data-testid="cn-ai-question-decision-adapt"]').trigger('click')
		await wrapper.find('[data-testid="cn-ai-question-decision-draft"]').setValue('Ja, mits.')
		await wrapper.find('[data-testid="cn-ai-question-decision-use-adapted"]').trigger('click')
		await flush()
		expect(decisions()[0]).toMatchObject({ type: 'qa', userAction: 'modified', suggestion: 'Ja.', actualValue: 'Ja, mits.', prompt: 'Vraag?' })
	})

	it('reports an answer nobody acted on as superseded by the next question, then closed', async () => {
		reads({ features: [], prompts: [{ id: 'p-1', label: 'Vraag', prompt: 'Vraag?' }] })
		axios.post.mockResolvedValueOnce({ data: { reply: 'Eerste.' } }).mockResolvedValueOnce({ data: {} }).mockResolvedValue({ data: { reply: 'Tweede.' } })
		const wrapper = await mountWidget()
		await wrapper.find('[data-testid="cn-ai-question-p-1"]').trigger('click')
		await flush()
		await wrapper.find('[data-testid="cn-ai-question-p-1"]').trigger('click')
		await flush()
		wrapper.unmount()
		await flush()
		expect(decisions()).toHaveLength(2)
		expect(decisions()[0]).toMatchObject({ userAction: 'ignored', unusedBecause: 'superseded', suggestion: 'Eerste.' })
		expect(decisions()[1]).toMatchObject({ userAction: 'ignored', unusedBecause: 'closed' })
	})
})

describe('CnObjectSidebar built-in', () => {
	it('resolves the ai-features widget type', () => {
		const fs = require('fs')
		const path = require('path')
		const source = fs.readFileSync(path.resolve(__dirname, '../../CnObjectSidebar/CnObjectSidebar.vue'), 'utf8')
		expect(source).toMatch(/'ai-features': CnAiFeaturesWidget/)
	})
})
