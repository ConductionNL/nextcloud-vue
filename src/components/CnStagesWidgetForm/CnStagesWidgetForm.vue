<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-stages-form">
		<h4 class="cn-stages-form__section">
			{{ t('nextcloud-vue', 'Stages widget') }}
		</h4>

		<NcTextField
			:model-value="draft.currentField || ''"
			:label="t('nextcloud-vue', 'Property holding the current stage')"
			placeholder="status"
			@update:model-value="setPath('currentField', $event)" />

		<div class="cn-stages-form__row">
			<NcSelect
				:model-value="draft.orientation || 'horizontal'"
				:options="['horizontal', 'vertical']"
				:input-label="t('nextcloud-vue', 'Direction')"
				:clearable="false"
				@update:model-value="setPath('orientation', $event)">
				<template #option="{ label: id }">
					{{ orientationLabel(id) }}
				</template>
				<template #selected-option="{ label: id }">
					{{ orientationLabel(id) }}
				</template>
			</NcSelect>
			<NcSelect
				:model-value="draft.size || 'medium'"
				:options="['medium', 'small']"
				:input-label="t('nextcloud-vue', 'Size')"
				:clearable="false"
				@update:model-value="setPath('size', $event)">
				<template #option="{ label: id }">
					{{ sizeLabel(id) }}
				</template>
				<template #selected-option="{ label: id }">
					{{ sizeLabel(id) }}
				</template>
			</NcSelect>
		</div>

		<NcTextField
			:model-value="draft.ariaLabel || ''"
			:label="t('nextcloud-vue', 'Accessible name for the stages')"
			:placeholder="t('nextcloud-vue', 'Case progress')"
			@update:model-value="setPath('ariaLabel', $event)" />

		<!-- Where the stages come from. -->
		<h4 class="cn-stages-form__section">
			{{ t('nextcloud-vue', 'Stages') }}
		</h4>
		<NcSelect
			:model-value="stagesKind"
			:options="['endpoint', 'source']"
			:input-label="t('nextcloud-vue', 'Read the stages from')"
			:clearable="false"
			@update:model-value="setStagesKind">
			<template #option="{ label: id }">
				{{ stagesKindLabel(id) }}
			</template>
			<template #selected-option="{ label: id }">
				{{ stagesKindLabel(id) }}
			</template>
		</NcSelect>

		<template v-if="stagesKind === 'endpoint'">
			<NcTextField
				:model-value="draft.stagesEndpoint.url || ''"
				:label="t('nextcloud-vue', 'Address')"
				placeholder="/apps/myapp/api/types/@object.type/stages"
				@update:model-value="setPath('stagesEndpoint.url', $event)" />
			<div class="cn-stages-form__row">
				<NcTextField
					:model-value="draft.stagesEndpoint.path || ''"
					:label="t('nextcloud-vue', 'List in the response')"
					placeholder="stages"
					@update:model-value="setPath('stagesEndpoint.path', $event)" />
				<NcTextField
					:model-value="draft.stagesEndpoint.orderField || ''"
					:label="t('nextcloud-vue', 'Order property')"
					placeholder="order"
					@update:model-value="setPath('stagesEndpoint.orderField', $event)" />
			</div>
			<div class="cn-stages-form__row">
				<NcTextField
					:model-value="draft.stagesEndpoint.labelField || ''"
					:label="t('nextcloud-vue', 'Label property')"
					placeholder="name"
					@update:model-value="setPath('stagesEndpoint.labelField', $event)" />
				<NcTextField
					:model-value="draft.stagesEndpoint.descriptionField || ''"
					:label="t('nextcloud-vue', 'Description property')"
					placeholder="description"
					@update:model-value="setPath('stagesEndpoint.descriptionField', $event)" />
			</div>
			<div class="cn-stages-form__row">
				<NcTextField
					:model-value="draft.stagesEndpoint.finalField || ''"
					:label="t('nextcloud-vue', 'Closing-stage property')"
					placeholder="isFinal"
					@update:model-value="setPath('stagesEndpoint.finalField', $event)" />
				<NcTextField
					:model-value="draft.stagesEndpoint.resultsPath || ''"
					:label="t('nextcloud-vue', 'Results in the response')"
					placeholder="resultTypes"
					@update:model-value="setPath('stagesEndpoint.resultsPath', $event)" />
			</div>
			<p class="cn-stages-form__hint">
				{{ t('nextcloud-vue', 'Use @objectId or @object.<property> in the address to name this record.') }}
			</p>
		</template>

		<template v-else>
			<div class="cn-stages-form__row">
				<CnRegisterSchemaSelect
					:register="draft.stagesSource.register || ''"
					:schema="draft.stagesSource.schema || ''"
					@update:register="setPath('stagesSource.register', $event)"
					@update:schema="setPath('stagesSource.schema', $event)" />
			</div>
			<div class="cn-stages-form__row">
				<NcTextField
					:model-value="draft.stagesSource.orderBy || ''"
					:label="t('nextcloud-vue', 'Order property')"
					placeholder="order"
					@update:model-value="setPath('stagesSource.orderBy', $event)" />
				<NcTextField
					:model-value="draft.stagesSource.labelField || ''"
					:label="t('nextcloud-vue', 'Label property')"
					placeholder="name"
					@update:model-value="setPath('stagesSource.labelField', $event)" />
			</div>
			<div class="cn-stages-form__row">
				<NcTextField
					:model-value="draft.stagesSource.descriptionField || ''"
					:label="t('nextcloud-vue', 'Description property')"
					placeholder="description"
					@update:model-value="setPath('stagesSource.descriptionField', $event)" />
				<NcTextField
					:model-value="draft.stagesSource.finalField || ''"
					:label="t('nextcloud-vue', 'Closing-stage property')"
					placeholder="isFinal"
					@update:model-value="setPath('stagesSource.finalField', $event)" />
			</div>
			<CnFilterRowsEditor
				:value="filterRows"
				:fields="[]"
				@input="onFilterRows" />
			<p class="cn-stages-form__hint">
				{{ t('nextcloud-vue', 'A filter value can name this record, for example @object.caseType.') }}
			</p>
		</template>

		<!-- What a click does. -->
		<h4 class="cn-stages-form__section">
			{{ t('nextcloud-vue', 'Moving the record') }}
		</h4>
		<NcSelect
			:model-value="transitionKind"
			:options="['none', 'field', 'endpoint']"
			:input-label="t('nextcloud-vue', 'Clicking a stage')"
			:clearable="false"
			@update:model-value="setTransitionKind">
			<template #option="{ label: id }">
				{{ transitionKindLabel(id) }}
			</template>
			<template #selected-option="{ label: id }">
				{{ transitionKindLabel(id) }}
			</template>
		</NcSelect>

		<template v-if="transitionKind === 'endpoint'">
			<div class="cn-stages-form__row">
				<NcTextField
					:model-value="draft.transition.url || ''"
					:label="t('nextcloud-vue', 'Address')"
					placeholder="/apps/myapp/api/case/@objectId/transition"
					@update:model-value="setPath('transition.url', $event)" />
				<NcSelect
					:model-value="draft.transition.method || 'POST'"
					:options="['POST', 'PUT', 'PATCH']"
					:input-label="t('nextcloud-vue', 'Method')"
					:clearable="false"
					@update:model-value="setPath('transition.method', $event)" />
			</div>
			<div class="cn-stages-form__row">
				<NcTextField
					:model-value="draft.transition.bodyKey || ''"
					:label="t('nextcloud-vue', 'Send the stage as')"
					placeholder="stage"
					@update:model-value="setPath('transition.bodyKey', $event)" />
				<NcTextField
					:model-value="draft.transition.commentKey || ''"
					:label="t('nextcloud-vue', 'Send the comment as')"
					placeholder="comment"
					@update:model-value="setPath('transition.commentKey', $event)" />
				<NcTextField
					:model-value="draft.transition.resultKey || ''"
					:label="t('nextcloud-vue', 'Send the result as')"
					placeholder="result"
					@update:model-value="setPath('transition.resultKey', $event)" />
			</div>
		</template>

		<NcSelect
			v-if="transitionKind !== 'none'"
			:model-value="draft.confirm === 'always' ? 'always' : 'declared'"
			:options="['declared', 'always']"
			:input-label="t('nextcloud-vue', 'Ask to confirm')"
			:clearable="false"
			@update:model-value="setPath('confirm', $event)">
			<template #option="{ label: id }">
				{{ confirmLabel(id) }}
			</template>
			<template #selected-option="{ label: id }">
				{{ confirmLabel(id) }}
			</template>
		</NcSelect>

		<!-- Which stages can be reached, and why not. -->
		<template v-if="transitionKind !== 'none'">
			<h4 class="cn-stages-form__section">
				{{ t('nextcloud-vue', 'Guards (optional)') }}
			</h4>
			<NcTextField
				:model-value="draft.availability.url || ''"
				:label="t('nextcloud-vue', 'Address that lists the reachable stages')"
				placeholder="/apps/myapp/api/case/@objectId/available-transitions"
				@update:model-value="setPath('availability.url', $event)" />
			<template v-if="draft.availability.url">
				<div class="cn-stages-form__row">
					<NcTextField
						:model-value="draft.availability.path || ''"
						:label="t('nextcloud-vue', 'List in the response')"
						placeholder="transitions"
						@update:model-value="setPath('availability.path', $event)" />
					<NcTextField
						:model-value="draft.availability.stageField || ''"
						:label="t('nextcloud-vue', 'Target stage property')"
						placeholder="stage"
						@update:model-value="setPath('availability.stageField', $event)" />
					<NcTextField
						:model-value="draft.availability.moveField || ''"
						:label="t('nextcloud-vue', 'Move id property')"
						placeholder="id"
						@update:model-value="setPath('availability.moveField', $event)" />
				</div>
				<div class="cn-stages-form__row">
					<NcTextField
						:model-value="draft.availability.allowedField || ''"
						:label="t('nextcloud-vue', 'Allowed property')"
						placeholder="allowed"
						@update:model-value="setPath('availability.allowedField', $event)" />
					<NcTextField
						:model-value="draft.availability.reasonField || ''"
						:label="t('nextcloud-vue', 'Reason property')"
						placeholder="reason"
						@update:model-value="setPath('availability.reasonField', $event)" />
				</div>
				<div class="cn-stages-form__row">
					<NcTextField
						:model-value="draft.availability.commentField || ''"
						:label="t('nextcloud-vue', 'Needs a comment property')"
						placeholder="requiresComment"
						@update:model-value="setPath('availability.commentField', $event)" />
					<NcTextField
						:model-value="draft.availability.resultField || ''"
						:label="t('nextcloud-vue', 'Needs a result property')"
						placeholder="requiresResult"
						@update:model-value="setPath('availability.resultField', $event)" />
				</div>
			</template>
		</template>
	</div>
