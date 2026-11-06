/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * The list reading of a flow: the trigger, then the steps in run order.
 *
 * Nothing here is stored. The rows are derived from the flow document the
 * canvas draws and every change goes back into that document, so the two views
 * cannot drift.
 *
 * A `graph` is `{ nodes, lines, startIds, roleOf }`: the document's nodes, the
 * store's `canvasEdges`, its `startNodeIds` and its `roleOfNodeType`.
 */

/**
 * @param {object} node A flow node.
 * @return {{x: number, y: number}} Where it stands on the canvas.
 */
function placeOf(node) {
	return { x: node.position?.x ?? node.x ?? 0, y: node.position?.y ?? node.y ?? 0 }
}

/**
 * @param {Array<object>} lines The lines.
 * @param {string} key `source` or `target`.
 * @return {Map<string, Array<object>>} The lines by that end.
 */
function linesBy(lines, key) {
	const grouped = new Map()
	lines.forEach((line) => grouped.set(line[key], [...(grouped.get(line[key]) || []), line]))

	return grouped
}

/**
 * The lines that lead onward from the starts. A line back into a step still
 * open is a loop, and a loop has no order to contribute.
 *
 * @param {object} graph The graph.
 * @param graph.lines
 * @param graph.startIds
 * @return {Array<object>} The lines without those going back.
 */
function forwardLines({ lines, startIds }) {
	const outgoing = linesBy(lines, 'source')
	const seen = new Map()
	const kept = []
	const visit = (id) => {
		seen.set(id, 'open')
		for (const line of outgoing.get(id) || []) {
			if (seen.get(line.target) !== 'open') {
				kept.push(line)
			}
			if (!seen.has(line.target)) {
				visit(line.target)
			}
		}
		seen.set(id, 'done')
	}
	startIds.filter((id) => !seen.has(id)).forEach(visit)

	return kept
}

/**
 * How many steps deep each reached node is, by its longest way in.
 *
 * @param {object} graph The graph.
 * @return {Map<string, number>} The depth per node id; a loose node has none.
 */
function depths(graph) {
	const lines = forwardLines(graph)
	const depth = new Map(graph.startIds.map((id) => [id, 0]))
	const deepen = ({ source, target }) => {
		if (depth.has(source) && (depth.get(target) ?? -1) <= depth.get(source)) {
			depth.set(target, depth.get(source) + 1)
		}
	}
	graph.nodes.forEach(() => lines.forEach(deepen))

	return depth
}

/**
 * The nodes in run order: by depth, then top to bottom and left to right as
 * they stand on the canvas. Nodes nothing leads to come last.
 *
 * @param {object} graph The graph.
 * @return {Array<{node: object, loose: boolean}>} The ordered nodes.
 */
export function orderFlowNodes(graph) {
	const depth = depths(graph)
	const entries = graph.nodes.map((node, index) => ({
		node,
		index,
		loose: !depth.has(node.id),
		depth: depth.get(node.id) ?? Infinity,
		...placeOf(node),
	}))
	const byDepth = (a, b) => (a.loose === b.loose ? (a.loose ? 0 : a.depth - b.depth) : (a.loose ? 1 : -1))

	return entries.sort((a, b) => byDepth(a, b) || a.y - b.y || a.x - b.x || a.index - b.index)
}

/**
 * @param {object} line A drawn line.
 * @return {string} When it is taken: its name, else its condition in words.
 */
function lineText(line) {
	return line.data?.label || line.data?.conditionText || ''
}

/**
 * The chip on a step: when the line into it is taken. A plain line in means
 * the step is reached regardless, so there is no condition to name.
 *
 * @param {Array<object>} into The lines into the step.
 * @return {string} The chip's text, or ''.
 */
function whenText(into) {
	const texts = into.map(lineText)
	if (texts.length === 0 || texts.includes('')) {
		return ''
	}
	if (into.every((line) => !line.data?.label && !line.data?.condition)) {
		return texts[0]
	}

	return t('nextcloud-vue', 'Only if {condition}', { condition: texts.join(` ${t('nextcloud-vue', 'or')} `) })
}

/**
 * @param {object} graph The graph.
 * @param {string} id A node id.
 * @return {{into: Array<object>, out: Array<object>}} The lines of that node.
 */
function linesOf(graph, id) {
	return {
		into: graph.lines.filter((line) => line.target === id),
		out: graph.lines.filter((line) => line.source === id),
	}
}

