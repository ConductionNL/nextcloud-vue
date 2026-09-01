/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * Pure layout for flow graphs whose nodes carry no usable positions.
 *
 * A flow declared in a schema's `x-openregister-flows` (and any generated or
 * imported flow) ships nodes with no coordinates at all. Rendered as-is, all
 * of them land on one point: the canvas shows one node's worth of pixels with
 * seventeen more underneath, and no amount of fit-view or zoom can separate
 * them. The run replay's per-node badges paint correctly — onto a pile nobody
 * can read.
 *
 * The functions here are PURE and deterministic: same nodes, same lines, same
 * start ids — same coordinates, every time. They never touch a store, never
 * read the DOM, and never mutate their inputs, which is what makes them safe
 * to run on a published (graph-locked) flow: the caller decides what to do
 * with the returned array, and a viewer that only renders it has mutated
 * nothing. This is also why the layout lives here and not in CnGraphCanvas:
 * per ADR-065 the canvas renders the geometry it is given and never invents
 * any.
 *
 * The algorithm is a small layered pass, on purpose. dagre and friends are
 * real dependencies with real weight, the in-app CSP allows no CDN fetch, and
 * nothing in the dependency tree ships a layout engine — while the layouts a
 * flow needs (left-to-right, branches fanned out, loops tolerated) fit in the
 * three steps below:
 *
 *   1. LAYER: longest-path columns over the graph with its back edges
 *      dropped, so triggers sit left and every forward edge points right.
 *      Back edges are found by depth-first search; dropping them is what
 *      makes a loop terminate instead of pushing its members ever further
 *      right (or hanging).
 *   2. ORDER: one barycenter pass per column — a node sits near the average
 *      row of the nodes that lead to it, which keeps parallel branches apart
 *      instead of braided.
 *   3. PLACE: fixed spacing on a grid. One column and row per node, so no
 *      two nodes can overlap by construction.
 */

/**
 * Horizontal distance between layout columns, in canvas pixels.
 *
 * Sized against the node card (~230px wide) so the edge between two adjacent
 * columns has room for its arrowhead and result badge.
 *
 * @type {number}
 */
export const FLOW_LAYOUT_COLUMN_WIDTH = 260

/**
 * Vertical distance between layout rows, in canvas pixels.
 *
 * About a card high plus a gap, for the same reason as the column width.
 *
 * @type {number}
 */
export const FLOW_LAYOUT_ROW_HEIGHT = 170

/**
 * Left margin before the first column, in canvas pixels.
 *
 * @type {number}
 */
export const FLOW_LAYOUT_MARGIN = 60

/**
 * Top margin above the first row, in canvas pixels.
 *
 * The editor's toolbar FLOATS over the canvas (position: absolute, ~52px
 * tall). A node laid out at a uniform 60px margin landed UNDER it, and an
 * overlaid node is not merely ugly — it is unreachable: the toolbar swallows
 * the pointer. Measured live: Playwright reported `cn-flow-detail__toolbar
 * subtree intercepts pointer events` on a node behind it.
 *
 * @type {number}
 */
export const FLOW_LAYOUT_TOP = 96

/**
 * The position a node carries, in either of the two spellings in circulation.
 *
 * The server stores `position: {x, y}`; the editor writes flat `x`/`y` in
 * memory. Reading only one spelling is the bug that once piled every saved
 * flow onto the origin, so both are read here, flat first — the same order
 * `useFlowStore.hasPosition()` and the canvas mapping use.
 *
 * A node AT the origin still counts as positioned: (0, 0) is a legitimate
 * place to park something. Whether a WHOLE GRAPH of identical points counts
 * is a different question, answered by {@link needsFullLayout}.
 *
 * @param {object} node A flow node.
 * @return {{x: number, y: number}|null} Its point, or null when it has none.
 */
export function readNodePoint(node) {
	const x = Number(node?.x ?? node?.position?.x)
	if (!Number.isFinite(x)) {
		return null
	}

	const y = Number(node?.y ?? node?.position?.y)
	return { x, y: Number.isFinite(y) ? y : 0 }
}

/**
 * Whether the whole graph needs laying out from scratch.
 *
 * True in exactly two situations:
 *
 * - NO node carries a position. Declared, generated and imported flows all
 *   arrive like this.
 * - Every node that does carry a position sits on the SAME point, and at
 *   least two do. That is not an arrangement, it is the same pile with
 *   coordinates written down — an importer that stamps `{x: 0, y: 0}` on
 *   every node produces it, and it must not be mistaken for a deliberate
 *   layout. A single node parked at one point (the origin included) stays
 *   where its author put it.
 *
 * Anything else — at least two distinct positioned points — is treated as
 * arranged: someone chose those places, and a layout that second-guesses them
 * throws that choice away. Position-less nodes in an arranged flow are the
 * caller's problem; {@link placeLooseNodes} slots them beneath.
 *
 * @param {Array<object>} nodes The flow's nodes.
 * @return {boolean} True when nothing about the current positions is worth keeping.
 */
