/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The variables a text template uses, in the `{name}` and `{name|format:arg}`
 * form that `fillTemplate` fills, checked against the allowed names.
 *
 * @module utils/templateVariables
 */

const TOKEN = /\{([^{}\s|]+)(?:\|[^{}]*)?\}/g

/**
 * The variable names a template uses, each once, in order.
 *
 * @param {string} text The template.
 * @return {string[]} The names.
 * @spec openspec/changes/markdown-editor-variables/tasks.md#task-2
 */
export function templateVariables(text) {
	const out = []
	for (const match of String(text || '').matchAll(TOKEN)) {
		if (!out.includes(match[1])) {
			out.push(match[1])
		}
	}
	return out
}

/**
 * The variable names a template uses that are not allowed. A dotted name is
 * allowed when it, or a prefix of it ending before a dot, is allowed:
 * `case.number` under `case`.
 *
 * @param {string} text The template.
 * @param {string[]} allowed The allowed names.
 * @return {string[]} The unknown names, each once, in order.
 * @spec openspec/changes/markdown-editor-variables/tasks.md#task-2
 */
export function unknownTemplateVariables(text, allowed) {
	const known = new Set(Array.isArray(allowed) ? allowed : [])
	return templateVariables(text).filter((name) => {
		const parts = name.split('.')
		for (let i = parts.length; i > 0; i--) {
			if (known.has(parts.slice(0, i).join('.'))) {
				return false
			}
		}
		return true
	})
}
