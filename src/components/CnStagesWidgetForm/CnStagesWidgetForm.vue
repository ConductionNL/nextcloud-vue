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
			:modelValue="draft.currentField || ''"
			:label="t('nextcloud-vue', 'Property holding the current stage')"
			placeholder="status"
			@update:modelValue="setPath('currentField', $event)" />

		<div class="cn-stages-form__row">
			<NcSelect
				:modelValue="draft.orientation || 'horizontal'"
				:options="['horizontal', 'vertical']"
				:inputLabel="t('nextcloud-vue', 'Direction')"
				:clearable="false"
				@update:modelValue="setPath('orientation', $event)">
				<template #option="{ label: id }">
					{{ orientationLabel(id) }}
				</template>
				<template #selected-option="{ label: id }">
					{{ orientationLabel(id) }}
				</template>
			</NcSelect>
			<NcSelect
				:modelValue="draft.size || 'medium'"
				:options="['medium', 'small']"
				:inputLabel="t('nextcloud-vue', 'Size')"
				:clearable="false"
				@update:modelValue="setPath('size', $event)">
				<template #option="{ label: id }">
					{{ sizeLabel(id) }}
				</template>
				<template #selected-option="{ label: id }">
					{{ sizeLabel(id) }}
				</template>
			</NcSelect>
		</div>

		<NcTextField
			:modelValue="draft.ariaLabel || ''"
			:label="t('nextcloud-vue', 'Accessible name for the stages')"
			:placeholder="t('nextcloud-vue', 'Case progress')"
			@update:modelValue="setPath('ariaLabel', $event)" />

		<!-- Where the stages come from. -->
		<h4 class="cn-stages-form__section">
			{{ t('nextcloud-vue', 'Stages') }}
		</h4>
		<NcSelect
			:modelValue="stagesKind"
			:options="['endpoint', 'source']"
			:inputLabel="t('nextcloud-vue', 'Read the stages from')"
			:clearable="false"
			@update:modelValue="setStagesKind">
			<template #option="{ label: id }">
				{{ stagesKindLabel(id) }}
			</template>
			<template #selected-option="{ label: id }">
				{{ stagesKindLabel(id) }}
			</template>
		</NcSelect>

		<template v-if="stagesKind === 'endpoint'">
			<NcTextField
				:modelValue="draft.stagesEndpoint.url || ''"
				:label="t('nextcloud-vue', 'Address')"
				placeholder="/apps/myapp/api/types/@object.type/stages"
				@update:modelValue="setPath('stagesEndpoint.url', $event)" />
			<div class="cn-stages-form__row">
				<NcTextField
					:modelValue="draft.stagesEndpoint.path || ''"
					:label="t('nextcloud-vue', 'List in the response')"
					placeholder="stages"
					@update:modelValue="setPath('stagesEndpoint.path', $event)" />
				<NcTextField
					:modelValue="draft.stagesEndpoint.orderField || ''"
					:label="t('nextcloud-vue', 'Order property')"
					placeholder="order"
					@update:modelValue="setPath('stagesEndpoint.orderField', $event)" />
			</div>
			<div class="cn-stages-form__row">
				<NcTextField
					:modelValue="draft.stagesEndpoint.labelField || ''"
					:label="t('nextcloud-vue', 'Label property')"
					placeholder="name"
					@update:modelValue="setPath('stagesEndpoint.labelField', $event)" />
				<NcTextField
					:modelValue="draft.stagesEndpoint.descriptionField || ''"
					:label="t('nextcloud-vue', 'Description property')"
					placeholder="description"
					@update:modelValue="setPath('stagesEndpoint.descriptionField', $event)" />
			</div>
			<NcTextField
				:modelValue="draft.stagesEndpoint.finalField || ''"
				:label="t('nextcloud-vue', 'Closing-stage property')"
				placeholder="isFinal"
				@update:modelValue="setPath('stagesEndpoint.finalField', $event)" />
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
					:modelValue="draft.stagesSource.orderBy || ''"
					:label="t('nextcloud-vue', 'Order property')"
					placeholder="order"
					@update:modelValue="setPath('stagesSource.orderBy', $event)" />
				<NcTextField
					:modelValue="draft.stagesSource.labelField || ''"
					:label="t('nextcloud-vue', 'Label property')"
					placeholder="name"
					@update:modelValue="setPath('stagesSource.labelField', $event)" />
			</div>
			<div class="cn-stages-form__row">
				<NcTextField
					:modelValue="draft.stagesSource.descriptionField || ''"
					:label="t('nextcloud-vue', 'Description property')"
					placeholder="description"
					@update:modelValue="setPath('stagesSource.descriptionField', $event)" />
				<NcTextField
					:modelValue="draft.stagesSource.finalField || ''"
					:label="t('nextcloud-vue', 'Closing-stage property')"
					placeholder="isFinal"
					@update:modelValue="setPath('stagesSource.finalField', $event)" />
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
			:modelValue="transitionKind"
			:options="['lifecycle', 'field', 'none']"
			:inputLabel="t('nextcloud-vue', 'Clicking a stage')"
			:clearable="false"
			@update:modelValue="setTransitionKind">
			<template #option="{ label: id }">
				{{ transitionKindLabel(id) }}
			</template>
			<template #selected-option="{ label: id }">
				{{ transitionKindLabel(id) }}
			</template>
		</NcSelect>

		<p v-if="unknownTransitionKind" class="cn-stages-form__hint" data-testid="cn-stages-form-unknown-kind">
			{{ t('nextcloud-vue', 'This widget is set to something this editor does not know. It is kept as it is unless you pick one of the options above.') }}
		</p>
		<p v-if="transitionKind === 'lifecycle'" class="cn-stages-form__hint">
			{{ t('nextcloud-vue', 'Open Register decides which stages can be reached and checks every move. Nothing to configure here.') }}
		</p>
		<p v-else-if="transitionKind === 'field'" class="cn-stages-form__hint">
			{{ t('nextcloud-vue', 'For a record whose schema has no lifecycle. Every stage is offered and nothing checks the move, so use it only where that is what you want.') }}
		</p>

		<NcTextField
			v-if="transitionKind === 'lifecycle'"
			:modelValue="draft.unreachableReason || ''"
			:label="t('nextcloud-vue', 'Text for a stage that cannot be reached (optional)')"
			:placeholder="t('nextcloud-vue', 'Not reachable from the current stage')"
			@update:modelValue="setPath('unreachableReason', $event)" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect, NcTextField } from '@nextcloud/vue'
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
	// The LIFECYCLE, not a record write. Open Register decides what is
	// reachable and re-validates the move; a field write has neither.
	transition: { kind: 'lifecycle' },
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
 * does: move the record through Open Register's lifecycle (the default),
 * write the stage onto the record for a schema that has no lifecycle, or
 * nothing at all.
 *
 * There is no guard section, because there is no guard to configure. Open
 * Register answers which stages are reachable and re-validates every move, so
 * the only thing an app may say here is the words to show beside a stage the
 * record cannot reach.
 *
 * Emits `update:content` on every change. Keys the form does not show pass
 * through unchanged, and empty text fields are left out rather than written
 * as empty strings. `validate()` requires the current-stage property, a
 * stage source. Used by both
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
		 * An unrecognised kind reads as `none`, matching the widget: a typo
		 * must not silently select a mode nobody asked for.
		 *
		 * @return {'none'|'field'|'lifecycle'} The kind.
		 */
		transitionKind() {
			const kind = this.draft.transition.kind
			return (kind === 'field' || kind === 'lifecycle') ? kind : 'none'
		},

		/**
		 * Whether the stored `kind` is one this form does not know.
		 *
		 * NOT the same as "the person chose read only", and the difference is
		 * destructive. Both show `none` in the picker, but only one of them is
		 * an instruction to delete the block. A kind this version has never
		 * heard of is a typo or a newer library's mode, and editing an
		 * unrelated field should not throw it away.
		 *
		 * @return {boolean} True when the stored kind is unrecognised.
		 */
		unknownTransitionKind() {
			const kind = this.draft.transition.kind
			return Boolean(kind) && kind !== 'field' && kind !== 'lifecycle'
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
				if (value === '' || value === null || value === undefined) {
					continue
				}
				if (value && typeof value === 'object' && !Array.isArray(value)) {
					const compact = {}
					for (const [k, v] of Object.entries(value)) {
						if (v === '' || v === null || v === undefined) {
							continue
						}
						compact[k] = v
					}
					if (Object.keys(compact).length === 0) {
						continue
					}
					out[key] = compact
				} else {
					out[key] = value
				}
			}
			if (this.stagesKind === 'endpoint') {
				delete out.stagesSource
			} else {
				delete out.stagesEndpoint
			}
			// Only a DELIBERATE read-only choice drops the block. An
			// unrecognised kind is kept exactly as stored, along with the text
			// that goes with it.
			if (this.transitionKind === 'none' && !this.unknownTransitionKind) {
				delete out.transition
				delete out.unreachableReason
			}
			// The reachable-stage text belongs to the lifecycle path; the field
			// path never marks a stage unreachable, so it would never show.
			if (this.transitionKind === 'field') {
				delete out.unreachableReason
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
		 * @param {unknown} value The new value.
		 * @return {void}
		 */
		setPath(path, value) {
			const keys = path.split('.')
			const last = keys.pop()
			let target = this.draft
			for (const key of keys) {
				if (!target[key] || typeof target[key] !== 'object') {
					target[key] = {}
				}
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
		 * @param {'none'|'field'|'lifecycle'} kind The chosen transition kind.
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
			if (id === 'lifecycle') {
				return t('nextcloud-vue', 'Moves the record through its lifecycle')
			}
			if (id === 'field') {
				return t('nextcloud-vue', 'Saves the stage on the record')
			}
			return t('nextcloud-vue', 'Does nothing (read only)')
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
