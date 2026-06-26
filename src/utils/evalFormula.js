/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tiny, safe arithmetic evaluator for the `computed` widget source — evaluates
 * a formula like `A/B*100` or `(A-B)/B` over a map of named values, WITHOUT
 * `eval`/`new Function` (CSP-safe). Supports `+ - * /`, parentheses, unary
 * minus, decimal numbers, and single-/multi-letter identifiers that index into
 * the provided variables. Division by zero yields `null` (so a KPI shows "—"
 * rather than Infinity); an unparseable formula or unknown identifier also
 * yields `null`.
 *
 * @module utils/evalFormula
 */

/**
 * Tokenise a formula into numbers, identifiers, operators, and parens.
 *
 * @param {string} src The formula source.
 * @return {Array<{t: string, v?: string}>} The token list.
 */
function tokenize(src) {
	const tokens = []
	let i = 0
	while (i < src.length) {
		const c = src[i]
		if (c === ' ' || c === '\t') { i++; continue }
		if ('+-*/()'.includes(c)) { tokens.push({ t: c }); i++; continue }
		if ((c >= '0' && c <= '9') || c === '.') {
			let j = i + 1
			while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++
			tokens.push({ t: 'num', v: src.slice(i, j) })
			i = j
			continue
		}
		if (/[A-Za-z_]/.test(c)) {
			let j = i + 1
			while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
			tokens.push({ t: 'id', v: src.slice(i, j) })
			i = j
			continue
		}
		// Unknown character → invalid formula.
		return null
	}
	return tokens
}

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 }

/**
 * Shunting-yard: convert an infix token list to RPN.
 *
 * @param {Array} tokens The token list.
 * @return {Array|null} The RPN token list, or null on a paren mismatch.
 */
function toRpn(tokens) {
	const out = []
	const ops = []
	let prev = null
	for (const tok of tokens) {
		if (tok.t === 'num' || tok.t === 'id') {
			out.push(tok)
		} else if (tok.t === '(') {
			ops.push(tok)
		} else if (tok.t === ')') {
			while (ops.length && ops[ops.length - 1].t !== '(') out.push(ops.pop())
			if (!ops.length) return null
			ops.pop()
		} else { // operator
			// Unary minus: a '-' at the start or after an operator/'('.
			if (tok.t === '-' && (prev === null || prev.t === '(' || PREC[prev.t])) {
				out.push({ t: 'num', v: '0' })
			}
			while (ops.length && PREC[ops[ops.length - 1].t] >= PREC[tok.t]) out.push(ops.pop())
			ops.push(tok)
		}
		prev = tok
	}
	while (ops.length) {
		const op = ops.pop()
		if (op.t === '(') return null
		out.push(op)
	}
	return out
}

/**
 * Evaluate a formula over a variable map.
 *
 * @param {string} formula The formula (e.g. `A/B*100`).
 * @param {Record<string, number>} vars The named values.
 * @return {number|null} The result, or null on error / divide-by-zero.
 */
export function evalFormula(formula, vars) {
	if (typeof formula !== 'string' || formula.trim() === '') return null
	const tokens = tokenize(formula)
	if (!tokens) return null
	const rpn = toRpn(tokens)
	if (!rpn) return null
	const stack = []
	for (const tok of rpn) {
		if (tok.t === 'num') {
			stack.push(Number(tok.v))
		} else if (tok.t === 'id') {
			const val = vars[tok.v]
			if (typeof val !== 'number' || !Number.isFinite(val)) return null
			stack.push(val)
		} else {
			const b = stack.pop()
			const a = stack.pop()
			if (a === undefined || b === undefined) return null
			let r
			if (tok.t === '+') r = a + b
			else if (tok.t === '-') r = a - b
			else if (tok.t === '*') r = a * b
			else if (tok.t === '/') { if (b === 0) return null; r = a / b } else return null
			stack.push(r)
		}
	}
	if (stack.length !== 1 || !Number.isFinite(stack[0])) return null
	return stack[0]
}
