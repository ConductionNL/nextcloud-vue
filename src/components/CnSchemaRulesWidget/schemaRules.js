/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The rules OpenRegister's engine holds for a schema, read rather than kept:
 * the closed sets (vocabulary), the inventory in evaluation order, and a dry
 * run that writes nothing.
 *
 * A rule is keyed on its id (`<kind>:<schemaSlug>:<key>`), never on its
 * position: the order belongs to the pipeline and moves the day a kind is
 * added. Kind labels come from the vocabulary endpoint, so a kind added later
 * renders instead of blanking.
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/** Where OpenRegister publishes the three closed sets. */
export const RULE_VOCABULARY_PATH = '/apps/openregister/api/rules/vocabulary'

/**
 * @param {string} schema The schema slug.
 * @return {string} The url of the schema's rule inventory.
 */
export function ruleInventoryUrl(schema) {
	return generateUrl(`/apps/openregister/api/schemas/${encodeURIComponent(schema)}/rules`)
}

/**
 * @param {string} schema The schema slug.
 * @param {string} ruleId The rule id.
 * @return {string} The url of the rule's dry run.
 */
export function ruleEvaluateUrl(schema, ruleId) {
	return generateUrl(`/apps/openregister/api/schemas/${encodeURIComponent(schema)}/rules/${encodeURIComponent(ruleId)}/evaluate`)
}

/**
 * @param {unknown} data An answer.
 * @return {boolean} Whether it carries the three sets.
 */
export function isRuleVocabulary(data) {
	return !!data && Array.isArray(data.kinds) && Array.isArray(data.verdicts) && Array.isArray(data.actions)
}

/**
 * The kinds the engine publishes, keyed by kind.
 *
 * @param {object} vocabulary The vocabulary answer.
 * @return {object} The descriptors, by kind.
 */
export function kindsByName(vocabulary) {
	const kinds = {}
	if (!isRuleVocabulary(vocabulary)) {
		return kinds
	}
	vocabulary.kinds.forEach((kind) => {
		const name = String((kind && kind.kind) ?? '')
		if (name !== '') {
			kinds[name] = kind
		}
	})
	return kinds
}

/**
 * Read the vocabulary. A refusal answers the empty sets: the vocabulary is open
 * to any signed-in caller, so a refusal means an instance that predates the
 * engine, and each rule then shows its own kind string.
 *
 * @return {Promise<object>} The vocabulary, possibly empty.
 */
export async function fetchRuleVocabulary() {
	try {
		const { data } = await axios.get(generateUrl(RULE_VOCABULARY_PATH))
		return isRuleVocabulary(data) ? data : { kinds: [], verdicts: [], actions: [] }
	} catch {
		return { kinds: [], verdicts: [], actions: [] }
	}
}

/**
 * Read one schema's rules, in the order the engine evaluates them. The
 * inventory is an admin read; a refusal throws for the caller to say so.
 *
 * @param {string} schema The schema slug.
 * @return {Promise<Array<object>>} The rules.
 */
export async function fetchSchemaRules(schema) {
	const { data } = await axios.get(ruleInventoryUrl(schema))
	return Array.isArray(data && data.rules) ? data.rules : []
}

/**
 * Try one rule against one stored object, writing nothing.
 *
 * @param {string} schema The schema slug.
 * @param {string} ruleId The rule id.
 * @param {string} register The register slug the object lives in.
 * @param {string} objectId The object to try it against.
 * @return {Promise<object>} The trial result, carrying `trace`.
 */
export async function evaluateRule(schema, ruleId, register, objectId) {
	const { data } = await axios.post(ruleEvaluateUrl(schema, ruleId), { register, objectId })
	return data || {}
}

/**
 * The trace of a trial. `operand` and `operandValue` are what turn "why did this
 * rule not fire" into a fact, so they are shown beside the verdict.
 *
 * @param {object} result The trial result.
 * @return {{verdict: string, operand: string, operandValue: string, message: string}} The trace.
 */
export function traceOf(result) {
	const trace = (result && result.trace) || {}
	return {
		verdict: String(trace.verdict ?? ''),
		operand: String(trace.operand ?? ''),
		operandValue: String(trace.operandValue ?? ''),
		message: String(trace.message ?? (result && result.error && result.error.message) ?? ''),
	}
}