export function needsFullLayout(nodes) {
	const list = Array.isArray(nodes) ? nodes : []
	if (!list.length) {
		return false
	}

	const points = []
	for (const node of list) {
		const point = readNodePoint(node)
		if (point !== null) {
			points.push(point)
		}
	}

	if (!points.length) {
		return true
	}

	return points.length >= 2
		&& points.every((p) => p.x === points[0].x && p.y === points[0].y)
}

/**
 * Column per node id: longest path from the start nodes, back edges dropped.
 *
 * Depth-first search from the start ids classifies back edges — an edge whose
 * target is still on the current DFS stack closes a loop. Those edges are
 * excluded from layering, which is what lets a flow with a loop (send back to
 * the submitter, wait, check again) lay out finitely: without it, longest
 * path around a cycle is unbounded. The back edge is still DRAWN, of course —
 * only the layering ignores it.
 *
 * Nodes the start ids cannot reach go one column past everything — never at
 * the origin, where they would hide under the entry points.
 *
 * @param {Array<object>} nodes The flow's nodes.
 * @param {Array<{source: string, target: string}>} lines The expanded edges.
 * @param {Array<string>} startIds The ids a run enters through.
 * @return {Map<string, number>} Node id to zero-based column.
 */
function layerColumns(nodes, lines, startIds) {
	const ids = new Set(nodes.map((node) => node.id))
	const outgoing = new Map()
	for (const line of lines) {
		if (line.source === line.target || !ids.has(line.source) || !ids.has(line.target)) {
			continue
		}
		if (!outgoing.has(line.source)) {
			outgoing.set(line.source, [])
		}
		outgoing.get(line.source).push(line.target)
	}

	// DFS: classify back edges and record a reverse postorder (a topological
	// order of the graph minus its back edges). Iterative, because a flow's
	// depth is user-controlled and the call stack is not.
	const seen = new Set()
	const onStack = new Set()
	const forward = new Map()
	const postorder = []
	for (const startId of startIds) {
		if (!ids.has(startId) || seen.has(startId)) {
			continue
		}

		const stack = [{ id: startId, next: 0 }]
		seen.add(startId)
		onStack.add(startId)
		while (stack.length) {
			const frame = stack[stack.length - 1]
			const targets = outgoing.get(frame.id) || []
			if (frame.next >= targets.length) {
				stack.pop()
				onStack.delete(frame.id)
				postorder.push(frame.id)
				continue
			}

			const target = targets[frame.next++]
			if (onStack.has(target)) {
				// A back edge: drawing it is fine, layering on it is not.
				continue
			}

			if (!forward.has(frame.id)) {
				forward.set(frame.id, [])
			}
			forward.get(frame.id).push(target)

			if (!seen.has(target)) {
				seen.add(target)
				onStack.add(target)
				stack.push({ id: target, next: 0 })
			}
		}
	}

	// Longest path over the acyclic remainder, in topological order: a node
	// sits one column past the furthest node that leads to it.
	const columns = new Map()
	for (const startId of startIds) {
		if (seen.has(startId)) {
			columns.set(startId, 0)
		}
	}
	for (let i = postorder.length - 1; i >= 0; i--) {
		const id = postorder[i]
		const from = columns.get(id) ?? 0
		columns.set(id, from)
		for (const target of (forward.get(id) || [])) {
			if ((columns.get(target) ?? -1) < from + 1) {
				columns.set(target, from + 1)
			}
		}
	}

	const unreachableColumn = (Math.max(-1, ...columns.values()) + 1)
	for (const node of nodes) {
		if (!columns.has(node.id)) {
			columns.set(node.id, unreachableColumn)
		}
	}

	return columns
}

/**
 * Row per node id: barycenter order within each column.
 *
 * One left-to-right pass. A node's sort key is the mean row of the already
 * placed nodes that lead into it, so a branch follows the branch point it
 * came from instead of braiding across the others. Ties — and nodes with no
 * placed predecessor — keep the document's own node order, which is what
 * makes the whole pass deterministic.
 *
 * @param {Array<object>} nodes The flow's nodes, in document order.
 * @param {Array<{source: string, target: string}>} lines The expanded edges.
 * @param {Map<string, number>} columns Node id to column, from layering.
 * @return {Map<string, number>} Node id to zero-based row within its column.
 */
