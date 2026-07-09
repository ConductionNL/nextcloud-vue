/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Generic offline data-collection core — public surface.
 *
 * Reusable offline-sync infrastructure extracted from procest's
 * `mobiel-inspectie-offline` PWA so any Conduction app can collect field data
 * offline by registering a checklist/planning schema instead of re-implementing
 * the IndexedDB cache, mutation queue, replay loop and sync-state indicator.
 *
 * @module integrations/offline
 */

export {
	cacheKey,
	getDb,
	storePlanning,
	getPlannedItems,
	getCachedObject,
	getPlanningMeta,
	enqueueMutation,
	countPending,
	resolveDeviceId,
	__setDexie,
	__resetDbForTests,
} from './offlineDb.js'

export {
	BACKOFF_SCHEDULE_MS,
	MAX_ATTEMPTS,
	TERMINAL_STATUSES,
	orderForReplay,
	delayForAttempt,
	canRetry,
	classifyConflict,
	isConflictRetryable,
	nextState,
	resolveConflictChoice,
	diffVersions,
} from './syncQueueEngine.js'

export { replayOperation, drainQueue } from './syncReplayService.js'

export {
	toDayString,
	buildPlanningQuery,
	fetchPlanning,
	fetchReferences,
} from './planningFetch.js'

export {
	GPS_POOR_ACCURACY_M,
	classifyGps,
	validateChecklistAnswers,
	checklistProgress,
	syncIndicator,
} from './fieldCollectionHelpers.js'
