<!--
  CnTasksCard — Inline tasks card for detail pages.

  Displays up to 5 tasks with status indicators, assignee, and due date.
  Integrates CnUserActionMenu on assignee names. Highlights overdue tasks.
  Wraps CnDetailCard for consistent styling.
-->
<template>
	<CnDetailCard :title="titleLabel" :icon="CheckboxMarkedOutline" :collapsible="collapsible">
		<div class="cn-tasks-card">
			<!-- Loading state -->
			<NcLoadingIcon v-if="loading" />

			<!-- Empty state -->
			<div v-else-if="allTasks.length === 0" class="cn-tasks-card__empty">
				{{ noTasksLabel }}
			</div>

			<!-- Tasks list -->
			<div v-else class="cn-tasks-card__list">
				<div
					v-for="task in displayedTasks"
					:key="task.id"
					class="cn-tasks-card__task">
					<!-- Status icon -->
					<div class="cn-tasks-card__status-icon">
						<CheckboxMarkedOutline
							v-if="task.status === 'completed'"
							:size="20"
							class="cn-tasks-card__icon--completed" />
						<ProgressClock
							v-else-if="task.status === 'active' || task.status === 'in-process'"
							:size="20"
							class="cn-tasks-card__icon--active" />
						<CloseCircleOutline
							v-else-if="task.status === 'terminated'"
							:size="20"
							class="cn-tasks-card__icon--terminated" />
						<CheckboxBlankOutline
							v-else
							:size="20"
							class="cn-tasks-card__icon--available" />
					</div>

					<!-- Task content -->
					<div class="cn-tasks-card__content">
						<span class="cn-tasks-card__title">{{ task.title || task.name }}</span>
						<div class="cn-tasks-card__meta">
							<!-- Assignee -->
							<span v-if="hasAssignee(task)" class="cn-tasks-card__assignee">
								<CnUserActionMenu
									v-if="!isCurrentUser(task.assignee)"
									:user-id="task.assignee"
									:display-name="task.assignee">
									<span class="cn-tasks-card__assignee-name">{{ task.assignee }}</span>
								</CnUserActionMenu>
								<span v-else class="cn-tasks-card__assignee-name cn-tasks-card__assignee-name--self">
									{{ task.assignee }}
								</span>
							</span>
							<span v-else class="cn-tasks-card__unassigned">
								{{ unassignedLabel }}
							</span>

							<!-- Due date -->
							<span
								v-if="task.dueDate"
								class="cn-tasks-card__due-date"
								:class="{ 'cn-tasks-card__due-date--overdue': isOverdue(task) }">
								{{ formatDate(task.dueDate) }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Footer: "Show all" link -->
		<template v-if="allTasks.length > maxDisplay" #footer>
			<button
				class="cn-tasks-card__show-all"
				@click="$emit('show-all')">
				{{ showAllLabel }} ({{ allTasks.length }})
			</button>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import CheckboxMarkedOutline from 'vue-material-design-icons/CheckboxMarkedOutline.vue'
import CheckboxBlankOutline from 'vue-material-design-icons/CheckboxBlankOutline.vue'
import ProgressClock from 'vue-material-design-icons/ProgressClock.vue'
import CloseCircleOutline from 'vue-material-design-icons/CloseCircleOutline.vue'

import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import CnUserActionMenu from '../CnUserActionMenu/CnUserActionMenu.vue'
import { buildHeaders } from '../../utils/index.js'

/**
 * CnTasksCard — Inline tasks widget for detail pages.
 *
 * Shows up to 5 tasks sorted by due date with status indicators.
 * Highlights overdue tasks and integrates CnUserActionMenu on assignees.
 *
 * Basic usage
 * <CnTasksCard
 *   register-id="uuid-register"
 *   schema-id="uuid-schema"
 *   object-id="uuid-object" />
 *
 * With sidebar sync
 * <CnTasksCard
 *   register-id="reg"
 *   schema-id="schema"
 *   object-id="obj"
 *   @show-all="openSidebarTasksTab" />
 */
export default {
	name: 'CnTasksCard',

	components: {
		CnDetailCard,
		CnUserActionMenu,
		NcLoadingIcon,
		CheckboxMarkedOutline,
		CheckboxBlankOutline,
		ProgressClock,
		CloseCircleOutline,
	},

	props: {
		/** OpenRegister register ID */
		registerId: {
			type: String,
			required: true,
		},
		/** OpenRegister schema ID */
		schemaId: {
			type: String,
			required: true,
		},
		/** Object UUID */
		objectId: {
			type: String,
			required: true,
		},
		/** Base API URL for OpenRegister */
		apiBase: {
			type: String,
			default: '/apps/openregister/api',
		},
		/** Maximum number of tasks to display */
		maxDisplay: {
			type: Number,
			default: 5,
		},
		/** Whether the card is collapsible */
		collapsible: {
			type: Boolean,
			default: false,
		},

		// --- Pre-translated labels ---
		titleLabel: { type: String, default: () => t('nextcloud-vue', 'Tasks') },
		noTasksLabel: { type: String, default: () => t('nextcloud-vue', 'No tasks') },
		showAllLabel: { type: String, default: () => t('nextcloud-vue', 'Show all') },
		unassignedLabel: { type: String, default: () => t('nextcloud-vue', 'Unassigned') },
	},

	emits: ['show-all'],

	data() {
		return {
			CheckboxMarkedOutline,
			allTasks: [],
			loading: false,
		}
	},

	computed: {
		displayedTasks() {
			// Sort by due date (soonest first), then limit
			const sorted = [...this.allTasks].sort((a, b) => {
				const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31')
				const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31')
				return dateA - dateB
			})
			return sorted.slice(0, this.maxDisplay)
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(newId) {
				if (newId && this.registerId && this.schemaId) {
					this.fetchTasks()
				}
			},
		},
	},

	methods: {
		hasAssignee(task) {
			return task.assignee && task.assignee.trim() !== ''
		},

		isCurrentUser(userId) {
			const currentUser = typeof OC !== 'undefined' ? OC?.currentUser : null
			return userId === currentUser
		},

		isOverdue(task) {
			if (!task.dueDate || task.status === 'completed') return false
			try {
				return new Date(task.dueDate) < new Date()
			} catch {
				return false
			}
		},

		async fetchTasks() {
			if (!this.registerId || !this.schemaId || !this.objectId) return
			this.loading = true
			try {
				const url = `${this.apiBase}/objects/${this.registerId}/${this.schemaId}/${this.objectId}/tasks`
				const response = await fetch(url, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.allTasks = data.results || data || []
				}
			} catch (err) {
				console.error('CnTasksCard: Failed to fetch tasks', err)
			} finally {
				this.loading = false
			}
		},

		formatDate(dateStr) {
			if (!dateStr) return ''
			try {
				return new Date(dateStr).toLocaleDateString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
				})
			} catch {
				return dateStr
			}
		},
	},
}
</script>

