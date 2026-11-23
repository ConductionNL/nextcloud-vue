/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Structural validation of a state machine: states as nodes, transitions as
 * directed edges between them. Used by CnStateMachineEditor for itemised
 * feedback before a host saves or publishes; a host's server remains the
 * authority on what it accepts.
 *
 * @module utils/stateMachineValidation
 */

import { translate as t } from '@nextcloud/l10n'

/** Rule codes, one per kind of issue. */
export const STATE_MACHINE_RULES = Object.freeze({
	NO_FINAL_STATE: 'NO_FINAL_STATE',
	UNREACHABLE_FINAL: 'UNREACHABLE_FINAL',
	DANGLING_TRANSITION: 'DANGLING_TRANSITION',
	DUPLICATE_TRANSITION: 'DUPLICATE_TRANSITION',
	ORPHAN_STATE: 'ORPHAN_STATE',
	CYCLE_NO_EXIT: 'CYCLE_NO_EXIT',
})

/**
 * The record keys the validator reads, by role. A host whose records use other
 * names passes its own (`{ final: 'isFinal', from: 'fromStatus' }`).
 */
export const DEFAULT_STATE_MACHINE_KEYS = Object.freeze({
	id: 'id',
	label: 'label',
	final: 'final',
	from: 'from',
	to: 'to',
	transitionLabel: 'label',
})

/**
 * The default message of each rule, in the library's own domain.
 *
 * @return {object} Messages by rule code.
 */
function defaultMessages() {
	return {
		NO_FINAL_STATE: t('nextcloud-vue', 'No state is marked as final'),
		UNREACHABLE_FINAL: t('nextcloud-vue', 'Final state "{name}" cannot be reached from any starting state'),
		DANGLING_TRANSITION: t('nextcloud-vue', 'Transition "{label}" points at a state that no longer exists'),
		DUPLICATE_TRANSITION: t('nextcloud-vue', 'Duplicate transition from "{from}" to "{to}"'),
		ORPHAN_STATE: t('nextcloud-vue', 'State "{name}" has no transitions connecting it to the others'),
		CYCLE_NO_EXIT: t('nextcloud-vue', 'Cycle with no way out to a final state: {names}'),
	}
}

/**
 * Normalise a list that may arrive as a JSON string or an array.
 *
 * @param {string|Array|null|undefined} raw The value.
 * @return {Array} The array, or [] when it is neither.
 */
export function asList(raw) {
	if (Array.isArray(raw)) {
		return raw
	}
	if (typeof raw === 'string' && raw !== '') {
		try {
			const parsed = JSON.parse(raw)
			return Array.isArray(parsed) ? parsed : []
		} catch {
			return []
		}
	}
	return []
}

/**
 * Fill `{name}` placeholders.
 *
 * @param {string} text The text.
 * @param {object} vars Values by placeholder.
 * @return {string} The filled text.
 */
function fill(text, vars) {
	return String(text).replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : match))
}

/**
 * Validate a state machine.
 *
 * Errors block (no final state, a final state no start reaches, a transition to
 * a state that is gone); warnings inform (duplicates, isolated states, cycles
 * that never reach a final state). An empty machine has no issues: it is
 * unfinished, not wrong.
 *
 * @param {object} graph The machine.
 * @param {Array|string} graph.states The states.
 * @param {Array|string} graph.transitions The transitions.
 * @param {object} [options] Options.
 * @param {object} [options.keys] Record keys by role, see DEFAULT_STATE_MACHINE_KEYS.
 * @param {object} [options.messages] Message templates by rule code, overriding the defaults.
 * @param {(text: string) => string} [options.translate] Applied to an overriding message before its placeholders are filled.
 * @return {Array<{type: string, code: string, message: string}>} The issues.
 */