function orderRows(nodes, lines, columns) {
	const incoming = new Map()
	for (const line of lines) {
		if (line.source === line.target) {
			continue
		}
		if (!incoming.has(line.target)) {
			incoming.set(line.target, [])
		}
		incoming.get(line.target).push(line.source)
	}

	const byColumn = new Map()
	for (const [index, node] of nodes.entries()) {
		const column = columns.get(node.id)
		if (!byColumn.has(column)) {
			byColumn.set(column, [])
		}
		byColumn.get(column).push({ id: node.id, index })
	}

	const rows = new Map()
	const columnKeys = [...byColumn.keys()].sort((a, b) => a - b)
	for (const column of columnKeys) {
		const members = byColumn.get(column)
		const keyed = members.map((member) => {
			const placed = (incoming.get(member.id) || [])
				.map((source) => rows.get(source))
				.filter((row) => row !== undefined)
			const barycenter = placed.length
				? placed.reduce((sum, row) => sum + row, 0) / placed.length
				: member.index
			return { ...member, barycenter }
		})
		keyed.sort((a, b) => (a.barycenter - b.barycenter) || (a.index - b.index))
		for (const [row, member] of keyed.entries()) {
			rows.set(member.id, row)
		}
	}

	return rows
}

/**
 * Lay every node out on the grid, document order preserved.
 *
 * Coordinates and NOTHING else change — each returned node is a copy of the
 * input node with `x`, `y` and `position` set, in both spellings, because
 * both are in circulation (see {@link readNodePoint}) and a layout that only
 * writes one does not survive the save round trip. The input array and its
 * nodes are never mutated.
 *
 * No two nodes can share a point: every node gets its own (column, row) cell
 * and cells are spaced by fixed offsets.
 *
 * @param {Array<object>} nodes The flow's nodes.
 * @param {Array<{source: string, target: string}>} lines The expanded edges.
 * @param {Array<string>} startIds The ids a run enters through.
 * @return {Array<object>} New node objects carrying computed positions.
 */
export function layoutFlowNodes(nodes, lines, startIds) {
	const list = Array.isArray(nodes) ? nodes : []
	if (!list.length) {
		return []
	}

	const columns = layerColumns(list, lines, startIds)
	const rows = orderRows(list, lines, columns)

	return list.map((node) => {
		const x = FLOW_LAYOUT_MARGIN + (columns.get(node.id) * FLOW_LAYOUT_COLUMN_WIDTH)
		const y = FLOW_LAYOUT_TOP + (rows.get(node.id) * FLOW_LAYOUT_ROW_HEIGHT)
		return { ...node, x, y, position: { x, y } }
	})
}

/**
 * Slot position-less nodes beneath an arranged graph, leaving it untouched.
 *
 * A flow with even one deliberately placed node is treated as arranged, and
 * an arranged flow is never rearranged behind its author's back. But the
 * nodes that DO lack positions still may not pile onto the origin — under
 * the arranged nodes, most likely — so they get the same layered pass as a
 * full layout, shifted below the lowest positioned node. Left-to-right order
 * still follows the run, and rows are counted among the loose nodes only.
 *
 * Positioned nodes are returned exactly as given (the same object, not a
 * copy), which is what "untouched" means here: reference equality is the
 * proof no field changed.
 *
 * @param {Array<object>} nodes The flow's nodes, some positioned and some not.
 * @param {Array<{source: string, target: string}>} lines The expanded edges.
 * @param {Array<string>} startIds The ids a run enters through.
 * @return {Array<object>} The same array shape, loose nodes placed beneath.
 */
export function placeLooseNodes(nodes, lines, startIds) {
	const list = Array.isArray(nodes) ? nodes : []
	const loose = list.filter((node) => readNodePoint(node) === null)
	if (!loose.length) {
		return list.slice()
	}

	let lowest = -Infinity
	for (const node of list) {
		const point = readNodePoint(node)
		if (point !== null && point.y > lowest) {
			lowest = point.y
		}
	}
	const top = Math.max(
		FLOW_LAYOUT_TOP,
		lowest === -Infinity ? FLOW_LAYOUT_TOP : lowest + FLOW_LAYOUT_ROW_HEIGHT,
	)

	// Columns come from the WHOLE graph, so a loose node keeps its place in
	// the run order; rows count loose nodes only, so the strip below the
	// arranged graph stays as short as the loose nodes make it.
	const columns = layerColumns(list, lines, startIds)
	const rowsTaken = new Map()

	return list.map((node) => {
		if (readNodePoint(node) !== null) {
			return node
		}

		const column = columns.get(node.id)
		const row = rowsTaken.get(column) || 0
		rowsTaken.set(column, row + 1)

		const x = FLOW_LAYOUT_MARGIN + (column * FLOW_LAYOUT_COLUMN_WIDTH)
		const y = top + (row * FLOW_LAYOUT_ROW_HEIGHT)
		return { ...node, x, y, position: { x, y } }
	})
}
