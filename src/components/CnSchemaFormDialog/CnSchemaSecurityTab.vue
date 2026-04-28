<template>
	<div class="cn-schema-form__security-section">
		<CnNoteCard type="info">
			<p><strong>Role-Based Access Control (RBAC)</strong></p>
			<p>Configure which Nextcloud user groups can perform CRUD operations on objects of this schema.</p>
			<ul>
				<li>If no groups are specified for an operation, all users can perform it</li>
				<li>The 'admin' group always has full access (cannot be changed)</li>
				<li>The object owner always has full access</li>
				<li>'public' represents unauthenticated access</li>
			</ul>
		</CnNoteCard>

		<div v-if="loadingGroups" class="cn-schema-form__loading-groups">
			<NcLoadingIcon :size="20" />
			<span>Loading user groups...</span>
		</div>

		<div v-else class="cn-schema-form__rbac-table-container">
			<h3>Group permissions</h3>
			<table class="cn-schema-form__rbac-table">
				<thead>
					<tr>
						<th>Group</th>
						<th>Create</th>
						<th>Read</th>
						<th>Update</th>
						<th>Delete</th>
					</tr>
				</thead>
				<tbody>
					<tr class="cn-schema-form__public-row">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge cn-schema-form__public">public</span>
							<small>Unauthenticated users</small>
						</td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission('public', 'create')" @update:checked="updateGroupPermission('public', 'create', $event)" /></td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission('public', 'read')" @update:checked="updateGroupPermission('public', 'read', $event)" /></td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission('public', 'update')" @update:checked="updateGroupPermission('public', 'update', $event)" /></td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission('public', 'delete')" @update:checked="updateGroupPermission('public', 'delete', $event)" /></td>
					</tr>
					<tr class="cn-schema-form__user-row">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge cn-schema-form__user">authenticated</span>
							<small>Authenticated users</small>
						</td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission('authenticated', 'create')" @update:checked="updateGroupPermission('authenticated', 'create', $event)" /></td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission('authenticated', 'read')" @update:checked="updateGroupPermission('authenticated', 'read', $event)" /></td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission('authenticated', 'update')" @update:checked="updateGroupPermission('authenticated', 'update', $event)" /></td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission('authenticated', 'delete')" @update:checked="updateGroupPermission('authenticated', 'delete', $event)" /></td>
					</tr>
					<tr v-for="group in sortedUserGroups" :key="group.id">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge">{{ group.displayname || group.id }}</span>
							<small v-if="group.displayname && group.displayname !== group.id">{{ group.id }}</small>
						</td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission(group.id, 'create')" @update:checked="updateGroupPermission(group.id, 'create', $event)" /></td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission(group.id, 'read')" @update:checked="updateGroupPermission(group.id, 'read', $event)" /></td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission(group.id, 'update')" @update:checked="updateGroupPermission(group.id, 'update', $event)" /></td>
						<td><NcCheckboxRadioSwitch :checked="hasGroupPermission(group.id, 'delete')" @update:checked="updateGroupPermission(group.id, 'delete', $event)" /></td>
					</tr>
					<tr class="cn-schema-form__admin-row">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge cn-schema-form__admin">admin</span>
							<small>Always has full access</small>
						</td>
						<td><NcCheckboxRadioSwitch :checked="true" :disabled="true" /></td>
						<td><NcCheckboxRadioSwitch :checked="true" :disabled="true" /></td>
						<td><NcCheckboxRadioSwitch :checked="true" :disabled="true" /></td>
						<td><NcCheckboxRadioSwitch :checked="true" :disabled="true" /></td>
					</tr>
				</tbody>
			</table>

			<div class="cn-schema-form__rbac-summary">
				<CnNoteCard v-if="!hasAnyPermissions" type="success">
					<p><strong>Open access:</strong> No specific permissions set — all users can perform all operations.</p>
				</CnNoteCard>
				<CnNoteCard v-else-if="isRestrictiveSchema" type="warning">
					<p><strong>Restrictive schema:</strong> Access is limited to specified groups only.</p>
				</CnNoteCard>
			</div>
		</div>

		<!-- Advanced: Conditional Access Rules (accordion) -->
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
				<span>Advanced: Conditional access rules</span>
				<span v-if="totalConditionalRules > 0" class="cn-schema-form__cond-count-badge">
					{{ totalConditionalRules }}
				</span>
			</button>

			<div v-show="showAdvanced" class="cn-schema-form__cond-accordion-body">
				<CnNoteCard type="info">
					<p>Grant access based on object property values evaluated at runtime. Multiple rules per action are OR'd — any matching rule grants access.</p>
					<p>
						<strong>Variables:</strong>
						<code>$now</code> (current date/time) &nbsp;
						<code>$userId</code> (current user ID) &nbsp;
						<code>$organisation</code> (current organisation)
					</p>
				</CnNoteCard>

				<div v-for="action in actions" :key="action" class="cn-schema-form__cond-action">
					<div class="cn-schema-form__cond-action-header">
						<strong class="cn-schema-form__cond-action-name">{{ capitalize(action) }}</strong>
						<NcButton size="small" @click="addConditionalRule(action)">
							<template #icon>
								<Plus :size="16" />
							</template>
							Add rule
						</NcButton>
					</div>

					<div v-if="getConditionalRules(action).length === 0" class="cn-schema-form__cond-empty">
						No conditional rules for {{ action }}
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
									:value="getGroupOption(rule.group)"
									:options="allGroupOptions"
									:clearable="false"
									aria-label-combobox="Group"
									@input="setRuleGroup(action, originalIndex, $event)" />
							</div>
							<NcButton type="error"
								@click="removeConditionalRule(action, originalIndex)">
								<template #icon>
									<TrashCanOutline :size="16" />
								</template>
								Remove rule
							</NcButton>
						</div>

						<!-- Conditions list -->
						<div class="cn-schema-form__cond-match-list">
							<p v-if="!rule.match || Object.keys(rule.match).length === 0"
								class="cn-schema-form__cond-match-empty">
								No conditions yet — add at least one condition
							</p>
							<table v-else class="cn-schema-form__cond-match-table">
								<thead>
									<tr>
										<th>Property</th>
										<th>Operator</th>
										<th>Value</th>
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
											<NcButton type="error"
												size="small"
												aria-label="Remove condition"
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
										input-label="Property"
										placeholder="Select property" />
								</div>
								<div class="cn-schema-form__cond-add-field">
									<NcSelect
										v-model="newCondition.operatorOption"
										:options="operatorOptions"
										:clearable="false"
										input-label="Operator" />
								</div>
								<div class="cn-schema-form__cond-add-field">
									<NcSelect
										v-if="newCondition.operatorOption && newCondition.operatorOption.id === '$exists'"
										v-model="newCondition.existsOption"
										:options="existsOptions"
										:clearable="false"
										input-label="Value" />
									<NcSelect
										v-else
										v-model="newCondition.valueOption"
										:options="specialValueOptions"
										:clearable="true"
										input-label="Value"
										placeholder="Select or type…"
										@input="onValueOptionChange" />
								</div>
							</div>
							<!-- Custom value appears below the three selects, never displaces them -->
							<div v-if="newCondition.customValue !== null" class="cn-schema-form__cond-custom-row">
								<label class="cn-schema-form__cond-add-label">Custom value</label>
								<input v-model="newCondition.customValue"
									class="cn-schema-form__cond-custom-input"
									placeholder="Enter a custom value">
							</div>
							<div class="cn-schema-form__cond-add-actions">
								<NcButton @click="confirmAddCondition(action, originalIndex)">
									Add
								</NcButton>
								<NcButton type="tertiary" @click="cancelAddCondition()">
									Cancel
								</NcButton>
							</div>
						</div>

						<NcButton v-else
							size="small"
							@click="startAddCondition(action, ruleIdx)">
							<template #icon>
								<Plus :size="14" />
							</template>
							Add condition
						</NcButton>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import {
	NcButton,
	NcCheckboxRadioSwitch,
	NcLoadingIcon,
	NcSelect,
} from '@nextcloud/vue'
import CnNoteCard from '../CnNoteCard/CnNoteCard.vue'

