/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * fieldPill: the status pill a widget draws for a row from a pill config, so
 * a record list, grouped cards and a checklist read the same keys.
 *
 * @module utils/fieldPill
 */
import { isBadgeVariant } from './badgeVariants.js'
import { variantForColor } from './headerFieldChips.js'
import { readPath } from './readPath.js'
import { evaluateVisibleWhenLocal } from './visibleWhen.js'

/**
 * The pill for a row.
 *
 * `{ field, labels?, colorMap?, colorField?, variant?, variantWhen?, hideValues? }`
 * reads the value at `field`: its label through `labels`, its tone through
 * `colorMap` (keys match case-insensitively), else the colour name at
 * `colorField`, else `variant`. `variantWhen` (`[{ when, variant }]`, the first
 * whose local condition holds for the row) wins over all of them.
 *
 * `{ cases: [{ when, label, variant? }], label?, variant? }` takes the first
 * case whose `when` holds, else the pill's own `label`; a label with `{field}`
 * tokens is filled from the row and draws nothing when it fills to ''.
 *
 * @param {object} row The row.
 * @param {object} pill The pill config.
 * @param {object} [options] Options.
 * @param {(text: string) => string} [options.translate] The app's translate.
 * @param {(template: string, row: object) => string} [options.fill] Fill a template from the row (translated).
 * @return {{label: string, variant: string}|null} The pill, or null.
 * @spec openspec/changes/record-list-pill-cases-footer-choice/specs/record-list/spec.md#requirement-a-record-list-row-pill-can-read-a-state-from-several-fields
 * @spec openspec/changes/grouped-cards-pills-and-counts/specs/grouped-cards-widget/spec.md
 */
export function fieldPill(row, pill, options = {}) {
	const translate = typeof options.translate === 'function' ? options.translate : (text) => text
	const fill = typeof options.fill === 'function' ? options.fill : (template) => translate(template)
	if (pill && typeof pill === 'object' && Array.isArray(pill.cases)) {
		const found = pill.cases.find((entry) => entry && typeof entry === 'object' && entry.when && evaluateVisibleWhenLocal(entry.when, row || {}))
		const chosen = found || pill
		if (typeof chosen.label !== 'string' || chosen.label === '') {
			return null
		}
		const label = chosen.label.indexOf('{') === -1 ? translate(chosen.label) : fill(chosen.label, row)
		return label === '' ? null : { label, variant: isBadgeVariant(chosen.variant) ? chosen.variant : 'default' }
	}
	if (!pill || typeof pill !== 'object' || !pill.field) {
		return null
	}
	const raw = readPath(row, pill.field)
	if (raw === null || raw === undefined || raw === '' || typeof raw === 'object') {
		return null
	}
	const key = String(raw)
	if (Array.isArray(pill.hideValues) && pill.hideValues.map(String).includes(key)) {
		return null
	}
	const labels = pill.labels && typeof pill.labels === 'object' ? pill.labels : {}
	const map = pill.colorMap && typeof pill.colorMap === 'object' ? pill.colorMap : {}
	const found = Object.keys(map).find((k) => k.toLowerCase() === key.toLowerCase())
	const rule = Array.isArray(pill.variantWhen)
		? pill.variantWhen.find((entry) => entry && entry.when && evaluateVisibleWhenLocal(entry.when, row || {}))
		: null
	const colour = pill.colorField ? readPath(row, pill.colorField) : null
	const fromRow = typeof colour === 'string' && colour !== '' ? variantForColor(colour) : null
	const variant = rule ? rule.variant : (found ? map[found] : (fromRow || pill.variant))
	return {
		label: labels[key] ? translate(labels[key]) : key,
		variant: isBadgeVariant(variant) ? variant : 'default',
	}
}
