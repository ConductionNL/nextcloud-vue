<template>
	<div class="cn-schema-form__security-section">
		<NcNoteCard type="info">
			<p><strong>Role-Based Access Control (RBAC)</strong></p>
			<p>Configure which Nextcloud user groups can perform CRUD operations on objects of this schema.</p>
			<ul>
				<li>If no groups are specified for an operation, all users can perform it</li>
				<li>The 'admin' group always has full access (cannot be changed)</li>
				<li>The object owner always has full access</li>
				<li>'public' represents unauthenticated access</li>
			</ul>
		</NcNoteCard>

		<div v-if="loadingGroups" class="cn-schema-form__loading-groups">
			<NcLoadingIcon :size="20" />
			<span>Loading user groups...</span>
		</div>

		<div v-else class="cn-schema-form__rbac-table-container">
			<h3>Group Permissions</h3>
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

					<!-- User group (authenticated users) -->
					<tr class="cn-schema-form__user-row">
						<td class="cn-schema-form__group-name">
							<span class="cn-schema-form__group-badge cn-schema-form__user">user</span>
							<small>Authenticated users</small>
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('user', 'create')"
								@update:checked="updateGroupPermission('user', 'create', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('user', 'read')"
								@update:checked="updateGroupPermission('user', 'read', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('user', 'update')"
								@update:checked="updateGroupPermission('user', 'update', $event)" />
						</td>
						<td>
							<NcCheckboxRadioSwitch
								:checked="hasGroupPermission('user', 'delete')"
								@update:checked="updateGroupPermission('user', 'delete', $event)" />
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
				<NcNoteCard v-if="!hasAnyPermissions" type="success">
					<p><strong>Open Access:</strong> No specific permissions set - all users can perform all operations.</p>
				</NcNoteCard>
				<NcNoteCard v-else-if="isRestrictiveSchema" type="warning">
					<p><strong>Restrictive Schema:</strong> Access is limited to specified groups only.</p>
				</NcNoteCard>
			</div>
		</div>
	</div>
</template>

<script>
import {
	NcNoteCard,
	NcCheckboxRadioSwitch,
	NcLoadingIcon,
} from '@nextcloud/vue'

/**
 * CnSchemaSecurityTab — RBAC permissions table tab for CnSchemaFormDialog.
 *
 * Renders the schema-level authorization configuration. Mutates
 * schemaItem.authorization directly.
 */
export default {
	name: 'CnSchemaSecurityTab',
	components: {
		NcNoteCard,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
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
	computed: {
		/** Local alias to avoid vue/no-mutating-props on template bindings */
		schema() {
			return this.schemaItem
		},
	},
	methods: {
		hasGroupPermission(groupId, action) {
			const auth = this.schema.authorization || {}
			if (!auth[action] || !Array.isArray(auth[action])) {
				return false
			}
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
	},
}
</script>
