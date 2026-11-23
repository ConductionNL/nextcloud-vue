// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
import { evaluateVisibleWhenLocal } from './visibleWhen.js'

/**
 * A text that may depend on the record: a string as it is, or `[{ when, text }]`,
 * the first entry whose `when` (the `visibleWhen` grammar, read against the
 * record and its `@context` rows) holds; an entry without `when` always holds.
 * With no record yet, or no entry holding, the text is ''.
 *
 * @param {string|Array<{when?: object, text: string}>|undefined} spec The text or its entries.
 * @param {object|null} data The record, with `@context` when the page loads it.
 * @return {string} The text, or ''.
 * @spec openspec/changes/widget-subtitle-by-condition/specs/widget-subtitle-by-condition/spec.md#requirement-a-card-subtitle-can-depend-on-the-record
 */
export function pickConditionalText(spec, data) {
	if (typeof spec === 'string') {
		return spec
	}
	if (!Array.isArray(spec) || !data) {
		return ''
	}
	const entry = spec.find((item) => item && typeof item.text === 'string'
		&& (!item.when || evaluateVisibleWhenLocal(item.when, data)))
	return entry ? entry.text : ''
}
