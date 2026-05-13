<template>
	<div class="cn-schema-form__security-section">
		<CnNoteCard type="info">
			<p><strong>{{ t('nextcloud-vue', 'Role-based access control (RBAC)') }}</strong></p>
			<p>{{ t('nextcloud-vue', 'Configure which Nextcloud user groups can perform CRUD operations on objects of this schema.') }}</p>
			<ul>
				<li>{{ t('nextcloud-vue', 'If no groups are specified for an operation, all users can perform it') }}</li>
				<li>{{ t('nextcloud-vue', "The 'admin' group always has full access (cannot be changed)") }}</li>
				<li>{{ t('nextcloud-vue', 'The object owner always has full access') }}</li>
				<li>{{ t('nextcloud-vue', "'public' represents unauthenticated access") }}</li>
			</ul>
		</CnNoteCard>

		<div v-if="loadingGroups" class="cn-schema-form__loading-groups">
			<NcLoadingIcon :size="20" />
			<span>{{ t('nextcloud-vue', 'Loading user groups…') }}</span>
		</div>

		<div v-else class="cn-schema-form__rbac-table-container">
			<h3>{{ t('nextcloud-vue', 'Group permissions') }}</h3>
			<table class="cn-schema-form__rbac-table">
				<thead>
					<tr>
						<th>{{ t('nextcloud-vue', 'Group') }}</th>
						<th>{{ t('nextcloud-vue', 'Create') }}</th>
						<th>{{ t('nextcloud-vue', 'Read') }}</th>
						<th>{{ t('nextcloud-vue', 'Update') }}</th>
						<th>{{ t('nextcloud-vue', 'Delete') }}</th>
					</tr>
				</thead>
				<tbody>
					<tr class="cn-schema-form__public-row">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge cn-schema-form__public">public</span>
							<small>{{ t('nextcloud-vue', 'Unauthenticated users') }}</small>
						</td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission('public', 'create')" @update:checked="updateGroupPermission('public', 'create', $event)" /></td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission('public', 'read')" @update:checked="updateGroupPermission('public', 'read', $event)" /></td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission('public', 'update')" @update:checked="updateGroupPermission('public', 'update', $event)" /></td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission('public', 'delete')" @update:checked="updateGroupPermission('public', 'delete', $event)" /></td>
					</tr>
					<tr class="cn-schema-form__user-row">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge cn-schema-form__user">authenticated</span>
							<small>{{ t('nextcloud-vue', 'Authenticated users') }}</small>
						</td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission('authenticated', 'create')" @update:checked="updateGroupPermission('authenticated', 'create', $event)" /></td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission('authenticated', 'read')" @update:checked="updateGroupPermission('authenticated', 'read', $event)" /></td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission('authenticated', 'update')" @update:checked="updateGroupPermission('authenticated', 'update', $event)" /></td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission('authenticated', 'delete')" @update:checked="updateGroupPermission('authenticated', 'delete', $event)" /></td>
					</tr>
					<tr v-for="group in sortedUserGroups" :key="group.id">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge">{{ group.displayname || group.id }}</span>
							<small v-if="group.displayname && group.displayname !== group.id">{{ group.id }}</small>
						</td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission(group.id, 'create')" @update:checked="updateGroupPermission(group.id, 'create', $event)" /></td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission(group.id, 'read')" @update:checked="updateGroupPermission(group.id, 'read', $event)" /></td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission(group.id, 'update')" @update:checked="updateGroupPermission(group.id, 'update', $event)" /></td>
						<td><NcCheckboxRadioSwitch :model-value="hasGroupPermission(group.id, 'delete')" @update:checked="updateGroupPermission(group.id, 'delete', $event)" /></td>
					</tr>
					<tr class="cn-schema-form__admin-row">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge cn-schema-form__admin">admin</span>
							<small>{{ t('nextcloud-vue', 'Always has full access') }}</small>
						</td>
						<td><NcCheckboxRadioSwitch :model-value="true" :disabled="true" /></td>
						<td><NcCheckboxRadioSwitch :model-value="true" :disabled="true" /></td>
						<td><NcCheckboxRadioSwitch :model-value="true" :disabled="true" /></td>
						<td><NcCheckboxRadioSwitch :model-value="true" :disabled="true" /></td>
					</tr>
				</tbody>
			</table>

			<div class="cn-schema-form__rbac-summary">
				<CnNoteCard v-if="!hasAnyPermissions" type="success">
					<p><strong>{{ t('nextcloud-vue', 'Open access:') }}</strong> {{ t('nextcloud-vue', 'No specific permissions set — all users can perform all operations.') }}</p>
				</CnNoteCard>
				<CnNoteCard v-else-if="isRestrictiveSchema" type="warning">
					<p><strong>{{ t('nextcloud-vue', 'Restrictive schema:') }}</strong> {{ t('nextcloud-vue', 'Access is limited to specified groups only.') }}</p>
				</CnNoteCard>
			</div>
		</div>

		<!-- Advanced: Conditional Access Rules & Inheritance(accordion) -->
		<div class="cn-schema-form__conditional-section">
			<!--
				type="button" prevents browser from treating this as a form submit button,
				which would reset scroll position inside NcDialog's internal <form>.
			-->
			<button type="button"
				class="cn-schema-form__cond-accordion-header"
				@click="showAdvanced = !showAdvanced">
				<ChevronDown v-if="showAdvanced" :size="20" class="cn-schema-form__cond-chevron" />
				<ChevronRight v-else :size="20" class="cn-schema-form__cond-chevron" />
				<span>{{ t('nextcloud-vue', 'Advanced: Conditional access rules and inheritance') }}</span>
				<span v-if="totalConditionalRules > 0" class="cn-schema-form__cond-count-badge">
					{{ totalConditionalRules }}
				</span>
			</button>

			<div v-show="showAdvanced" class="cn-schema-form__cond-accordion-body">
				<h3>{{ t('nextcloud-vue', 'Conditional access rules') }}</h3>
				<CnNoteCard type="info">
					<p>{{ t('nextcloud-vue', "Grant access based on object property values evaluated at runtime. Multiple rules per action are OR'd — any matching rule grants access.") }}</p>
					<p>
						<strong>{{ t('nextcloud-vue', 'Variables:') }}</strong>
						<code>$now</code> {{ t('nextcloud-vue', '(current date/time)') }} &nbsp;
						<code>$userId</code> {{ t('nextcloud-vue', '(current user ID)') }} &nbsp;
						<code>$organisation</code> {{ t('nextcloud-vue', '(current organisation)') }}
					</p>
				</CnNoteCard>

				<div v-for="action in actions" :key="action" class="cn-schema-form__cond-action">
					<div class="cn-schema-form__cond-action-header">
						<strong class="cn-schema-form__cond-action-name">{{ capitalize(action) }}</strong>
						<NcButton size="small" @click="addConditionalRule(action)">
							<template #icon>
								<Plus :size="16" />
							</template>
							{{ t('nextcloud-vue', 'Add rule') }}
						</NcButton>
					</div>

					<div v-if="getConditionalRules(action).length === 0" class="cn-schema-form__cond-empty">
						{{ t('nextcloud-vue', 'No conditional rules for {action}', { action }) }}
					</div>

					<div v-for="({ rule, originalIndex }, ruleIdx) in getConditionalRules(action)"
						:key="originalIndex"
						class="cn-schema-form__cond-rule-card"
						:class="{
							'cn-schema-form__cond-rule-card--public': rule.group === 'public',
							'cn-schema-form__cond-rule-card--authenticated': rule.group === 'authenticated',
							'cn-schema-form__cond-rule-card--admin': rule.group === 'admin',
						}">
						<!-- Rule header row — styled like a table row with group + remove -->
						<div class="cn-schema-form__cond-rule-header">
							<span class="cn-schema-form__group-badge">
								{{ rule.group }}
							</span>
							<div class="cn-schema-form__cond-rule-group-select">
								<NcSelect
									:model-value="getGroupOption(rule.group)"
									:options="allGroupOptions"
									:clearable="false"
									:aria-label-combobox="t('nextcloud-vue', 'Group')"
									@input="setRuleGroup(action, originalIndex, $event)" />
							</div>
							<NcButton variant="error"
								@click="removeConditionalRule(action, originalIndex)">
								<template #icon>
									<TrashCanOutline :size="16" />
								</template>
								{{ t('nextcloud-vue', 'Remove rule') }}
							</NcButton>
						</div>

						<!-- Conditions list -->
						<div class="cn-schema-form__cond-match-list">
							<p v-if="!rule.match || Object.keys(rule.match).length === 0"
								class="cn-schema-form__cond-match-empty">
								{{ t('nextcloud-vue', 'No conditions yet — add at least one condition') }}
							</p>
							<table v-else class="cn-schema-form__cond-match-table">
								<thead>
									<tr>
										<th>{{ t('nextcloud-vue', 'Property') }}</th>
										<th>{{ t('nextcloud-vue', 'Operator') }}</th>
										<th>{{ t('nextcloud-vue', 'Value') }}</th>
										<th />
									</tr>
								</thead>
								<tbody>
									<tr v-for="(condObj, propKey) in (rule.match || {})"
										:key="propKey"
										class="cn-schema-form__cond-match-row">
										<td>{{ propKey }}</td>
										<td :title="Object.keys(condObj)[0]">
											{{ getOperatorLabel(Object.keys(condObj)[0]) }}
										</td>
										<td>{{ formatConditionValue(Object.values(condObj)[0]) }}</td>
										<td class="cn-schema-form__cond-match-actions">
											<NcButton variant="error"
												size="small"
												:aria-label="t('nextcloud-vue', 'Remove condition')"
												@click="removeCondition(action, originalIndex, propKey)">
												<template #icon>
													<Close :size="14" />
												</template>
											</NcButton>
										</td>
									</tr>
								</tbody>
							</table>
						</div>

						<!-- Inline add-condition form -->
						<div v-if="isAddingConditionFor(action, ruleIdx)"
							:ref="`addForm-${action}-${ruleIdx}`"
							class="cn-schema-form__cond-add-form">
							<div class="cn-schema-form__cond-add-row">
								<div class="cn-schema-form__cond-add-field">
									<NcSelect
										v-model="newCondition.propertyOption"
										:options="availablePropertyOptions(action, ruleIdx)"
										:clearable="false"
										:input-label="t('nextcloud-vue', 'Property')"
										:placeholder="t('nextcloud-vue', 'Select property')" />
								</div>
								<div class="cn-schema-form__cond-add-field">
									<NcSelect
										v-model="newCondition.operatorOption"
										:options="operatorOptions"
										:clearable="false"
										:input-label="t('nextcloud-vue', 'Operator')" />
								</div>
								<div class="cn-schema-form__cond-add-field">
									<NcSelect
										v-if="newCondition.operatorOption && newCondition.operatorOption.id === '$exists'"
										v-model="newCondition.existsOption"
										:options="existsOptions"
										:clearable="false"
										:input-label="t('nextcloud-vue', 'Value')" />
									<NcSelect
										v-else
										v-model="newCondition.valueOption"
										:options="specialValueOptions"
										:clearable="true"
										:input-label="t('nextcloud-vue', 'Value')"
										:placeholder="t('nextcloud-vue', 'Select or type…')"
										@input="onValueOptionChange" />
								</div>
							</div>
							<!-- Custom value appears below the three selects, never displaces them -->
							<div v-if="newCondition.customValue !== null" class="cn-schema-form__cond-custom-row">
								<label class="cn-schema-form__cond-add-label">{{ t('nextcloud-vue', 'Custom value') }}</label>
								<input v-model="newCondition.customValue"
									class="cn-schema-form__cond-custom-input"
									:placeholder="t('nextcloud-vue', 'Enter a custom value')">
							</div>
							<div class="cn-schema-form__cond-add-actions">
								<NcButton @click="confirmAddCondition(action, originalIndex)">
									{{ t('nextcloud-vue', 'Add') }}
								</NcButton>
								<NcButton variant="tertiary" @click="cancelAddCondition()">
									{{ t('nextcloud-vue', 'Cancel') }}
								</NcButton>
							</div>
						</div>

						<NcButton v-else
							size="small"
							@click="startAddCondition(action, ruleIdx)">
							<template #icon>
								<Plus :size="14" />
							</template>
							{{ t('nextcloud-vue', 'Add condition') }}
						</NcButton>
					</div>
				</div>

				<h3>{{ t('nextcloud-vue', 'Inheritance') }}</h3>
				<!-- Inherit-from-public toggle -->
				<div class="cn-schema-form__inherit-from-public">
					<NcCheckboxRadioSwitch
						:model-value="inheritFromPublic"
						@update:checked="setInheritFromPublic">
						{{ t('nextcloud-vue', 'Authenticated users inherit `public` group rights') }}
					</NcCheckboxRadioSwitch>
					<p class="cn-schema-form__inherit-from-public-description">
						{{ t('nextcloud-vue', 'When on (default), logged-in users qualify for any rule that targets the `public` group. Disable to make authenticated access strictly gated by explicit group memberships — anonymous users are unaffected either way.') }}
					</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcButton,
	NcCheckboxRadioSwitch,
	NcLoadingIcon,
	NcSelect,
} from '@nextcloud/vue'
import _ from 'lodash'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import CnNoteCard from '../CnNoteCard/CnNoteCard.vue'

