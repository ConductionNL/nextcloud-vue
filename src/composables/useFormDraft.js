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

import { getCurrentUser } from '@nextcloud/auth'
import { translate as t } from '@nextcloud/l10n'

/** How long a draft stays interesting, in milliseconds (7 days). */
export const DRAFT_MAX_AGE_MS = (7 * 24 * 60 * 60 * 1000)

/** How long to wait after the last keystroke before writing, in milliseconds. */
export const DRAFT_DEBOUNCE_MS = 500

/** The prefix every draft key carries, so a sweep can find them. */
export const DRAFT_KEY_PREFIX = 'cn-form-draft'

/** The user part of a draft key when nobody is signed in. */
export const DRAFT_ANONYMOUS_USER = 'anonymous'

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
		String(userId || DRAFT_ANONYMOUS_USER),
	].join(':')
}

/**
 * Who a draft belongs to: the id the host passed, else the signed-in
 * Nextcloud user, else '' (which {@link draftKey} stores as `anonymous`).
 *
 * 🔴 A HOST THAT PASSES NOTHING STILL GETS PER-USER DRAFTS. Leaving the user
 * to every host meant no host passed it, and every draft on a shared device
 * was keyed `anonymous`: the next person at the counter was offered what the
 * last one typed.
 *
 * @param {string} [explicit] The id the host passed (`draftUserId`).
 * @return {string} The user id, or '' when nobody is signed in.
 * @spec openspec/changes/form-draft-on-change-and-help-text-spacing/specs/form-draft-on-change-and-help-text-spacing/spec.md#requirement-a-draft-belongs-to-the-signed-in-user
 */
export function resolveDraftUserId(explicit = '') {
	if (explicit) {
		return String(explicit)
	}
	try {
		const uid = getCurrentUser()?.uid
		return uid ? String(uid) : ''
	} catch {
		// No Nextcloud page around us (a test, an embed): nobody is signed in.
		return ''
	}
}

/**
 * Remove every draft stored under the anonymous user.
 *
 * Called once a signed-in user is known. Such a draft was written by a page
 * that did not know who was typing, so it may be somebody else's, and it is
 * deleted rather than moved: moving it would hand it to whoever opened the
 * form next.
 *
 * @return {number} How many drafts were removed.
 * @spec openspec/changes/form-draft-on-change-and-help-text-spacing/specs/form-draft-on-change-and-help-text-spacing/spec.md#requirement-a-draft-belongs-to-the-signed-in-user
 */
export function clearAnonymousDrafts() {
	let removed = 0
	try {
		const storage = window.localStorage
		const suffix = ':' + DRAFT_ANONYMOUS_USER
		const doomed = []
		for (let i = 0; i < storage.length; i++) {
			const key = storage.key(i)
			if (key && key.startsWith(DRAFT_KEY_PREFIX + ':') && key.endsWith(suffix)) {
				doomed.push(key)
			}
		}
		for (const key of doomed) {
			storage.removeItem(key)
			removed++
		}
	} catch {
		// Blocked storage holds no drafts to leak.
	}
	return removed
}

/**
 * Whether a value counts as empty for a draft: null, undefined, '' and [].
 *
 * @param {unknown} value The value.
 * @return {boolean} True when empty.
 */
function isEmptyDraftValue(value) {
	return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
}

/**
 * Whether two field values are the same for the purpose of a draft.
 *
 * Empty values are equal to each other: an input reports a missing value back
 * as '', and that is the control normalising, not a person typing.
 *
 * @param {unknown} a One value.
 * @param {unknown} b The other.
 * @return {boolean} True when they are the same.
 */
export function sameDraftValue(a, b) {
	if (isEmptyDraftValue(a) && isEmptyDraftValue(b)) {
		return true
	}
	if (a === b) {
		return true
	}
	try {
		return JSON.stringify(a) === JSON.stringify(b)
	} catch {
		return false
	}
}

