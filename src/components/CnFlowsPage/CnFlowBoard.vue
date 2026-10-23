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
					@click="onRun">
					{{ t('nextcloud-vue', 'Run') }}
				</NcButton>
				<NcButton v-if="testSubjectReady"
					:disabled="store.dryRunning || !store.flow.id"
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
				{{ t('nextcloud-vue', 'The saved flow is tried with the record you pick. Nothing is changed or sent.') }}
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
					:disabled="!testRecord || store.dryRunning"
					data-testid="flow-board-test-run"
					@click="runTest">
					{{ t('nextcloud-vue', 'Run test') }}
				</NcButton>
			</template>
		</CnDialog>

		<p class="cn-flow-board__path" data-testid="flow-board-path">
			<CnStatusBadge v-if="pillText"
				class="cn-flow-board__pill"
				:label="pillText"
				:variant="pill ? pillVariant : 'default'" />
			<template v-for="(crumb, index) in trailCrumbs" :key="index">
				<a :href="crumb.href" class="cn-flow-board__crumb" @click="onCrumbClick($event, crumb.path)">{{ crumb.label }}</a>
				<span aria-hidden="true"> / </span>
			</template>
			<template v-if="store.inRunView">
				<a :href="flowHref" class="cn-flow-board__crumb" @click="onCrumbClick($event, flowPath)">{{ flowName }}</a>
				<span aria-hidden="true"> / </span>
				<span>{{ runCrumb }}</span>
			</template>
			<span v-else>{{ flowName }}</span>
			<span v-if="metaText" class="cn-flow-board__meta"> · {{ metaText }}</span>
		</p>

		<NcNoteCard v-if="notice && !store.inRunView" type="info" class="cn-flow-board__notice">
			{{ noticeText }}
		</NcNoteCard>

		<div class="cn-flow-board__body">
			<aside v-if="showPalette"
				class="cn-flow-board__card cn-flow-board__palette"
				:aria-label="t('nextcloud-vue', 'Steps')"
				data-testid="flow-board-palette">
				<section v-for="group in paletteSections"
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
				<button v-if="paletteCurated"
					type="button"
					class="cn-flow-board__palette-more"
					:disabled="store.graphLocked"
					data-testid="flow-board-palette-more"
					@click="stepPickerOpen = true">
					{{ t('nextcloud-vue', 'More steps') }}
				</button>
				<p v-if="paletteFootnote" class="cn-flow-board__palette-note">
					{{ paletteFootnote }}
				</p>
			</aside>
			<CnFlowStepPickerModal v-if="stepPickerOpen" @close="stepPickerOpen = false" />

			<section class="cn-flow-board__card cn-flow-board__canvas" :aria-label="t('nextcloud-vue', 'Flow canvas')">
				<CnFlowDetail :id="id"
					:app="app"
					:run="run"
					:layoutDirection="flowDirection === 'down' ? 'down' : 'right'"
					:fitMaxZoom="flowDirection === 'down' ? 1 : 0"
					:nodeBadge="nodeLook === 'card' ? nodeBadge : null"
					:toolbarActions="false"
					:addStep="!showPalette"
					@save="$emit('save')"
					@run="onRun" />
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
				<CnFlowDryRunResult v-if="store.dryRunResult && !store.inRunView"
					:result="store.dryRunResult"
					@close="store.clearDryRun()" />
				<template v-else-if="store.inRunView">
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
					<h3 class="cn-flow-board__card-title" data-testid="flow-board-step-name">
						{{ stepName }}
					</h3>
					<!-- The step type as a pill under the name (DqFlow "Beslistabel van OpenRegister"). -->
					<CnStatusBadge :label="stepTypePill"
						variant="purple"
						class="cn-flow-board__step-type"
						data-testid="flow-board-step-type" />
					<div v-if="stepFields.length > 0" class="cn-flow-board__settings">
						<div v-for="field in stepFields"
							:key="field.key"
							class="cn-flow-board__setting"
							data-testid="flow-board-step-setting">
							<NcCheckboxRadioSwitch v-if="field.widget === 'switch'"
								type="switch"
								:modelValue="field.value === true"
								:disabled="store.graphLocked"
								@update:modelValue="setStepField(field, $event)">
								{{ field.label }}
							</NcCheckboxRadioSwitch>
							<NcSelect v-else-if="field.widget === 'select'"
								:modelValue="field.option"
								:options="field.options"
								:inputLabel="field.label"
								:clearable="false"
								:disabled="store.graphLocked"
								label="label"
								@update:modelValue="setStepField(field, $event ? $event.id : '')" />
							<NcTextArea v-else-if="field.widget === 'textarea'"
								:modelValue="fieldDraft(field)"
								:label="field.label"
								:disabled="store.graphLocked"
								resize="vertical"
								@update:modelValue="drafts[field.key] = $event"
								@blur="commitStepField(field)" />
							<NcTextField v-else
								:modelValue="fieldDraft(field)"
								:label="field.label"
								:disabled="store.graphLocked"
								@update:modelValue="drafts[field.key] = $event"
								@blur="commitStepField(field)"
								@keydown.enter="commitStepField(field)" />
						</div>
					</div>
					<dl v-if="stepOutcomes.length > 0" class="cn-flow-board__outcomes" data-testid="flow-board-step-outcomes">
						<div v-for="outcome in stepOutcomes" :key="outcome.id" class="cn-flow-board__outcome">
							<dt>{{ outcome.label }}</dt>
							<dd>{{ outcome.target }}</dd>
						</div>
					</dl>
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
					<details class="cn-flow-board__step-log" data-testid="flow-board-step-log">
						<summary class="cn-flow-board__subtitle">
							{{ t('nextcloud-vue', 'Recent log lines of this step') }}
						</summary>
						<CnFlowStepLog :lines="recentStepLines"
							withDay
							:emptyText="t('nextcloud-vue', 'This step has not run yet.')" />
					</details>
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
				<template v-else-if="showRuns">
					<NcButton variant="tertiary"
						class="cn-flow-board__runs-back"
						data-testid="flow-board-hide-runs"
						@click="showRuns = false">
						{{ t('nextcloud-vue', 'Back to the step settings') }}
					</NcButton>
					<CnFlowSidebar embedded />
				</template>
				<div v-else class="cn-flow-board__inspector-empty" data-testid="flow-board-inspector-empty">
					<p>{{ t('nextcloud-vue', 'Select a step on the canvas to see its settings.') }}</p>
					<NcButton variant="secondary"
						data-testid="flow-board-show-runs"
						@click="showRuns = true">
						{{ t('nextcloud-vue', 'Show runs') }}
					</NcButton>
				</div>
			</aside>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcNoteCard, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'
