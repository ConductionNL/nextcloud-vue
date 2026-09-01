<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-flow-runs-widget">
		<!-- One quiet line on failure, never a leaked axios status string
		     (ADR-062). The real error goes to the console. -->
		<p v-if="error" class="cn-flow-runs-widget__error">
			{{ tr('Could not load the running flows') }}
		</p>
		<!-- A configured-but-unresolved subject token also shows the loading
		     state: "no runs" would be a claim about a case the widget has not
		     identified yet. -->
		<div v-else-if="(loading || subjectPending) && rows.length === 0" class="cn-flow-runs-widget__loading">
			<NcLoadingIcon :size="24" />
		</div>
		<!-- A subject where nothing EVER ran gets its own line: distinct from
		     a case that is merely quiet right now. -->
		<p v-else-if="neverRan" class="cn-flow-runs-widget__empty">
			{{ tr('No flows have run yet') }}
		</p>
		<!-- Nothing running is the NORMAL state for this widget, not an
		     error and not a void: one muted line, no illustration. -->
		<p v-else-if="rows.length === 0 && showHistory === false" class="cn-flow-runs-widget__empty">
			{{ emptyLabel }}
		</p>
		<template v-else>
			<p v-if="rows.length === 0" class="cn-flow-runs-widget__empty">
				{{ emptyLabel }}
			</p>
			<ul v-else class="cn-flow-runs-widget__list">
				<li
					v-for="run in rows"
					:key="run.uuid"
					class="cn-flow-runs-widget__row"
					:class="{ 'cn-flow-runs-widget__row--linked': isLinked }"
					:data-status="run.status"
					@click="onRowClick(run)">
					<span
						class="cn-flow-runs-widget__dot"
						:class="`cn-flow-runs-widget__dot--${run.status}`"
						:title="statusLabel(run.status)" />
					<span class="cn-flow-runs-widget__body">
						<span class="cn-flow-runs-widget__name">{{ run.flowName }}</span>
						<span class="cn-flow-runs-widget__meta">{{ metaLine(run) }}</span>
					</span>
					<span class="cn-flow-runs-widget__age">{{ ageLabel(run) }}</span>
				</li>
			</ul>
			<!-- The remainder is a count, never a scrollbar: the widget shows
			     what fits its cell and states the honest total (ADR-062). -->
			<p v-if="hiddenCount > 0" class="cn-flow-runs-widget__more">
				{{ moreLabel }}
			</p>
			<!-- The subject's run history. Terminal rows sit under their own
			     labelled section with a hollow dot and a muted name, so live
			     and finished never rely on colour alone to tell apart. -->
			<template v-if="showHistory">
				<p class="cn-flow-runs-widget__history-title">
					{{ tr('Earlier runs') }}
				</p>
				<p v-if="completedError" class="cn-flow-runs-widget__error">
					{{ tr('Could not load the run history') }}
				</p>
				<ul v-else class="cn-flow-runs-widget__list">
					<li
						v-for="run in completedRows"
						:key="run.uuid"
						class="cn-flow-runs-widget__row cn-flow-runs-widget__row--terminal"
						:class="{ 'cn-flow-runs-widget__row--linked': isLinked }"
						:data-status="run.status"
						@click="onRowClick(run)">
						<span
							class="cn-flow-runs-widget__dot cn-flow-runs-widget__dot--terminal"
							:class="`cn-flow-runs-widget__dot--${run.status}`"
							:title="statusLabel(run.status)" />
						<span class="cn-flow-runs-widget__body">
							<span class="cn-flow-runs-widget__name">{{ run.flowName }}</span>
							<span class="cn-flow-runs-widget__meta">{{ metaLine(run) }}</span>
						</span>
						<span class="cn-flow-runs-widget__age">{{ ageLabel(run) }}</span>
					</li>
				</ul>
				<p v-if="completedError === '' && completedHiddenCount > 0" class="cn-flow-runs-widget__more">
					{{ completedMoreLabel }}
				</p>
			</template>
		</template>
	</div>
</template>