</template>

<script>
import { NcSelect, NcTextField } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnFilterRowsEditor from '../CnFilterRowsEditor/CnFilterRowsEditor.vue'
import CnRegisterSchemaSelect from '../CnRegisterSchemaSelect/CnRegisterSchemaSelect.vue'
import { filterToRows, rowsToFilter } from '../CnFilterRowsEditor/filterRows.js'

/**
 * The config a new `stages` placement starts from.
 *
 * @type {object}
 */
const DEFAULT_CONTENT = Object.freeze({
	currentField: 'status',
	orientation: 'horizontal',
	size: 'medium',
	stagesEndpoint: { url: '', path: '' },
	transition: { kind: 'field' },
})

/**
 * Deep-copy a plain config blob.
 *
 * @param {object} value The blob.
 * @return {object} The copy.
 */
function clone(value) {
	return JSON.parse(JSON.stringify(value || {}))
}

/**
 * CnStagesWidgetForm: the config sub-form for a `stages` widget
 * (`CnStagesWidget`).
 *
 * Edits the property holding the current stage, where the stage list comes
 * from (an app endpoint or an OpenRegister query), what clicking a stage
 * does (save the record's stage field, or call a transition endpoint),
 * whether to always confirm, and the optional availability endpoint whose
 * answer gates each move.
 *
 * Emits `update:content` on every change. Keys the form does not show pass
 * through unchanged, and empty text fields are left out rather than written
 * as empty strings. `validate()` requires the current-stage property, a
 * stage source, and a url for an endpoint transition. Used by both
 * `CnAddWidgetModal` and the cog `CnWidgetStyleEditorModal`.
 */
