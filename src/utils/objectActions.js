/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The actions OpenRegister lets a person run on an object, read and run
 * through its one contract (`object-actions-declared-and-run`):
 *
 *  - `GET  /api/objects/{register}/{schema}/{id}/actions` answers
 *    `{ actions: [{ key, kind, label, description, icon, surfaces, available,
 *    reason?, inputs, confirm?, mode, next }] }`. An action the caller may not
 *    run is absent; one whose precondition fails is listed with
 *    `available: false` and its `reason`.
 *  - `GET  /api/object-actions/{register}/{schema}` answers the actions
 *    offered on a selection (the `bulk` surface).
 *  - `POST /api/objects/{register}/{schema}/{id}/actions/{action}` with
 *    `{ inputs }` answers 200 (sync) or 202 (`queued` or `suspended`, with the
 *    run), or refuses with 404, 403, 409 (`action-precondition-unmet`) or 422
 *    (inputs per field, or the body's own refusal).
 *  - `POST /api/object-actions/{register}/{schema}/{action}` with
 *    `{ ids, inputs }` answers a per-object summary, or 202 with a bulk job.
 *  - `GET  /api/flow-runs/{uuid}` reads an async run.
 *  - `GET  /api/objects/{register}/{schema}/{id}/actions/history` lists the
 *    runs of actions on the object.
 *
 * Nothing here decides who may run what: OpenRegister answers that, and
 * checks it again on every run. The reads never throw; the runs answer a
 * result object rather than throwing, so a host shows one sentence either way.
 *
 * @module utils/objectActions
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md
 */

import { humaniseKey } from './humaniseKey.js'
import { resolveLocalised } from './notificationRuleLabel.js'

/** Where a host may offer an action. */
export const OBJECT_ACTION_SURFACES = ['header', 'row', 'bulk', 'detail-menu']

/** The surfaces of an action that names none. */
export const DEFAULT_OBJECT_ACTION_SURFACES = ['header', 'row']

/** The bodies an action runs. `macro` is the older name of `flow`. */
const KINDS = ['transition', 'flow', 'steps']

/** Where a person goes after a run. */
const NEXT_HINTS = ['stay', 'next', 'list']

/** Run statuses after which a run no longer changes. */
export const TERMINAL_RUN_STATUSES = ['completed', 'stopped', 'dead_letter', 'failed']

/**
 * Load axios and the url builder together, so a consumer that never runs an
 * action does not pull them into its bundle.
 *
 * @return {Promise<{axios: object, generateUrl: (url: string, params?: object) => string}>}
 */
async function http() {
	const [{ default: axios }, { generateUrl }] = await Promise.all([
		import('@nextcloud/axios'),
		import('@nextcloud/router'),
	])
	return { axios, generateUrl }
}

/**
 * A non-empty trimmed string, or ''.
 *
 * @param {unknown} value The value.
 * @return {string}
 */
function text(value) {
	return typeof value === 'string' ? value.trim() : ''
}

/**
 * Whether a register, schema and object id are all known.
 *
 * @param {{register?: unknown, schema?: unknown, id?: unknown}} target Where the object lives.
 * @param {boolean} [withId] Whether the object id is needed too.
 * @return {boolean}
 */
function complete(target, withId = true) {
	const parts = [target?.register, target?.schema, ...(withId ? [target?.id] : [])]
	return parts.every((part) => part !== undefined && part !== null && String(part) !== '')
}

/**
 * One listed action in the shape every host reads. A label or confirm text
 * given per locale (`{ nl, en }`) is resolved for `language`. An entry
 * without a key is not an action and answers null.
 *
 * @param {object} entry The entry as OpenRegister lists it.
 * @param {object} [options] Options.
 * @param {string} [options.language] The reader's language.
 * @return {object|null} `{ key, kind, label, description, icon, surfaces,
 *   available, reason, inputs, confirm, mode, next }`.
 */
export function normaliseObjectAction(entry, { language = 'en' } = {}) {
	if (!entry || typeof entry !== 'object') {
		return null
	}
	const key = text(entry.key) || text(entry.action)
	if (key === '') {
		return null
	}
	const kind = entry.kind === 'macro' ? 'flow' : (KINDS.includes(entry.kind) ? entry.kind : 'flow')
	const surfaces = Array.isArray(entry.surfaces)
		? entry.surfaces.filter((surface) => OBJECT_ACTION_SURFACES.includes(surface))
		: [...DEFAULT_OBJECT_ACTION_SURFACES]
	const inputs = entry.inputs && typeof entry.inputs === 'object' && !Array.isArray(entry.inputs) ? entry.inputs : null
	const available = entry.available !== false
	const confirm = entry.confirm === true ? true : resolveLocalised(entry.confirm, language)
	return {
		key,
		kind,
		label: resolveLocalised(entry.label, language) || resolveLocalised(entry.name, language) || humaniseKey(key) || key,
		description: resolveLocalised(entry.description, language),
		icon: text(entry.icon),
		surfaces,
		available,
		reason: available ? '' : (resolveLocalised(entry.reason, language) || resolveLocalised(entry.whenMessage, language)),
		inputs,
		confirm: confirm || '',
		mode: entry.mode === 'async' ? 'async' : 'sync',
		next: NEXT_HINTS.includes(entry.next) ? entry.next : 'stay',
	}
}

/**
 * Whether an action asks for inputs before it runs.
 *
 * @param {object|null} action The normalised action.
 * @return {boolean}
 */
export function hasActionInputs(action) {
	const properties = action?.inputs?.properties
	return Boolean(properties && typeof properties === 'object' && Object.keys(properties).length > 0)
}

/**
 * The actions a surface offers: those whose `surfaces` include it. With
 * `include`, only those keys, in that order; an include list that is not an
 * array offers every action of the surface.
 *
 * @param {Array<object>} actions The normalised actions.
 * @param {string} surface `header`, `row`, `bulk` or `detail-menu`.
 * @param {unknown} [include] The keys a manifest narrows the list to.
 * @return {Array<object>}
 */
export function actionsForSurface(actions, surface, include) {
	const list = Array.isArray(actions) ? actions.filter((action) => action && action.surfaces.includes(surface)) : []
	if (!Array.isArray(include)) {
		return list
	}
	return include
		.map((key) => list.find((action) => action.key === String(key)))
		.filter(Boolean)
}

/**
 * The actions of a list answer, normalised, with entries that are not
 * actions dropped.
 *
 * @param {unknown} data The response body.
 * @param {string} language The reader's language.
 * @return {Array<object>}
 */
function listedActions(data, language) {
	const raw = Array.isArray(data) ? data : data?.actions
	return (Array.isArray(raw) ? raw : [])
		.map((entry) => normaliseObjectAction(entry, { language }))
		.filter(Boolean)
}

/**
 * Read a list endpoint. `unsupported` is true when OpenRegister answers 404
 * for the route itself, an instance that predates object actions; `failed`
 * when it could not be read at all. A 403 is an answer: nothing is offered.
 *
 * @param {string} path The route, with `{}` placeholders.
 * @param {object} params The placeholder values.
 * @param {string} language The reader's language.
 * @return {Promise<{actions: Array<object>, failed: boolean, unsupported: boolean}>}
 */
async function readList(path, params, language) {
	const { axios, generateUrl } = await http()
	try {
		const res = await axios.get(generateUrl(path, params))
		return { actions: listedActions(res?.data, language), failed: false, unsupported: false }
	} catch (e) {
		const status = e?.response?.status
		if (status === 403) {
			return { actions: [], failed: false, unsupported: false }
		}
		return { actions: [], failed: status !== 404, unsupported: status === 404 }
	}
}

/**
 * The actions the person may run on one object.
 *
 * @param {{register: string, schema: string, id: string}} target Where the object lives.
 * @param {object} [options] Options.
 * @param {string} [options.language] The reader's language.
 * @return {Promise<{actions: Array<object>, failed: boolean, unsupported: boolean}>}
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-a-host-reads-the-actions-of-an-object-from-openregister
 */
export async function readObjectActions(target, { language = 'en' } = {}) {
	if (!complete(target)) {
		return { actions: [], failed: false, unsupported: false }
	}
	return readList('/apps/openregister/api/objects/{register}/{schema}/{id}/actions', {
		register: String(target.register),
		schema: String(target.schema),
		id: String(target.id),
	}, language)
}

/**
 * The actions offered on a selection of a schema's objects.
 *
 * @param {{register: string, schema: string}} target The list's register and schema.
 * @param {object} [options] Options.
 * @param {string} [options.language] The reader's language.
 * @return {Promise<{actions: Array<object>, failed: boolean, unsupported: boolean}>}
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-a-host-reads-the-actions-of-an-object-from-openregister
 */
export async function readSelectionActions(target, { language = 'en' } = {}) {
	if (!complete(target, false)) {
		return { actions: [], failed: false, unsupported: false }
	}
	return readList('/apps/openregister/api/object-actions/{register}/{schema}', {
		register: String(target.register),
		schema: String(target.schema),
	}, language)
}

/**
 * Whether a value reads as a machine code (`action-precondition-unmet`)
 * rather than a sentence.
 *
 * @param {string} value The value.
 * @return {boolean}
 */
function isCode(value) {
	return /^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/.test(value)
}

/**
 * The input keys a 422 names. Read from `fields` (keys), `errors` as a list
 * of `{ field | property | path | key }` or as a map keyed by field.
 *
 * @param {object} data The response body.
 * @return {string[]}
 */
export function actionFieldErrors(data) {
	if (!data || typeof data !== 'object') {
		return []
	}
	const keys = []
	if (Array.isArray(data.fields)) {
		keys.push(...data.fields.filter((key) => typeof key === 'string'))
	}
	if (Array.isArray(data.errors)) {
		for (const entry of data.errors) {
			const key = entry && typeof entry === 'object'
				? (entry.field || entry.property || entry.path || entry.key)
				: null
			if (typeof key === 'string') {
				keys.push(key.replace(/^\/+/, '').replace(/\//g, '.'))
			}
		}
	} else if (data.errors && typeof data.errors === 'object') {
		keys.push(...Object.keys(data.errors))
	}
	return [...new Set(keys.filter((key) => key !== ''))]
}

/**
 * The sentence a refusal carries: `message` (ADR-050), then a reason the
 * precondition gave, then `error` when it is a sentence and not a code.
 *
 * @param {object} data The response body.
 * @return {string}
 */
function refusalSentence(data) {
	if (!data || typeof data !== 'object') {
		return ''
	}
	for (const candidate of [data.message, data.reason, data.whenMessage]) {
		if (text(candidate) !== '') {
			return text(candidate)
		}
	}
	const error = text(data.error)
	return error !== '' && !isCode(error) ? error : ''
}

/**
 * A refused or failed call as a run result.
 *
 * @param {object} e The axios error.
 * @return {object} `{ ok: false, status: 'refused', httpStatus, error, message, fieldErrors }`.
 */
function refusal(e) {
	const data = e?.response?.data
	const error = data && typeof data === 'object' && isCode(text(data.error)) ? text(data.error) : ''
	return {
		ok: false,
		status: 'refused',
		httpStatus: e?.response?.status ?? 0,
		error,
		message: refusalSentence(data) || text(e?.message),
		fieldErrors: e?.response?.status === 422 ? actionFieldErrors(data) : [],
	}
}

/**
 * The run uuid an answer names, from `run` as a string or as `{ uuid }`.
 *
 * @param {object} data The response body.
 * @return {string}
 */
function runUuid(data) {
	const run = data?.run
	if (typeof run === 'string') {
		return run
	}
	return run && typeof run === 'object' ? text(run.uuid) : ''
}

/**
 * A run's answer as a result: 200 is `completed` (or `failed` when the
 * outcome says so), 202 is `queued` or `suspended` with the run to follow.
 *
 * @param {object} res The axios response.
 * @return {object} `{ ok, status, httpStatus, run, outcome, next, object, kind, data }`.
 */
function runResult(res) {
	const data = res?.data && typeof res.data === 'object' ? res.data : {}
	const httpStatus = res?.status ?? 200
	let status = 'completed'
	if (httpStatus === 202) {
		status = data.status === 'suspended' ? 'suspended' : 'queued'
	} else if (data.outcome === 'failed') {
		status = 'failed'
	}
	return {
		ok: status !== 'failed',
		status,
		httpStatus,
		run: runUuid(data),
		outcome: text(data.outcome) || status,
		next: NEXT_HINTS.includes(data.next) ? data.next : 'stay',
		object: data.object && typeof data.object === 'object' ? data.object : null,
		kind: text(data.kind),
		data,
	}
}

/**
 * The inputs to send: empty optional values are left out, so OpenRegister
 * applies the declared default (`@now`, `@user`, `@object.<path>`).
 *
 * @param {object} inputs The collected values.
 * @return {object}
 */
export function sentInputs(inputs) {
	const sent = {}
	for (const [key, value] of Object.entries(inputs && typeof inputs === 'object' ? inputs : {})) {
		if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
			continue
		}
		sent[key] = value
	}
	return sent
}

/**
 * Run one action on one object, as the person.
 *
 * @param {{register: string, schema: string, id: string}} target Where the object lives.
 * @param {string} key The action key.
 * @param {object} [inputs] The collected inputs.
 * @return {Promise<object>} The result (see `runResult` and `refusal`); never throws.
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-a-run-reports-what-happened
 */
export async function runObjectAction(target, key, inputs = {}) {
	if (!complete(target) || text(key) === '') {
		return { ok: false, status: 'refused', httpStatus: 0, error: 'incomplete-target', message: '', fieldErrors: [] }
	}
	const { axios, generateUrl } = await http()
	const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/actions/{action}', {
		register: String(target.register),
		schema: String(target.schema),
		id: String(target.id),
		action: key,
	})
	try {
		return runResult(await axios.post(url, { inputs: sentInputs(inputs) }))
	} catch (e) {
		return refusal(e)
	}
}

