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
					<!-- Public group at top -->
					<tr class="cn-schema-form__public-row">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge cn-schema-form__public">public</span>
							<small>Unauthenticated users</small>
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('public', 'create')"
								@update:checked="updateGroupPermission('public', 'create', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('public', 'read')"
								@update:checked="updateGroupPermission('public', 'read', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('public', 'update')"
								@update:checked="updateGroupPermission('public', 'update', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('public', 'delete')"
								@update:checked="updateGroupPermission('public', 'delete', $event)" />
						</td>
					</tr>

					<!-- Authenticated users group -->
					<tr class="cn-schema-form__user-row">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge cn-schema-form__user">authenticated</span>
							<small>Authenticated users</small>
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('authenticated', 'create')"
								@update:checked="updateGroupPermission('authenticated', 'create', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('authenticated', 'read')"
								@update:checked="updateGroupPermission('authenticated', 'read', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('authenticated', 'update')"
								@update:checked="updateGroupPermission('authenticated', 'update', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('authenticated', 'delete')"
								@update:checked="updateGroupPermission('authenticated', 'delete', $event)" />
						</td>
					</tr>

					<!-- Regular user groups -->
					<tr v-for="group in sortedUserGroups" :key="group.id">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge">{{ group.displayname || group.id }}</span>
							<small v-if="group.displayname && group.displayname !== group.id">{{ group.id }}</small>
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission(group.id, 'create')"
								@update:checked="updateGroupPermission(group.id, 'create', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission(group.id, 'read')"
								@update:checked="updateGroupPermission(group.id, 'read', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission(group.id, 'update')"
								@update:checked="updateGroupPermission(group.id, 'update', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission(group.id, 'delete')"
								@update:checked="updateGroupPermission(group.id, 'delete', $event)" />
						</td>
					</tr>

					<!-- Admin group at bottom (disabled) -->
					<tr class="cn-schema-form__admin-row">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge cn-schema-form__admin">admin</span>
							<small>Always has full access</small>
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="true"
								:disabled="true" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="true"
								:disabled="true" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="true"
								:disabled="true" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="true"
								:disabled="true" />
						</td>
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

		<!-- Advanced: Conditional Access Rules -->
		<div class="cn-schema-form__conditional-section">
			<h3>Advanced: Conditional access rules</h3>
			<CnNoteCard type="info">
				<p>Grant access based on object property values evaluated at runtime. Multiple rules per action are OR'd — any matching rule grants access. Conditional rules and group permissions above work independently.</p>
				<p>
					<strong>Variables:</strong> <code>$now</code> (current date/time) &nbsp;
					<code>$userId</code> (current user) &nbsp;
					<code>$organisation</code> (current organisation)
				</p>
				<p>
					<strong>Operators:</strong>
					<code>$eq</code> <code>$ne</code> <code>$gt</code> <code>$gte</code>
					<code>$lt</code> <code>$lte</code> <code>$in</code> <code>$nin</code> <code>$exists</code>
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
					class="cn-schema-form__cond-rule-card">
					<!-- Rule header: group selector + remove button -->
					<div class="cn-schema-form__cond-rule-header">
						<label class="cn-schema-form__cond-rule-label">Group</label>
						<select :value="rule.group"
							class="cn-schema-form__cond-select"
							@change="setRuleGroup(action, originalIndex, $event.target.value)">
							<option value="public">public</option>
							<option value="authenticated">authenticated</option>
							<option v-for="group in sortedUserGroups" :key="group.id" :value="group.id">
								{{ group.displayname || group.id }}
							</option>
						</select>
						<NcButton type="tertiary-no-background"
							@click="removeConditionalRule(action, originalIndex)">
							<template #icon>
								<TrashCanOutline :size="16" />
							</template>
						</NcButton>
					</div>

					<!-- Conditions in match -->
					<div class="cn-schema-form__cond-match-list">
						<div v-if="!rule.match || Object.keys(rule.match).length === 0"
							class="cn-schema-form__cond-match-empty">
							No conditions yet — add at least one condition
						</div>
						<div v-for="(condObj, propKey) in (rule.match || {})"
							:key="propKey"
							class="cn-schema-form__cond-match-row">
							<code class="cn-schema-form__cond-match-prop">{{ propKey }}</code>
							<span class="cn-schema-form__cond-match-op">{{ Object.keys(condObj)[0] }}</span>
							<code class="cn-schema-form__cond-match-val">{{ String(Object.values(condObj)[0]) }}</code>
							<NcButton type="tertiary-no-background"
								@click="removeCondition(action, originalIndex, propKey)">
								<template #icon>
									<Close :size="14" />
								</template>
							</NcButton>
						</div>
					</div>

					<!-- Inline add-condition form -->
					<div v-if="isAddingConditionFor(action, ruleIdx)"
						class="cn-schema-form__cond-add-form">
						<div class="cn-schema-form__cond-add-row">
							<input v-model="newCondition.property"
								:list="`cn-props-${action}-${ruleIdx}`"
								class="cn-schema-form__cond-input"
								placeholder="Property name" />
							<datalist :id="`cn-props-${action}-${ruleIdx}`">
								<option v-for="propKey in schemaPropertyKeys" :key="propKey" :value="propKey" />
							</datalist>

							<select v-model="newCondition.operator" class="cn-schema-form__cond-op-select">
								<option v-for="op in operators" :key="op" :value="op">{{ op }}</option>
							</select>

							<select v-if="newCondition.operator === '$exists'"
								v-model="newCondition.existsValue"
								class="cn-schema-form__cond-input">
								<option :value="true">true</option>
								<option :value="false">false</option>
							</select>
							<template v-else>
								<input v-model="newCondition.value"
									:list="`cn-vals-${action}-${ruleIdx}`"
									class="cn-schema-form__cond-input"
									placeholder="Value (e.g. $now)" />
								<datalist :id="`cn-vals-${action}-${ruleIdx}`">
									<option value="$now" />
									<option value="$userId" />
									<option value="$organisation" />
								</datalist>
							</template>
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

					<NcButton v-else size="small" @click="startAddCondition(action, ruleIdx)">
						<template #icon>
							<Plus :size="14" />
						</template>
						Add condition
					</NcButton>
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
} from '@nextcloud/vue'
import CnNoteCard from '../CnNoteCard/CnNoteCard.vue'

