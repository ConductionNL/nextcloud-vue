/**
 * Built-in integration registrations.
 *
 * The five always-available integrations (`files`, `notes`, `tags`,
 * `tasks`, `audit-trail`) that mirror OpenRegister's built-in PHP
 * `IntegrationProvider`s, plus bespoke overrides for leaf integrations
 * that need a richer UI than the generic `CnIntegrationTab` /
 * `CnIntegrationCard` pair (currently: `version-history`, `calendar`,
 * `contacts`, `email`, `talk`, `deck`, `bookmarks`, `polls`, `shares`,
 * `xwiki`, `openproject`, `activity`, `forms`, `flow`, `collectives`,
 * `maps`, `photos`, `analytics`, `cospend`, `time-tracker`).
 *
 * Each entry maps onto a sidebar tab plus a compact widget for
 * dashboard / detail surfaces.
 *
 * OpenRegister's main bundle calls `registerBuiltinIntegrations()`
 * once at bootstrap BEFORE `registerLeafIntegrations()` (see
 * `openregister/src/main.js`), so the bespoke pairs below win over
 * the generic leaf-factory entries still in `leaves.js` via the
 * AD-13 first-wins collision policy. `leaves.js` stays as the
 * no-bespoke-installed fallback.
 *
 * Bespoke leaf overrides are listed AFTER the canonical five so the
 * documented core ordering — `files`, `notes`, `tags`, `tasks`,
 * `audit-trail` — stays stable for snapshot consumers; within the
 * bespoke block, ordering follows the group hierarchy
 * (comms → docs → workflow → external) used in `leaves.js`.
 *
 * @module integrations/builtin
 */

import { integrations as defaultRegistry } from '../registry.js'
import { filesIntegration } from './files.js'
import { notesIntegration } from './notes.js'
import { tagsIntegration } from './tags.js'
import { tasksIntegration } from './tasks.js'
import { auditTrailIntegration } from './audit-trail.js'
import { versionHistoryIntegration } from './version-history.js'
import { calendarIntegration } from './calendar.js'
import { contactsIntegration } from './contacts.js'
import { contactmomentIntegration } from './contactmoment.js'
import { emailIntegration } from './email.js'
import { talkIntegration } from './talk.js'
import { bookmarksIntegration } from './bookmarks.js'
import { collectivesIntegration } from './collectives.js'
import { mapsIntegration } from './maps.js'
import { photosIntegration } from './photos.js'
import { deckIntegration } from './deck.js'
import { pollsIntegration } from './polls.js'
import { sharesIntegration } from './shares.js'
import { activityIntegration } from './activity.js'
import { analyticsIntegration } from './analytics.js'
import { cospendIntegration } from './cospend.js'
import { flowIntegration } from './flow.js'
import { formsIntegration } from './forms.js'
import { timeTrackerIntegration } from './time-tracker.js'
import { openprojectIntegration } from './openproject.js'
import { fieldInspectionIntegration } from './field-inspection.js'
import { xwikiIntegration } from './xwiki.js'

/**
 * Ordered list of the built-in integration descriptors.
 *
 * The first five are the canonical built-ins mirroring the PHP-side
 * providers (`files`, `notes`, `tags`, `tasks`, `audit-trail`).
 * Bespoke leaf overrides follow, ordered by group (comms → docs →
 * workflow → external) to mirror `leaves.js`.
 *
 * @type {object[]}
 */
export const builtinIntegrations = [
	filesIntegration,
	notesIntegration,
	tagsIntegration,
	tasksIntegration,
	auditTrailIntegration,
	versionHistoryIntegration,
	// comms
	calendarIntegration,
	contactsIntegration,
	contactmomentIntegration,
	emailIntegration,
	talkIntegration,
	// docs
	bookmarksIntegration,
	collectivesIntegration,
	mapsIntegration,
	photosIntegration,
	// workflow
	deckIntegration,
	pollsIntegration,
	sharesIntegration,
	activityIntegration,
	analyticsIntegration,
	cospendIntegration,
	flowIntegration,
	formsIntegration,
	timeTrackerIntegration,
	fieldInspectionIntegration,
	// external
	openprojectIntegration,
	xwikiIntegration,
]

/**
 * Register every built-in integration onto a registry. Existing
 * registrations win (collision policy: first wins), so this is safe
 * to call after consuming apps have pre-registered overrides — the
 * collision warning is suppressed here on purpose.
 *
 * @param {object} [registry] Registry instance (default: the singleton).
 *
 * @return {string[]} The ids that were newly registered (skipped ones excluded).
 */
export function registerBuiltinIntegrations(registry) {
	const target = registry || defaultRegistry
	const registered = []
	for (const descriptor of builtinIntegrations) {
		if (target.has(descriptor.id) === true) {
			continue
		}
		// Mark as lib-owned so useIntegrationRegistry's resolveTab /
		// resolveWidget can swap to the rendering bundle's LOCAL
		// component for these ids (avoiding the ADR-019 dual-Vue trap —
		// see openregister#1958). Consumer-custom registrations omit the
		// marker and continue to resolve via their stored component.
		const result = target.register({ ...descriptor, __libOwned: true })
		if (result !== null) {
			registered.push(descriptor.id)
		}
	}
	return registered
}

export {
	filesIntegration,
	notesIntegration,
	tagsIntegration,
	tasksIntegration,
	auditTrailIntegration,
	versionHistoryIntegration,
	calendarIntegration,
	contactsIntegration,
	contactmomentIntegration,
	emailIntegration,
	talkIntegration,
	bookmarksIntegration,
	collectivesIntegration,
	mapsIntegration,
	photosIntegration,
	deckIntegration,
	pollsIntegration,
	sharesIntegration,
	activityIntegration,
	analyticsIntegration,
	cospendIntegration,
	flowIntegration,
	formsIntegration,
	timeTrackerIntegration,
	fieldInspectionIntegration,
	openprojectIntegration,
	xwikiIntegration,
}