export function validateStateMachine({ states, transitions } = {}, options = {}) {
	const keys = { ...DEFAULT_STATE_MACHINE_KEYS, ...(options.keys || {}) }
	const translate = typeof options.translate === 'function' ? options.translate : (text) => text
	const own = options.messages || {}
	const defaults = defaultMessages()
	const message = (code, vars) => {
		const template = typeof own[code] === 'string' && own[code] !== '' ? translate(own[code]) : defaults[code]
		return fill(template, vars)
	}

	const nodes = asList(states)
	const edges = asList(transitions)
	const issues = []
	if (nodes.length === 0) {
		return issues
	}

	const idOf = (node) => node[keys.id]
	const nodeIds = new Set(nodes.map(idOf))
	const nameOf = (id) => {
		const node = nodes.find((candidate) => idOf(candidate) === id)
		return (node && node[keys.label]) || id
	}

	const validEdges = []
	edges.forEach((edge) => {
		const from = edge[keys.from]
		const to = edge[keys.to]
		if (!nodeIds.has(from) || !nodeIds.has(to)) {
			issues.push({
				type: 'error',
				code: STATE_MACHINE_RULES.DANGLING_TRANSITION,
				message: message('DANGLING_TRANSITION', { label: edge[keys.transitionLabel] || `${from} → ${to}` }),
			})
			return
		}
		validEdges.push(edge)
	})

	const seenPairs = new Set()
	validEdges.forEach((edge) => {
		const pair = `${edge[keys.from]}::${edge[keys.to]}`
		if (seenPairs.has(pair)) {
			issues.push({
				type: 'warning',
				code: STATE_MACHINE_RULES.DUPLICATE_TRANSITION,
				message: message('DUPLICATE_TRANSITION', { from: nameOf(edge[keys.from]), to: nameOf(edge[keys.to]) }),
			})
		}
		seenPairs.add(pair)
	})

	const finals = nodes.filter((node) => node[keys.final] === true)
	if (finals.length === 0) {
		issues.push({
			type: 'error',
			code: STATE_MACHINE_RULES.NO_FINAL_STATE,
			message: message('NO_FINAL_STATE', {}),
		})
	}

	const forward = new Map(nodes.map((node) => [idOf(node), []]))
	const reverse = new Map(nodes.map((node) => [idOf(node), []]))
	validEdges.forEach((edge) => {
		forward.get(edge[keys.from]).push(edge[keys.to])
		reverse.get(edge[keys.to]).push(edge[keys.from])
	})

	if (nodes.length > 1) {
		nodes.forEach((node) => {
			if (reverse.get(idOf(node)).length === 0 && forward.get(idOf(node)).length === 0) {
				issues.push({
					type: 'warning',
					code: STATE_MACHINE_RULES.ORPHAN_STATE,
					message: message('ORPHAN_STATE', { name: node[keys.label] || idOf(node) }),
				})
			}
		})
	}

	// Starting states are those nothing leads into. When every state has an
	// incoming transition there is no entry point, so nothing is reachable.
	const reachable = new Set()
	const queue = nodes.filter((node) => reverse.get(idOf(node)).length === 0).map(idOf)
	while (queue.length > 0) {
		const current = queue.shift()
		if (!reachable.has(current)) {
			reachable.add(current)
			forward.get(current).forEach((next) => queue.push(next))
		}
	}
	finals.forEach((node) => {
		if (!reachable.has(idOf(node))) {
			issues.push({
				type: 'error',
				code: STATE_MACHINE_RULES.UNREACHABLE_FINAL,
				message: message('UNREACHABLE_FINAL', { name: node[keys.label] || idOf(node) }),
			})
		}
	})

	const reachesFinal = new Set(finals.map(idOf))
	const back = finals.map(idOf)
	while (back.length > 0) {
		reverse.get(back.shift()).forEach((previous) => {
			if (!reachesFinal.has(previous)) {
				reachesFinal.add(previous)
				back.push(previous)
			}
		})
	}

	const WHITE = 0
	const GREY = 1
	const BLACK = 2
	const colour = new Map(nodes.map((node) => [idOf(node), WHITE]))
	const stack = []
	const reported = new Set()
	const visit = (id) => {
		colour.set(id, GREY)
		stack.push(id)
		forward.get(id).forEach((next) => {
			if (colour.get(next) === GREY) {
				const cycle = stack.slice(stack.indexOf(next))
				const cycleKey = [...cycle].sort().join(',')
				if (!reported.has(cycleKey) && !cycle.some((member) => reachesFinal.has(member))) {
					reported.add(cycleKey)
					issues.push({
						type: 'warning',
						code: STATE_MACHINE_RULES.CYCLE_NO_EXIT,
						message: message('CYCLE_NO_EXIT', { names: cycle.map(nameOf).join(' → ') }),
					})
				}
			} else if (colour.get(next) === WHITE) {
				visit(next)
			}
		})
		stack.pop()
		colour.set(id, BLACK)
	}
	nodes.forEach((node) => {
		if (colour.get(idOf(node)) === WHITE) {
			visit(idOf(node))
		}
	})

	return issues
}