export default {
	name: 'CnStagesWidgetForm',

	components: {
		CnFilterRowsEditor,
		CnRegisterSchemaSelect,
		NcSelect,
		NcTextField,
	},

	props: {
		/**
		 * The placement being edited (pre-fills from `editingWidget.content`),
		 * or `null` in create mode.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},
		/**
		 * Initial content values when not editing (registry defaults).
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => clone(DEFAULT_CONTENT),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const draft = clone(this.editingWidget?.content || this.value || DEFAULT_CONTENT)
		draft.stagesEndpoint = draft.stagesEndpoint || {}
		draft.stagesSource = draft.stagesSource || {}
		draft.availability = draft.availability || {}
		draft.transition = draft.transition || {}
		return {
			draft,
			stagesKind: draft.stagesSource.register && !draft.stagesEndpoint.url ? 'source' : 'endpoint',
			filterRows: filterToRows(draft.stagesSource.filter || {}),
		}
	},

	computed: {
		/**
		 * The transition kind shown in the picker.
		 *
		 * @return {'none'|'field'|'endpoint'} The kind.
		 */
		transitionKind() {
			const kind = this.draft.transition.kind
			return (kind === 'field' || kind === 'endpoint') ? kind : 'none'
		},

		/**
		 * The content blob as it is stored: empty strings and empty blocks
		 * left out, and only the chosen stage source kept.
		 *
		 * @return {object} The content.
		 */
		assembledContent() {
			const out = {}
			for (const [key, value] of Object.entries(this.draft)) {
				if (value === '' || value === null || value === undefined) continue
				if (value && typeof value === 'object' && !Array.isArray(value)) {
					const compact = {}
					for (const [k, v] of Object.entries(value)) {
						if (v === '' || v === null || v === undefined) continue
						compact[k] = v
					}
					if (Object.keys(compact).length === 0) continue
					out[key] = compact
				} else {
					out[key] = value
				}
			}
			if (this.stagesKind === 'endpoint') delete out.stagesSource
			else delete out.stagesEndpoint
			if (this.transitionKind === 'none') {
				delete out.transition
				delete out.availability
				delete out.confirm
			}
			return out
		},
	},

	methods: {
		t,

		/**
		 * Write one config value by dot path (`transition.url`) and emit.
		 *
		 * @param {string} path The dot path into the draft.
		 * @param {*} value The new value.
		 * @return {void}
		 */
		setPath(path, value) {
			const keys = path.split('.')
			const last = keys.pop()
			let target = this.draft
			for (const key of keys) {
				if (!target[key] || typeof target[key] !== 'object') target[key] = {}
				target = target[key]
			}
			target[last] = value
			this.emitChange()
		},

		/**
		 * Switch between the endpoint and the OpenRegister stage source.
		 *
		 * @param {'endpoint'|'source'} kind The chosen source.
		 * @return {void}
		 */
		setStagesKind(kind) {
			this.stagesKind = kind === 'source' ? 'source' : 'endpoint'
			this.emitChange()
		},

		/**
		 * Switch what clicking a stage does.
		 *
		 * @param {'none'|'field'|'endpoint'} kind The chosen transition kind.
		 * @return {void}
		 */
		setTransitionKind(kind) {
			this.draft.transition = kind === 'none' ? {} : { ...this.draft.transition, kind }
			this.emitChange()
		},

		/**
		 * Receive the `stagesSource` filter rows.
		 *
		 * @param {Array<{key: string, op: string, value: string}>} rows The rows.
		 * @return {void}
		 */
		onFilterRows(rows) {
			this.filterRows = rows
			this.draft.stagesSource.filter = rowsToFilter(rows)
			this.emitChange()
		},

		/**
		 * Human label for a direction.
		 *
		 * @param {string} id The direction.
		 * @return {string} The label.
		 */
		orientationLabel(id) {
			return id === 'vertical' ? t('nextcloud-vue', 'Top to bottom') : t('nextcloud-vue', 'Left to right')
		},

		/**
		 * Human label for a size.
		 *
		 * @param {string} id The size.
		 * @return {string} The label.
		 */
		sizeLabel(id) {
			return id === 'small' ? t('nextcloud-vue', 'Small') : t('nextcloud-vue', 'Medium')
		},

		/**
		 * Human label for a stage source.
		 *
		 * @param {string} id The source kind.
		 * @return {string} The label.
		 */
		stagesKindLabel(id) {
			return id === 'source' ? t('nextcloud-vue', 'A register and schema') : t('nextcloud-vue', 'An app endpoint')
		},

		/**
		 * Human label for a transition kind.
		 *
		 * @param {string} id The transition kind.
		 * @return {string} The label.
		 */
		transitionKindLabel(id) {
			if (id === 'field') return t('nextcloud-vue', 'Saves the stage on the record')
			if (id === 'endpoint') return t('nextcloud-vue', 'Calls a transition endpoint')
			return t('nextcloud-vue', 'Does nothing (read only)')
		},

		/**
		 * Human label for a confirm mode.
		 *
		 * @param {string} id The confirm mode.
		 * @return {string} The label.
		 */
		confirmLabel(id) {
			return id === 'always' ? t('nextcloud-vue', 'Before every move') : t('nextcloud-vue', 'Only when a move needs input')
		},

		/**
		 * Emit the assembled content.
		 *
		 * @return {void}
		 */
		emitChange() {
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} The validation errors.
		 */
		validate() {
			const errors = []
			if (!this.draft.currentField) {
				errors.push(t('nextcloud-vue', 'The property holding the current stage is required'))
			}
			if (this.stagesKind === 'endpoint' && !this.draft.stagesEndpoint.url) {
				errors.push(t('nextcloud-vue', 'An address for the stages is required'))
			}
			if (this.stagesKind === 'source' && (!this.draft.stagesSource.register || !this.draft.stagesSource.schema)) {
				errors.push(t('nextcloud-vue', 'A register and schema for the stages are required'))
			}
			if (this.transitionKind === 'endpoint' && !this.draft.transition.url) {
				errors.push(t('nextcloud-vue', 'An address for the transition is required'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-stages-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-stages-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-stages-form__hint {
	margin: 0;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-stages-form__row {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	align-items: flex-end;
}

.cn-stages-form__row > * {
	flex: 1 1 140px;
	min-width: 0;
}
</style>
