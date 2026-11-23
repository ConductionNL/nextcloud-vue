/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a drop on a board actually does.
 *
 * 🔴 A DROP ASKS THE HOST TO RUN A TRANSITION. IT NEVER WRITES THE STATUS
 * FIELD. Writing the field directly would put the card in the new column and
 * skip every guard, every side effect and every audit entry the transition
 * carries: the board would become a way to move a case past a rule that the
 * same move through the case page refuses. A board is a nicer way to do a
 * thing, never a way to do a different thing.
 *
 * 🔴 A REFUSAL RETURNS THE CARD AND SHOWS THE GUARD'S OWN WORDS. A card that
 * stayed in the new column after a refusal is a lie about where the work is,
 * and it survives a page refresh as a surprise. A generic "could not move" in
 * place of the guard's sentence throws away the only text that says WHY, which
 * is the thing the person has to act on.
 *
 * 🔴 A CARD SOMEBODY ELSE HAS MOVED IS RE-READ, NEVER FORCED. Two people on
 * one board is the ordinary case, not the exotic one. If the card is no longer
 * where the dragger thought it was, their drop was a decision about a state
 * that no longer exists.
 *
 * Pure: no store, no fetch, no Vue. The host supplies `runTransition`.
 */

/** What a drop did, or why it did not. */
export const DROP_OUTCOMES = Object.freeze({
	MOVED: 'moved',
	REFUSED: 'refused',
	STALE: 'stale',
	NOOP: 'noop',
})

/**
 * Run a board drop through the host's transition.
 *
 * @param {object} options - The call.
 * @param {object} options.card - The card dropped.
 * @param {string} options.fromKey - The column it came from.
 * @param {string} options.toKey - The column it was dropped on.
 * @param {string} options.statusField - Where the status lives on a card.
 * @param {(move: {card: object, toKey: string}) => Promise<object>} options.runTransition -
 *   The host's transition. It is the ONLY way the status changes.
 * @param {?((card: object) => Promise<object>)} [options.reread] - To check
 *   the card is still where the dragger thought before asking for the move.
 *
 * @return {Promise<object>} `{ outcome, message, card }`.
 */
export async function runBoardDrop({
	card,
	fromKey = '',
	toKey = '',
	statusField = '',
	runTransition,
	reread = null,
} = {}) {
	if (String(fromKey) === String(toKey)) {
		// Dropped back where it came from. Asking the host to transition a
		// case to the status it already has would write an audit entry for
		// something nobody did.
		return { outcome: DROP_OUTCOMES.NOOP, message: '', card }
	}

	if (typeof reread === 'function') {
		let current
		try {
			current = await reread(card)
		} catch {
			// Unreadable is not the same as moved. Treating it as stale would
			// refuse an ordinary drop every time the network hiccuped, so the
			// move goes ahead and the transition itself is the authority.
			current = null
		}

		if (current && String(current[statusField] ?? '') !== String(fromKey)) {
			return {
				outcome: DROP_OUTCOMES.STALE,
				message: '',
				// The card AS IT NOW IS, so the caller re-renders the truth
				// rather than putting the dragger's stale copy back.
				card: current,
			}
		}
	}

	try {
		const moved = await runTransition({ card, toKey })
		return { outcome: DROP_OUTCOMES.MOVED, message: '', card: moved || card }
	} catch (error) {
		return {
			outcome: DROP_OUTCOMES.REFUSED,
			// The guard's own sentence. It is the only text that says why, and
			// it is what the person has to act on.
			message: messageOf(error),
			card,
		}
	}
}

/**
 * The message a refusal carries.
 *
 * @param {object} error - What the transition threw.
 * @return {string} The guard's sentence, or the empty string.
 */
function messageOf(error) {
	const candidates = [
		error?.response?.data?.message,
		error?.response?.data?.error,
		error?.message,
	]

	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.trim() !== '') {
			return candidate.trim()
		}
	}

	// Empty rather than invented. A caller that gets nothing can say "the move
	// was refused" in its own words; one handed a made-up sentence cannot tell
	// that apart from the guard's.
	return ''
}
