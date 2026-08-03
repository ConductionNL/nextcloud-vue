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
		<div v-else-if="loading && rows.length === 0" class="cn-flow-runs-widget__loading">
			<NcLoadingIcon :size="24" />
		</div>
		<!-- Nothing running is the NORMAL state for this widget, not an
		     error and not a void: one muted line, no illustration. -->
		<p v-else-if="rows.length === 0" class="cn-flow-runs-widget__empty">
			{{ emptyLabel }}
		</p>
		<template v-else>
			<ul class="cn-flow-runs-widget__list">
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
		</template>
	</div>
</template>

<script>
import { inject, ref } from 'vue'
import { NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { useEndpointSource } from '../../composables/useEndpointSource.js'

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
 * Statuses, in the order a person reads them: what is executing, what is
 * queued behind it, what is parked waiting on a timer or a child run.
 *
 * @type {Record<string, string>}
 */
const STATUS_LABELS = {
	running: 'Running',
	queued: 'Queued',
	suspended: 'Waiting',
}

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
 * @spec openspec/changes/cn-flow-runs-widget/specs/cn-flow-runs-widget/spec.md
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
		 * - `emptyText` — override for the "nothing running" line.
		 *
		 * @type {{limit?: number, pollSeconds?: number, rowRoute?: string, emptyText?: string, title?: string}}
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
		const source = () => ({
			url: ACTIVE_RUNS_URL,
			method: 'GET',
			params: { limit: normaliseLimit(props.content && props.content.limit) },
		})
		const { data, loading, error, refetch } = useEndpointSource(source, {
			widgetId: widgetIdRef,
			ctx: () => ({ workspace: {}, config: {} }),
		})
		// `inject` is re-read in setup so Vue 2.7 and Vue 3 resolve it
		// identically to the Options `inject` block (CnStatWidget precedent).
		const injectedTranslate = inject('cnTranslate', null)

		return {
			payload: data,
			loading,
			error,
			refetch,
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

		/** Whether a row click navigates (a `content.rowRoute` is configured). */
		isLinked() {
			return typeof this.content.rowRoute === 'string' && this.content.rowRoute !== ''
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
				this.refetch(true)
			}, this.pollMs)
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
			this.refetch(true)
			this.startPolling()
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
		 * Open the configured route for a run's flow, when one is configured.
		 *
		 * The route receives the FLOW id, not the run id: a click on a live
		 * run means "show me this flow", and the flow page is the surface that
		 * exists in every app that authors flows.
		 *
		 * @param {object} run The clicked run row.
		 * @return {void}
		 */
		onRowClick(run) {
			if (this.isLinked === false || !this.$router) {
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
