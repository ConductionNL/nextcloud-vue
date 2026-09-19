/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * useFormDraft — keep what somebody typed when the dialog closes on them.
 *
 * A handler filling a 27-field case type form and losing the tab starts over.
 * This writes the values to `localStorage` as they type and offers them back
 * the next time the same form opens.
 *
 * 🔴 IT NEVER DECIDES TO RESTORE. The draft is offered and the person chooses.
 * Silently refilling a form is how somebody submits last week's answers without
 * noticing they were there, and a form that fills itself is indistinguishable
 * from a form the server prefilled.
 *
 * 🔴 EVERY READ AND WRITE IS WRAPPED. `localStorage` throws in a private
 * window, with site data blocked, and inside some embedded webviews. A draft
 * that cannot be saved is a small loss; a dialog that will not open because
 * saving the draft threw is a large one.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not touch the server. A keystroke
 * autosave against the object API writes an audit row for every half-typed
 * value, and the audit trail is read by people answering "who changed this".
 */

/** How long a draft stays interesting, in milliseconds (7 days). */
export const DRAFT_MAX_AGE_MS = (7 * 24 * 60 * 60 * 1000)

/** How long to wait after the last keystroke before writing, in milliseconds. */
export const DRAFT_DEBOUNCE_MS = 500

/** The prefix every draft key carries, so a sweep can find them. */
export const DRAFT_KEY_PREFIX = 'cn-form-draft'

/**
 * The storage key one form's draft lives under.
 *
 * 🔴 THE USER ID IS PART OF THE KEY. A shared browser profile at a service
 * desk is the ordinary case in a municipality, and a draft keyed without the
 * user hands the next person at the counter what the last one typed.
 *
 * @param {object} parts The identifying parts.
 * @param {string} [parts.appId] The app the form belongs to.
 * @param {string} [parts.schema] The schema being filled in.
 * @param {string} [parts.objectId] The object being edited, or '' when new.
 * @param {string} [parts.userId] Who is typing.
 * @return {string} The storage key.
 */
export function draftKey({ appId = '', schema = '', objectId = '', userId = '' } = {}) {
	return [
		DRAFT_KEY_PREFIX,
		String(appId || 'app'),
		String(schema || 'schema'),
		String(objectId || 'new'),
		String(userId || 'anonymous'),
	].join(':')
}

/**
 * Read one draft back, or null when there is nothing usable.
 *
 * Returns null for an absent key, unreadable storage, unparseable JSON, a
 * draft older than {@link DRAFT_MAX_AGE_MS}, and a draft older than the object
 * it belongs to. That last one matters: a colleague who saved the record after
 * you started typing has said something more recent than your draft, and
 * offering yours on top would invite you to overwrite them without being told.
 *
 * @param {string} key The storage key.
 * @param {object} [options] Reading options.
 * @param {string} [options.objectUpdated] The object's `updated` timestamp, when it has one.
 * @param {number} [options.now] The current epoch ms, for testing.
 * @return {{values: object, savedAt: number}|null} The draft, or null.
 */
export function readDraft(key, { objectUpdated = '', now = Date.now() } = {}) {
	let raw
	try {
		raw = window.localStorage.getItem(key)
	} catch {
		// Blocked or unavailable storage reads as "no draft", never as a throw.
		return null
	}

	if (!raw) {
		return null
	}

	let parsed
	try {
		parsed = JSON.parse(raw)
	} catch {
		// A corrupted entry is dropped rather than offered. Nothing here can
		// repair it, and offering half a form is worse than offering none.
		clearDraft(key)
		return null
	}

	if (!parsed || typeof parsed !== 'object' || typeof parsed.savedAt !== 'number') {
		clearDraft(key)
		return null
	}

	if ((now - parsed.savedAt) > DRAFT_MAX_AGE_MS) {
		clearDraft(key)
		return null
	}

	if (objectUpdated) {
		const updatedAt = Date.parse(String(objectUpdated))
		if (!Number.isNaN(updatedAt) && updatedAt > parsed.savedAt) {
			// The record moved on after this draft was written.
			clearDraft(key)
			return null
		}
	}

	if (!parsed.values || typeof parsed.values !== 'object') {
		clearDraft(key)
		return null
	}

	return { values: parsed.values, savedAt: parsed.savedAt }
}

/**
 * Write one draft.
 *
 * @param {string} key The storage key.
 * @param {object} values The form values.
 * @param {number} [now] The current epoch ms, for testing.
 * @return {boolean} True when it was stored.
 */
export function writeDraft(key, values, now = Date.now()) {
	try {
		window.localStorage.setItem(
			key,
			JSON.stringify({ savedAt: now, values: (values || {}) }),
		)
		return true
	} catch {
		// Quota exceeded, or storage blocked. The form keeps working; the
		// recovery does not exist for this session. Reported to the caller so
		// the indicator can stay quiet rather than claim "Saved".
		return false
	}
}

/**
 * Forget one draft.
 *
 * @param {string} key The storage key.
 * @return {void}
 */
export function clearDraft(key) {
	try {
		window.localStorage.removeItem(key)
	} catch {
		// Nothing to do and nothing worth failing a dialog over.
	}
}

/**
 * The Options API mixin the library's components use.
 *
 * A mixin rather than a Vue 3 composable, because these components are Options
 * API and the library builds for both Vue 2.7 and Vue 3.
 *
 * @return {object} The mixin.
 */
export function formDraftMixin() {
	return {
		data() {
			return {
				/** The draft offered on open, or null when there is none. */
				draftOffer: null,
				/** 'idle' | 'saving' | 'saved' — what the indicator announces. */
				draftState: 'idle',
				/** Non-reactive handle for the debounce. */
				draftTimeout: null,
				/**
				 * Whether the form's own initial population has happened.
				 *
				 * The first change to the values is the component building
				 * them, not a person typing. See the watcher that reads this.
				 */
				draftSeeded: false,
			}
		},

		beforeUnmount() {
			if (this.draftTimeout) {
				clearTimeout(this.draftTimeout)
				this.draftTimeout = null
			}
		},

		methods: {
			/**
			 * Schedule a draft write, debounced.
			 *
			 * @param {string} key The storage key.
			 * @param {object} values The current form values.
			 * @return {void}
			 */
			scheduleDraftWrite(key, values) {
				if (!key) {
					return
				}

				this.draftState = 'saving'
				if (this.draftTimeout) {
					clearTimeout(this.draftTimeout)
				}

				this.draftTimeout = setTimeout(() => {
					this.draftTimeout = null
					// 'idle' and not 'saved' when the write failed: an
					// indicator that says Saved about a draft that is not
					// stored is the whole class of defect this library has
					// been paying down, in the one place a user is trusting it.
					this.draftState = writeDraft(key, values) ? 'saved' : 'idle'
				}, DRAFT_DEBOUNCE_MS)
			},

			/**
			 * Drop the draft and stop announcing anything about it.
			 *
			 * @param {string} key The storage key.
			 * @return {void}
			 */
			forgetDraft(key) {
				if (this.draftTimeout) {
					clearTimeout(this.draftTimeout)
					this.draftTimeout = null
				}

				clearDraft(key)
				this.draftOffer = null
				this.draftState = 'idle'
			},
		},
	}
}
