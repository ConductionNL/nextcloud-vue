/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useObjectActions: the actions OpenRegister lets the person run on an object,
 * or on a selection of a schema's objects, and the one way to run them.
 *
 * The list comes from OpenRegister, which has already left out what the
 * person may not run and marked with a reason what cannot run now. A host
 * renders it and adds nothing: no rights, no list of its own. The contract
 * is in `utils/objectActions.js`.
 *
 * @module composables/useObjectActions
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md
 */

import { emit } from '@nextcloud/event-bus'
import { getLanguage } from '@nextcloud/l10n'
import { getCurrentScope, onScopeDispose, ref, toValue, watch } from 'vue'
import {
	actionsForSurface,
	readObjectActions,
	readSelectionActions,
	runObjectAction,
	runSelectionAction,
	watchActionRun,
} from '../utils/objectActions.js'

/**
 * The language labels resolve in. Falls back to English when Nextcloud's
 * l10n is not set up (a test, a public page without it).
 *
 * @return {string}
 */
function readerLanguage() {
	try {
		return getLanguage() || 'en'
	} catch {
		return 'en'
	}
}

/**
 * Read and run the actions of one object, or of a selection.
 *
 * @param {object|import('vue').Ref<object>|(() => object)} target `{ register, schema, id }`
 *   for one object; without `id` the actions offered on a selection.
 * @param {object} [options] Options.
 * @param {boolean} [options.immediate] Read the list at once and again when the target changes (default true).
 * @param {number} [options.pollInterval] Milliseconds between reads of an async run.
 * @return {object} `{ actions, loading, failed, unsupported, running, progress,
 *   lastResult, refresh, forSurface, find, run, runOnSelection, stop }`.
 *
 * @example
 * const { forSurface, run } = useObjectActions(() => ({ register, schema, id }))
 * const buttons = computed(() => forSurface('header'))
 * const result = await run('publish', { from: '2026-11-01' })
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-a-host-reads-the-actions-of-an-object-from-openregister
 */
export function useObjectActions(target, { immediate = true, pollInterval = 1500 } = {}) {
	const actions = ref([])
	const loading = ref(false)
	const failed = ref(false)
	const unsupported = ref(false)
	const running = ref('')
	const progress = ref(null)
	const lastResult = ref(null)
	let watcher = null
	let readCount = 0

	/** @return {{register: string, schema: string, id: string}} The target now. */
	const current = () => {
		const value = toValue(target) || {}
		return {
			register: String(value.register ?? ''),
			schema: String(value.schema ?? ''),
			id: String(value.id ?? ''),
		}
	}

	/**
	 * Read the list again. A read that started earlier and answers later is
	 * dropped, so a fast target change never shows the old object's actions.
	 *
	 * @return {Promise<void>}
	 */
	const refresh = async () => {
		const at = current()
		const count = ++readCount
		loading.value = true
		const language = readerLanguage()
		const answer = at.id !== ''
			? await readObjectActions(at, { language })
			: await readSelectionActions(at, { language })
		if (count !== readCount) {
			return
		}
		actions.value = answer.actions
		failed.value = answer.failed
		unsupported.value = answer.unsupported
		loading.value = false
	}

	/**
	 * The listed actions offered on one surface, narrowed to `include`.
	 *
	 * @param {string} surface `header`, `row`, `bulk` or `detail-menu`.
	 * @param {Array<string>} [include] The keys to keep, in their order.
	 * @return {Array<object>}
	 */
	const forSurface = (surface, include) => actionsForSurface(actions.value, surface, include)

	/**
	 * One listed action by key.
	 *
	 * @param {string} key The action key.
	 * @return {object|null}
	 */
	const find = (key) => actions.value.find((action) => action.key === key) || null

	/** Stop following an async run. */
	const stop = () => {
		if (watcher) {
			watcher.stop()
			watcher = null
		}
	}

	/**
	 * After a run that changed something: read the list again and ask the
	 * page to refresh, since the object, its status and its actions moved.
	 *
	 * @param {string} key The action that ran.
	 * @return {Promise<void>}
	 */
	const afterChange = async (key) => {
		emit('cn:page:refresh', { source: 'object-action', action: key })
		await refresh()
	}

	/**
	 * Follow an async run until it ends; `progress` holds what is known of it.
	 *
	 * @param {string} key The action.
	 * @param {object} result The 202 result.
	 * @return {Promise<object>} The result, with the final run status.
	 */
	const follow = async (key, result) => {
		progress.value = { action: key, run: result.run, status: result.status, steps: 0, error: '' }
		if (result.run === '') {
			return result
		}
		stop()
		watcher = watchActionRun(result.run, {
			interval: pollInterval,
			onUpdate: (run) => {
				if (run) {
					progress.value = { action: key, run: run.uuid, status: run.status, steps: run.steps, error: run.error }
				}
			},
		})
		const run = await watcher.done
		watcher = null
		const finished = run ? { ...result, status: run.status, ok: !run.failed, message: run.error || result.message || '' } : result
		lastResult.value = finished
		if (run && run.status === 'completed') {
			await afterChange(key)
		}
		return finished
	}

	/**
	 * Run one action on the object. A sync run answers its outcome; an async
	 * or suspended one answers at once and is followed in `progress`.
	 *
	 * @param {string} key The action key.
	 * @param {object} [inputs] The collected inputs.
	 * @param {object} [options] Options.
	 * @param {boolean} [options.follow] Follow an async run here (default true). A
	 *   host that shows the progress itself passes false.
	 * @return {Promise<object>} The result; see `runObjectAction`.
	 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-a-run-reports-what-happened
	 */
	const run = async (key, inputs = {}, { follow: track = true } = {}) => {
		running.value = key
		progress.value = null
		const result = await runObjectAction(current(), key, inputs)
		running.value = ''
		lastResult.value = result
		if (!result.ok) {
			return result
		}
		if (result.status === 'queued' || result.status === 'suspended') {
			if (track && result.status === 'queued') {
				return follow(key, result)
			}
			progress.value = { action: key, run: result.run, status: result.status, steps: 0, error: '' }
			return result
		}
		await afterChange(key)
		return result
	}

	/**
	 * Run one action on a selection.
	 *
	 * @param {string} key The action key.
	 * @param {Array<string>} ids The selected ids.
	 * @param {object} [inputs] The collected inputs.
	 * @return {Promise<object>} The result; see `runSelectionAction`.
	 */
	const runOnSelection = async (key, ids, inputs = {}) => {
		running.value = key
		const result = await runSelectionAction(current(), key, ids, inputs)
		running.value = ''
		lastResult.value = result
		if (result.ok) {
			emit('cn:page:refresh', { source: 'object-action', action: key })
		}
		return result
	}

	if (immediate) {
		watch(() => JSON.stringify(current()), () => {
			refresh()
		}, { immediate: true })
	}

	if (getCurrentScope()) {
		onScopeDispose(stop)
	}

	return {
		actions,
		loading,
		failed,
		unsupported,
		running,
		progress,
		lastResult,
		refresh,
		forSurface,
		find,
		run,
		runOnSelection,
		stop,
	}
}
