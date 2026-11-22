/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * linkButtonActionType — the action types a link button entry can carry,
 * shared by CnLinkButtonWidget and CnLinkButtonWidgetForm.
 *
 * The single-button content spells its types `external` / `internal` /
 * `createFile`; the list-mode schema spells the first two `url` and
 * `action_id`. Both spellings resolve to the same canonical type, so an
 * `action_id` entry dispatches through the host's action registry instead of
 * falling through to an external link.
 */

export const LINK_ACTION_TYPES = Object.freeze({
	EXTERNAL: 'external',
	INTERNAL: 'internal',
	CREATE_FILE: 'createFile',
})

const ALIASES = Object.freeze({
	url: LINK_ACTION_TYPES.EXTERNAL,
	action_id: LINK_ACTION_TYPES.INTERNAL,
})

/**
 * Resolve a declared action type to its canonical value.
 *
 * @param {*} declared the stored `actionType`.
 * @return {string} `external`, `internal` or `createFile`; anything unknown is `external`.
 */
export function normaliseLinkActionType(declared) {
	if (declared === LINK_ACTION_TYPES.INTERNAL || declared === LINK_ACTION_TYPES.CREATE_FILE) {
		return declared
	}
	if (typeof declared === 'string' && Object.hasOwn(ALIASES, declared)) {
		return ALIASES[declared]
	}
	return LINK_ACTION_TYPES.EXTERNAL
}
