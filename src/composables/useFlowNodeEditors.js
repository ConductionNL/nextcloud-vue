// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.
//
// The per-node-type editor registry for the flow editor.
//
// A node whose configuration IS another product surface — a synchronization,
// a mapping, a source — deserves that surface as its editor, not a generic
// form over its config keys. An app registers its editor component here at
// bootstrap; CnFlowDetail opens it instead of the generic CnFlowNodeEditModal
// when the edited node's type has one.
//
// THE CONTRACT a registered editor signs up to (the same one the generic
// dialog implements): it reads the node through `useFlowStore()` —
// `editingNode` / `editingNodeId` — edits a DRAFT of its own, commits via
// `setNodeConfigById(id, config)` (+ `setNodeName(id, name)`) and closes by
// setting `editingNodeId = null`. Cancel = close without committing. The
// registry hands over rendering, never the draft semantics.

const editors = new Map()

/**
 * Register the editor component for one node type.
 *
 * Last registration wins, with a console.warn on the collision — an app
 * hot-reloading its bundle re-registers, and refusing that would make dev
 * builds sticky. Register at app bootstrap, before a flow editor can open.
 *
 * @param {string} nodeId The catalogue node id, e.g. `openconnector.synchronization-run`.
 * @param {object} component The Vue component to render as the node's editor.
 * @return {void}
 */
export function registerFlowNodeEditor(nodeId, component) {
	if (editors.has(nodeId)) {
		console.warn(`registerFlowNodeEditor: replacing the editor for "${nodeId}"`)
	}

	editors.set(nodeId, component)
}

/**
 * The registered editor for a node type, or null for the generic dialog.
 *
 * @param {string} nodeId The catalogue node id.
 * @return {object|null} The component.
 */
export function resolveFlowNodeEditor(nodeId) {
	return editors.get(nodeId) || null
}

/**
 * Drop a registration. Exists for tests; apps have no reason to call it.
 *
 * @param {string} nodeId The catalogue node id.
 * @return {void}
 */
export function unregisterFlowNodeEditor(nodeId) {
	editors.delete(nodeId)
}
