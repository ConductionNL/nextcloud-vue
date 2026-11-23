/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The reads and the run behind CnAiFeaturesWidget: the AI features a record's
 * TYPE object places on a surface, where hermiq runs each one, a run on one of
 * the record's documents, and the sentence a refusal is shown as.
 *
 * An undeclared type asks nobody: the declaration is read first and the
 * features endpoint is called only when something is placed on the surface.
 * Every read answers null when it failed, so the widget can say it is
 * incomplete instead of drawing an empty list.
 *
 * The run goes to hermiq in the reader's own session, so their own access
 * decides which document can be read. A request without a usable document
 * reference is refused before it is sent: hermiq's redaction gate sits on the
 * document, and a request without one would run unchecked.
 */
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { prefixUrl } from './headers.js'

/** The gate name for a run refused before it was sent. */
export const MISSING_REFERENCE = 'missing-reference'

/** The hermiq endpoint a feature runs on a document through; `{slug}` is filled in. */
export const DEFAULT_RUN_ENDPOINT = '/apps/hermiq/api/ai-features/{slug}/run-on-document'

/**
 * A run that was refused, before sending or by one of hermiq's gates.
 */
export class AiFeatureRefusal extends Error {
	/**
	 * @param {string}      feature The feature slug.
	 * @param {string}      reason  The refusing side's own sentence.
	 * @param {string|null} gate    The gate that refused, when named.
	 */
	constructor(feature, reason, gate) {
		super(reason)
		this.name = 'AiFeatureRefusal'
		this.feature = feature
		this.reason = reason
		this.gate = gate
	}
}

/**
 * The id inside a reference that may be a plain id or an object carrying one.
 *
 * @param {string|object|null|undefined} value The reference.
 * @return {string} The id, or ''.
 */
export function referenceId(value) {
	if (value !== null && typeof value === 'object') {
		return String(value.id ?? value.uuid ?? '').trim()
	}
	return String(value ?? '').trim()
}

/**
 * The slugs a type object places on one surface. The declaration is a map of
 * feature slug to surface name.
 *
 * @param {object} typeObject The type object.
 * @param {string} field      The declaration field.
 * @param {string} surface    The surface.
 * @return {Array<string>} The slugs, in declaration order.
 */
export function surfaceSlugs(typeObject, field, surface) {
	const declared = typeObject?.[field]
	if (declared === null || typeof declared !== 'object' || Array.isArray(declared)) {
		return []
	}
	return Object.keys(declared).filter((slug) => declared[slug] === surface)
}

/**
 * Read one OpenRegister object.
 *
 * @param {string} apiBase  API root.
 * @param {string} register Register.
 * @param {string} schema   Schema.
 * @param {string} id       Object id.
 * @return {Promise<object>} The object.
 */
async function readObject(apiBase, register, schema, id) {
	const { data } = await axios.get(prefixUrl(`${apiBase}/objects/${register}/${schema}/${encodeURIComponent(id)}`))
	return data?.object ?? data ?? {}
}

/**
 * The AI features the record's type places on the surface, each with where it
 * runs as the features endpoint answers it.
 *
 * @param {object} options                         The options.
 * @param {string} options.apiBase                 OpenRegister API root.
 * @param {string} options.register                Register.
 * @param {string} options.schema                  Schema of the record.
 * @param {string} options.objectId                The record id.
 * @param {object} options.declaration             `{typeField, typeSchema, field, surface}`.
 * @param {string} options.featuresEndpoint        The endpoint that asks hermiq.
 * @param {string} options.featuresQueryKey        Query key the slugs are sent under.
 * @return {Promise<Array<object>|null>} The features, or null when they could not be read.
 */
export async function fetchFeatures({ apiBase, register, schema, objectId, declaration, featuresEndpoint, featuresQueryKey }) {
	try {
		const record = await readObject(apiBase, register, schema, objectId)
		const typeId = referenceId(record[declaration.typeField])
		if (typeId === '') {
			return []
		}
		const typeObject = await readObject(apiBase, register, declaration.typeSchema, typeId)
		const slugs = surfaceSlugs(typeObject, declaration.field || 'aiFeatures', declaration.surface)
		if (slugs.length === 0) {
			return []
		}

		const query = new URLSearchParams({ surface: declaration.surface })
		for (const slug of slugs) {
			query.append(`${featuresQueryKey}[${slug}]`, declaration.surface)
		}
		const { data } = await axios.get(`${prefixUrl(featuresEndpoint)}?${query.toString()}`)
		return Array.isArray(data?.features) ? data.features : []
	} catch {
		return null
	}
}

