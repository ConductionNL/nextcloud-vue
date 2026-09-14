/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Wait for a CONDITION, never for a duration.
 *
 * WHY THIS EXISTS
 *
 * This suite lost roughly one spec per full run, a different one each time,
 * and every one of them passed in isolation. That is not flakiness to be
 * tolerated: it is a spec waiting a fixed number of milliseconds for
 * asynchronous work instead of waiting for the thing it is about to assert.
 * Such a wait holds on a quiet machine and loses on a loaded one, and when it
 * loses the failure names the feature (`expected 1 call, received 0`) rather
 * than the wait that was too short.
 *
 * `flushPromises()` covers microtask work and is the right tool there. It
 * cannot cover a macrotask — a `setTimeout` debounce in the product, a
 * FileReader, a timer-driven poll — so those need this instead: poll for the
 * state the assertion is about, and fail with a message that says what never
 * happened.
 *
 * A real debounce IS a duration in the product, and this helper does not
 * pretend otherwise: it simply refuses to turn that duration into the test's
 * own deadline. The deadline here is generous on purpose, so a loaded runner
 * costs the run a few milliseconds instead of a red cell.
 *
 * It is 3000 ms rather than 5000 BECAUSE Jest's own per-test timeout is 5000:
 * a deadline at the same number can never be reached, Jest's generic "Exceeded
 * timeout of 5000 ms" wins the race, and the message naming what never
 * happened — the entire point of this helper — is never printed. Verified by
 * mutation: at 5000 the broken debounce reported Jest's timeout, at 3000 it
 * reports "the debounced search refetch had not happened". Still ten times the
 * longest real debounce these specs wait on (600 ms).
 *
 * @param {Function} check Predicate that becomes true once the work has landed.
 * @param {string} what What we are waiting for, named in the timeout message.
 * @param {number} [timeoutMs] How long to wait before giving up.
 * @return {Promise<void>} Resolves once the predicate holds.
 */
export async function settleUntil(check, what, timeoutMs = 3000) {
	const deadline = Date.now() + timeoutMs
	while (!check() && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 5))
	}
	if (!check()) {
		throw new Error(`${what} had not happened after ${timeoutMs} ms`)
	}
}
