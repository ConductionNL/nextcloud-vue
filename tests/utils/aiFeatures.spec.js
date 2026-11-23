/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The reads and the run behind CnAiFeaturesWidget: an undeclared type asks
 * nobody, a failed read is null and not an empty list, a feature hermiq does
 * not offer is unavailable and never local, a run without a document is
 * refused before any request, and a refusal is a sentence naming the feature.
 */
import axios from '@nextcloud/axios'
import {
	AiFeatureRefusal,
	fetchDocuments,
	fetchFeatures,
	fetchPrompts,
	MISSING_REFERENCE,
	referenceId,
	refusalSentence,
	runFeatureOnDocument,
	surfaceSlugs,
	whereItRuns,
} from '../../src/utils/aiFeatures.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (path) => `/index.php${path}` }))

const OPTIONS = {
	apiBase: '/apps/openregister/api',
	register: 'reg',
	schema: 'case',
	objectId: 'c-1',
	declaration: { typeField: 'caseType', typeSchema: 'caseType', field: 'aiFeatures', surface: 'case' },
	featuresEndpoint: '/apps/app/api/assistant/ai-features',
	featuresQueryKey: 'caseType[aiFeatures]',
}

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
})

describe('the declaration', () => {
	it('reads an id from a plain reference and from an object', () => {
		expect(referenceId('ct-1')).toBe('ct-1')
		expect(referenceId({ id: 'ct-2' })).toBe('ct-2')
		expect(referenceId(null)).toBe('')
	})

	it('keeps only the features placed on the surface', () => {
		expect(surfaceSlugs({ aiFeatures: { summary: 'case', triage: 'intake' } }, 'aiFeatures', 'case')).toEqual(['summary'])
		expect(surfaceSlugs({ aiFeatures: ['summary'] }, 'aiFeatures', 'case')).toEqual([])
	})

	it('asks nobody about features when the type declares none on the surface', async () => {
		axios.get
			.mockResolvedValueOnce({ data: { caseType: 'ct-1' } })
			.mockResolvedValueOnce({ data: { aiFeatures: { triage: 'intake' } } })
		expect(await fetchFeatures(OPTIONS)).toEqual([])
		expect(axios.get).toHaveBeenCalledTimes(2)
	})

	it('sends the declaration and answers the features with where they run', async () => {
		axios.get
			.mockResolvedValueOnce({ data: { caseType: { id: 'ct-1' } } })
			.mockResolvedValueOnce({ data: { aiFeatures: { summary: 'case' } } })
			.mockResolvedValueOnce({ data: { features: [{ slug: 'summary', available: true }] } })
		const features = await fetchFeatures(OPTIONS)
		expect(features).toEqual([{ slug: 'summary', available: true }])
		expect(axios.get.mock.calls[0][0]).toBe('/index.php/apps/openregister/api/objects/reg/case/c-1')
		expect(axios.get.mock.calls[1][0]).toBe('/index.php/apps/openregister/api/objects/reg/caseType/ct-1')
		const url = decodeURIComponent(axios.get.mock.calls[2][0])
		expect(url).toBe('/index.php/apps/app/api/assistant/ai-features?surface=case&caseType[aiFeatures][summary]=case')
	})

	it('answers null, not an empty list, when the features cannot be read', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		expect(await fetchFeatures(OPTIONS)).toBeNull()
	})
})

describe('the other reads', () => {
	it('lists the documents with their file id, and null when it fails', async () => {
		axios.get.mockResolvedValueOnce({ data: { results: [{ id: 42, name: 'besluit.pdf' }, { name: 'no id' }] } })
		expect(await fetchDocuments('/x/files')).toEqual([{ id: '42', title: 'besluit.pdf' }])
		axios.get.mockRejectedValueOnce(new Error('down'))
		expect(await fetchDocuments('/x/files')).toBeNull()
	})

	it('reads the prompts, and null when it fails', async () => {
		axios.get.mockResolvedValueOnce({ data: { prompts: [{ id: 'p', label: 'L', prompt: 'P' }] } })
		expect(await fetchPrompts('/p')).toHaveLength(1)
		axios.get.mockRejectedValueOnce(new Error('down'))
		expect(await fetchPrompts('/p')).toBeNull()
	})

	it('says a feature hermiq does not offer is unavailable, never local', () => {
		expect(whereItRuns({ available: false })).toBe('Unavailable: hermiq does not offer this feature here.')
		expect(whereItRuns({ available: true })).toBe('hermiq did not say which provider runs this, or where.')
		expect(whereItRuns({ available: true, provider: 'Hermiq', residency: 'on-premise' })).toBe('Hermiq, runs in on-premise')
	})
})

describe('a run on a document', () => {
	it('refuses a run without a usable reference before any request', async () => {
		for (const reference of [undefined, '', '  ', 'besluit.pdf']) {
			await expect(runFeatureOnDocument({ feature: 'summary', documentReference: reference, instruction: 'x' }))
				.rejects.toMatchObject({ name: 'AiFeatureRefusal', gate: MISSING_REFERENCE, feature: 'summary' })
		}
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('carries the reference with the request to hermiq', async () => {
		axios.post.mockResolvedValue({ data: { output: 'Verleend.' } })
		const result = await runFeatureOnDocument({ feature: 'summary', documentReference: 42, instruction: 'Vat samen' })
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/hermiq/api/ai-features/summary/run-on-document', { documentReference: '42', instruction: 'Vat samen' })
		expect(result.output).toBe('Verleend.')
	})

	it("turns a gate refusal into a refusal carrying hermiq's gate and sentence", async () => {
		axios.post.mockRejectedValue({ response: { status: 422, data: { error: 'Refused by the redaction check', gate: 'redaction' } } })
		const refusal = await runFeatureOnDocument({ feature: 'summary', documentReference: '42', instruction: 'x' }).catch((error) => error)
		expect(refusal).toBeInstanceOf(AiFeatureRefusal)
		expect(refusal.gate).toBe('redaction')
		expect(refusal.reason).toBe('Refused by the redaction check')
	})

	it('lets a transport failure through as the failure it is', async () => {
		const failure = new Error('Network Error')
		axios.post.mockRejectedValue(failure)
		await expect(runFeatureOnDocument({ feature: 'summary', documentReference: '42', instruction: 'x' })).rejects.toBe(failure)
	})

	it('names the feature and the reason in the sentence a reader sees', () => {
		expect(refusalSentence(new AiFeatureRefusal('s', 'x', 'redaction'), 'Samenvatting')).toBe('Samenvatting will not read a document that has not been redacted.')
		expect(refusalSentence(new AiFeatureRefusal('s', 'x', MISSING_REFERENCE), 'Samenvatting')).toBe('Samenvatting reads a document, and no document was chosen.')
		expect(refusalSentence(new AiFeatureRefusal('s', 'Refused by the residency check', 'residency'), 'Samenvatting')).toBe('Samenvatting did not run: Refused by the residency check')
	})
})
