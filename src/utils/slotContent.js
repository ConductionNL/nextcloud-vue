/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

import { Comment, Fragment, Text } from 'vue'

/**
 * Whether a rendered slot produced anything a user can actually see.
 *
 * A non-empty vnode array is NOT evidence of content: Vue hands back a
 * `Comment` placeholder for a falsy `v-if`, and a whitespace-only `Text` node
 * for a stray newline between tags. Both have to read as "empty", or a
 * consumer who merely wrote the template across two lines counts as having
 * filled the slot.
 *
 * That distinction decides layout in two places, which is why it lives here
 * rather than in either of them. `CnDetailPage` uses it to decide whether to
 * render its auto-body. `CnWidgetWrapper` uses it to decide whether its header
 * band is worth the vertical space: `CnObjectDataWidget` always PROVIDES the
 * `actions` template and fills it only while an edit is unsaved, so reading
 * the template's presence gave a tab panel a 59px empty bar with a divider
 * rule under it on every case that was not being edited.
 *
 * @param {Array} nodes Vnodes returned by calling a slot function.
 * @return {boolean} True when at least one vnode renders visible content.
 */
export function hasRenderableContent(nodes) {
	if (!Array.isArray(nodes)) {
		return false
	}
	return nodes.some((vnode) => {
		if (!vnode || vnode.type === Comment) {
			return false
		}
		if (vnode.type === Text) {
			return String(vnode.children ?? '').trim() !== ''
		}
		if (vnode.type === Fragment) {
			return hasRenderableContent(vnode.children)
		}
		return true
	})
}

/**
 * Whether a slot FUNCTION, if provided at all, renders visible content.
 *
 * Call this from a template or a method rather than caching it in a computed:
 * the answer changes when the parent's own state changes (an unsaved edit
 * appearing), and a computed that reads `$slots` does not re-track that.
 *
 * @param {Function|undefined} slot A slot function off `$slots`.
 * @return {boolean} True when calling it yields visible content.
 */
export function slotRenders(slot) {
	if (typeof slot !== 'function') {
		return false
	}
	try {
		return hasRenderableContent(slot())
	} catch (e) {
		// A slot that throws while being probed is the caller's problem to see
		// at render time, not a reason to decide the layout question wrongly.
		// Treating it as filled keeps the controls' home.
		return true
	}
}
