<!--
  CnFlowBoard — the flow editor in the board look: a page header with the
  flow's name, path and actions, then the canvas in a card beside an
  inspector card. Optionally a palette card on the left (`palette: column`).
  The same page shows one run when the route carries `?run=`: the canvas
  paints each step's outcome and the inspector holds the run's card and logs.

  The canvas itself is CnFlowDetail; this component only lays it out and adds
  what the board draws around it.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-flow-board" :class="{ 'cn-flow-board--with-palette': showPalette }" data-testid="flow-board">
		<header class="cn-flow-board__header">
			<div class="cn-flow-board__heading">
				<h2 class="cn-flow-board__title" data-testid="flow-board-title">
					{{ titleText }}
				</h2>
				<CnStatusBadge v-if="pillText" :label="pillText" variant="default" />
			</div>
			<div v-if="!store.inRunView" class="cn-flow-board__actions">
				<NcCheckboxRadioSwitch v-if="store.flow.id"
					type="switch"
					:modelValue="store.flow.enabled !== false"
					data-testid="flow-board-enabled"
					@update:modelValue="onEnabledChange">
					{{ store.flow.enabled !== false ? t('nextcloud-vue', 'Active') : t('nextcloud-vue', 'Paused') }}
				</NcCheckboxRadioSwitch>
				<NcButton :disabled="store.checking || !store.nodes.length"
					data-testid="flow-board-check"
					@click="store.check()">
					{{ t('nextcloud-vue', 'Check') }}
				</NcButton>
				<NcButton v-if="showRun"
					:disabled="store.running || !store.flow.id"
					data-testid="flow-board-run"
					@click="$emit('run')">
					{{ t('nextcloud-vue', 'Run') }}
				</NcButton>
				<NcButton v-if="testSubjectReady"
					:disabled="store.running || !store.flow.id"
					data-testid="flow-board-test"
					@click="testOpen = true">
					<template #icon>
						<TestTube :size="16" />
					</template>
					{{ testLabel }}
				</NcButton>
				<CnBuildiqEditButton />
				<NcButton variant="primary"
					:disabled="store.saving || !store.flow.name || store.graphLocked"
					data-testid="flow-board-save"
					@click="$emit('save')">
					{{ t('nextcloud-vue', 'Save') }}
				</NcButton>
			</div>
		</header>

		<CnDialog v-if="testOpen"
			:name="testLabel"
			data-testid="flow-board-test-dialog"
			@closing="testOpen = false">
			<p class="cn-flow-board__test-intro">
				{{ t('nextcloud-vue', 'The saved flow runs once with the record you pick as its subject.') }}
			</p>
			<CnResourceSelect v-model="testRecord"
				:register="testSubject.register"
				:schema="testSubject.schema"
				:labelField="testSubject.labelField || 'title'"
				:inputLabel="t('nextcloud-vue', 'Record')"
				data-testid="flow-board-test-record" />
			<template #actions>
				<NcButton data-testid="flow-board-test-cancel" @click="testOpen = false">
					{{ t('nextcloud-vue', 'Cancel') }}
				</NcButton>
				<NcButton variant="primary"
					:disabled="!testRecord || store.running"
					data-testid="flow-board-test-run"
					@click="runTest">
					{{ t('nextcloud-vue', 'Run test') }}
				</NcButton>
			</template>
		</CnDialog>

		<p class="cn-flow-board__path" data-testid="flow-board-path">
			<a :href="listHref" class="cn-flow-board__crumb" @click="onCrumbClick($event, detailRoute)">{{ listText }}</a>
			<span aria-hidden="true"> / </span>
			<template v-if="store.inRunView">
				<a :href="flowHref" class="cn-flow-board__crumb" @click="onCrumbClick($event, flowPath)">{{ flowName }}</a>
				<span aria-hidden="true"> / </span>
				<span>{{ runCrumb }}</span>
			</template>
			<span v-else>{{ flowName }}</span>
			<span v-if="metaText" class="cn-flow-board__meta"> · {{ metaText }}</span>
		</p>

		<NcNoteCard v-if="notice && !store.inRunView" type="info" class="cn-flow-board__notice">
			{{ notice }}
		</NcNoteCard>

		<div class="cn-flow-board__body">
			<aside v-if="showPalette" class="cn-flow-board__card cn-flow-board__palette" data-testid="flow-board-palette">
				<h3 class="cn-flow-board__card-title">
					{{ t('nextcloud-vue', 'Steps') }}
				</h3>
				<section v-for="group in paletteGroups"
					:key="group.app"
					class="cn-flow-board__palette-group">
					<h4 class="cn-flow-board__palette-app">
						{{ group.name }}
					</h4>
					<ul class="cn-flow-board__palette-list">
						<li v-for="entry in group.entries" :key="entry.id">
							<button type="button"
								class="cn-flow-board__palette-step"
								:disabled="store.graphLocked"
								:data-testid="`flow-board-palette-${entry.id}`"
								@click="store.addNode(entry.id)">
								{{ entry.displayName || entry.label || entry.id }}
							</button>
						</li>
					</ul>
				</section>
				<p v-if="paletteFootnote" class="cn-flow-board__palette-note">
					{{ paletteFootnote }}
				</p>
			</aside>

			<section class="cn-flow-board__card cn-flow-board__canvas" :aria-label="t('nextcloud-vue', 'Flow canvas')">
				<CnFlowDetail :id="id"
					:app="app"
					:run="run"
					:toolbarActions="false"
					:addStep="!showPalette"
					@save="$emit('save')"
					@run="$emit('run')" />
				<div v-if="store.inRunView"
					class="cn-flow-board__legend"
					data-testid="flow-board-legend">
					<span v-for="level in legend" :key="level.id" class="cn-flow-board__legend-item">
						<CnStatusBadge :label="level.label" :variant="level.variant" size="small" />
					</span>
				</div>
				<p v-else
					class="cn-flow-board__validity"
					:class="`cn-flow-board__validity--${validity.tone}`"
					role="status"
					data-testid="flow-board-validity">
					{{ validity.text }}
				</p>
			</section>

			<aside class="cn-flow-board__card cn-flow-board__inspector" data-testid="flow-board-inspector">
				<template v-if="store.inRunView">
					<CnFlowRunSummary :run="runRecord"
						:stepsTotal="store.nodes.length"
						:canRetry="canRetry"
						@back="onBackToFlow"
						@retry="onRetry" />
					<div class="cn-flow-board__tabs" role="tablist">
						<button v-for="tab in runTabs"
							:key="tab.id"
							type="button"
							role="tab"
							class="cn-flow-board__tab"
							:class="{ 'cn-flow-board__tab--active': runTab === tab.id }"
							:aria-selected="runTab === tab.id ? 'true' : 'false'"
							:data-testid="`flow-board-run-tab-${tab.id}`"
							@click="runTab = tab.id">
							{{ tab.label }}
							<span class="cn-flow-board__tab-count">{{ tab.count }}</span>
						</button>
					</div>
					<CnFlowStepLog :lines="runTab === 'step' ? selectedRunLines : allRunLines"
						:emptyText="runTab === 'step' && !store.selectedNodeId ? t('nextcloud-vue', 'Select a step on the canvas to see what it did.') : ''" />
				</template>
				<template v-else-if="store.selectedNode">
					<p class="cn-flow-board__eyebrow">
						{{ stepTypeLabel }}
					</p>
					<h3 class="cn-flow-board__card-title" data-testid="flow-board-step-name">
						{{ stepName }}
					</h3>
					<div class="cn-flow-board__step-actions">
						<NcButton data-testid="flow-board-edit-step" @click="store.editingNodeId = store.selectedNodeId">
							{{ t('nextcloud-vue', 'Edit step') }}
						</NcButton>
						<NcButton v-if="lastRunUuid"
							variant="tertiary"
							data-testid="flow-board-open-last-run"
							@click="openRun(lastRunUuid)">
							{{ t('nextcloud-vue', 'Open the last run on the canvas') }}
						</NcButton>
					</div>
					<h4 class="cn-flow-board__subtitle">
						{{ t('nextcloud-vue', 'Recent log lines of this step') }}
					</h4>
					<CnFlowStepLog :lines="recentStepLines"
						withDay
						:emptyText="t('nextcloud-vue', 'This step has not run yet.')" />
					<div class="cn-flow-board__step-footer">
						<NcButton variant="tertiary"
							:disabled="store.graphLocked"
							data-testid="flow-board-delete-step"
							@click="store.removeNode(store.selectedNodeId)">
							{{ t('nextcloud-vue', 'Delete step') }}
						</NcButton>
						<NcButton data-testid="flow-board-done" @click="store.selectedNodeId = null">
							{{ t('nextcloud-vue', 'Done') }}
						</NcButton>
					</div>
				</template>
				<CnFlowSidebar v-else embedded />
			</aside>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcNoteCard } from '@nextcloud/vue'