/**
 * Whether a person changed the form: one of the fields they edited holds a
 * value different from the one the form opened with.
 *
 * 🔴 ONLY EDITED FIELDS COUNT. A form fills in values by itself after it
 * opens (defaults, normalised dates, the active organisation, options that
 * arrive later). Counting those wrote a draft and said "Saved just now" on a
 * dialog nobody had touched.
 *
 * @param {object} values The current values.
 * @param {object} baseline The values the form opened with.
 * @param {string[]} editedKeys The fields a person edited.
 * @return {boolean} True when there is something worth keeping.
 * @spec openspec/changes/form-draft-on-change-and-help-text-spacing/specs/form-draft-on-change-and-help-text-spacing/spec.md#requirement-a-draft-is-written-only-after-a-person-changes-a-field
 */
export function hasDraftChanges(values, baseline, editedKeys) {
	const now = values || {}
	const base = baseline || {}
	return (editedKeys || []).some((key) => !sameDraftValue(now[key], base[key]))
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
 * What the draft indicator says: "Saving" while a local write is pending,
 * "Saved just now" / "Saved 3 minutes ago" once it landed, nothing before that.
 *
 * After a failed save (`options.saveFailed`) it never says Saving or Saved:
 * next to a server error those words read as if the record had been saved.
 * It then says "Draft kept on this device" when a local copy is stored, and
 * nothing otherwise.
 *
 * @param {string} state `idle`, `saving` or `saved`.
 * @param {number} [savedAt] When the last write landed, in epoch ms.
 * @param {number} [now] The current epoch ms, for testing.
 * @param {{saveFailed?: boolean}} [options] `saveFailed`: the form shows a failed save.
 * @return {string} The text, or '' when it says nothing.
 * @spec openspec/changes/cell-labels-and-draft-indicator/specs/cell-labels-and-draft-indicator/spec.md#requirement-the-draft-indicator-never-reads-as-a-server-save-after-a-failed-save
 */
export function draftIndicatorText(state, savedAt = 0, now = Date.now(), options = {}) {
	if (options && options.saveFailed === true) {
		return state === 'saved' ? t('nextcloud-vue', 'Draft kept on this device') : ''
	}
	if (state === 'saving') {
		return t('nextcloud-vue', 'Saving')
	}
	if (state !== 'saved') {
		return ''
	}
	const minutes = Math.floor(Math.max(0, now - savedAt) / 60000)
	if (!savedAt || minutes < 1) {
		return t('nextcloud-vue', 'Saved just now')
	}
	try {
		const relative = new Intl.RelativeTimeFormat(document.documentElement.lang || 'en', { numeric: 'auto' }).format(-minutes, 'minute')
		return t('nextcloud-vue', 'Saved {time}', { time: relative })
	} catch {
		return t('nextcloud-vue', 'Saved')
	}
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
				/** When the last local write landed, in epoch ms. */
				draftSavedAt: 0,
				/** Non-reactive handle for the debounce. */
				draftTimeout: null,
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
					const stored = writeDraft(key, values)
					this.draftState = stored ? 'saved' : 'idle'
					this.draftSavedAt = stored ? Date.now() : 0
				}, DRAFT_DEBOUNCE_MS)
			},

			/**
			 * The form is back to what it opened with: cancel a pending write,
			 * remove a draft written earlier and stop announcing anything.
			 *
			 * @param {string} key The storage key.
			 * @return {void}
			 * @spec openspec/changes/form-draft-on-change-and-help-text-spacing/specs/form-draft-on-change-and-help-text-spacing/spec.md#requirement-a-draft-is-written-only-after-a-person-changes-a-field
			 */
			settleUnchangedDraft(key) {
				if (this.draftTimeout) {
					clearTimeout(this.draftTimeout)
					this.draftTimeout = null
				}
				if (this.draftState !== 'idle') {
					clearDraft(key)
					this.draftState = 'idle'
					this.draftSavedAt = 0
				}
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