import TestTube from 'vue-material-design-icons/TestTube.vue'
import CnFlowStepPickerModal from '../../dialogs/CnFlowStepPickerModal.vue'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import CnDialog from '../CnDialog/CnDialog.vue'
import CnFlowDetail from '../CnFlowDetail/CnFlowDetail.vue'
import CnFlowDryRunResult from '../CnFlowDetail/CnFlowDryRunResult.vue'
import CnFlowRunSummary from '../CnFlowDetail/CnFlowRunSummary.vue'
import CnFlowSidebar from '../CnFlowDetail/CnFlowSidebar.vue'
import CnFlowStepLog from '../CnFlowDetail/CnFlowStepLog.vue'
import CnResourceSelect from '../CnResourceSelect/CnResourceSelect.vue'
import { FLOW_RUN_ACTIVE_STATUSES, useFlowStore } from '../../composables/useFlowStore.js'
import { formatRelativeDate } from '../../utils/boardDate.js'
import { flowOutcomeLevels, flowRunDurationMs, flowRunLogLines, flowRunName, formatFlowDuration } from '../../utils/flowRunLog.js'
import { appDisplayNames } from '../../utils/nextcloudApps.js'
import { normaliseSelectOptions } from '../../utils/selectOptions.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

/**
 * The board-look flow editor and run view. CnFlowEditorPage renders it when
 * the app or page is in the board look; the Nextcloud look keeps the canvas
 * on its own with the app sidebar.
 */
