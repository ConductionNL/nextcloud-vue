/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * fieldRules — what OpenRegister decided about a record's fields for this
 * reader in its current state (`@self.fieldRules`: required, read-only,
 * hidden). Read straight off the record: the answer is computed per user and
 * per state on the render path, and a second evaluator here would disagree
 * with the one that refuses the save.
 *
 * @module utils/fieldRules
 */

/**
 * A published list as a list of property names.
 *
 * @param {unknown} names The published list.
 * @return {Array<string>} The names.
 */
function asNames(names) {
	if (Array.isArray(names) === false) {
		return []
	}
	return names.map((name) => String(name)).filter((name) => name !== '')
}

/**
 * What OpenRegister decided about the fields of one record, for this reader.
 *
 * @param {object} record The record as OpenRegister answered it.
 * @return {{state: string, hidden: Array<string>, readOnly: Array<string>, required: Array<string>}} The answer.
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-can-explain-its-status
 */
export function fieldRulesOf(record) {
	const published = record?.['@self']?.fieldRules
	return {
		state: String(published?.state ?? ''),
		hidden: asNames(published?.hidden),
		readOnly: asNames(published?.readOnly),
		required: asNames(published?.required),
	}
}

/**
 * Whether the published answer says anything at all.
 *
 * @param {object} rules The answer, as `fieldRulesOf` shapes it.
 * @return {boolean} True when at least one list has a name in it.
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-can-explain-its-status
 */
export function hasFieldRules(rules) {
	return (rules?.required?.length ?? 0) > 0
		|| (rules?.readOnly?.length ?? 0) > 0
		|| (rules?.hidden?.length ?? 0) > 0
}
