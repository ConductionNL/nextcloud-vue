/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Why a person is getting a notification, and whether they can stop it.
 *
 * FOUR LEVELS, NARROWEST SET VALUE WINNING, except that the top one is not the
 * narrowest — it is the one nobody may overrule:
 *
 *   app default  →  group value  →  the person's own  →  FORCED
 *
 * The first three are the ordinary precedence: an administrator sets a group
 * default and a person overrules it for themselves. A FORCED channel is a
 * different thing. It is an administrator saying this kind goes out over this
 * channel whatever anybody prefers, and openregister applies it above the
 * preference rather than as another default.
 *
 * 🔴 A FORCED VALUE MUST BE VISIBLE AS FORCED, NOT RENDERED AS A SETTING. The
 * failure this exists to stop is a screen showing a toggle the person can move,
 * which then does nothing: they switch a notification off, they keep receiving
 * it, and nothing on the page ever said why. A cell that is forced says so,
 * says who forced it, and does not pretend to be editable.
 *
 * 🔴 A CHANNEL REFUSED FOR THIS RECIPIENT IS A REFUSAL, NOT AN ABSENCE. An
 * internal kind addressed to somebody outside the organisation comes back
 * refused with a reason. Rendering that as "no channels available" would read
 * as a configuration gap somebody should go and fix, when it is a rule working
 * correctly. The reason is carried so the screen can say it.
 *
 * Pure: no store, no fetch, no Vue.
 */

/** Where a cell's value came from. */
export const PREFERENCE_LEVELS = Object.freeze({
	DEFAULT: 'app-default',
	GROUP: 'group',
	PERSONAL: 'personal',
	FORCED: 'forced',
})

/**
 * Resolve one cell.
 *
 * @param {object} options - The call.
 * @param {boolean} [options.appDefault] - What the app ships with.
 * @param {?boolean} [options.groupValue] - What an administrator set for the group.
 * @param {?boolean} [options.personalValue] - What this person set.
 * @param {?object} [options.forced] - `{ value, by, reason }` when an
 *   administrator has taken this cell out of the person's hands.
 *
 * @return {object} `{ value, level, editable, forcedBy, reason }`.
 */
export function resolvePreference({
	appDefault = false,
	groupValue = null,
	personalValue = null,
	forced = null,
} = {}) {
	if (forced && typeof forced === 'object') {
		return {
			value: forced.value !== false,
			level: PREFERENCE_LEVELS.FORCED,
			// NOT editable. A toggle that moves and changes nothing is worse
			// than a locked one, because the person believes they have acted.
			editable: false,
			forcedBy: String(forced.by ?? ''),
			reason: String(forced.reason ?? ''),
		}
	}

	if (personalValue !== null && personalValue !== undefined) {
		return editableAt(personalValue, PREFERENCE_LEVELS.PERSONAL)
	}

	if (groupValue !== null && groupValue !== undefined) {
		return editableAt(groupValue, PREFERENCE_LEVELS.GROUP)
	}

	return editableAt(appDefault, PREFERENCE_LEVELS.DEFAULT)
}

/**
 * A resolved value the person may still change.
 *
 * @param {boolean} value - The value.
 * @param {string} level - Where it came from.
 * @return {object} The resolution.
 */
function editableAt(value, level) {
	return { value: value === true, level, editable: true, forcedBy: '', reason: '' }
}

/**
 * Whether a channel can carry this kind to this recipient at all.
 *
 * @param {object} options - The call.
 * @param {object} [options.channel] - `{ id, configured, unconfiguredReason }`.
 * @param {?object} [options.refusal] - `{ reason }` when the platform refused
 *   this kind for this recipient over this channel.
 *
 * @return {object} `{ usable, cause, reason }`.
 */
export function channelAvailability({ channel = {}, refusal = null } = {}) {
	// A REFUSAL COMES FIRST, because it is the more specific answer and the one
	// with a reason worth reading. A channel that is both unconfigured and
	// refused should say the rule, not the gap: fixing the configuration would
	// not change the outcome.
	if (refusal && typeof refusal === 'object') {
		return { usable: false, cause: 'refused', reason: String(refusal.reason ?? '') }
	}

	if (channel.configured === false) {
		return {
			usable: false,
			cause: 'unconfigured',
			reason: String(channel.unconfiguredReason ?? ''),
		}
	}

	return { usable: true, cause: '', reason: '' }
}
