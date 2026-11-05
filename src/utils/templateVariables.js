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

/** The default way a variable is written: `{name}`. */
export const DEFAULT_VARIABLE_SYNTAX = '{name}'

/**
 * Whether a variable syntax is usable: `name` with something on either side
 * of it (`{name}`, `{{name}}`, `[[name]]`).
 *
 * @param {unknown} syntax The syntax.
 * @return {boolean}
 * @spec openspec/changes/markdown-editor-variable-syntax-plain-text/specs/markdown-editor/spec.md#requirement-variables-can-be-written-in-another-syntax
 */
export function isVariableSyntax(syntax) {
	if (typeof syntax !== 'string') {
		return false
	}
	const at = syntax.indexOf('name')
	return at > 0 && at + 4 < syntax.length
}

/**
 * A variable written in a syntax: `case.number` in `{{name}}` is
 * `{{case.number}}`.
 *
 * @param {string} name The variable name.
 * @param {string} [syntax] The syntax, `{name}` by default.
 * @return {string}
 * @spec openspec/changes/markdown-editor-variable-syntax-plain-text/specs/markdown-editor/spec.md#requirement-variables-can-be-written-in-another-syntax
 */
export function writeVariable(name, syntax) {
	return (isVariableSyntax(syntax) ? syntax : DEFAULT_VARIABLE_SYNTAX).replace('name', name)
}

/**
 * The pattern that finds a syntax's variables, the name in group 1. The
 * default `{name}` keeps its `{name|format:arg}` form; another syntax allows
 * spaces inside its marks (`{{ name }}`) and a `|format` before the close.
 *
 * @param {string} [syntax] The syntax.
 * @return {RegExp} A global pattern.
 */
export function variablePattern(syntax) {
	if (!isVariableSyntax(syntax) || syntax === DEFAULT_VARIABLE_SYNTAX) {
		return new RegExp(TOKEN.source, 'g')
	}
	const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const [open, close] = [syntax.slice(0, syntax.indexOf('name')), syntax.slice(syntax.indexOf('name') + 4)]
	return new RegExp(`${escape(open)}\\s*([^\\s|]+?)(?:\\|[^\\n]*?)?\\s*${escape(close)}`, 'g')
}

/**
 * The variable names a template uses, each once, in order.
 *
 * @param {string} text The template.
 * @param {string} [syntax] How a variable is written, `{name}` by default.
 * @return {string[]} The names.
 * @spec openspec/changes/markdown-editor-variables/tasks.md#task-2
 */
export function templateVariables(text, syntax) {
	const out = []
	for (const match of String(text || '').matchAll(variablePattern(syntax))) {
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
	return unknownVariablesIn(text, { allowed })
}

/**
 * Whether a variable name is allowed: it, or a prefix of it ending before a
 * dot, is in the set.
 *
 * @param {string} name The name.
 * @param {Set<string>} known The allowed names.
 * @return {boolean}
 */
function isKnownVariable(name, known) {
	const parts = name.split('.')
	return parts.some((_part, index) => known.has(parts.slice(0, index + 1).join('.')))
}

/**
 * The variable names a template uses that are not allowed, in a syntax.
 *
 * @param {string} text The template.
 * @param {{allowed: string[], syntax?: string}} rules The allowed names and the syntax.
 * @return {string[]} The unknown names, each once, in order.
 * @spec openspec/changes/markdown-editor-variable-syntax-plain-text/specs/markdown-editor/spec.md#requirement-variables-can-be-written-in-another-syntax
 */
export function unknownVariablesIn(text, rules) {
	const known = new Set(Array.isArray(rules.allowed) ? rules.allowed : [])
	return templateVariables(text, rules.syntax).filter((name) => !isKnownVariable(name, known))
}

/**
 * A plain text as safe HTML for a preview: escaped, line breaks kept, and each
 * variable marked, as unknown when a list of allowed names is given and it is
 * not on it.
 *
 * @param {string} text The text.
 * @param {{allowed?: string[], syntax?: string}} rules The allowed names (none: no check) and the syntax.
 * @return {string}
 * @spec openspec/changes/markdown-editor-variable-syntax-plain-text/specs/markdown-editor/spec.md#requirement-a-plain-text-mode-without-markdown
 */
export function plainTextPreview(text, rules) {
	const source = String(text || '')
	const known = new Set(Array.isArray(rules.allowed) ? rules.allowed : [])
	let html = ''
	let from = 0
	for (const match of source.matchAll(variablePattern(rules.syntax))) {
		const unknown = known.size > 0 && !isKnownVariable(match[1], known)
		html += escapeHtml(source.slice(from, match.index))
		html += `<span class="cn-markdown-editor__var${unknown ? ' cn-markdown-editor__var--unknown' : ''}">${escapeHtml(match[0])}</span>`
		from = match.index + match[0].length
	}
	return (html + escapeHtml(source.slice(from))).replace(/\n/g, '<br>')
}

/**
 * Text made safe to place in HTML.
 *
 * @param {string} value The text.
 * @return {string}
 */
function escapeHtml(value) {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