/**
 * Run one action on a selection. Up to 100 objects OpenRegister answers per
 * object (`summary`, `results`); above that it answers 202 with a bulk job.
 *
 * @param {{register: string, schema: string}} target The list's register and schema.
 * @param {string} key The action key.
 * @param {Array<string>} ids The selected object ids.
 * @param {object} [inputs] The collected inputs.
 * @return {Promise<object>} `{ ok, status, httpStatus, summary, results, job, next }`, or a refusal.
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-a-run-reports-what-happened
 */
export async function runSelectionAction(target, key, ids, inputs = {}) {
	const list = (Array.isArray(ids) ? ids : []).map(String).filter((id) => id !== '')
	if (!complete(target, false) || text(key) === '' || list.length === 0) {
		return { ok: false, status: 'refused', httpStatus: 0, error: 'incomplete-target', message: '', fieldErrors: [] }
	}
	const { axios, generateUrl } = await http()
	const url = generateUrl('/apps/openregister/api/object-actions/{register}/{schema}/{action}', {
		register: String(target.register),
		schema: String(target.schema),
		action: key,
	})
	try {
		const res = await axios.post(url, { ids: list, inputs: sentInputs(inputs) })
		const data = res?.data && typeof res.data === 'object' ? res.data : {}
		const summary = data.summary && typeof data.summary === 'object'
			? { succeeded: Number(data.summary.succeeded) || 0, failed: Number(data.summary.failed) || 0 }
			: { succeeded: 0, failed: 0 }
		return {
			ok: true,
			status: res?.status === 202 ? 'queued' : 'completed',
			httpStatus: res?.status ?? 200,
			summary,
			results: Array.isArray(data.results) ? data.results : [],
			job: data.job ?? null,
			next: NEXT_HINTS.includes(data.next) ? data.next : 'stay',
		}
	} catch (e) {
		return refusal(e)
	}
}

