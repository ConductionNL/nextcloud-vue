/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

const SIDES = ['top', 'right', 'bottom', 'left']

/**
 * How far chrome floating over a frame reaches into it, per side.
 *
 * A box taller than half the frame is a side panel and reserves its width on
 * the side it stands; any other box is a strip and reserves its height from
 * the top or the bottom, whichever half holds its centre. Boxes with no size
 * (not drawn) are skipped.
 *
 * @param {DOMRect|object|null} frame The frame's rect.
 * @param {Array<DOMRect|object|null>} rects The floating boxes' rects.
 * @return {{top: number, right: number, bottom: number, left: number}} Pixels per side.
 */
export function overlayInset(frame, rects) {
	const inset = { top: 0, right: 0, bottom: 0, left: 0 }
	if (!frame || !frame.width || !frame.height) {
		return inset
	}
	for (const rect of rects || []) {
		if (!rect || !rect.width || !rect.height) {
			continue
		}
		if (rect.height > frame.height / 2) {
			if (rect.left + rect.width / 2 > frame.left + frame.width / 2) {
				inset.right = Math.max(inset.right, frame.right - rect.left)
			} else {
				inset.left = Math.max(inset.left, rect.right - frame.left)
			}
		} else if (rect.top + rect.height / 2 < frame.top + frame.height / 2) {
			inset.top = Math.max(inset.top, rect.bottom - frame.top)
		} else {
			inset.bottom = Math.max(inset.bottom, frame.bottom - rect.top)
		}
	}
	return inset
}

/**
 * Vue Flow's fit padding for a canvas with chrome over it: each side's inset
 * plus a gap, in pixels. Without an inset, Vue Flow's own 0.1.
 *
 * @param {object|null} inset Pixels per side, as overlayInset returns.
 * @param {number} gap Pixels kept clear beyond the inset.
 * @return {number|object} The `padding` for Vue Flow's fitView.
 */
export function fitPaddingFor(inset, gap = 24) {
	if (!inset || !SIDES.some((side) => inset[side] > 0)) {
		return 0.1
	}
	return Object.fromEntries(SIDES.map((side) => [side, `${Math.round((inset[side] || 0) + gap)}px`]))
}