/**
 * CnSchemaSecurityTab — RBAC permissions table + conditional access rules tab for CnSchemaFormDialog.
 *
 * Renders the schema-level authorization configuration. Mutates
 * schemaItem.authorization directly.
 *
 * authorization[action] is a mixed array:
 *   - strings like "public", "authenticated" — managed by the RBAC checkboxes
 *   - objects like { group, match } — managed by the conditional rules accordion
 */
export default {
	name: 'CnSchemaSecurityTab',
	components: {
		CnNoteCard,
		NcButton,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
		NcSelect,
		Plus,
		Close,
		TrashCanOutline,
		ChevronDown,
		ChevronRight,
	},

	props: {
		/** The full schema item — mutates authorization directly */
		schemaItem: { type: Object, required: true },
		/** Full user groups array */
		userGroups: { type: Array, default: () => [] },
		/** Filtered/sorted user groups (excludes admin/public/authenticated) */
		sortedUserGroups: { type: Array, default: () => [] },
		/** Whether groups are loading */
		loadingGroups: { type: Boolean, default: false },
		/** Whether schema has any permissions set */
		hasAnyPermissions: { type: Boolean, default: false },
		/** Whether schema has restrictive permissions */
		isRestrictiveSchema: { type: Boolean, default: false },
		/** Properties inherited from parent schemas (allOf) */
		inheritedProperties: { type: Object, default: () => ({}) },
	},

	data() {
		return {
			actions: ['create', 'read', 'update', 'delete'],
			showAdvanced: false,
			addingCondition: { action: null, ruleIdx: null },
			newCondition: {
				propertyOption: null,
				operatorOption: null,
				valueOption: null,
				customValue: null,
				existsOption: null,
			},
		}
	},

	computed: {
		/** Local alias to avoid vue/no-mutating-props on template bindings */
		schema() {
			return this.schemaItem
		},

		operatorOptions() {
			return [
				{ id: '$eq', label: t('nextcloud-vue', '= Equal to') },
				{ id: '$ne', label: t('nextcloud-vue', '≠ Not equal to') },
				{ id: '$gt', label: t('nextcloud-vue', '> Greater than') },
				{ id: '$gte', label: t('nextcloud-vue', '≥ Greater than or equal') },
				{ id: '$lt', label: t('nextcloud-vue', '< Less than') },
				{ id: '$lte', label: t('nextcloud-vue', '≤ Less than or equal') },
				{ id: '$in', label: t('nextcloud-vue', '∈ In list') },
				{ id: '$nin', label: t('nextcloud-vue', '∉ Not in list') },
				{ id: '$exists', label: t('nextcloud-vue', '∃ Exists') },
			]
		},

		propertyOptions() {
			const ownKeys = Object.keys(this.schemaItem.properties || {}).filter((k) => k !== '')
			const inheritedKeys = Object.keys(this.inheritedProperties || {}).filter((k) => k !== '')
			const allKeys = [...new Set([...inheritedKeys, ...ownKeys])]
			const schemaProps = allKeys.map((key) => ({ id: key, label: key }))
			const systemProps = [
				{ id: '_organisation', label: t('nextcloud-vue', '_organisation (system)') },
				{ id: '_owner', label: t('nextcloud-vue', '_owner (system)') },
				{ id: '_created', label: t('nextcloud-vue', '_created (system)') },
				{ id: '_updated', label: t('nextcloud-vue', '_updated (system)') },
			]
			return [...schemaProps, ...systemProps]
		},

		specialValueOptions() {
			return [
				{ id: '$now', label: t('nextcloud-vue', '$now — current date/time') },
				{ id: '$userId', label: t('nextcloud-vue', '$userId — current user ID') },
				{ id: '$organisation', label: t('nextcloud-vue', '$organisation — current organisation') },
				{ id: '__custom__', label: t('nextcloud-vue', 'Custom value…') },
			]
		},

		existsOptions() {
			return [
				{ id: 'true', label: t('nextcloud-vue', 'true — field must exist') },
				{ id: 'false', label: t('nextcloud-vue', 'false — field must not exist') },
			]
		},

		allGroupOptions() {
			return [
				{ id: 'public', label: 'public' },
				{ id: 'authenticated', label: 'authenticated' },
				...this.sortedUserGroups.map((g) => ({ id: g.id, label: g.displayname || g.id })),
			]
		},

		totalConditionalRules() {
			return this.actions.reduce((total, action) => {
				return total + this.getConditionalRules(action).length
			}, 0)
		},

		/**
		 * Resolved schema-level value of `inheritFromPublic`.
		 *
		 * The cascade (register / tenant default) lives on the backend; here we
		 * just surface the schema's explicit value, defaulting to `true` (the
		 * pre-change behaviour) when unset.
		 *
		 * @return {boolean}
		 */
		inheritFromPublic() {
			const auth = this.schemaItem.authorization || {}
			if (auth.inheritFromPublic === undefined || auth.inheritFromPublic === null) {
				return true
			}
			return Boolean(auth.inheritFromPublic)
		},
	},

	methods: {
		t,
		capitalize: _.capitalize,

		/**
		 * Set the schema-level `inheritFromPublic` flag.
		 *
		 * Mutates schemaItem.authorization directly (matches the existing
		 * permission-table pattern). Storing `true` explicitly (rather than
		 * deleting the key) keeps the user's choice visible in the JSON view —
		 * the cascade still treats omitted/null as "unset" if a future operator
		 * removes it manually.
		 *
		 * @param {boolean} value New value for the flag.
		 */
		setInheritFromPublic(value) {
			if (!this.schemaItem.authorization) {
				this.$set(this.schemaItem, 'authorization', {})
			}
			this.$set(this.schemaItem.authorization, 'inheritFromPublic', Boolean(value))
		},

		availablePropertyOptions(action, ruleIdx) {
			const rules = this.getConditionalRules(action)
			const currentRule = rules[ruleIdx]
			if (!currentRule || !currentRule.rule.match) return this.propertyOptions
			const used = Object.keys(currentRule.rule.match)
			return this.propertyOptions.filter((opt) => !used.includes(opt.id))
		},

		// ─── Operator / value helpers ─────────────────────────────────────

		getOperatorLabel(opId) {
			const op = this.operatorOptions.find((o) => o.id === opId)
			return op ? op.label : opId
		},

		formatConditionValue(val) {
			if (Array.isArray(val)) return val.join(', ')
			return String(val)
		},

		getGroupOption(groupId) {
			return this.allGroupOptions.find((opt) => opt.id === groupId)
				|| { id: groupId, label: groupId }
		},

		// ─── Simple RBAC (string entries) ────────────────────────────────

		hasGroupPermission(groupId, action) {
			const auth = this.schema.authorization || {}
			if (!auth[action] || !Array.isArray(auth[action])) return false
			return auth[action].includes(groupId)
		},

		updateGroupPermission(groupId, action, hasPermission) {
			if (!this.schema.authorization) {
				this.$set(this.schema, 'authorization', {})
			}
			if (!this.schema.authorization[action]) {
				this.$set(this.schema.authorization, action, [])
			}
			const currentPermissions = this.schema.authorization[action]
			const groupIndex = currentPermissions.indexOf(groupId)
			if (hasPermission && groupIndex === -1) {
				currentPermissions.push(groupId)
			} else if (!hasPermission && groupIndex !== -1) {
				currentPermissions.splice(groupIndex, 1)
			}
			if (currentPermissions.length === 0) {
				this.$delete(this.schema.authorization, action)
			}
			if (Object.keys(this.schema.authorization).length === 0) {
				this.$set(this.schema, 'authorization', {})
			}
		},

		// ─── Conditional rules (object entries) ──────────────────────────

		/**
		 * Returns conditional (object-type) entries for an action with their original array indices.
		 *
		 * @param {string} action - The CRUD action name (create, read, update, delete).
		 * @return {{ rule: object, originalIndex: number }[]}
		 */
		getConditionalRules(action) {
			const auth = this.schema.authorization || {}
			if (!auth[action] || !Array.isArray(auth[action])) return []
			const result = []
			auth[action].forEach((entry, index) => {
				if (entry && typeof entry === 'object') {
					result.push({ rule: entry, originalIndex: index })
				}
			})
			return result
		},

		addConditionalRule(action) {
			if (!this.schema.authorization) {
				this.$set(this.schema, 'authorization', {})
			}
			if (!this.schema.authorization[action]) {
				this.$set(this.schema.authorization, action, [])
			}
			this.schema.authorization[action].push({ group: 'public', match: {} })
			// Focus the new rule card's first interactive element so NcDialog's focus-trap
			// does not reset focus to the dialog top when new DOM appears.
			this.$nextTick(() => {
				const cards = this.$el.querySelectorAll('.cn-schema-form__cond-rule-card')
				const lastCard = cards[cards.length - 1]
				if (lastCard) {
					const firstFocusable = lastCard.querySelector('input, button, [tabindex]')
					if (firstFocusable) firstFocusable.focus({ preventScroll: true })
				}
			})
		},

		removeConditionalRule(action, originalIndex) {
			const auth = this.schema.authorization
			if (!auth || !auth[action]) return
			auth[action].splice(originalIndex, 1)
			if (auth[action].length === 0) {
				this.$delete(this.schema.authorization, action)
			}
			this.cancelAddCondition()
		},

		setRuleGroup(action, originalIndex, option) {
			if (option && option.id) {
				this.$set(this.schema.authorization[action][originalIndex], 'group', option.id)
			}
		},

		removeCondition(action, originalIndex, propKey) {
			const rule = this.schema.authorization[action][originalIndex]
			if (!rule.match) return
			const updated = { ...rule.match }
			delete updated[propKey]
			this.$set(rule, 'match', updated)
		},

		// ─── Add-condition form state ─────────────────────────────────────

		isAddingConditionFor(action, ruleIdx) {
			return this.addingCondition.action === action && this.addingCondition.ruleIdx === ruleIdx
		},

		startAddCondition(action, ruleIdx) {
			this.addingCondition = { action, ruleIdx }
			this.newCondition = {
				propertyOption: null,
				operatorOption: this.operatorOptions.find((o) => o.id === '$lte'),
				valueOption: null,
				customValue: null,
				existsOption: this.existsOptions[0],
			}
			// Focus the first input inside the new form so NcDialog's focus-trap does not
			// reset focus to the dialog top when the "Add condition" button unmounts.
			this.$nextTick(() => {
				const refKey = `addForm-${action}-${ruleIdx}`
				const formEl = this.$refs[refKey]
				const form = Array.isArray(formEl) ? formEl[0] : formEl
				if (form) {
					const firstInput = (form.$el || form).querySelector('input, [tabindex="0"]')
					if (firstInput) firstInput.focus({ preventScroll: true })
				}
			})
		},

		cancelAddCondition() {
			this.addingCondition = { action: null, ruleIdx: null }
			this.newCondition = {
				propertyOption: null,
				operatorOption: null,
				valueOption: null,
				customValue: null,
				existsOption: null,
			}
		},

		onValueOptionChange(option) {
			if (option && option.id === '__custom__') {
				this.newCondition.customValue = ''
			} else {
				this.newCondition.customValue = null
			}
		},

		confirmAddCondition(action, originalIndex) {
			const property = this.newCondition.propertyOption && this.newCondition.propertyOption.id
			const operator = this.newCondition.operatorOption && this.newCondition.operatorOption.id
			if (!property || !operator) return

			let conditionValue
			if (operator === '$exists') {
				const existsId = this.newCondition.existsOption && this.newCondition.existsOption.id
				conditionValue = existsId !== 'false'
			} else if (this.newCondition.customValue !== null) {
				conditionValue = this.newCondition.customValue
			} else {
				conditionValue = this.newCondition.valueOption && this.newCondition.valueOption.id
			}

			if (!conditionValue && conditionValue !== false) return

			const rule = this.schema.authorization[action][originalIndex]
			// Replace the entire match object so Vue 2's property-level dep on `rule.match`
			// fires and the condition table v-for updates correctly.
			this.$set(rule, 'match', { ...(rule.match || {}), [property]: { [operator]: conditionValue } })

			this.cancelAddCondition()
		},
	},
}
</script>
