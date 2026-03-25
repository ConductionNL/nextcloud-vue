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
				:force-display-actions="true"
				:class="{ 'cn-sidebar-tab__task--overdue': isOverdue(task) }">
				<template #icon>
					<button class="cn-sidebar-tab__task-checkbox" @click.stop="toggleTask(task)">
						<CheckboxMarkedOutline v-if="task.status === 'completed'" :size="32" class="cn-sidebar-tab__task-done" />
						<CheckboxBlankOutline v-else :size="32" :class="{ 'cn-sidebar-tab__task-overdue-icon': isOverdue(task) }" />
					</button>
				</template>
				<template #subname>
					{{ extractAssignee(task) }}
				</template>
				<template v-if="task.due" #details>
					<span :class="{ 'cn-sidebar-tab__task-overdue-date': isOverdue(task) }">
						{{ formatShortDate(task.due) }}
					</span>
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
		<NcButton
			v-if="tasks.length < total"
			type="tertiary"
			:wide="true"
			:disabled="loadingMore"
			class="cn-sidebar-tab__load-more"
			@click="loadMore">
			<template v-if="loadingMore" #icon>
				<NcLoadingIcon :size="20" />
			</template>
			{{ loadingMore ? '' : loadMoreLabel }}
		</NcButton>
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
		loadMoreLabel: { type: String, default: 'Load more' },
	},

	data() {
		return {
			tasks: [],
			loading: false,
			loadingMore: false,
			newTaskSummary: '',
			newTaskDue: null,
			newTaskAssignee: null,
			saving: false,
			userList: [],
			page: 1,
			total: 0,
			limit: 20,
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
		async fetchTasks(append = false) {
			if (!this.register || !this.schema) return
			if (append) { this.loadingMore = true } else { this.loading = true }
			try {
				const params = new URLSearchParams({ limit: this.limit, _page: this.page })
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tasks?${params}`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					const results = data.results || data || []
					this.tasks = append ? [...this.tasks, ...results] : results
					this.total = data.total || this.tasks.length
				}
			} catch (err) {
				console.error('CnTasksTab: Failed to fetch tasks', err)
			} finally {
				this.loading = false
				this.loadingMore = false
			}
		},

		loadMore() {
			this.page++
			this.fetchTasks(true)
		},

		isOverdue(task) {
			if (!task.due || task.status === 'completed') return false
			return new Date(task.due) < new Date()
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

		async toggleTask(task) {
			const newStatus = task.status === 'completed' ? 'NEEDS-ACTION' : 'COMPLETED'
			try {
				await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tasks/${task.id}`,
					{
						method: 'PUT',
						headers: buildHeaders(),
						body: JSON.stringify({ status: newStatus }),
					},
				)
				await this.fetchTasks()
			} catch (err) {
				console.error('CnTasksTab: Failed to toggle task', err)
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

		extractAssignee(task) {
			if (task.description?.startsWith('Assigned to: ')) {
				return task.description.replace('Assigned to: ', '')
			}
			return task.description || ''
		},

		formatShortDate(dateStr) {
			if (!dateStr) return ''
			try {
				return new Date(dateStr).toLocaleDateString(undefined, {
					day: 'numeric', month: 'short',
				})
			} catch { return dateStr }
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
.cn-sidebar-tab__task-checkbox {
	display: flex;
	align-items: center;
	justify-content: center;
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	color: inherit;
}

.cn-sidebar-tab__task-done { color: var(--color-success); }
.cn-sidebar-tab__task-overdue-icon { color: var(--color-error, #e53935); }
.cn-sidebar-tab__task-overdue-date { color: var(--color-error, #e53935); font-weight: 500; }
.cn-sidebar-tab__load-more { margin-top: 8px; }
</style>