import TestTube from 'vue-material-design-icons/TestTube.vue'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import CnDialog from '../CnDialog/CnDialog.vue'
import CnFlowDetail from '../CnFlowDetail/CnFlowDetail.vue'
import CnFlowRunSummary from '../CnFlowDetail/CnFlowRunSummary.vue'
import CnFlowSidebar from '../CnFlowDetail/CnFlowSidebar.vue'
import CnFlowStepLog from '../CnFlowDetail/CnFlowStepLog.vue'
import CnResourceSelect from '../CnResourceSelect/CnResourceSelect.vue'
import { FLOW_RUN_ACTIVE_STATUSES, useFlowStore } from '../../composables/useFlowStore.js'
import { formatRelativeDate } from '../../utils/boardDate.js'
import { flowOutcomeLevels, flowRunDurationMs, flowRunLogLines, flowRunName, formatFlowDuration } from '../../utils/flowRunLog.js'
import { appDisplayNames } from '../../utils/nextcloudApps.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

/**
 * The board-look flow editor and run view. CnFlowEditorPage renders it when
 * the app or page is in the board look; the Nextcloud look keeps the canvas
 * on its own with the app sidebar.
 */
export default {
	name: 'CnFlowBoard',

	components: { CnBuildiqEditButton, CnDialog, CnFlowDetail, CnResourceSelect, TestTube, CnFlowRunSummary, CnFlowSidebar, CnFlowStepLog, CnStatusBadge, NcButton, NcCheckboxRadioSwitch, NcNoteCard },

	props: {
		/** The flow uuid, or `new`. */
		id: { type: String, default: '' },
		/** The owning app, for a new flow and the list scope. */
		app: { type: String, default: null },
		/** The run to show, or ''. */
		run: { type: String, default: '' },
		/** Where the flow list lives; flows open at `<detailRoute>/<id>`. */
		detailRoute: { type: String, default: '/flows' },
		/** The list's name in the path ("Flows", "Settings / Flows"). */
		listLabel: { type: String, default: '' },
		/** `column` draws the step palette as a card on the left. */
		palette: { type: String, default: 'picker' },
		/** Free text under the path in the palette card. */
		paletteFootnote: { type: String, default: '' },
		/** An info notice under the path. */
		notice: { type: String, default: '' },
		/** The pill beside the title ("Case type flow"). */
		pill: { type: String, default: '' },
		/**
		 * The records a test run can take as its subject: `{ register, schema,
		 * labelField?, label? }`. Draws a header button ("Testen met een zaak",
		 * DqFlow) that runs the saved flow once with a picked record.
		 */
		testSubject: { type: Object, default: null },
	},

	emits: ['save', 'run', 'retried'],

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		return { runTab: 'step', testOpen: false, testRecord: null, appNames: {} }
	},

	computed: {
		/** @return {boolean} Whether a test subject is declared well enough to pick one. */
		testSubjectReady() {
			return Boolean(this.testSubject && this.testSubject.register && this.testSubject.schema)
		},

		/** @return {string} The test button's label: the page's own, else the library's. */
		testLabel() {
			return (this.testSubject && this.testSubject.label) || t('nextcloud-vue', 'Test with a record')
		},

		/** @return {boolean} Whether the palette card is drawn. */
		showPalette() {
			return this.palette === 'column' && !this.store.inRunView
		},

		/** @return {string} The page title. */
		titleText() {
			return this.store.flow.name || this.t('nextcloud-vue', 'New flow')
		},

		/** @return {string} The flow's name in the path. */
		flowName() {
			return this.store.flow.name || this.t('nextcloud-vue', 'New flow')
		},

		/** @return {string} The pill text: the page's, else the lifecycle. */
		pillText() {
			if (this.pill) {
				return this.pill
			}
			const lifecycle = String(this.store.flow.lifecycleStatus || '')
			if (lifecycle === 'draft') {
				return this.t('nextcloud-vue', 'Draft')
			}
			if (lifecycle === 'deprecated') {
				return this.t('nextcloud-vue', 'Retired')
			}
			return ''
		},

		/** @return {string} The list label. */
		listText() {
			return this.listLabel || this.t('nextcloud-vue', 'Flows')
		},

		/** @return {string} The flow's own path. */
		flowPath() {
			return `${this.detailRoute}/${this.store.flow.id || this.id}`
		},

		/** @return {string} The list href. */
		listHref() {
			return this.hrefOf(this.detailRoute)
		},

		/** @return {string} The flow href. */
		flowHref() {
			return this.hrefOf(this.flowPath)
		},

		/**
		 * What the path says after the name: the trigger, the step count and
		 * the version in the editor; when the run started and how long it
		 * took in the run view.
		 *
		 * @return {string} The meta text.
		 */
		metaText() {
			if (this.store.inRunView) {
				const record = this.runRecord
				if (!record) {
					return ''
				}
				const parts = [formatRelativeDate(record.created, { withTime: true })]
				const duration = formatFlowDuration(flowRunDurationMs(record))
				if (duration) {
					parts.push(this.t('nextcloud-vue', 'done in {duration}', { duration }))
				}
				return parts.filter(Boolean).join(' · ')
			}
			const parts = []
			const trigger = this.triggerText
			if (trigger) {
				parts.push(this.t('nextcloud-vue', 'trigger {trigger}', { trigger }))
			}
			const count = this.store.nodes.length
			parts.push(count === 1 ? this.t('nextcloud-vue', '1 step') : this.t('nextcloud-vue', '{count} steps', { count }))
			if (this.store.flow.version) {
				parts.push(this.t('nextcloud-vue', 'version {version}', { version: this.store.flow.version }))
			}
			return parts.join(' · ')
		},

		/** @return {string} How the flow starts, as the catalogue names it. */
		triggerText() {
			const trigger = String(this.store.flow.trigger || '')
			if (trigger === 'schedule') {
				return this.t('nextcloud-vue', 'On a schedule')
			}
			if (trigger === '' || trigger === 'manual') {
				return this.t('nextcloud-vue', 'Run by hand')
			}
			const entry = (this.store.eventCatalog || []).find((item) => item && item.id === trigger)
			return (entry && entry.label) || trigger
		},

		/** @return {boolean} Whether Run is offered. */
		showRun() {
			return this.store.nodes.some((node) => node?.type === 'openregister.trigger-manual')
		},

		/**
		 * The engine's verdict on the canvas as one line under it.
		 *
		 * @return {{tone: string, text: string}} The validity bar.
		 */
		validity() {
			const result = this.store.checkResult
			if (!result) {
				return { tone: 'unknown', text: this.t('nextcloud-vue', 'Not checked yet. Check runs the flow past the engine without saving it.') }
			}
			const blocking = Array.isArray(result.blocking) ? result.blocking.length : 0
			const warnings = Array.isArray(result.warnings) ? result.warnings.length : 0
			if (result.valid === false || blocking > 0) {
				return { tone: 'error', text: result.message || this.t('nextcloud-vue', 'The flow cannot run as it is. See the messages on the canvas.') }
			}
			if (warnings > 0) {
				return { tone: 'warning', text: this.t('nextcloud-vue', 'The flow is valid, with {count} warnings.', { count: warnings }) }
			}
			return { tone: 'success', text: this.t('nextcloud-vue', 'The flow is valid.') }
		},

		/**
		 * The palette grouped by owning app, each group named by the app's
		 * display name (its id when Nextcloud names none), the app that owns
		 * this flow first.
		 *
		 * @return {Array<{app: string, name: string, entries: Array<object>}>} The groups.
		 */
		paletteGroups() {
			const groups = {}
			;(this.store.nodeCatalog || []).forEach((entry) => {
				const app = String(entry?.app || String(entry?.id || '').split('.')[0] || '')
				if (!groups[app]) {
					groups[app] = { app, name: this.appNames[app] || app, entries: [] }
				}
				groups[app].entries.push(entry)
			})
			const list = Object.values(groups)
			const host = list.findIndex((group) => group.app === this.app)
			return host > 0 ? [list[host], ...list.slice(0, host), ...list.slice(host + 1)] : list
		},

		/** @return {object|null} The run on screen. */
		runRecord() {
			return this.store.runDetail
				|| (this.store.runs || []).find((item) => item.uuid === this.store.inspectedRunUuid)
				|| null
		},

		/** @return {string} The run's place in the path. */
		runCrumb() {
			return this.t('nextcloud-vue', 'Run {id}', { id: flowRunName(this.runRecord) })
		},

		/** @return {boolean} Whether Run again is offered. */
		canRetry() {
			return !!this.runRecord && !FLOW_RUN_ACTIVE_STATUSES.includes(this.runRecord.status)
		},

		/** @return {Array<object>} Every line of the run on screen. */
		allRunLines() {
			return this.runRecord ? flowRunLogLines(this.runRecord) : []
		},

		/** @return {Array<object>} The selected step's lines in this run. */
		selectedRunLines() {
			return this.runRecord && this.store.selectedNodeId
				? flowRunLogLines(this.runRecord, this.store.selectedNodeId)
				: []
		},

		/** @return {Array<object>} The two log tabs with their counts. */
		runTabs() {
			return [
				{ id: 'step', label: this.t('nextcloud-vue', 'This step'), count: this.selectedRunLines.length },
				{ id: 'run', label: this.t('nextcloud-vue', 'Logs of the whole run'), count: this.allRunLines.length },
			]
		},

		/** @return {Array<object>} The legend of outcomes on the canvas. */
		legend() {
			const levels = flowOutcomeLevels()
			return ['success', 'warning', 'error', 'info', 'skipped'].map((id) => ({ id, ...levels[id] }))
		},

		/** @return {string} The selected step's type, as the catalogue names it. */
		stepTypeLabel() {
			const node = this.store.selectedNode
			const entry = node ? this.store.catalogEntry(node.type) : null
			return entry ? (entry.displayName || entry.id) : String(node?.type || '')
		},

		/** @return {string} The selected step's name. */
		stepName() {
			const node = this.store.selectedNode
			return (node && (node.name || node.label)) || this.stepTypeLabel
		},

		/**
		 * The selected step's lines from the flow's recent runs, newest run
		 * first, at most ten.
		 *
		 * @return {Array<object>} The lines.
		 */
		recentStepLines() {
			const id = this.store.selectedNodeId
			if (!id) {
				return []
			}
			const lines = []
			;(this.store.runs || []).forEach((item) => {
				flowRunLogLines(item, id).forEach((line) => lines.push({ ...line, key: `${item.uuid}-${line.key}` }))
			})
			return lines.slice(0, 10)
		},

		/** @return {string} The newest run's uuid, or ''. */
		lastRunUuid() {
			return (this.store.runs && this.store.runs[0] && this.store.runs[0].uuid) || ''
		},
	},

	async created() {
		// The palette names its groups by app display name; only the column
		// palette draws them, so only it reads the names.
		if (this.palette !== 'column') {
			return
		}
		const { default: axios } = await import('@nextcloud/axios')
		this.appNames = await appDisplayNames(axios)
	},

	methods: {
		/**
		 * Run the saved flow once with the picked record as its subject, then
		 * close the dialog; the run shows on the canvas as any run does.
		 *
		 * @return {Promise<void>}
		 */
		async runTest() {
			const uuid = Array.isArray(this.testRecord) ? this.testRecord[0] : this.testRecord
			if (!uuid) {
				return
			}
			await this.store.run({ uuid, register: this.testSubject.register, schema: this.testSubject.schema })
			this.testOpen = false
			this.testRecord = null
		},

		t,

		/**
		 * @param {string} path An app route path.
		 * @return {string} Its href.
		 */
		hrefOf(path) {
			if (this.$router && typeof this.$router.resolve === 'function') {
				try {
					const resolved = this.$router.resolve(path)
					if (resolved && resolved.href) {
						return resolved.href
					}
				} catch {
					// A path the router does not know stays a plain path.
				}
			}
			return path
		},

		/**
		 * Follow a path link on the app's router; a modified click keeps the
		 * browser's own behaviour.
		 *
		 * @param {MouseEvent} event The click.
		 * @param {string} path The target path.
		 * @return {void}
		 */
		onCrumbClick(event, path) {
			if (!this.$router || event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
				return
			}
			event.preventDefault()
			this.$router.push(path).catch(() => {})
		},

		/**
		 * Switch the flow on or off. The change is saved with the flow.
		 *
		 * @param {boolean} on The new state.
		 * @return {void}
		 */
		onEnabledChange(on) {
			this.store.flow.enabled = on === true
			this.store.dirty = true
		},

		/**
		 * Open a run of this flow on the canvas.
		 *
		 * @param {string} uuid The run.
		 * @return {void}
		 */
		openRun(uuid) {
			if (this.$router) {
				this.$router.push({ path: this.flowPath, query: { run: uuid } }).catch(() => {})
			} else {
				this.store.inspectRun(uuid)
			}
		},

		/**
		 * Leave the run view for the flow.
		 *
		 * @return {void}
		 */
		onBackToFlow() {
			this.store.closeRun()
			if (this.$router) {
				this.$router.push({ path: this.flowPath }).catch(() => {})
			}
		},

		/**
		 * Start the shown run again and open the new one.
		 *
		 * @return {Promise<void>}
		 */
		async onRetry() {
			const retried = await this.store.retryRun(this.runRecord?.uuid)
			this.$emit('retried', retried)
			if (retried && retried.uuid) {
				this.openRun(retried.uuid)
			}
		},
	},
}
</script>

