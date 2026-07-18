<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<NcDialog
		v-if="show"
		size="normal"
		:name="t('nextcloud-vue', 'Visibility rules')"
		@closing="onCancel">
		<p class="cn-visibility-rules__hint">
			{{ t('nextcloud-vue', 'Show this widget when ANY rule matches (OR). Within a rule, ALL of its conditions must match (AND).') }}
		</p>

		<!-- Existing rules: each rule is an OR branch; its conditions AND. -->
		<ul
			v-if="draft.length > 0"
			class="cn-visibility-rules__list"
			data-testid="cn-visibility-rules-list">
			<li
				v-for="(rule, ruleIndex) in draft"
				:key="rule.id"
				class="cn-visibility-rules__rule"
				data-testid="cn-visibility-rules-rule">
				<div class="cn-visibility-rules__rule-header">
					<strong>{{ ruleHeading(ruleIndex) }}</strong>
					<NcButton
						type="tertiary"
						:aria-label="t('nextcloud-vue', 'Remove rule')"
						data-testid="cn-visibility-rule-remove"
						@click="removeRule(ruleIndex)">
						<template #icon>
							<Close :size="18" />
						</template>
					</NcButton>
				</div>

				<ul class="cn-visibility-rules__conditions">
					<li
						v-for="(condition, condIndex) in rule.conditions"
						:key="condIndex"
						class="cn-visibility-rules__condition"
						data-testid="cn-visibility-rules-condition">
						<span class="cn-visibility-rules__condition-kind">{{ kindLabel(condition.kind) }}</span>
						<code class="cn-visibility-rules__condition-summary">{{ summariseCondition(condition) }}</code>
						<NcButton
							type="tertiary"
							:aria-label="t('nextcloud-vue', 'Remove condition')"
							data-testid="cn-visibility-condition-remove"
							@click="removeCondition(ruleIndex, condIndex)">
							<template #icon>
								<Close :size="16" />
							</template>
						</NcButton>
					</li>
					<li v-if="rule.conditions.length === 0" class="cn-visibility-rules__condition-empty">
						{{ t('nextcloud-vue', 'No conditions — add one below.') }}
					</li>
				</ul>

				<NcButton
					type="tertiary"
					data-testid="cn-visibility-condition-target"
					@click="targetRule = ruleIndex">
					{{ ruleIndex === targetRule ? t('nextcloud-vue', 'Adding condition here') : t('nextcloud-vue', 'Add condition to this rule') }}
				</NcButton>
			</li>
		</ul>
		<p v-else class="cn-visibility-rules__empty">
			{{ t('nextcloud-vue', 'No visibility rules yet — this widget is always shown.') }}
		</p>

		<NcButton
			type="secondary"
			data-testid="cn-visibility-add-rule"
			@click="addRule">
			{{ t('nextcloud-vue', 'Add a new rule (OR)') }}
		</NcButton>

		<!-- Condition builder: appends an AND-condition to the target rule. -->
		<div class="cn-visibility-rules__form" data-testid="cn-visibility-rules-form">
			<h3>{{ t('nextcloud-vue', 'Add a condition') }}</h3>

			<div class="cn-visibility-rules__field">
				<NcSelect
					v-model="conditionDraft.kind"
					:input-label="t('nextcloud-vue', 'Condition kind')"
					:aria-label-combobox="t('nextcloud-vue', 'Condition kind')"
					:options="kindOptions"
					label="label"
					track-by="id"
					:clearable="false" />
			</div>

			<!-- group -->
			<div v-if="activeKind === 'group'" class="cn-visibility-rules__field">
				<NcSelect
					v-model="conditionDraft.groups"
					:input-label="t('nextcloud-vue', 'Groups')"
					:aria-label-combobox="t('nextcloud-vue', 'Groups')"
					:options="availableGroups"
					:multiple="true"
					:placeholder="t('nextcloud-vue', 'Select groups')" />
			</div>

			<!-- time-of-day -->
			<template v-else-if="activeKind === 'time'">
				<div class="cn-visibility-rules__field">
					<NcTextField
						:value="conditionDraft.startTime"
						:label="t('nextcloud-vue', 'Start time (HH:MM)')"
						placeholder="09:00"
						@update:value="conditionDraft.startTime = $event" />
				</div>
				<div class="cn-visibility-rules__field">
					<NcTextField
						:value="conditionDraft.endTime"
						:label="t('nextcloud-vue', 'End time (HH:MM)')"
						placeholder="17:00"
						@update:value="conditionDraft.endTime = $event" />
				</div>
			</template>

			<!-- date-range -->
			<template v-else-if="activeKind === 'date'">
				<div class="cn-visibility-rules__field">
					<NcTextField
						:value="conditionDraft.startDate"
						:label="t('nextcloud-vue', 'Start date (YYYY-MM-DD)')"
						placeholder="2026-12-01"
						@update:value="conditionDraft.startDate = $event" />
				</div>
				<div class="cn-visibility-rules__field">
					<NcTextField
						:value="conditionDraft.endDate"
						:label="t('nextcloud-vue', 'End date (YYYY-MM-DD)')"
						placeholder="2026-12-31"
						@update:value="conditionDraft.endDate = $event" />
				</div>
			</template>

			<!-- user-attribute -->
			<template v-else-if="activeKind === 'attribute'">
				<div class="cn-visibility-rules__field">
					<NcTextField
						:value="conditionDraft.attribute"
						:label="t('nextcloud-vue', 'Attribute')"
						placeholder="language"
						@update:value="conditionDraft.attribute = $event" />
				</div>
				<div class="cn-visibility-rules__field">
					<NcTextField
						:value="conditionDraft.value"
						:label="t('nextcloud-vue', 'Equals value')"
						placeholder="nl"
						@update:value="conditionDraft.value = $event" />
				</div>
			</template>

			<div class="cn-visibility-rules__actions">
				<NcButton
					type="primary"
					:disabled="!canAddCondition"
					data-testid="cn-visibility-add-condition"
					@click="addCondition">
					{{ t('nextcloud-vue', 'Add condition') }}
				</NcButton>
			</div>
		</div>

		<template #actions>
			<NcButton type="tertiary" @click="onCancel">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton type="primary" data-testid="cn-visibility-save" @click="onSave">
				{{ t('nextcloud-vue', 'Save') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcSelect, NcTextField } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Close from 'vue-material-design-icons/Close.vue'

let titleIdCounter = 0
let ruleIdCounter = 0

/**
 * CnWidgetVisibilityRulesModal — isolated host (ADR-004) for editing a
 * dashboard-widget's conditional-visibility rule set. It is a pure editor: it
 * does NO API. The rule model is OR-across-rules / AND-within-a-rule — the
 * widget shows when ANY rule matches, and a rule matches only when ALL of its
 * conditions match. Each condition is one of four kinds: `group`, `time`
 * (time-of-day), `date` (date-range), `attribute` (user-attribute). The modal
 * edits a working copy of the passed `rules`; nothing leaves the modal until
 * Save, which emits the rebuilt array.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnWidgetVisibilityRulesModal',

	components: {
		NcDialog,
		NcButton,
		NcSelect,
		NcTextField,
		Close,
	},

	props: {
		/** Toggles visibility. Going `false → true` re-seeds the working copy from `rules`. */
		show: {
			type: Boolean,
			default: false,
		},
		/**
		 * The rule set to edit. Each rule ANDs its `conditions`; the array ORs
		 * its rules. A condition is `{ kind, ...config }`. The prop is not
		 * mutated — Save emits a fresh array.
		 *
		 * @type {Array<{id?: (number|string), conditions: Array<{kind: string}>}>}
		 */
		rules: {
			type: Array,
			default: () => [],
		},
		/** Group options for the `group` condition picker. */
		availableGroups: {
			type: Array,
			default: () => [],
		},
	},

	emits: [
		/** Fired on Cancel, backdrop click, or Esc — discards the working copy. */
		'close',
		/**
		 * @event save Fired with the rebuilt rule array (OR of AND-condition rules).
		 * @type {Array<{id: (number|string), conditions: Array<object>}>}
		 */
		'save',
	],

	data() {
		return {
			titleId: `cn-visibility-rules-title-${++titleIdCounter}`,
			draft: this.cloneRules(this.rules),
			targetRule: 0,
			conditionDraft: this.freshCondition(),
		}
	},

	computed: {
		/**
		 * The four supported condition kinds, in display order.
		 *
		 * @return {Array<{id: string, label: string}>} the kind options.
		 */
		kindOptions() {
			return [
				{ id: 'group', label: t('nextcloud-vue', 'Group') },
				{ id: 'time', label: t('nextcloud-vue', 'Time of day') },
				{ id: 'date', label: t('nextcloud-vue', 'Date range') },
				{ id: 'attribute', label: t('nextcloud-vue', 'User attribute') },
			]
		},

		/**
		 * The selected condition-kind id (or null while unset).
		 *
		 * @return {string|null} the active kind id.
		 */
		activeKind() {
			return this.conditionDraft.kind ? this.conditionDraft.kind.id : null
		},

		/**
		 * Whether the condition draft holds enough input to build a condition.
		 *
		 * @return {boolean} true when the draft is complete for its kind.
		 */
		canAddCondition() {
			switch (this.activeKind) {
			case 'group':
				return Array.isArray(this.conditionDraft.groups) && this.conditionDraft.groups.length > 0
			case 'time':
				return this.conditionDraft.startTime !== '' && this.conditionDraft.endTime !== ''
			case 'date':
				return this.conditionDraft.startDate !== '' || this.conditionDraft.endDate !== ''
			case 'attribute':
				return this.conditionDraft.attribute !== '' && this.conditionDraft.value !== ''
			default:
				return false
			}
		},
	},

	watch: {
		/**
		 * Re-seed the working copy + drafts when the modal opens.
		 *
		 * @param {boolean} isOpen the new `show` value.
		 * @return {void}
		 */
		show(isOpen) {
			if (isOpen) {
				this.draft = this.cloneRules(this.rules)
				this.targetRule = 0
				this.conditionDraft = this.freshCondition()
			}
		},
	},

	mounted() {
		document.addEventListener('keydown', this.onKeydown)
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onKeydown)
	},

	methods: {
		t,

		/**
		 * Deep-clone the incoming rules into an editable working copy, assigning
		 * a local id to any rule that lacks one (needed as a stable `:key`).
		 *
		 * @param {Array<object>} rules the source rule array.
		 * @return {Array<object>} a deep copy with ids and `conditions` arrays.
		 */
		cloneRules(rules) {
			return (Array.isArray(rules) ? rules : []).map((rule) => ({
				id: rule.id ?? `cn-rule-${++ruleIdCounter}`,
				conditions: Array.isArray(rule.conditions)
					? rule.conditions.map((c) => this.cloneCondition(c))
					: [],
			}))
		},

		/**
		 * Deep-copy a single condition, including its `groups` array, so the
		 * working copy never shares references with the `rules` prop.
		 *
		 * @param {object} condition the source condition.
		 * @return {object} a deep copy.
		 */
		cloneCondition(condition) {
			const copy = { ...condition }
			if (Array.isArray(condition.groups)) {
				copy.groups = [...condition.groups]
			}
			return copy
		},

		/**
		 * A pristine condition-builder draft.
		 *
		 * @return {object} the fresh draft state.
		 */
		freshCondition() {
			return {
				kind: { id: 'group', label: t('nextcloud-vue', 'Group') },
				groups: [],
				startTime: '',
				endTime: '',
				startDate: '',
				endDate: '',
				attribute: '',
				value: '',
			}
		},

		/**
		 * Append a new empty OR-rule and make it the condition target.
		 *
		 * @return {void}
		 */
		addRule() {
			this.draft.push({ id: `cn-rule-${++ruleIdCounter}`, conditions: [] })
			this.targetRule = this.draft.length - 1
		},

		/**
		 * Remove a rule by index, keeping the condition target in range.
		 *
		 * @param {number} ruleIndex the rule index to remove.
		 * @return {void}
		 */
		removeRule(ruleIndex) {
			this.draft.splice(ruleIndex, 1)
			if (this.targetRule >= this.draft.length) {
				this.targetRule = Math.max(0, this.draft.length - 1)
			}
		},

		/**
		 * Remove one AND-condition from a rule.
		 *
		 * @param {number} ruleIndex the owning rule index.
		 * @param {number} condIndex the condition index within the rule.
		 * @return {void}
		 */
		removeCondition(ruleIndex, condIndex) {
			this.draft[ruleIndex].conditions.splice(condIndex, 1)
		},

		/**
		 * Build the `{ kind, ...config }` blob for the active draft kind.
		 *
		 * @return {object|null} the condition blob, or null if incomplete.
		 */
		buildCondition() {
			switch (this.activeKind) {
			case 'group':
				return { kind: 'group', groups: [...this.conditionDraft.groups] }
			case 'time':
				return { kind: 'time', startTime: this.conditionDraft.startTime, endTime: this.conditionDraft.endTime }
			case 'date':
				return { kind: 'date', startDate: this.conditionDraft.startDate, endDate: this.conditionDraft.endDate }
			case 'attribute':
				return { kind: 'attribute', attribute: this.conditionDraft.attribute, operator: 'equals', value: this.conditionDraft.value }
			default:
				return null
			}
		},

		/**
		 * Append the built condition (AND) to the target rule, creating a first
		 * rule if none exists, then reset the condition draft.
		 *
		 * @return {void}
		 */
		addCondition() {
			if (!this.canAddCondition) {
				return
			}
			if (this.draft.length === 0) {
				this.addRule()
			}
			const condition = this.buildCondition()
			if (!condition) {
				return
			}
			const rule = this.draft[this.targetRule] || this.draft[this.draft.length - 1]
			rule.conditions.push(condition)
			this.conditionDraft = this.freshCondition()
		},

		/**
		 * Human label for a condition kind id.
		 *
		 * @param {string} kind the kind id.
		 * @return {string} the localised kind label.
		 */
		kindLabel(kind) {
			const found = this.kindOptions.find((o) => o.id === kind)
			return found ? found.label : kind
		},

		/**
		 * Heading for an OR-rule row (1-based, with an "or" prefix after the first).
		 *
		 * @param {number} ruleIndex the rule index.
		 * @return {string} the localised heading.
		 */
		ruleHeading(ruleIndex) {
			return ruleIndex === 0
				? t('nextcloud-vue', 'Rule {n}', { n: ruleIndex + 1 })
				: t('nextcloud-vue', 'or Rule {n}', { n: ruleIndex + 1 })
		},

		/**
		 * Short summary of a condition's config for the row.
		 *
		 * @param {object} condition the condition blob.
		 * @return {string} the human summary.
		 */
		summariseCondition(condition) {
			switch (condition.kind) {
			case 'group':
				return (condition.groups || []).join(', ')
			case 'time':
				return `${condition.startTime || ''}–${condition.endTime || ''}`
			case 'date':
				return `${condition.startDate || '…'} → ${condition.endDate || '…'}`
			case 'attribute':
				return `${condition.attribute || ''} = ${condition.value || ''}`
			default:
				return ''
			}
		},

		/**
		 * Emit the rebuilt rule set (dropping any empty rules) and let the parent
		 * persist. The original `rules` prop is never mutated.
		 *
		 * @return {void}
		 */
		onSave() {
			const out = this.draft
				.filter((rule) => rule.conditions.length > 0)
				.map((rule) => ({
					id: rule.id,
					conditions: rule.conditions.map((c) => this.cloneCondition(c)),
				}))
			this.$emit('save', out)
		},

		/**
		 * Cancel / backdrop / Esc — discard the working copy.
		 *
		 * @return {void}
		 */
		onCancel() {
			this.$emit('close')
		},

		/**
		 * Esc-key fallback (in case NcModal's own handler is suppressed by a
		 * parent focus-trap). Emits `close`, never `save`.
		 *
		 * @param {KeyboardEvent} event the keydown event.
		 * @return {void}
		 */
		onKeydown(event) {
			if (this.show && event.key === 'Escape') {
				this.$emit('close')
			}
		},
	},
}
</script>

<style scoped>
.cn-visibility-rules__hint {
	color: var(--color-text-maxcontrast);
	margin: 0 0 8px;
}

.cn-visibility-rules__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-visibility-rules__rule {
	padding: 12px;
	background: var(--color-background-dark);
	border-radius: var(--border-radius);
}

.cn-visibility-rules__rule-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
}

.cn-visibility-rules__conditions {
	list-style: none;
	margin: 0 0 8px;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-visibility-rules__condition {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-visibility-rules__condition-kind {
	font-weight: 500;
}

.cn-visibility-rules__condition-summary {
	flex: 1;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-visibility-rules__condition-empty {
	color: var(--color-text-maxcontrast);
	font-size: 12px;
}

.cn-visibility-rules__empty {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-visibility-rules__form {
	border-top: 1px solid var(--color-border);
	padding-top: 12px;
}

.cn-visibility-rules__form h3 {
	margin: 0 0 12px;
}

.cn-visibility-rules__field {
	margin-bottom: 12px;
}

.cn-visibility-rules__actions {
	display: flex;
	justify-content: flex-end;
}
</style>
