/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The OpenRegister translation reads and the one write behind
 * CnObjectTranslationsWidget. The engine is OpenRegister's; nothing here
 * translates or stores anything of its own.
 *
 *   GET   {apiBase}/registers/{register}                       languages, source first
 *   GET   {apiBase}/registers/{register}/schemas                property titles
 *   GET   {apiBase}/objects/{register}/{schema}/{id}?_translations=all&_translationMeta=true
 *   GET   {apiBase}/translations/object/{uuid}?schema={schema}   per-value workflow status
 *   PATCH {apiBase}/objects/{register}/{schema}/{id}             { property: languageMap }
 *
 * The WHOLE language map is written and no `X-Translation-Target-Language` is
 * sent: OpenRegister refuses a language-keyed body that arrives with that
 * header, and keeps one that arrives without it.
 *
 * The translatable properties come from `_meta.languageMeta`, which OpenRegister
 * builds from the schema it imported, so a property it never read as
 * translatable is not offered.
 *
 * A failed read throws: an outage and an object with nothing translated look
 * the same from the browser, and only one of them is somebody's problem.
 */
import axios from '@nextcloud/axios'
import { prefixUrl } from './headers.js'

/** The OpenRegister API root a target defaults to. */
export const DEFAULT_API_BASE = '/apps/openregister/api'

/**
 * A translation row is stale when the source value moved under it; OpenRegister
 * flips a derived row to `outdated`. A stale value does not count as translated.
 *
 * @type {string}
 */
export const STATUS_OUTDATED = 'outdated'

/**
 * The slug of a schema given as a slug or as the schema object.
 *
 * @param {string|object} schema The schema.
 * @return {string} The slug (or id).
 */
export function schemaSlugOf(schema) {
	if (schema && typeof schema === 'object') {
		return String(schema.slug || schema.id || schema.uuid || '')
	}
	return String(schema || '')
}

/**
 * Normalise a target to `{register, schema, apiBase}`.
 *
 * @param {object} target `{register, schema, apiBase?}`.
 * @return {{register: string, schema: string, apiBase: string}} The target.
 */
function normalise(target = {}) {
	return {
		register: String(target.register || ''),
		schema: schemaSlugOf(target.schema),
		apiBase: String(target.apiBase || DEFAULT_API_BASE).replace(/\/$/, ''),
	}
}

/**
 * The languages the register serves, source language first.
 *
 * @param {object} target The target.
 * @return {Promise<string[]>} The language codes.
 */
export async function registerLanguages(target) {
	const { apiBase, register } = normalise(target)
	const { data } = await axios.get(prefixUrl(`${apiBase}/registers/${register}`))
	const languages = data?.languages ?? data?.register?.languages ?? []
	return Array.isArray(languages) ? languages.filter((code) => typeof code === 'string' && code !== '') : []
}

/**
 * One object with every language of every value, and its label envelope.
 *
 * @param {object} target The target.
 * @param {string} id     The object id.
 * @return {Promise<{object: object, languageMeta: object}>} The values and the envelope.
 */
export async function objectWithTranslations(target, id) {
	const { apiBase, register, schema } = normalise(target)
	const { data } = await axios.get(
		prefixUrl(`${apiBase}/objects/${register}/${schema}/${encodeURIComponent(id)}`),
		{ params: { _translations: 'all', _translationMeta: 'true' } },
	)
	const object = data?.object ?? data ?? {}
	return { object, languageMeta: object?._meta?.languageMeta ?? {} }
}

/**
 * The schema's property definitions, for their titles (`languageMeta` carries
 * none).
 *
 * @param {object} target The target.
 * @return {Promise<object>} Property name to its definition.
 */
export async function schemaProperties(target) {
	const { apiBase, register, schema } = normalise(target)
	const { data } = await axios.get(prefixUrl(`${apiBase}/registers/${register}/schemas`))
	const schemas = data?.results ?? data?.schemas ?? data ?? []
	const list = Array.isArray(schemas) ? schemas : Object.values(schemas)
	const found = list.find((entry) => [entry?.slug, entry?.id, entry?.uuid, entry?.title].map((v) => (v === undefined || v === null) ? '' : String(v)).includes(schema))
	return found?.properties ?? {}
}

/**
 * The sidecar rows for one object, so a stale value can be told apart.
 *
 * @param {object} target The target.
 * @param {string} uuid   The object uuid.
 * @return {Promise<Array<object>>} Rows naming property, language and status.
 */
export async function translationRows(target, uuid) {
	const { apiBase, schema } = normalise(target)
	const { data } = await axios.get(
		prefixUrl(`${apiBase}/translations/object/${encodeURIComponent(uuid)}`),
		{ params: { schema } },
	)
	const rows = data?.translations ?? []
	return Array.isArray(rows) ? rows : []
}

/**
 * Write one property back with every language it now holds.
 *
 * @param {object} target      The target.
 * @param {string} id          The object id.
 * @param {string} property    The property.
 * @param {object} languageMap Every language of it, the edit included.
 * @return {Promise<object>} The saved object.
 */
export async function saveTranslatedProperty(target, id, property, languageMap) {
	const { apiBase, register, schema } = normalise(target)
	const { data } = await axios.patch(
		prefixUrl(`${apiBase}/objects/${register}/${schema}/${encodeURIComponent(id)}`),
		{ [property]: languageMap },
	)
	return data?.object ?? data ?? {}
}

/**
 * How many of a language's properties are present AND current.
 *
 * Deliberately not OpenRegister's `completeness`, which counts every non-empty
 * row and never reads its status: a stale value is a wrong value. The source
 * language is complete by definition for every non-empty value.
 *
 * @param {object}   args                The inputs.
 * @param {string[]} args.properties     The translatable properties.
 * @param {object}   args.values         Property to language to value.
 * @param {object}   args.statuses       Property to language to status.
 * @param {string}   args.language       The language counted.
 * @param {string}   args.sourceLanguage The source language.
 * @return {{translated: number, total: number}} The counts.
 */
export function completenessOf({ properties, values, statuses, language, sourceLanguage }) {
	const total = properties.length
	const translated = properties.filter((property) => {
		const value = values?.[property]?.[language] ?? ''
		if (typeof value !== 'string' || value.trim() === '') {
			return false
		}
		if (language === sourceLanguage) {
			return true
		}
		return (statuses?.[property]?.[language] ?? '') !== STATUS_OUTDATED
	}).length
	return { translated, total }
}