/**
 * @param {object} node A node.
 * @return {boolean} Whether it routes through declared exits.
 */
function branches(node) {
	return Array.isArray(node.exits) && node.exits.length > 0
}

/**
 * @param {object} graph The graph.
 * @param {object} node A node.
 * @return {boolean} Whether it may trade places with a neighbour.
 */
function isMovable(graph, node) {
	return !branches(node) && !node.start && !node.initial && graph.roleOf(node.type) === 'step'
}

/**
 * Whether two neighbours in the list are a plain link of one chain: only then
 * does swapping them mean what the arrows promise. Steps on a branch keep their
 * place until the canvas moves them.
 *
 * @param {object} graph The graph.
 * @param {Array<object>} pair The first and the second node.
 * @return {boolean} Whether they can swap.
 */
function canSwap(graph, [first, second]) {
	if (!isMovable(graph, first) || !isMovable(graph, second)) {
		return false
	}
	const { out } = linesOf(graph, first.id)
	const { into, out: onward } = linesOf(graph, second.id)

	return out.length === 1 && out[0].target === second.id && into.length === 1 && onward.length <= 1
}

/**
 * @param {object} graph The graph.
 * @return {Array<object>} The steps in order, triggers left out.
 */
function orderedSteps(graph) {
	return orderFlowNodes(graph).filter(({ node }) => graph.roleOf(node.type) !== 'trigger')
}

/**
 * The two steps a move would swap.
 *
 * @param {object} graph The graph.
 * @param {{id: string, by: number}} move The step and -1 (up) or 1 (down).
 * @return {Array<string>|null} Their ids, first in the list first; null when the move cannot be made.
 */
export function flowStepSwap(graph, { id, by }) {
	const steps = orderedSteps(graph).map((entry) => entry.node)
	const index = steps.findIndex((node) => node.id === id)
	const pair = by < 0 ? [steps[index - 1], steps[index]] : [steps[index], steps[index + 1]]
	if (index < 0 || !pair[0] || !pair[1]) {
		return null
	}

	return canSwap(graph, pair) ? pair.map((node) => node.id) : null
}

/**
 * Where a step's lines lead, as the routes under a branching step.
 *
 * @param {Array<object>} out The step's outgoing lines.
 * @param {object} names `{ numbers, titleOf }`: step numbers by id and a name fallback.
 * @param names.numbers
 * @param names.titleOf
 * @return {Array<{id: string, label: string, to: string}>} The routes; none when it does not branch.
 */
function routesOf(out, { numbers, titleOf }) {
	if (out.length < 2) {
		return []
	}

	return out.map((line) => ({
		id: line.id,
		label: lineText(line) || t('nextcloud-vue', 'Otherwise'),
		to: numbers.has(line.target) ? t('nextcloud-vue', 'Step {n}', { n: numbers.get(line.target) }) : titleOf(line.target),
	}))
}

/**
 * @param {object} graph The graph.
 * @param {object} names `{ numbers, titleOf }`: step numbers by id and a name by node.
 * @return {(entry: {node: object, loose: boolean}) => object} Builds one row.
 */
function rowBuilder(graph, names) {
	return ({ node, loose }) => {
		const { into, out } = linesOf(graph, node.id)

		return { id: node.id, node, role: graph.roleOf(node.type), loose, n: names.numbers.get(node.id), when: whenText(into), routes: routesOf(out, names) }
	}
}

/**
 * The rows of the list.
 *
 * @param {object} graph The graph.
 * @param {(node: object) => string} titleOf The name a node goes by.
 * @return {{triggers: Array<object>, steps: Array<object>}} The rows.
 */
export function flowStepRows(graph, titleOf) {
	const ordered = orderFlowNodes(graph)
	const steps = ordered.filter(({ node }) => graph.roleOf(node.type) !== 'trigger')
	const numbers = new Map(steps.map(({ node }, index) => [node.id, index + 1]))
	const row = rowBuilder(graph, { numbers, titleOf: (id) => titleOf(graph.nodes.find((node) => node.id === id) || { id }) })
	const swaps = (index) => index >= 0 && index + 1 < steps.length && canSwap(graph, [steps[index].node, steps[index + 1].node])

	return {
		triggers: ordered.filter(({ node }) => graph.roleOf(node.type) === 'trigger').map(row),
		steps: steps.map((entry, index) => ({ ...row(entry), canMoveUp: swaps(index - 1), canMoveDown: swaps(index) })),
	}
}

