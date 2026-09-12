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
	__resetDbForTests,
	__setDexie,
	cacheKey,
	countPending,
	enqueueMutation,
	getCachedObject,
	getDb,
	getPlannedItems,
	getPlanningMeta,
	resolveDeviceId,
	storePlanning,
} from './offlineDb.js'

export {
	BACKOFF_SCHEDULE_MS,
	canRetry,
	classifyConflict,
	delayForAttempt,
	diffVersions,
	isConflictRetryable,
	MAX_ATTEMPTS,
	nextState,
	orderForReplay,
	resolveConflictChoice,
	TERMINAL_STATUSES,
} from './syncQueueEngine.js'

export { drainQueue, replayOperation } from './syncReplayService.js'

export {
	buildPlanningQuery,
	fetchPlanning,
	fetchReferences,
	toDayString,
} from './planningFetch.js'

export {
	checklistProgress,
	classifyGps,
	GPS_POOR_ACCURACY_M,
	syncIndicator,
	validateChecklistAnswers,
} from './fieldCollectionHelpers.js'