/**
 * Read a run. Null when it cannot be read.
 *
 * @param {string} uuid The run uuid.
 * @return {Promise<{uuid: string, status: string, steps: number, failed: boolean, error: string, data: object}|null>}
 */
export async function readActionRun(uuid) {
	if (text(uuid) === '') {
		return null
	}
	const { axios, generateUrl } = await http()
	try {
		const res = await axios.get(generateUrl('/apps/openregister/api/flow-runs/{uuid}', { uuid }))
		const data = res?.data && typeof res.data === 'object' ? res.data : {}
		const status = text(data.status) || 'queued'
		const lastFailure = Array.isArray(data.log)
			? [...data.log].reverse().find((entry) => entry && typeof entry === 'object' && (entry.error || entry.status === 'failed'))
			: null
		return {
			uuid,
			status,
			steps: Array.isArray(data.log) ? data.log.length : 0,
			failed: status === 'failed' || status === 'dead_letter',
			error: lastFailure ? text(lastFailure.error) || text(lastFailure.message) : '',
			data,
		}
	} catch {
		return null
	}
}

/**
 * Follow an async run until it ends, reporting each read. A read that fails
 * is reported as null and retried; the watch gives up after `timeout`.
 *
 * @param {string} uuid The run uuid.
 * @param {object} [options] Options.
 * @param {(run: object|null) => void} [options.onUpdate] Called after every read.
 * @param {number} [options.interval] Milliseconds between reads.
 * @param {number} [options.timeout] Milliseconds before the watch stops.
 * @return {{done: Promise<object|null>, stop: () => void}} `done` resolves with the last run read.
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-an-async-run-shows-its-progress-and-its-result
 */