/**
 * @param {string|Array<string>} value An edge endpoint, one id or a list.
 * @param {(id: string) => string} change What becomes of an id.
 * @return {string|Array<string>} The endpoint with the ids changed.
 */
function mapEndpoint(value, change) {
	return Array.isArray(value) ? value.map(change) : change(value)
}

/**
 * @param {object} edge A stored edge.
 * @param {object} change `{ keys, map }`: the endpoint keys to touch and what becomes of an id.
 * @param change.keys
 * @param change.map
 * @return {object} The edge with those endpoints changed, in its own spelling.
 */
function mapEdge(edge, { keys, map }) {
	const next = { ...edge }
	keys.filter((key) => key in next).forEach((key) => {
		next[key] = mapEndpoint(next[key], map)
	})

	return next
}

/**
 * Swap two steps in the stored edges, whichever spelling they use. What led
 * into the first now leads into the second, and the other way round.
 *
 * @param {Array<object>} edges The stored edges.
 * @param {Array<string>} pair The two ids.
 * @return {Array<object>} The new edges.
 */
export function swapStepEdges(edges, [first, second]) {
	const map = (id) => (id === first ? second : (id === second ? first : id))

	return edges.map((edge) => mapEdge(edge, { keys: ['from', 'to', 'source', 'target'], map }))
}

/**
 * @param {object} node A node.
 * @return {object} Its canvas place, in the spellings it carries.
 */
function placeFields(node) {
	const { x, y, position } = node

	return { x, y, position }
}

/**
 * Swap two steps' places on the canvas, so the canvas reads as the list does.
 *
 * @param {Array<object>} nodes The nodes.
 * @param {Array<string>} pair The two ids.
 * @return {Array<object>} The new nodes.
 */
export function swapStepPlaces(nodes, [first, second]) {
	const a = nodes.find((node) => node.id === first)
	const b = nodes.find((node) => node.id === second)
	const places = new Map([[first, placeFields(b)], [second, placeFields(a)]])

	return nodes.map((node) => (places.has(node.id) ? { ...node, ...places.get(node.id) } : node))
}

/**
 * Where a step added at the bottom of the list goes in the flow.
 *
 * @param {object} graph The graph, before the step is added.
 * @return {{end: object|null, last: object|null}} The closing step, and the step left without a way on.
 */
export function flowStepTail(graph) {
	const reached = orderFlowNodes(graph).filter((entry) => !entry.loose).map((entry) => entry.node)
	const ends = reached.filter((node) => graph.roleOf(node.type) === 'end')
	const open = reached.filter((node) => graph.roleOf(node.type) !== 'end' && linesOf(graph, node.id).out.length === 0)

	return { end: ends[ends.length - 1] || null, last: open[open.length - 1] || null }
}

/**
 * The edges with a new step in at the bottom: before the closing step when
 * there is one, else after the last step.
 *
 * @param {Array<object>} edges The stored edges.
 * @param {object} insert `{ id, end, last }`: the new step and flowStepTail()'s answer.
 * @param insert.id
 * @param insert.end
 * @param insert.last
 * @return {Array<object>} The new edges.
 */
export function insertStepEdges(edges, { id, end, last }) {
	const map = (target) => (target === end?.id ? id : target)
	const leadsToEnd = (edge) => end !== null && [].concat(edge.to ?? edge.target).includes(end.id)
	const reachesEnd = edges.some(leadsToEnd)
	const before = last !== null && !reachesEnd ? [{ from: last.id, to: id }] : []
	const after = end !== null ? [{ from: id, to: end.id }] : []

	return [...edges.map((edge) => mapEdge(edge, { keys: ['to', 'target'], map })), ...before, ...after]
}

/**
 * The edge that closes the gap a removed step leaves in a chain.
 *
 * @param {object} graph The graph.
 * @param {string} id The step being removed.
 * @return {object|null} The edge, or null when the step is not a plain link of a chain.
 */
export function flowStepBridge(graph, id) {
	const node = graph.nodes.find((candidate) => candidate.id === id)
	const { into, out } = linesOf(graph, id)
	const plain = node && !branches(node) && into.length === 1 && out.length === 1
	if (!plain || out[0].target === into[0].source) {
		return null
	}
	const edge = into[0].data.edge
	const single = !Array.isArray(edge.from ?? edge.source) && !Array.isArray(edge.to ?? edge.target)

	return single ? { ...edge, ['to' in edge ? 'to' : 'target']: out[0].target } : null
}
