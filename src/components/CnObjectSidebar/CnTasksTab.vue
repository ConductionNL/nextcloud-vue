<template>
	<div class="cn-sidebar-tab">
		<!-- Add task -->
		<div class="cn-sidebar-tab__action">
			<div class="cn-sidebar-tab__action--row">
				<NcTextField
					v-model="newTaskSummary"
					:label="addTaskPlaceholder"
					@keyup.enter="addTask" />
				<NcButton
					type="primary"
					:disabled="!newTaskSummary.trim() || saving"
					@click="addTask">
					<template #icon>
						<Plus :size="20" />
					</template>
				</NcButton>
			</div>
			<div class="cn-sidebar-tab__task-fields">
				<NcDateTimePickerNative
					id="task-deadline"
					v-model="newTaskDue"
					:label="deadlineLabel"
					type="date" />
				<NcSelect
					v-model="newTaskAssignee"
					:options="userList"
					:placeholder="assigneeLabel"
					label="displayName"
					track-by="userId"
					:clearable="true" />
			</div>
		</div>

		<!-- Tasks list -->
		<NcLoadingIcon v-if="loading" />
		<div v-else-if="tasks.length === 0" class="cn-sidebar-tab__empty">
			{{ noTasksLabel }}
		</div>
		<div v-else class="cn-sidebar-tab__list">
			<NcListItem
				v-for="task in tasks"
				:key="task.id"
				:name="task.summary || task.title || task.name"
				:bold="false"
				:force-display-actions="true">
				<template #icon>
					<CheckboxMarkedOutline v-if="task.status === 'completed'" :size="32" class="cn-sidebar-tab__task-done" />
					<CheckboxBlankOutline v-else :size="32" />
				</template>
				<template #subname>
					{{ task.due ? formatDate(task.due) : '' }}
				</template>
				<template #actions>
					<NcActionButton v-if="task.status !== 'completed'" @click="completeTask(task)">
						<template #icon>
							<CheckboxMarkedOutline :size="20" />
						</template>
						{{ completeLabel }}
					</NcActionButton>
					<NcActionButton @click="deleteTask(task)">
						<template #icon>
							<Delete :size="20" />
						</template>
						{{ deleteLabel }}
					</NcActionButton>
				</template>
			</NcListItem>
		</div>
	</div>
</template>

<script>
import { NcButton, NcTextField, NcListItem, NcActionButton, NcLoadingIcon, NcDateTimePickerNative, NcSelect } from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import CheckboxMarkedOutline from 'vue-material-design-icons/CheckboxMarkedOutline.vue'
import CheckboxBlankOutline from 'vue-material-design-icons/CheckboxBlankOutline.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnTasksTab',

	components: {
		NcButton, NcTextField, NcListItem, NcActionButton, NcLoadingIcon,
		NcDateTimePickerNative, NcSelect, Plus, Delete,
		CheckboxMarkedOutline, CheckboxBlankOutline,
	},

	props: {
		objectId: { type: String, required: true },
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },
		addTaskPlaceholder: { type: String, default: 'Add task...' },
		deadlineLabel: { type: String, default: 'Deadline' },
		assigneeLabel: { type: String, default: 'Assign to...' },
		completeLabel: { type: String, default: 'Complete' },
		deleteLabel: { type: String, default: 'Delete' },
		noTasksLabel: { type: String, default: 'No linked tasks' },
	},

	data() {
		return {
			tasks: [],
			loading: false,
			newTaskSummary: '',
			newTaskDue: null,
			newTaskAssignee: null,
			saving: false,
			userList: [],
		}
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) {
				if (id) {
					this.fetchTasks()
					this.fetchUsers()
				}
			},
		},
	},

	methods: {
		async fetchTasks() {
			if (!this.register || !this.schema) return
			this.loading = true
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tasks`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					this.tasks = data.results || data || []
				}
			} catch (err) {
				console.error('CnTasksTab: Failed to fetch tasks', err)
			} finally {
				this.loading = false
			}
		},

		async fetchUsers() {
			try {
				const response = await fetch('/ocs/v2.php/cloud/users/details?format=json&limit=50', {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					const users = data.ocs?.data?.users || {}
					this.userList = Object.entries(users).map(([id, user]) => ({
						userId: id,
						displayName: user.displayname || id,
					}))
				}
			} catch (err) {
				console.error('CnTasksTab: Failed to fetch users', err)
			}
		},

		async addTask() {
			if (!this.newTaskSummary.trim() || !this.register || !this.schema) return
			this.saving = true
			try {
				const taskData = { summary: this.newTaskSummary.trim() }
				if (this.newTaskDue) {
					taskData.due = new Date(this.newTaskDue).toISOString()
				}
				if (this.newTaskAssignee) {
					taskData.description = 'Assigned to: ' + this.newTaskAssignee.displayName
				}
				await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tasks`,
					{
						method: 'POST',
						headers: buildHeaders(),
						body: JSON.stringify(taskData),
					},
				)
				this.newTaskSummary = ''
				this.newTaskDue = null
				this.newTaskAssignee = null
				await this.fetchTasks()
			} catch (err) {
				console.error('CnTasksTab: Failed to add task', err)
			} finally {
				this.saving = false
			}
		},

		async completeTask(task) {
			try {
				await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tasks/${task.id}`,
					{
						method: 'PUT',
						headers: buildHeaders(),
						body: JSON.stringify({ status: 'COMPLETED' }),
					},
				)
				await this.fetchTasks()
			} catch (err) {
				console.error('CnTasksTab: Failed to complete task', err)
			}
		},

		async deleteTask(task) {
			try {
				await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tasks/${task.id}`,
					{ method: 'DELETE', headers: buildHeaders() },
				)
				this.tasks = this.tasks.filter(t => t.id !== task.id)
			} catch (err) {
				console.error('CnTasksTab: Failed to delete task', err)
			}
		},

		formatDate(dateStr) {
			if (!dateStr) return ''
			try {
				return new Date(dateStr).toLocaleString(undefined, {
					year: 'numeric', month: 'short', day: 'numeric',
					hour: '2-digit', minute: '2-digit',
				})
			} catch { return dateStr }
		},
	},
}
</script>

<style scoped>
.cn-sidebar-tab { padding: 12px; }
.cn-sidebar-tab__action { margin-bottom: 16px; }
.cn-sidebar-tab__action--row { display: flex; gap: 8px; align-items: flex-end; }

.cn-sidebar-tab__task-fields {
	display: flex;
	gap: 8px;
	margin-top: 8px;
}

.cn-sidebar-tab__task-fields > * { flex: 1; min-width: 0; }

.cn-sidebar-tab__empty {
	text-align: center;
	padding: 24px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-sidebar-tab__list { display: flex; flex-direction: column; gap: 2px; }
.cn-sidebar-tab__task-done { color: var(--color-success); }
</style>