/**
 * The record's documents a feature can be run on.
 *
 * @param {string} url The files endpoint.
 * @return {Promise<Array<{id: string, title: string}>|null>} The documents, or null.
 */
export async function fetchDocuments(url) {
	try {
		const { data } = await axios.get(prefixUrl(url))
		const rows = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
		return rows
			.filter((row) => row && row.id !== undefined && row.id !== null)
			.map((row) => ({ id: String(row.id), title: String(row.title ?? row.name ?? row.id) }))
	} catch {
		return null
	}
}

/**
 * The prompts offered on the record, as the endpoint holds them.
 *
 * @param {string} url The prompts endpoint.
 * @return {Promise<Array<{id: string, label: string, prompt: string}>|null>} The prompts, or null.
 */
export async function fetchPrompts(url) {
	try {
		const { data } = await axios.get(prefixUrl(url))
		return Array.isArray(data?.prompts) ? data.prompts : []
	} catch {
		return null
	}
}

/**
 * Ask one prompt about the record.
 *
 * @param {string} url       The ask endpoint.
 * @param {string} objectKey Body key naming the record.
 * @param {string} objectId  The record id.
 * @param {string} message   The prompt.
 * @return {Promise<object>} `{reply, model?}`.
 */
export async function askAbout(url, objectKey, objectId, message) {
	const { data } = await axios.post(prefixUrl(url), { [objectKey]: objectId, message })
	return data
}

/**
 * Where a feature runs, in words. A feature hermiq does not offer reads
 * unavailable, never local.
 *
 * @param {object} feature One feature row.
 * @return {string} The sentence.
 */
export function whereItRuns(feature) {
	if (feature?.available !== true) {
		return t('nextcloud-vue', 'Unavailable: hermiq does not offer this feature here.')
	}
	const provider = String(feature.provider ?? '').trim()
	const residency = String(feature.residency ?? '').trim()
	if (provider === '' || residency === '') {
		return t('nextcloud-vue', 'hermiq did not say which provider runs this, or where.')
	}
	return t('nextcloud-vue', '{provider}, runs in {residency}', { provider, residency })
}

/**
 * Run one AI feature on one document, through hermiq.
 *
 * @param {object}        request                   The run.
 * @param {string}        request.feature           The feature slug.
 * @param {string|number} request.documentReference The document's file id.
 * @param {string}        request.instruction       What to do with it.
 * @param {string}        [request.runEndpoint]     Endpoint template with `{slug}`.
 * @return {Promise<object>} hermiq's answer.
 * @throws {AiFeatureRefusal} When the reference is missing, or hermiq refuses.
 */
export async function runFeatureOnDocument({ feature, documentReference, instruction, runEndpoint = DEFAULT_RUN_ENDPOINT }) {
	const reference = String(documentReference ?? '').trim()
	if (/^\d+$/.test(reference) === false) {
		throw new AiFeatureRefusal(feature, t('nextcloud-vue', 'No document was chosen.'), MISSING_REFERENCE)
	}

	const url = prefixUrl(runEndpoint.replace('{slug}', encodeURIComponent(feature)))
	try {
		const response = await axios.post(url, { documentReference: reference, instruction })
		return response.data
	} catch (error) {
		const status = error?.response?.status
		const data = error?.response?.data ?? {}
		if ([400, 403, 404, 422].includes(status) === true) {
			throw new AiFeatureRefusal(feature, String(data.error ?? ''), data.gate ?? null)
		}
		throw error
	}
}

/**
 * The sentence a reader sees for a refusal, naming the feature and the reason.
 *
 * @param {AiFeatureRefusal} refusal      The refusal.
 * @param {string}           featureLabel The feature's name.
 * @return {string} The sentence.
 */
export function refusalSentence(refusal, featureLabel) {
	if (refusal.gate === MISSING_REFERENCE) {
		return t('nextcloud-vue', '{feature} reads a document, and no document was chosen.', { feature: featureLabel })
	}
	if (refusal.gate === 'redaction') {
		return t('nextcloud-vue', '{feature} will not read a document that has not been redacted.', { feature: featureLabel })
	}
	return t('nextcloud-vue', '{feature} did not run: {reason}', { feature: featureLabel, reason: refusal.reason })
}