export function watchActionRun(uuid, { onUpdate = () => {}, interval = 1500, timeout = 120000 } = {}) {
	let stopped = false
	let timer = null
	let finish = () => {}
	const started = Date.now()
	let last = null

	const done = new Promise((resolve) => {
		finish = resolve
	})

	const tick = async () => {
		if (stopped) {
			return
		}
		const run = await readActionRun(uuid)
		if (stopped) {
			return
		}
		last = run || last
		onUpdate(run)
		if ((run && TERMINAL_RUN_STATUSES.includes(run.status)) || Date.now() - started >= timeout) {
			stopped = true
			finish(last)
			return
		}
		timer = setTimeout(tick, interval)
	}
	tick()

	return {
		done,
		stop: () => {
			stopped = true
			if (timer) {
				clearTimeout(timer)
			}
			finish(last)
		},
	}
}

/**
 * The runs of actions on an object, newest first: `action.run` and the older
 * `action.macro` entries alike. Read from the history route, or, on an
 * OpenRegister without it, from the object's audit trail.
 *
 * @param {{register: string, schema: string, id: string}} target Where the object lives.
 * @param {object} [options] Options.
 * @param {number} [options.limit] How many entries to read.
 * @return {Promise<Array<{action: string, kind: string, run: string, outcome: string, created: string, changes: Array<{step: string, kind: string}>}>>}
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-the-last-run-reads-both-audit-names
 */