<script>
import { computed, inject, ref } from 'vue'
import { NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { useEndpointSource } from '../../composables/useEndpointSource.js'
import { resolveFilterValue } from '../../utils/resolveFilterTokens.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'

/**
 * The OpenRegister endpoint that lists the caller's live flow runs.
 *
 * Every Conduction app runs its flows on OpenRegister's ONE flow engine
 * (ADR-065), so "what is running right now" has a single answer for the whole
 * instance and this widget can be app-agnostic: an app places it and gets its
 * users' live runs without shipping a controller, a store or a view.
 *
 * @type {string}
 */
const ACTIVE_RUNS_URL = '/apps/openregister/api/flow-runs/active'

/**
 * The OpenRegister endpoint that lists the finished runs for ONE subject
 * object. Subject-required by contract (openregister change
 * `flow-runs-subject-scope`): there is no org-wide "all finished runs" here,
 * so the widget only ever calls it with a resolved subject uuid.
 *
 * @type {string}
 */
const COMPLETED_RUNS_URL = '/apps/openregister/api/flow-runs/completed'

/**
 * Statuses, in the order a person reads them: what is executing, what is
 * queued behind it, what is parked waiting on a timer or a child run, and
 * then the terminal set a subject's run history renders.
 *
 * @type {Record<string, string>}
 */
const STATUS_LABELS = {
	running: 'Running',
	queued: 'Queued',
	suspended: 'Waiting',
	completed: 'Completed',
	stopped: 'Stopped',
	failed: 'Failed',
	dead_letter: 'Failed after retries',
}

/**
 * The terminal statuses (FlowRun::TERMINAL on the OpenRegister side). Rows
 * with one of these are HISTORY: rendered in the earlier-runs section with a
 * hollow dot and a muted name, never mixed into the live list.
 *
 * @type {string[]}
 */
const TERMINAL_STATUSES = ['completed', 'stopped', 'failed', 'dead_letter']

/**
 * CnFlowRunsWidget — the live flow runs for the viewer's organisation.
 *
 * Reads OpenRegister's `flow-runs/active` surface (non-terminal runs, scoped
 * server-side to the caller's organisation) and renders one row per run: its
 * flow's NAME, what triggered it, the step it currently sits on, and how long
 * it has been going. Placed by its registry type key `flow-runs`, so any app
 * gets the widget from a single manifest placement:
 *
 * ```js
 * { id: 'running-flows', type: 'flow-runs', title: 'Running flows',
 *   content: { limit: 6, pollSeconds: 15, rowRoute: 'GraphDetail' } }
 * ```
 *
 * Why it polls: a run is a moving thing. A widget titled "running flows" that
 * only reflects the moment the dashboard mounted would be wrong within
 * seconds and would look identical to being right — so it refetches on an
 * interval, and stops while the tab is hidden so an idle dashboard is not a
 * background request loop.
 *
 * Statuses shown are ALL the non-terminal ones (queued / running / suspended),
 * because filtering to literally `running` would show an empty widget almost
 * always: a run holds that status only during a worker pass, while queued and
 * suspended are where live runs actually wait. See FlowRun::ACTIVE.
 *
 * Subject mode: a `content.subject` (a subject object uuid, or the
 * `@objectId` / `@object.<field>` token a detail placement authors) narrows
 * the live list to one case AND adds that case's finished runs below it, so
 * a flow that completed does not look like nothing ever happened. Tokens
 * resolve against the detail surface's injected object context, the same
 * route CnStatWidget and CnChartWidget take.
 *
 * @spec openspec/changes/cn-flow-runs-widget/specs/cn-flow-runs-widget/spec.md
 * @spec openspec/changes/cn-flow-runs-widget-subject/specs/cn-flow-runs-widget-subject/spec.md
 */
export default {
	name: 'CnFlowRunsWidget',

	components: {
		NcLoadingIcon,
	},

	inject: {
		/**
		 * Host translate function, provided by CnAppRoot (identity by default)
		 * so a library string localises through the consuming app's l10n.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget's persisted configuration blob.
		 *
		 * - `limit` — rows to request AND show (1–50, default 6). The total is
		 *   always reported honestly regardless of this cap.
		 * - `pollSeconds` — refetch interval (default 15; `0` disables polling).
		 * - `rowRoute` — vue-router route NAME to open on a row click, receiving
		 *   the run's flow id as `:id`. Omitted = rows are not clickable, which
		 *   is correct for an app that has no flow-detail page.
		 * - `runRoute` — vue-router route NAME to open on a row click, receiving
		 *   the RUN's uuid as `:id`. Takes precedence over `rowRoute`; a row
		 *   without a run uuid falls back to the `rowRoute` flow-id behaviour.
		 * - `subject` — a subject object uuid, or an object-context token
		 *   (`@objectId`, `@object.<field>`) a detail placement authors. When
		 *   set, the live list is filtered to that subject server-side and the
		 *   subject's finished runs render below it. Absent = today's org-wide
		 *   widget, unchanged.
		 * - `emptyText` — override for the "nothing running" line.
		 *
		 * @type {{limit?: number, pollSeconds?: number, rowRoute?: string, runRoute?: string, subject?: string, emptyText?: string, title?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Widget placement id, so the per-widget Refresh action
		 * (`cn:widget:refresh`) reaches this instance's fetch.
		 */
		widgetId: {
			type: String,
			default: '',
		},

		/**
		 * Translate function. Falls back to the injected `cnTranslate`.
		 * Provide explicitly when mounting outside a CnAppRoot ancestor.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	setup(props) {
		// The shared endpoint engine owns request dedup, the short-TTL cache
		// and the cn:page:refresh / cn:widget:refresh subscriptions — the same
		// binding CnStatWidget's endpoint mode uses, so a page-level Refresh
		// updates this widget with everything else on the page.
		const widgetIdRef = ref(props.widgetId)

		// The detail surface's object context, injected the same way the other
		// endpoint-bound widgets (stat / chart / audit-trail) receive it, so a
		// `subject: '@objectId'` placement binds the CURRENT object without the
		// manifest hardcoding a uuid. Null on plain dashboards — the token then
		// stays unresolved and the endpoint engine's `blocked` semantics hold
		// the fetch instead of sending a literal `@objectId` to the server.
		const objectCtxRaw = inject('cnObjectContext', null)
		const detailCtxRaw = inject('cnDetailObjectContext', null)
		const tokenCtx = () => ({
			workspace: {},
			config: {},
			...(resolveObjectTokenContext(objectCtxRaw, detailCtxRaw) || {}),
		})

		const configuredSubject = () => {
			const subject = props.content && props.content.subject
			return (typeof subject === 'string' && subject !== '') ? subject : ''
		}

		/**
		 * The subject uuid after token resolution: `''` when no subject is
		 * configured, `null` while a token still waits on the object context,
		 * else the concrete uuid.
		 */
		const resolvedSubject = computed(() => {
			const subject = configuredSubject()
			if (subject === '') {
				return ''
			}
			const value = resolveFilterValue(subject, tokenCtx())
			if (typeof value === 'string' && value.charAt(0) === '@') {
				return null
			}
			return (value === undefined || value === null) ? null : String(value)
		})

		const source = () => {
			const params = { limit: normaliseLimit(props.content && props.content.limit) }
			const subject = configuredSubject()
			if (subject !== '') {
				params.subject = subject
			}
			return { url: ACTIVE_RUNS_URL, method: 'GET', params }
		}
		const { data, loading, error, refetch } = useEndpointSource(source, {
			widgetId: widgetIdRef,
			ctx: tokenCtx,
		})

		// The history half of the subject view. A null config (no subject)
		// means the composable never queries: the org-wide widget stays a
		// single-request surface, bit-identical to before.
		const completedSource = () => {
			const subject = configuredSubject()
			if (subject === '') {
				return null
			}
			return {
				url: COMPLETED_RUNS_URL,
				method: 'GET',
				params: { subject, limit: normaliseLimit(props.content && props.content.limit) },
			}
		}
		const {
			data: completedData,
			loading: completedLoading,
			error: completedError,
			refetch: refetchCompleted,
		} = useEndpointSource(completedSource, {
			widgetId: widgetIdRef,
			ctx: tokenCtx,
		})

		// `inject` is re-read in setup so Vue 2.7 and Vue 3 resolve it
		// identically to the Options `inject` block (CnStatWidget precedent).
		const injectedTranslate = inject('cnTranslate', null)

		return {
			payload: data,
			loading,
			error,
			refetch,
			completedPayload: completedData,
			completedLoading,
			completedError,
			refetchCompleted,
			resolvedSubject,
			injectedTranslate,
		}
	},

	data() {
		return {
			pollTimer: null,
		}
	},

	computed: {
		/**
		 * Effective translate function: the explicit prop, then the injected
		 * host one, then `@nextcloud/l10n` under the library's own app id.
		 *
		 * @return {(key: string) => string}
		 */
		tr() {
			const fn = this.translate ?? this.injectedTranslate ?? this.cnTranslate
			if (typeof fn === 'function') {
				return (key) => fn(key)
			}
			return (key) => t('nextcloud-vue', key)
		},

		/**
		 * The rows to render — the endpoint's bounded page, defensively
		 * re-capped so a wider server default can never overflow the cell.
		 *
		 * @return {Array<object>} The run rows.
		 */
		rows() {
			const results = (this.payload && this.payload.results) || []
			if (Array.isArray(results) === false) {
				return []
			}
			return results.slice(0, normaliseLimit(this.content.limit))
		},

		/**
		 * How many live runs exist beyond the rendered rows.
		 *
		 * Read off the server's `total`, NOT the array length — the point of
		 * the total is to be honest about what the cell could not fit.
		 *
		 * @return {number} The hidden run count (never negative).
		 */
		hiddenCount() {
			const total = Number((this.payload && this.payload.total) ?? this.rows.length)
			if (Number.isFinite(total) === false) {
				return 0
			}
			return Math.max(0, total - this.rows.length)
		},

		/** The "+N more" line. */
		moreLabel() {
			return this.tr('+{count} more').replace('{count}', String(this.hiddenCount))
		},

		/** The nothing-running line. */
		emptyLabel() {
			const override = this.content.emptyText
			if (typeof override === 'string' && override !== '') {
				return this.tr(override)
			}
			return this.tr('No flows are running')
		},

		/** Whether this placement is scoped to one subject object. */
		hasSubject() {
			return typeof this.content.subject === 'string' && this.content.subject !== ''
		},

		/**
		 * Whether a configured subject token still waits on the object
		 * context. The widget shows its loading state instead of an empty
		 * line then: "no runs" would be a claim about a case it has not
		 * identified yet.
		 *
		 * @return {boolean} True while the subject is configured but unresolved.
		 */
		subjectPending() {
			return this.hasSubject && this.resolvedSubject === null
		},

		/**
		 * The subject's finished runs — the completed-runs read's bounded
		 * page, re-capped like the live rows.
		 *
		 * @return {Array<object>} The terminal run rows (empty without a subject).
		 */
		completedRows() {
			if (this.hasSubject === false) {
				return []
			}
			const results = (this.completedPayload && this.completedPayload.results) || []
			if (Array.isArray(results) === false) {
				return []
			}
			return results.slice(0, normaliseLimit(this.content.limit))
		},

		/**
		 * How many finished runs exist beyond the rendered history rows, read
		 * off the completed read's honest total.
		 *
		 * @return {number} The hidden finished-run count (never negative).
		 */
		completedHiddenCount() {
			const total = Number((this.completedPayload && this.completedPayload.total) ?? this.completedRows.length)
			if (Number.isFinite(total) === false) {
				return 0
			}
			return Math.max(0, total - this.completedRows.length)
		},

		/** The "+N earlier" line under the history section. */
		completedMoreLabel() {
			return this.tr('+{count} earlier').replace('{count}', String(this.completedHiddenCount))
		},

		/**
		 * Whether this subject has NO runs at all, live or finished. Rendered
		 * as its own line: a case where nothing ever ran reads differently
		 * from a case that is merely quiet right now.
		 *
		 * @return {boolean} True when both reads settled empty for a subject.
		 */
		neverRan() {
			return this.hasSubject
				&& this.subjectPending === false
				&& this.loading === false
				&& this.completedLoading === false
				&& this.completedError === ''
				&& this.rows.length === 0
				&& this.completedRows.length === 0
		},

		/** Whether the history section renders (rows or a failed history read). */
		showHistory() {
			return this.hasSubject
				&& this.subjectPending === false
				&& (this.completedRows.length > 0 || this.completedError !== '')
		},

		/** Whether a row click navigates (a `runRoute` or `rowRoute` is configured). */
		isLinked() {
			return (typeof this.content.rowRoute === 'string' && this.content.rowRoute !== '')
				|| (typeof this.content.runRoute === 'string' && this.content.runRoute !== '')
		},

		/**
		 * Poll interval in ms, or 0 when polling is off.
		 *
		 * Floored at 5s so a mis-authored `pollSeconds: 0.1` cannot turn a
		 * dashboard into a request storm; `0` remains an explicit opt-out.
		 *
		 * @return {number} The interval in milliseconds.
		 */
		pollMs() {
			const raw = this.content.pollSeconds
			const seconds = (raw === undefined || raw === null) ? 15 : Number(raw)
			if (Number.isFinite(seconds) === false || seconds <= 0) {
				return 0
			}
			return Math.max(5, seconds) * 1000
		},
	},

	mounted() {
		this.startPolling()
		document.addEventListener('visibilitychange', this.onVisibilityChange)
	},

	beforeUnmount() {
		this.teardown()
	},

	methods: {
		/**
		 * Start (or restart) the refetch interval, unless polling is disabled.
		 *
		 * @return {void}
		 */
		startPolling() {
			this.stopPolling()
			if (this.pollMs === 0 || document.hidden === true) {
				return
			}
			this.pollTimer = setInterval(() => {
				this.refetchAll()
			}, this.pollMs)
		},

		/**
		 * Refetch the live read, and the history read when a subject is
		 * configured — a run that finishes between polls must MOVE to the
		 * history section, not vanish from the widget.
		 *
		 * @return {void}
		 */
		refetchAll() {
			this.refetch(true)
			if (this.hasSubject) {
				this.refetchCompleted(true)
			}
		},

		/**
		 * Clear the refetch interval.
		 *
		 * @return {void}
		 */
		stopPolling() {
			if (this.pollTimer !== null) {
				clearInterval(this.pollTimer)
				this.pollTimer = null
			}
		},

		/**
		 * Remove the timer and the visibility listener.
		 *
		 * @return {void}
		 */
		teardown() {
			this.stopPolling()
			document.removeEventListener('visibilitychange', this.onVisibilityChange)
		},

		/**
		 * Pause polling while the tab is hidden; refetch once and resume when
		 * it comes back, so returning to the dashboard shows current state
		 * rather than whatever was true when the tab was backgrounded.
		 *
		 * @return {void}
		 */
		onVisibilityChange() {
			if (document.hidden === true) {
				this.stopPolling()
				return
			}
			this.refetchAll()
			this.startPolling()
		},

		/**
		 * Whether a run's status is terminal — the history half of the
		 * subject view. Drives the hollow-dot / muted-name row treatment.
		 *
		 * @param {object} run The run row.
		 * @return {boolean} True for a finished run.
		 */
		isTerminal(run) {
			return TERMINAL_STATUSES.includes(run && run.status)
		},

		/**
		 * The human label for a status, falling back to the raw value so an
		 * engine that gains a status still renders something truthful.
		 *
		 * @param {string} status The run status.
		 * @return {string} The label.
		 */
		statusLabel(status) {
			const key = STATUS_LABELS[status]
			return key ? this.tr(key) : String(status || '')
		},

		/**
		 * The secondary line: status, the step the run sits on, and what
		 * triggered it — whichever of those the run actually carries.
		 *
		 * @param {object} run The run row.
		 * @return {string} The meta line.
		 */
		metaLine(run) {
			const parts = [this.statusLabel(run.status)]
			if (run.step) {
				parts.push(String(run.step))
			}
			if (run.trigger) {
				parts.push(String(run.trigger))
			}
			return parts.join(' · ')
		},

		/**
		 * How long the run has been going, as a coarse relative label.
		 *
		 * Coarse on purpose: a dashboard reader wants "8m", not a timestamp,
		 * and a second-precision label on a 15s poll would read as stale.
		 *
		 * @param {object} run The run row.
		 * @return {string} The age label, or '' when the run has no start time.
		 */
		ageLabel(run) {
			const started = Date.parse(run.created || '')
			if (Number.isFinite(started) === false) {
				return ''
			}
			const seconds = Math.max(0, Math.round((Date.now() - started) / 1000))
			if (seconds < 60) {
				return this.tr('now')
			}
			const minutes = Math.round(seconds / 60)
			if (minutes < 60) {
				return `${minutes}m`
			}
			const hours = Math.round(minutes / 60)
			if (hours < 24) {
				return `${hours}h`
			}
			return `${Math.round(hours / 24)}d`
		},

		/**
		 * Open the configured route for a clicked run.
		 *
		 * `runRoute` wins when the row carries a run uuid: on a case page a
		 * click means "show me THIS run", and the run uuid is the deep link
		 * the row contract carries. Without a `runRoute` (or on a row with no
		 * uuid) the original behaviour holds unchanged: `rowRoute` receives
		 * the FLOW id, the surface every flow-authoring app has.
		 *
		 * @param {object} run The clicked run row.
		 * @return {void}
		 */
		onRowClick(run) {
			if (this.isLinked === false || !this.$router) {
				return
			}
			const runRoute = this.content.runRoute
			if (typeof runRoute === 'string' && runRoute !== ''
				&& run.uuid !== undefined && run.uuid !== null && run.uuid !== '') {
				this.$router.push({ name: runRoute, params: { id: String(run.uuid) } }).catch(() => {})
				return
			}
			if (typeof this.content.rowRoute !== 'string' || this.content.rowRoute === '') {
				return
			}
			const id = run.flowId
			if (id === undefined || id === null || id === '') {
				return
			}
			this.$router.push({ name: this.content.rowRoute, params: { id: String(id) } }).catch(() => {})
		},
	},
}

/**
 * Clamp a configured row limit into the range the endpoint accepts.
 *
 * @param {*} raw The configured limit.
 * @return {number} A limit between 1 and 50 (default 6).
 */
function normaliseLimit(raw) {
	const n = Number(raw)
	if (Number.isFinite(n) === false || n <= 0) {
		return 6
	}
	return Math.min(50, Math.round(n))
}
</script>

<style scoped>
.cn-flow-runs-widget {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-flow-runs-widget__loading {
	display: flex;
	justify-content: center;
	padding: 8px 0;
}

.cn-flow-runs-widget__empty,
.cn-flow-runs-widget__error,
.cn-flow-runs-widget__more {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-flow-runs-widget__more {
	padding-top: 4px;
}

.cn-flow-runs-widget__list {
	list-style: none;
	margin: 0;
	padding: 0;
	min-width: 0;
}

.cn-flow-runs-widget__row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
	min-width: 0;
}

.cn-flow-runs-widget__row:last-child {
	border-bottom: none;
}

.cn-flow-runs-widget__row--linked {
	cursor: pointer;
}

.cn-flow-runs-widget__dot {
	flex: 0 0 auto;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--color-text-maxcontrast);
}

/* Executing now — the primary colour, and the only row that animates. */
.cn-flow-runs-widget__dot--running {
	background: var(--color-primary-element, #0082c9);
	animation: cn-flow-runs-pulse 1.6s ease-in-out infinite;
}

.cn-flow-runs-widget__dot--queued {
	background: var(--color-warning, #c28900);
}

.cn-flow-runs-widget__dot--suspended {
	background: var(--color-text-maxcontrast);
}

/* Terminal rows: the dot is a hollow RING, so live (filled) and finished
   (hollow) never differ by colour alone. The per-status colour still rides
   on the ring's border. */
.cn-flow-runs-widget__dot--terminal {
	width: 6px;
	height: 6px;
	background: transparent;
	border: 2px solid var(--color-text-maxcontrast);
}

.cn-flow-runs-widget__dot--terminal.cn-flow-runs-widget__dot--completed {
	border-color: var(--color-success, #2d7b41);
}

.cn-flow-runs-widget__dot--terminal.cn-flow-runs-widget__dot--failed,
.cn-flow-runs-widget__dot--terminal.cn-flow-runs-widget__dot--dead_letter {
	border-color: var(--color-error, #d91f2d);
}

.cn-flow-runs-widget__body {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1 1 auto;
}

.cn-flow-runs-widget__name {
	font-weight: 600;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Finished runs read as history: regular weight, muted colour. The hollow
   dot and the section label carry the distinction for anyone who cannot
   rely on colour. */
.cn-flow-runs-widget__row--terminal .cn-flow-runs-widget__name {
	font-weight: 400;
	color: var(--color-text-maxcontrast);
}

/* Must sit AFTER the plain `__name` rule: the compound selector is more
   specific, and stylelint's no-descending-specificity flags the reverse
   order because the cascade then depends on specificity rather than
   source order — the shape that quietly stops working when someone adds
   a competing rule. */
.cn-flow-runs-widget__row--linked:hover .cn-flow-runs-widget__name {
	text-decoration: underline;
}

.cn-flow-runs-widget__meta {
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-flow-runs-widget__age {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-variant-numeric: tabular-nums;
}

/* The history section label. Small caps text, not a colour: the section
   boundary must survive monochrome. */
.cn-flow-runs-widget__history-title {
	margin: 0;
	padding-top: 8px;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

@keyframes cn-flow-runs-pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.35; }
}

/* Respect a reduced-motion preference: the pulse is decoration, and the dot
   colour already carries the status. */
@media (prefers-reduced-motion: reduce) {
	.cn-flow-runs-widget__dot--running {
		animation: none;
	}
}
</style>