<style scoped>
.cn-tasks-card__empty {
	text-align: center;
	padding: 16px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-tasks-card__list {
	display: flex;
	flex-direction: column;
}

.cn-tasks-card__task {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-tasks-card__task:last-child {
	border-bottom: none;
}

.cn-tasks-card__status-icon {
	flex-shrink: 0;
	padding-top: 1px;
}

.cn-tasks-card__icon--completed {
	color: var(--color-success);
}

.cn-tasks-card__icon--active {
	color: var(--color-primary-element);
}

.cn-tasks-card__icon--terminated {
	color: var(--color-error);
}

.cn-tasks-card__icon--available {
	color: var(--color-text-maxcontrast);
}

.cn-tasks-card__content {
	flex: 1;
	min-width: 0;
}

.cn-tasks-card__title {
	display: block;
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-tasks-card__meta {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 2px;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-tasks-card__assignee-name {
	color: var(--color-primary-element);
	font-weight: 500;
	cursor: pointer;
}

.cn-tasks-card__assignee-name:hover {
	text-decoration: underline;
}

.cn-tasks-card__assignee-name--self {
	color: var(--color-text-maxcontrast);
	cursor: default;
}

.cn-tasks-card__assignee-name--self:hover {
	text-decoration: none;
}

.cn-tasks-card__unassigned {
	font-style: italic;
	color: var(--color-text-maxcontrast);
}

.cn-tasks-card__due-date {
	white-space: nowrap;
}

.cn-tasks-card__due-date--overdue {
	color: var(--color-error);
	font-weight: 500;
}

.cn-tasks-card__show-all {
	background: none;
	border: none;
	color: var(--color-primary-element);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	padding: 0;
	width: 100%;
	text-align: center;
}

.cn-tasks-card__show-all:hover {
	text-decoration: underline;
}
</style>
