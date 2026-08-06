<!--
  CnFlowSidebar — the controls half of the flow editor.

  Palette, per-node configuration, flow settings, run history and Save/Run.
  Rendered in Nextcloud's app sidebar so the canvas keeps the full width; shares
  `useFlowStore` with CnFlowDetail because the two sit in different parts of the
  tree.

  THE PALETTE IS THE ENGINE'S CATALOGUE, AND NOTHING ELSE. A builder that offers
  a step the engine has never heard of produces a flow that cannot run, which is
  precisely what the component this was ported from did: it drew its palette
  from the catalogue and then matched bare, un-namespaced ids everywhere else.
  An empty palette here means the catalogue could not be read — a visible,
  diagnosable state — never a hard-coded fallback list that might disagree with
  the engine.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-flow-sidebar">
		<!-- ── Palette ─────────────────────────────────────────────── -->
		<section>
			<h4>{{ t('nextcloud-vue', 'Steps') }}</h4>
			<NcNoteCard v-if="!store.nodeCatalog.length" type="warning">
				{{ t('nextcloud-vue', 'The list of available steps could not be read, so no steps can be added. This does not mean the instance has none.') }}
			</NcNoteCard>
			<ul v-else class="cn-flow-sidebar__palette">
				<li v-for="entry in store.nodeCatalog"
					:key="entry.id"
					class="cn-flow-sidebar__palette-item"
					draggable="true"
					:title="entry.description"
					@dragstart="store.paletteDragType = entry.id"
					@click="store.addNode(entry.id)">
					<span class="cn-flow-sidebar__palette-name">{{ entry.displayName || entry.id }}</span>
					<span class="cn-flow-sidebar__palette-id">{{ entry.id }}</span>
				</li>
			</ul>
		</section>

		<!-- ── Selected node ───────────────────────────────────────── -->
		<section v-if="store.selectedNode">
			<h4>{{ t('nextcloud-vue', 'Step configuration') }}</h4>
			<p class="cn-flow-sidebar__hint">
				{{ store.selectedNode.type }}
			</p>

			<!--
			  A RAW config editor, deliberately. The catalogue publishes each
			  node's id, name, description and icon — but not a schema for its
			  config — so a typed form here could only be hand-written per node
			  type, which is how the previous builder ended up understanding four
			  node types and silently ignoring every other app's. Editing the
			  config as a document works for every node the engine has now and
			  every one an app adds later.
			-->
			<NcTextArea :model-value="configJson"
				:label="t('nextcloud-vue', 'Configuration (JSON)')"
				:error="configError !== null"
				:helper-text="configError || t('nextcloud-vue', 'The options this step takes. See the step description above.')"
				rows="8"
				@update:model-value="onConfigInput" />

			<NcButton type="tertiary" @click="store.removeNode(store.selectedNode.id)">
				{{ t('nextcloud-vue', 'Remove step') }}
			</NcButton>
		</section>

		<!-- ── Flow settings ───────────────────────────────────────── -->
		<section>
			<h4>{{ t('nextcloud-vue', 'Flow') }}</h4>

			<NcTextField :model-value="store.flow.name"
				:label="t('nextcloud-vue', 'Name')"
				@update:model-value="store.setFlowField('name', $event)" />

			<NcTextField :model-value="store.flow.description || ''"
				:label="t('nextcloud-vue', 'Description')"
				@update:model-value="store.setFlowField('description', $event)" />

			<NcSelect :model-value="triggerOption"
				:options="triggerOptions"
				:input-label="t('nextcloud-vue', 'Trigger')"
				:clearable="false"
				@update:model-value="onTrigger" />

			<NcTextField v-if="store.flow.trigger === 'schedule'"
				:model-value="store.flow.cron || ''"
				:label="t('nextcloud-vue', 'Cron schedule')"
				:helper-text="t('nextcloud-vue', 'For example 0 9 * * 1 — 09:00 every Monday.')"
				@update:model-value="store.setFlowField('cron', $event)" />

			<NcTextField :model-value="store.flow.triggerRegister || ''"
				:label="t('nextcloud-vue', 'Restrict to register')"
				:helper-text="t('nextcloud-vue', 'Leave empty for any register.')"
				@update:model-value="store.setFlowField('triggerRegister', $event)" />

			<NcTextField :model-value="store.flow.triggerSchema || ''"
				:label="t('nextcloud-vue', 'Restrict to schema')"
				:helper-text="t('nextcloud-vue', 'Leave empty for any schema.')"
				@update:model-value="store.setFlowField('triggerSchema', $event)" />

			<NcCheckboxRadioSwitch :model-value="store.flow.enabled === true"
				type="switch"
				@update:model-value="store.setFlowField('enabled', $event)">
				{{ t('nextcloud-vue', 'Enabled') }}
			</NcCheckboxRadioSwitch>

			<NcNoteCard v-if="store.flow.enabled && !store.flow.owner" type="warning">
				{{ t('nextcloud-vue', 'This flow has no owner yet, so a trigger will not start it. Saving it makes you its owner.') }}
			</NcNoteCard>
		</section>

		<!-- ── Actions ─────────────────────────────────────────────── -->
		<section class="cn-flow-sidebar__actions">
			<NcButton type="primary" :disabled="store.saving || !store.flow.name" @click="$emit('save')">
				{{ store.saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Save') }}
			</NcButton>
			<NcButton :disabled="store.running || !store.flow.id" @click="$emit('run')">
				{{ store.running ? t('nextcloud-vue', 'Starting…') : t('nextcloud-vue', 'Run now') }}
			</NcButton>
		</section>

		<!--
			The server's reason for refusing a save or a run.

			`store.error` was set on every failure and rendered NOWHERE, so a
			refused save looked exactly like a save that worked: the button
			flickered and nothing else happened. There is no server log line to
			fall back on either, because a 400 JSONResponse is not an exception
			(#607).

			`store.save()` and `store.run()` both swallow the failure into
			`return null`, and the consumer's `onSave()` then skips its
			`$router.replace` — so the only remaining evidence that anything went
			wrong is this card.
		-->
		<NcNoteCard v-if="store.error" type="error" class="cn-flow-sidebar__failure">
			{{ errorText }}
		</NcNoteCard>
		<p v-if="!store.flow.id" class="cn-flow-sidebar__hint">
			{{ t('nextcloud-vue', 'Save the flow before running it — the engine runs the stored flow, not the unsaved canvas.') }}
		</p>

		<!-- ── Run history ─────────────────────────────────────────── -->
		<section v-if="store.runs.length">
			<h4>{{ t('nextcloud-vue', 'Recent runs') }}</h4>
			<ul class="cn-flow-sidebar__runs">
				<li v-for="run in store.runs" :key="run.uuid">
					<button class="cn-flow-sidebar__run" @click="store.inspectRun(run.uuid)">
						<span :class="`cn-flow-sidebar__status cn-flow-sidebar__status--${run.status}`">{{ run.status }}</span>
						<span>{{ run.created }}</span>
					</button>
				</li>
			</ul>

			<div v-if="store.inspectedRunUuid" class="cn-flow-sidebar__steps">
				<h5>{{ t('nextcloud-vue', 'Steps') }}</h5>
				<p v-if="!store.steps.length" class="cn-flow-sidebar__hint">
					{{ t('nextcloud-vue', 'This run recorded no steps.') }}
				</p>
				<ol v-else>
					<li v-for="(step, i) in store.steps" :key="i">
						<strong>{{ step.transition }}</strong>
						<span class="cn-flow-sidebar__hint"> · {{ step.status }}</span>
						<span v-if="step.error" class="cn-flow-sidebar__error"> · {{ step.error }}</span>
					</li>
				</ol>
			</div>
		</section>
	</div>
</template>

<script>
import {
	NcButton,
	NcCheckboxRadioSwitch,
	NcNoteCard,
	NcSelect,
	NcTextArea,
	NcTextField,
} from '@nextcloud/vue'
import { useFlowStore } from '../../composables/useFlowStore.js'

export default {
	name: 'CnFlowSidebar',

	components: {
		NcButton,
		NcCheckboxRadioSwitch,
		NcNoteCard,
		NcSelect,
		NcTextArea,
		NcTextField,
	},

	emits: ['save', 'run'],

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		return {
			// Null while the JSON parses. Held separately from the store so an
			// in-progress edit is not written back as a broken config — the node
			// keeps its last valid configuration until the text parses again.
			configError: null,
			configDraft: null,
		}
	},

	computed: {
		/**
		 * What to show the user when a save or a run was refused.
		 *
		 * Prefers the API's own `error` field, because that is the sentence
		 * written for a person — "A flow needs a name." says what to do, where
		 * "Request failed with status code 400" does not. Falls back to the
		 * axios message, and then to a generic line, so the card is never empty
		 * while `store.error` is set.
		 *
		 * @return {string} The message.
		 */
		errorText() {
			const error = this.store.error
			if (!error) {
				return ''
			}

			return error?.response?.data?.error
				|| error?.response?.data?.message
				|| error?.message
				|| this.t('nextcloud-vue', 'The last action failed.')
		},

		/**
		 * @return {string} The selected node's config as pretty JSON.
		 */
		configJson() {
			if (this.configDraft !== null) {
				return this.configDraft
			}

			return JSON.stringify((this.store.selectedNode?.config || {}), null, 2)
		},

		/**
		 * @return {Array<object>} The trigger options, from the event catalogue.
		 */
		triggerOptions() {
			const fromCatalog = this.store.eventCatalog.map((e) => ({ id: e.id, label: e.label || e.id }))

			// `manual` and `schedule` are engine-level triggers rather than
			// dispatched events, so the event catalogue does not carry them.
			return [
				{ id: 'manual', label: this.t('nextcloud-vue', 'Manually only') },
				{ id: 'schedule', label: this.t('nextcloud-vue', 'On a schedule') },
				...fromCatalog,
			]
		},

		/**
		 * @return {object} The currently selected trigger option.
		 */
		triggerOption() {
			const current = this.store.flow.trigger
			return this.triggerOptions.find((o) => o.id === current) || { id: current, label: current }
		},
	},

	watch: {
		'store.selectedNodeId'() {
			// A fresh selection starts from the stored config, not the previous
			// node's half-finished text.
			this.configDraft = null
			this.configError = null
		},
	},

	methods: {
		/**
		 * Parse and store the node config, keeping the last valid value on error.
		 *
		 * @param {string} value The raw JSON text.
		 * @return {void}
		 */
		onConfigInput(value) {
			this.configDraft = value
			try {
				const parsed = JSON.parse(value || '{}')
				if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
					this.configError = this.t('nextcloud-vue', 'A step configuration must be a JSON object.')
					return
				}

				this.configError = null
				this.store.setNodeConfigAll(parsed)
			} catch (e) {
				this.configError = this.t('nextcloud-vue', 'Not valid JSON, so this step keeps its previous configuration.')
			}
		},

		/**
		 * @param {object} option The chosen trigger option.
		 * @return {void}
		 */
		onTrigger(option) {
			this.store.setFlowField('trigger', option ? option.id : 'manual')
		},
	},
}
</script>

<style scoped>
.cn-flow-sidebar {
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 8px 12px;
}

.cn-flow-sidebar section > * {
	margin-block-end: 8px;
}

.cn-flow-sidebar__palette {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-flow-sidebar__palette-item {
	display: flex;
	flex-direction: column;
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: grab;
}

.cn-flow-sidebar__palette-item:hover {
	background: var(--color-background-hover);
}

.cn-flow-sidebar__palette-id,
.cn-flow-sidebar__hint {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-flow-sidebar__error {
	color: var(--color-error-text);
}

.cn-flow-sidebar__actions {
	display: flex;
	gap: 8px;
}

.cn-flow-sidebar__run {
	display: flex;
	gap: 8px;
	inline-size: 100%;
	padding: 4px 6px;
	border: none;
	background: none;
	text-align: start;
	cursor: pointer;
}

.cn-flow-sidebar__run:hover {
	background: var(--color-background-hover);
}

.cn-flow-sidebar__status--failed {
	color: var(--color-error-text);
}

.cn-flow-sidebar__status--completed {
	color: var(--color-success-text);
}
</style>