export default {
	name: 'CnFlowBoard',

	components: { CnBuildiqEditButton, CnDialog, CnFlowDetail, CnFlowDryRunResult, CnResourceSelect, TestTube, CnFlowRunSummary, CnFlowSidebar, CnFlowStepLog, CnFlowStepPickerModal, CnStatusBadge, NcButton, NcCheckboxRadioSwitch, NcNoteCard, NcSelect, NcTextArea, NcTextField },

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
		/**
		 * The palette's groups as the page curates them, in order:
		 * `[{ app?, label?, tone?, entries: [{ type, label?, short? }] }]`.
		 * `type` is a catalogue id; `label` replaces the step's catalogue name
		 * and the group's app name; on the canvas (`nodeLook: card`) a step's
		 * pill reads the group's `pill` (else its name) and the step's `short`,
		 * in the group's `tone`. Steps the catalogue lacks are left out, and every other
		 * step stays behind "More steps". Empty draws the whole catalogue,
		 * grouped per app (DqFlow: four groups, nine steps).
		 */
		paletteGroups: { type: Array, default: () => [] },
		/**
		 * `card` draws each step as a card with its name and the pill of the
		 * app that does it ("dossiq · persoon vragen", DqFlow); default `type`
		 * keeps the type line over the name.
		 */
		nodeLook: { type: String, default: 'type' },
		/** `down` runs the steps top to bottom and opens them at their own size (DqFlow); default `right`, left to right and fitted. */
		flowDirection: { type: String, default: 'right' },
		/** An info notice under the path. */
		notice: { type: String, default: '' },
		/**
		 * Edit a published flow in place; Save publishes the edits as the next
		 * version, and runs already started keep theirs (DqFlow).
		 */
		saveAsVersion: { type: Boolean, default: false },
		/** Which of `trigger`, `steps` and `version` the path names after the flow, in that order. */
		metaParts: { type: Array, default: () => ['trigger', 'steps', 'version'] },
		/** A closing note after the path's meta ("changes apply to new cases"). */
		metaNote: { type: String, default: '' },
		/**
		 * The levels before the flow in the path, each its own link:
		 * `[{ label, href? }]` ("Settings" / "Flows"). A crumb without an
		 * `href` links to the flow list. Empty draws the one `listLabel` link.
		 */
		breadcrumb: { type: Array, default: () => [] },
		/** The pill at the start of the path row ("Case type flow"). */
		pill: { type: String, default: '' },
		/** The tone of `pill` ("teal" on DqFlow); a lifecycle pill stays neutral. */
		pillVariant: { type: String, default: 'default' },
		/**
		 * The records a test run can take as its subject: `{ register, schema,
		 * labelField?, label? }`. Draws a header button ("Testen met een zaak",
		 * DqFlow) that tries the saved flow with a picked record through
		 * OpenRegister's dry-run, changing and sending nothing.
		 */
		testSubject: { type: Object, default: null },
	},

	emits: ['save', 'run', 'retried'],

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		return { runTab: 'step', testOpen: false, testRecord: null, appNames: {}, showRuns: false, stepPickerOpen: false, drafts: {}, loadedOptions: {} }
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

		/**
		 * The path's links before the flow: the declared trail, else the one
		 * list link.
		 *
		 * @spec openspec/changes/flow-board-trail/specs/flow-board/spec.md#requirement-the-flow-board-path-names-every-level-and-carries-the-pill
		 * @return {Array<{label: string, href: string, path: string}>} The crumbs.
		 */
		trailCrumbs() {
			const declared = (this.breadcrumb || []).filter((crumb) => crumb && typeof crumb.label === 'string' && crumb.label !== '')
			if (declared.length === 0) {
				return [{ label: this.listText, href: this.listHref, path: this.detailRoute }]
			}
			return declared.map((crumb) => (crumb.href
				? { label: crumb.label, href: crumb.href, path: '' }
				: { label: crumb.label, href: this.listHref, path: this.detailRoute }))
		},

		/**
		 * The notice with `{name}` filled with the flow's name.
		 *
		 * @spec openspec/changes/flow-board-trail/specs/flow-board/spec.md#requirement-the-flow-board-notice-can-name-the-flow
		 * @return {string} The notice text.
		 */
		noticeText() {
			return String(this.notice || '').split('{name}').join(this.store.flow.name || '')
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
			const shown = Array.isArray(this.metaParts) ? this.metaParts : []
			const trigger = this.triggerText
			if (trigger && shown.includes('trigger')) {
				parts.push(this.t('nextcloud-vue', 'trigger {trigger}', { trigger }))
			}
			const count = this.store.nodes.length
			if (shown.includes('steps')) {
				parts.push(count === 1 ? this.t('nextcloud-vue', '1 step') : this.t('nextcloud-vue', '{count} steps', { count }))
			}
			if (this.store.flow.version && shown.includes('version')) {
				parts.push(this.t('nextcloud-vue', 'version {version}', { version: this.store.flow.version }))
			}
			if (this.metaNote) {
				parts.push(this.metaNote)
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

		/** @return {boolean} Whether the page curates the palette. */
		paletteCurated() {
			return Array.isArray(this.paletteGroups) && this.paletteGroups.length > 0
		},

		/**
		 * The palette's groups: the page's curated ones when it names them,
		 * else the catalogue grouped by owning app, each group named by the
		 * app's display name (its id when Nextcloud names none), the app that
		 * owns this flow first.
		 *
		 * @spec openspec/changes/flow-board-palette-groups/specs/flow-board/spec.md#requirement-a-flow-page-can-curate-its-palette
		 * @return {Array<{app: string, name: string, entries: Array<object>}>} The groups.
		 */
		paletteSections() {
			if (this.paletteCurated) {
				return this.curatedSections
			}
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

		/**
		 * The page's curated groups, each step resolved against the catalogue
		 * under the page's label; a step the catalogue lacks is left out, and a
		 * group left with none is not drawn.
		 *
		 * @return {Array<{app: string, name: string, tone: string, entries: Array<object>}>} The groups.
		 */
		curatedSections() {
			const catalog = this.store.nodeCatalog || []
			return this.paletteGroups
				.map((group, index) => {
					const entries = (Array.isArray(group?.entries) ? group.entries : [])
						.map((step) => {
							const entry = step && catalog.find((item) => item && item.id === step.type)
							return entry ? { ...entry, displayName: step.label || entry.displayName, short: step.short || '' } : null
						})
						.filter(Boolean)
					const app = String(group?.app || (entries[0] ? String(entries[0].id).split('.')[0] : '') || index)
					return { app, name: group?.label || this.appNames[app] || app, tone: group?.tone || '', entries }
				})
				.filter((group) => group.entries.length > 0)
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

		/**
		 * The selected step's settings as fields, as its owner declares them in
		 * the catalogue's `configForm`: the ones the step sets and the required
		 * ones. A field with options is a select, a boolean a switch, a
		 * textarea or an object value a text area; the rest a text field.
		 * Every other setting stays behind Edit step.
		 *
		 * @spec openspec/changes/flow-board-inspector-fields/specs/flow-board/spec.md#requirement-the-flow-board-inspector-edits-the-selected-steps-settings-and-names-its-outcomes
		 * @return {Array<object>} The fields.
		 */
		stepFields() {
			const node = this.store.selectedNode
			const entry = node ? this.store.catalogEntry(node.type) : null
			const config = (node && node.config) || {}
			const form = (entry && Array.isArray(entry.configForm)) ? entry.configForm : []
			const isSet = (value) => value !== undefined && value !== null && value !== ''
			return form
				.filter((field) => field && field.key && (isSet(config[field.key]) || field.required === true))
				.map((field) => {
					const value = config[field.key]
					const options = field.optionsFrom
						? [...(this.loadedOptions[field.optionsFrom] || [])]
						: normaliseSelectOptions(field.options)
					if (isSet(value) && typeof value !== 'object' && options.length > 0 && !options.some((o) => o.id === value)) {
						options.push({ id: value, label: String(value) })
					}
					let widget = 'text'
					if (options.length > 0 || (field.type === 'select' && field.optionsFrom)) {
						widget = 'select'
					} else if (field.type === 'boolean' || field.type === 'switch' || typeof value === 'boolean') {
						widget = 'switch'
					} else if (field.type === 'textarea' || field.type === 'json' || (value !== null && typeof value === 'object')) {
						widget = 'textarea'
					}
					return {
						key: field.key,
						label: field.label || field.key,
						widget,
						value,
						options,
						option: options.find((o) => o.id === value) || null,
						isObject: value !== null && typeof value === 'object',
					}
				})
		},

		/**
		 * Where the selected step goes next: each outgoing line by its name
		 * ("Ja", "Nee"), else "Next", with the step it leads to.
		 *
		 * @return {Array<{id: string, label: string, target: string}>} The outcomes.
		 */
		stepOutcomes() {
			const id = this.store.selectedNodeId
			if (!id) {
				return []
			}
			const nameOf = (target) => {
				const node = this.store.nodes.find((item) => item.id === target)
				return (node && (node.name || node.label)) || target
			}
			return (this.store.canvasEdges || [])
				.filter((line) => line.source === id)
				.map((line) => ({ id: line.id, label: (line.data && line.data.label) || this.t('nextcloud-vue', 'Next'), target: nameOf(line.target) }))
		},

		/**
		 * The selected step's type pill: the palette's name for it and the app
		 * that does it ("Beslistabel van OpenRegister"), else the catalogue's.
		 *
		 * @return {string} The pill text.
		 */
		stepTypePill() {
			const type = String(this.store.selectedNode?.type || '')
			const group = (Array.isArray(this.paletteGroups) ? this.paletteGroups : []).find((item) => (item?.entries || []).some((step) => step && step.type === type))
			const step = group ? group.entries.find((item) => item && item.type === type) : null
			if (!group) {
				return this.stepTypeLabel
			}
			const app = String(group.app || type.split('.')[0] || '')
			return this.t('nextcloud-vue', '{type} from {app}', { type: (step && step.label) || this.stepTypeLabel, app: group.label || this.appNames[app] || app })
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

	watch: {
		// A field's typing belongs to the step it was typed for.
		'store.selectedNodeId': {
			handler() {
				this.drafts = {}
				this.loadStepOptions()
			},
		},

		saveAsVersion: {
			immediate: true,
			handler(on) {
				this.store.savesAsVersion = on === true
			},
		},

		// A selected step takes the panel back from the run history.
		'store.selectedNodeId': function(id) {
			if (id) {
				this.showRuns = false
			}
		},
	},

	async created() {
		// The palette groups and the step pills name apps by display name;
		// only those read the names.
		if (this.palette !== 'column' && this.nodeLook !== 'card') {
			return
		}
		const { default: axios } = await import('@nextcloud/axios')
		this.appNames = await appDisplayNames(axios)
	},

	beforeUnmount() {
		this.store.savesAsVersion = false
	},

	methods: {
		/**
		 * Load the choices of the selected step's select fields that name a
		 * url (`optionsFrom`), once per url.
		 *
		 * @return {Promise<void>}
		 */
		async loadStepOptions() {
			const node = this.store.selectedNode
			const entry = node ? this.store.catalogEntry(node.type) : null
			const urls = ((entry && entry.configForm) || [])
				.filter((field) => field && field.type === 'select' && field.optionsFrom)
				.map((field) => String(field.optionsFrom))
				.filter((url) => !this.loadedOptions[url])
			if (urls.length === 0) {
				return
			}
			const { default: axios } = await import('@nextcloud/axios')
			const { generateUrl } = await import('@nextcloud/router')
			await Promise.all(urls.map(async (url) => {
				try {
					const response = await axios.get(url.startsWith('/') && !url.startsWith('/apps') && !url.startsWith('/index.php') ? generateUrl(url) : url)
					const rows = Array.isArray(response.data) ? response.data : (response.data?.results || [])
					this.loadedOptions = { ...this.loadedOptions, [url]: normaliseSelectOptions(rows) }
				} catch (error) {
					// The field then shows the stored value; Edit step still reaches everything.
					// eslint-disable-next-line no-console -- diagnostic for a failure this degrades from
					console.error(`cn-flow: could not load options from ${url}`, error)
				}
			}))
		},

		/**
		 * What a text field shows: the typing in progress, else the setting.
		 *
		 * @param {object} field A step field.
		 * @return {string} The text.
		 */
		fieldDraft(field) {
			if (Object.hasOwn(this.drafts, field.key)) {
				return this.drafts[field.key]
			}
			if (field.isObject) {
				return JSON.stringify(field.value, null, 2)
			}
			return field.value === undefined || field.value === null ? '' : String(field.value)
		},

		/**
		 * Write a text field's typing to the step when the field is left; an
		 * object setting is written back as an object when the text is JSON.
		 *
		 * @param {object} field A step field.
		 * @return {void}
		 */
		commitStepField(field) {
			if (!Object.hasOwn(this.drafts, field.key)) {
				return
			}
			let value = this.drafts[field.key]
			if (field.isObject) {
				try {
					value = JSON.parse(value)
				} catch {
					return
				}
			}
			delete this.drafts[field.key]
			this.setStepField(field, value)
		},

		/**
		 * Write one setting of the selected step, as one undoable edit.
		 *
		 * @spec openspec/changes/flow-board-inspector-fields/specs/flow-board/spec.md#requirement-the-flow-board-inspector-edits-the-selected-steps-settings-and-names-its-outcomes
		 * @param {object} field A step field.
		 * @param {string|boolean|object} value The new value.
		 * @return {void}
		 */
		setStepField(field, value) {
			const node = this.store.selectedNode
			if (!node || JSON.stringify(node.config?.[field.key]) === JSON.stringify(value)) {
				return
			}
			this.store.setNodeConfigById(node.id, { ...(node.config || {}), [field.key]: value })
		},

		/**
		 * The pill on a step's card: the app that does it, with the page's short
		 * type when it gives one, in the palette group's tone (the app that owns
		 * the flow in the primary tone); "Start" on a start step.
		 *
		 * @spec openspec/changes/flow-board-node-card/specs/flow-board/spec.md#requirement-a-flow-step-on-the-board-canvas-is-a-card-with-its-app-pill
		 * @param {object} node A flow node.
		 * @return {{label: string, variant: string}} The pill.
		 */
		nodeBadge(node) {
			const type = String(node?.type || '')
			if (this.store.roleOfNodeType(type) === 'trigger') {
				return { label: this.t('nextcloud-vue', 'Start step'), variant: 'default' }
			}
			const curated = (Array.isArray(this.paletteGroups) ? this.paletteGroups : []).find((group) => (group?.entries || []).some((step) => step && step.type === type))
			const step = curated ? curated.entries.find((item) => item && item.type === type) : null
			const entry = this.store.catalogEntry(type)
			const app = String(curated?.app || entry?.app || type.split('.')[0] || '')
			const name = curated ? (curated.pill || curated.label || this.appNames[app] || app) : (this.appNames[app] || app)
			const variant = curated?.tone || (app === this.app ? 'primary' : 'default')
			return { label: step && step.short ? `${name} · ${step.short}` : name, variant }
		},

		/**
		 * Run the flow, with the run history in the panel to follow it.
		 *
		 * @return {void}
		 */
		onRun() {
			this.showRuns = true
			this.$emit('run')
		},

		/**
		 * Try the saved flow with the picked record through OpenRegister's
		 * dry-run, which changes and sends nothing, then close the dialog; the
		 * per-step result shows beside the canvas.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/flow-test-with-a-record/specs/flow-test-with-a-record/spec.md#requirement-testing-a-flow-with-a-record-changes-nothing
		 */
		async runTest() {
			const uuid = Array.isArray(this.testRecord) ? this.testRecord[0] : this.testRecord
			if (!uuid) {
				return
			}
			await this.store.dryRun({ uuid, register: this.testSubject.register, schema: this.testSubject.schema })
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
		 * Follow a path link on the app's router; a modified click, or a crumb
		 * that names an href rather than a path, keeps the browser's own
		 * behaviour.
		 *
		 * @param {MouseEvent} event The click.
		 * @param {string} path The target path.
		 * @return {void}
		 */
		onCrumbClick(event, path) {
			if (!path || !this.$router || event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
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
/* The board page's padding, so the title stands where every board page puts it (DqFlow). */
.cn-flow-board {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: var(--cn-board-content-padding, 24px 28px);
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

.cn-flow-board__pill {
	margin-inline-end: 10px;
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

/* Palette, canvas and inspector at 220 / rest / 280 (DqFlow). */
.cn-flow-board--with-palette .cn-flow-board__body {
	grid-template-columns: 220px minmax(0, 1fr) 280px;
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

/* The canvas is the white card with the dot grid; the palette beside it sits
   on the page ground (DqFlow). */
.cn-flow-board__canvas {
	padding: 0;
	overflow: hidden;
	background-color: var(--color-main-background);
	background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
	background-size: 16px 16px;
}

.cn-flow-board__palette {
	gap: 14px;
	padding: 14px;
	background: transparent;
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

.cn-flow-board__step-type {
	align-self: flex-start;
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
	gap: 6px;
}

/* The providing app as a small caps label, no title row above the groups. */
.cn-flow-board__palette-app {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.cn-flow-board__palette-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 0;
	padding: 0;
	list-style: none;
}

/* A step is a plain 400 label (DqFlow "Status zetten"); the nldesign theme
   sets every button's weight with `!important` through its token. */
.cn-flow-board__palette-step {
	--nldesign-component-button-font-weight: 400;
	width: 100%;
	min-height: 34px;
	padding: 8px 10px;
	border: 1px solid var(--color-border);
	border-radius: 8px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-size: 14px;
	font-weight: 400;
	text-align: start;
	cursor: pointer;
}

.cn-flow-board__palette-step:hover {
	background: var(--color-background-hover);
}

/* The way to every other step under a curated palette, quiet beside the steps. */
.cn-flow-board__palette-more {
	align-self: flex-start;
	padding: 0;
	border: 0;
	background: none;
	color: var(--color-primary-element);
	font-size: 14px;
	text-decoration: underline;
	cursor: pointer;
}

.cn-flow-board__palette-more:disabled {
	color: var(--color-text-maxcontrast);
	cursor: default;
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

.cn-flow-board__settings {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
}

.cn-flow-board__setting :deep(.input-field),
.cn-flow-board__setting :deep(.v-select) {
	margin: 0;
}

/* Where the step goes next: "Ja  Deelzaak welstandsadvies" (DqFlow). */
.cn-flow-board__outcomes {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 6px 16px;
	margin: 0;
}

.cn-flow-board__outcome {
	display: contents;
}

.cn-flow-board__outcome dt {
	color: var(--color-text-maxcontrast);
}

.cn-flow-board__outcome dd {
	margin: 0;
	font-weight: 600;
	overflow-wrap: anywhere;
}

.cn-flow-board__step-log summary {
	cursor: pointer;
}

.cn-flow-board__inspector-empty {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-flow-board__inspector-empty p {
	margin: 0;
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
