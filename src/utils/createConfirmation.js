/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * createConfirmation — a question a list asks before it creates a record with
 * certain values, declared as `content.confirmCreate` on an object-list.
 *
 * `confirmCreate` is a list of `{ when, text, confirmLabel? }`. `when` is a
 * local visibleWhen condition evaluated against the values the create form is
 * about to send (`{ field, op, value }`, or `{ all: [...] }` / `{ any: [...] }`);
 * the first entry whose `when` holds is asked, and the create goes ahead only
 * when the user confirms. An entry without a `when` never matches, so a typo
 * cannot put a question on every create. Texts are returned untranslated; the
 * caller runs them through the host translate.
 *
 * Example: before a document is shared with everyone,
 * `{ "when": { "field": "audience", "op": "eq", "value": "public" },
 *    "text": "Anyone can read this document, also without an account. Publish it?",
 *    "confirmLabel": "Publish publicly" }`.
 *
 * @module utils/createConfirmation
 */

import { evaluateVisibleWhenLocal } from './visibleWhen.js'

/**
 * The confirmation a create with these values needs, or null.
 *
 * @param {Array<{when: object, text: string, confirmLabel?: string}>|undefined} rules The declared `confirmCreate`.
 * @param {object} values The values the create sends.
 * @return {{when: object, text: string, confirmLabel?: string}|null} The first matching entry.
 */
export function createConfirmationFor(rules, values) {
	if (!Array.isArray(rules)) {
		return null
	}
	return rules.find((rule) => rule
		&& typeof rule === 'object'
		&& typeof rule.text === 'string'
		&& rule.text.trim() !== ''
		&& rule.when !== null
		&& typeof rule.when === 'object'
		&& evaluateVisibleWhenLocal(rule.when, values || {})) || null
}