<style scoped>
.cn-flow-board {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 20px 24px;
	min-height: 100%;
	box-sizing: border-box;
}

.cn-flow-board__header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.cn-flow-board__heading {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}

.cn-flow-board__title {
	margin: 0;
	font-size: 24px;
	font-weight: 600;
}

.cn-flow-board__actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-flow-board__test-intro {
	margin: 0 0 12px;
	color: var(--color-text-maxcontrast);
}

.cn-flow-board__path {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-flow-board__crumb {
	color: var(--color-main-text);
	text-decoration: underline;
}

.cn-flow-board__body {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 340px;
	gap: 16px;
	flex: 1 1 auto;
	min-height: 520px;
}

.cn-flow-board--with-palette .cn-flow-board__body {
	grid-template-columns: 240px minmax(0, 1fr) 340px;
}

.cn-flow-board__card {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-width: 0;
	padding: 16px;
	border: 1px solid var(--color-border);
	border-radius: 12px;
	background: var(--color-main-background);
}

.cn-flow-board__canvas {
	padding: 0;
	overflow: hidden;
	background-color: var(--color-background-hover);
	background-image: radial-gradient(var(--color-border-dark) 1px, transparent 1px);
	background-size: 16px 16px;
}

.cn-flow-board__canvas > :first-child {
	flex: 1 1 auto;
	min-height: 0;
}

.cn-flow-board__card-title {
	margin: 0;
	font-size: 16px;
	font-weight: 600;
}

.cn-flow-board__subtitle {
	margin: 4px 0 0;
	font-size: 14px;
	font-weight: 600;
}

.cn-flow-board__eyebrow {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-flow-board__validity,
.cn-flow-board__legend {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 0;
	padding: 10px 16px;
	border-top: 1px solid var(--color-border);
	background: var(--color-main-background);
}

.cn-flow-board__validity--success {
	color: var(--color-success-text);
}

.cn-flow-board__validity--warning {
	color: var(--color-warning-text);
}

.cn-flow-board__validity--error {
	color: var(--color-error-text);
}

.cn-flow-board__palette-group {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-flow-board__palette-app {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	font-weight: 600;
}

.cn-flow-board__palette-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-flow-board__palette-step {
	width: 100%;
	min-height: 34px;
	padding: 6px 10px;
	border: 1px solid var(--color-border);
	border-radius: 8px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	text-align: start;
	cursor: pointer;
}

.cn-flow-board__palette-step:hover {
	background: var(--color-background-hover);
}

.cn-flow-board__palette-note {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-flow-board__tabs {
	display: flex;
	gap: 4px;
	border-bottom: 1px solid var(--color-border);
}

.cn-flow-board__tab {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 10px;
	margin-bottom: -1px;
	border: 1px solid transparent;
	border-radius: 8px 8px 0 0;
	background: transparent;
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-flow-board__tab--active {
	border-color: var(--color-border);
	border-bottom-color: var(--color-main-background);
	font-weight: 600;
}

.cn-flow-board__tab-count {
	min-width: 18px;
	padding: 0 5px;
	border-radius: 9px;
	background: var(--color-background-dark);
	font-size: 12px;
	line-height: 18px;
	text-align: center;
}

.cn-flow-board__step-actions,
.cn-flow-board__step-footer {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-flow-board__step-footer {
	justify-content: space-between;
	margin-top: auto;
}

@media (max-width: 1024px) {
	.cn-flow-board__body,
	.cn-flow-board--with-palette .cn-flow-board__body {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