export async function readActionHistory(target, { limit = 10 } = {}) {
	if (!complete(target)) {
		return []
	}
	const { axios, generateUrl } = await http()
	const params = { register: String(target.register), schema: String(target.schema), id: String(target.id) }
	let entries
	try {
		const res = await axios.get(generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/actions/history', params), { params: { _limit: limit } })
		entries = res?.data?.results ?? res?.data?.history ?? res?.data
	} catch (e) {
		if (e?.response?.status !== 404) {
			return []
		}
		const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/audit-trails', params)
		const answers = await Promise.all(['action.run', 'action.macro'].map((action) => axios
			.get(url, { params: { action, _limit: limit, '_sort[created]': 'DESC' } })
			.then((res) => res?.data?.results)
			.catch(() => [])))
		entries = answers.flatMap((list) => (Array.isArray(list) ? list : []))
	}
	return (Array.isArray(entries) ? entries : [])
		.filter((entry) => entry && typeof entry === 'object')
		.map(historyEntry)
		.filter((entry) => entry.action !== '')
		.sort((a, b) => String(b.created).localeCompare(String(a.created)))
		.slice(0, limit)
}

/**
 * One history row from an audit entry (`changed` holds the run context) or an
 * already flattened history row.
 *
 * @param {object} entry The entry.
 * @return {object}
 */
function historyEntry(entry) {
	const context = entry.changed && typeof entry.changed === 'object' ? entry.changed : entry
	const changes = Array.isArray(context.changes)
		? context.changes
				.filter((change) => change && typeof change.step === 'string' && change.step !== '')
				.map((change) => ({ step: change.step, kind: text(change.kind) }))
		: []
	return {
		action: text(context.declaredAction) || text(context.action),
		kind: text(context.kind) || (entry.action === 'action.macro' ? 'flow' : ''),
		run: typeof context.run === 'string' ? context.run : '',
		outcome: text(context.outcome),
		created: text(entry.created),
		changes,
	}
}

/**
 * Whether a manifest action list holds an entry that needs OpenRegister's
 * list: an `object-action` or an `actionsFrom: "openregister"` entry.
 *
 * @param {unknown} entries The manifest actions.
 * @return {boolean}
 */
export function needsObjectActions(entries) {
	return Array.isArray(entries) && entries.some((entry) => entry && (entry.actionsFrom === 'openregister' || entry.type === 'object-action'))
}

/**
 * One listed action as a manifest action entry: `type: "object-action"`,
 * with the listed label and icon unless the manifest gave its own, and,
 * when it cannot run now, `disabled` with the reason as `title`.
 *
 * @param {object} listed The listed action.
 * @param {object} base What the manifest declared for it.
 * @return {object}
 */
function objectActionEntry(listed, base) {
	const entry = {
		...base,
		type: 'object-action',
		action: listed.key,
		label: base.label || listed.label,
		icon: base.icon || listed.icon || undefined,
		objectAction: listed,
	}
	if (!listed.available) {
		entry.disabled = true
		entry.title = listed.reason
	}
	return entry
}

/**
 * Expand a manifest action list against OpenRegister's list.
 *
 * - `actionsFrom: "openregister"` becomes, in place, one `object-action` per
 *   listed action offered on `surface` (or the entry's own `surface`),
 *   narrowed by `include`. Each gets the id `<entry id>:<action key>` and
 *   keeps the entry's `variant` and `group`.
 * - `type: "object-action"` gets the listed action, or is left out when
 *   OpenRegister does not list it: the person may not run it.
 * - Every other entry passes through.
 *
 * @param {Array<object>} entries The manifest actions.
 * @param {Array<object>} listed The listed actions (normalised).
 * @param {string} surface `header`, `row`, `bulk` or `detail-menu`.
 * @return {Array<object>} The entries to render.
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-actionsfrom-renders-the-listed-actions-on-a-surface
 */
export function expandObjectActionEntries(entries, listed, surface) {
	const out = []
	for (const entry of Array.isArray(entries) ? entries : []) {
		if (!entry || typeof entry !== 'object') {
			continue
		}
		if (entry.actionsFrom === 'openregister') {
			const base = { variant: entry.variant, group: entry.group, sourceId: entry.id }
			for (const action of actionsForSurface(listed, entry.surface || surface, entry.include)) {
				out.push(objectActionEntry(action, { ...base, id: `${entry.id}:${action.key}` }))
			}
			continue
		}
		if (entry.type === 'object-action') {
			const action = (Array.isArray(listed) ? listed : []).find((candidate) => candidate.key === entry.action)
			if (action) {
				out.push(objectActionEntry(action, { ...entry, sourceId: entry.id }))
			}
			continue
		}
		out.push(entry)
	}
	return out
}