import Plus from 'vue-material-design-icons/Plus.vue'
import Close from 'vue-material-design-icons/Close.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'

/**
 * CnSchemaSecurityTab — RBAC permissions table + conditional access rules tab for CnSchemaFormDialog.
 *
 * Renders the schema-level authorization configuration. Mutates
 * schemaItem.authorization directly.
 *
 * authorization[action] is a mixed array:
 *   - strings like "public", "authenticated" — managed by the RBAC checkboxes above
 *   - objects like { group, match } — managed by the conditional rules section
 */
export default {
	name: 'CnSchemaSecurityTab',
	components: {
		CnNoteCard,
		NcButton,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
		Plus,
		Close,
		TrashCanOutline,
	},
	props: {
		/** The full schema item — mutates authorization directly */
		schemaItem: { type: Object, required: true },
		/** Full user groups array */
		userGroups: { type: Array, default: () => [] },
		/** Filtered/sorted user groups (excludes admin/public) */
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
			operators: ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$exists'],
			addingCondition: { action: null, ruleIdx: null },
			newCondition: { property: '', operator: '$lte', value: '', existsValue: true },
		}
	},
	computed: {
		/** Local alias to avoid vue/no-mutating-props on template bindings */
		schema() {
			return this.schemaItem
		},
		schemaPropertyKeys() {
			return Object.keys(this.schemaItem.properties || {})
		},
	},
	methods: {
		capitalize(str) {
			return str.charAt(0).toUpperCase() + str.slice(1)
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

			// Only delete the action key if the array is truly empty (no conditional rules either)
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

		setRuleGroup(action, originalIndex, newGroup) {
			this.$set(this.schema.authorization[action][originalIndex], 'group', newGroup)
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
			this.newCondition = { property: '', operator: '$lte', value: '', existsValue: true }
		},

		cancelAddCondition() {
			this.addingCondition = { action: null, ruleIdx: null }
			this.newCondition = { property: '', operator: '$lte', value: '', existsValue: true }
		},

		confirmAddCondition(action, originalIndex) {
			const { property, operator, value, existsValue } = this.newCondition
			if (!property || !operator) return

			const rule = this.schema.authorization[action][originalIndex]
			if (!rule.match) {
				this.$set(rule, 'match', {})
			}

			const conditionValue = operator === '$exists' ? existsValue : value
			this.$set(rule.match, property, { [operator]: conditionValue })

			this.cancelAddCondition()
		},
	},
}
</script>