import Plus from 'vue-material-design-icons/Plus.vue'
import Close from 'vue-material-design-icons/Close.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'

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
				{ id: '$eq', label: '= Equal to' },
				{ id: '$ne', label: '≠ Not equal to' },
				{ id: '$gt', label: '> Greater than' },
				{ id: '$gte', label: '≥ Greater than or equal' },
				{ id: '$lt', label: '< Less than' },
				{ id: '$lte', label: '≤ Less than or equal' },
				{ id: '$in', label: '∈ In list' },
				{ id: '$nin', label: '∉ Not in list' },
				{ id: '$exists', label: '∃ Exists' },
			]
		},

		propertyOptions() {
			const schemaProps = Object.keys(this.schemaItem.properties || {}).map(key => ({
				id: key,
				label: key,
			}))
			const systemProps = [
				{ id: '_organisation', label: '_organisation (system)' },
				{ id: '_owner', label: '_owner (system)' },
				{ id: '_created', label: '_created (system)' },
				{ id: '_updated', label: '_updated (system)' },
			]
			return [...schemaProps, ...systemProps]
		},

		specialValueOptions() {
			return [
				{ id: '$now', label: '$now — current date/time' },
				{ id: '$userId', label: '$userId — current user ID' },
				{ id: '$organisation', label: '$organisation — current organisation' },
				{ id: '__custom__', label: 'Custom value…' },
			]
		},

		existsOptions() {
			return [
				{ id: 'true', label: 'true — field must exist' },
				{ id: 'false', label: 'false — field must not exist' },
			]
		},

		allGroupOptions() {
			return [
				{ id: 'public', label: 'public' },
				{ id: 'authenticated', label: 'authenticated' },
				...this.sortedUserGroups.map(g => ({ id: g.id, label: g.displayname || g.id })),
			]
		},

		totalConditionalRules() {
			return this.actions.reduce((total, action) => {
				return total + this.getConditionalRules(action).length
			}, 0)
		},
	},
	methods: {
		capitalize(str) {
			return str.charAt(0).toUpperCase() + str.slice(1)
		},

		availablePropertyOptions(action, ruleIdx) {
			const rules = this.getConditionalRules(action)
			const currentRule = rules[ruleIdx]
			if (!currentRule || !currentRule.rule.match) return this.propertyOptions
			const used = Object.keys(currentRule.rule.match)
			return this.propertyOptions.filter(opt => !used.includes(opt.id))
		},

		// ─── Operator / value helpers ─────────────────────────────────────

		getOperatorLabel(opId) {
			const op = this.operatorOptions.find(o => o.id === opId)
			return op ? op.label : opId
		},

		formatConditionValue(val) {
			if (Array.isArray(val)) return val.join(', ')
			return String(val)
		},

		getGroupOption(groupId) {
			return this.allGroupOptions.find(opt => opt.id === groupId)
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
		 * @param {string} action
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
			const match = this.schema.authorization[action][originalIndex].match
			if (match) {
				this.$delete(match, propKey)
			}
		},

		// ─── Add-condition form state ─────────────────────────────────────

		isAddingConditionFor(action, ruleIdx) {
			return this.addingCondition.action === action && this.addingCondition.ruleIdx === ruleIdx
		},

		startAddCondition(action, ruleIdx) {
			this.addingCondition = { action, ruleIdx }
			this.newCondition = {
				propertyOption: null,
				operatorOption: this.operatorOptions.find(o => o.id === '$lte'),
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
			if (!rule.match) {
				this.$set(rule, 'match', {})
			}
			this.$set(rule.match, property, { [operator]: conditionValue })

			this.cancelAddCondition()
		},
	},
}
</script>
