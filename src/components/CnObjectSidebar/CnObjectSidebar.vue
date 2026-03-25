<!--
  CnObjectSidebar — Right sidebar with standardized tabs for generic object functionality.

  Provides Files, Notes, Tags, Tasks, and Audit Trail tabs that integrate with
  OpenRegister API endpoints (which bridge to Nextcloud-native APIs).
  All tabs are optional and overridable via props and slots.
-->
<template>
	<NcAppSidebar
		:title="sidebarTitle"
		:subtitle="sidebarSubtitle"
		:active.sync="activeTab"
		@update:open="$emit('update:open', $event)"
		@close="$emit('update:open', false)">
		<!-- Files Tab -->
		<NcAppSidebarTab
			v-if="!isTabHidden('files')"
			id="files"
			:name="filesLabel"
			:order="1">
			<template #icon>
				<Paperclip :size="20" />
			</template>
			<slot name="tab-files" :object-id="objectId" :object-type="objectType">
				<CnFilesTab
					:object-id="objectId"
					:register="register"
					:schema="schema"
					:api-base="apiBase" />
			</slot>
		</NcAppSidebarTab>

		<!-- Notes Tab -->
		<NcAppSidebarTab
			v-if="!isTabHidden('notes')"
			id="notes"
			:name="notesLabel"
			:order="2">
			<template #icon>
				<CommentTextOutline :size="20" />
			</template>
			<slot name="tab-notes" :object-id="objectId" :object-type="objectType">
				<CnNotesTab
					:object-id="objectId"
					:register="register"
					:schema="schema"
					:api-base="apiBase" />
			</slot>
		</NcAppSidebarTab>

		<!-- Tags Tab -->
		<NcAppSidebarTab
			v-if="!isTabHidden('tags')"
			id="tags"
			:name="tagsLabel"
			:order="3">
			<template #icon>
				<TagOutline :size="20" />
			</template>
			<slot name="tab-tags" :object-id="objectId" :object-type="objectType">
				<CnTagsTab
					:object-id="objectId"
					:register="register"
					:schema="schema"
					:api-base="apiBase" />
			</slot>
		</NcAppSidebarTab>

		<!-- Tasks Tab -->
		<NcAppSidebarTab
			v-if="!isTabHidden('tasks')"
			id="tasks"
			:name="tasksLabel"
			:order="4">
			<template #icon>
				<CheckboxMarkedOutline :size="20" />
			</template>
			<slot name="tab-tasks" :object-id="objectId" :object-type="objectType">
				<CnTasksTab
					:object-id="objectId"
					:register="register"
					:schema="schema"
					:api-base="apiBase" />
			</slot>
		</NcAppSidebarTab>

		<!-- Audit Trail Tab -->
		<NcAppSidebarTab
			v-if="!isTabHidden('auditTrail')"
			id="auditTrail"
			:name="auditTrailLabel"
			:order="5">
			<template #icon>
				<History :size="20" />
			</template>
			<slot name="tab-audit-trail" :object-id="objectId" :object-type="objectType">
				<CnAuditTrailTab
					:object-id="objectId"
					:register="register"
					:schema="schema"
					:api-base="apiBase" />
			</slot>
		</NcAppSidebarTab>

		<!-- Custom tabs slot -->
		<slot name="extra-tabs" />
	</NcAppSidebar>
</template>

<script>
import { NcAppSidebar, NcAppSidebarTab } from '@nextcloud/vue'

import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import CheckboxMarkedOutline from 'vue-material-design-icons/CheckboxMarkedOutline.vue'
import History from 'vue-material-design-icons/History.vue'

import CnFilesTab from './CnFilesTab.vue'
import CnNotesTab from './CnNotesTab.vue'
import CnTagsTab from './CnTagsTab.vue'
import CnTasksTab from './CnTasksTab.vue'
import CnAuditTrailTab from './CnAuditTrailTab.vue'

/**
 * CnObjectSidebar — Right sidebar for entity detail pages.
 *
 * Provides standardized tabs for generic object functionality (Files, Notes, Tags,
 * Tasks, Audit Trail) that integrate with OpenRegister API endpoints bridging to
 * Nextcloud-native APIs. Each tab is a self-contained component.
 *
 * @example Basic usage
 * <CnObjectSidebar
 *   object-type="pipelinq_lead"
 *   :object-id="leadId"
 *   :register="registerConfig.register"
 *   :schema="registerConfig.schema" />
 *
 * @example Hide specific tabs
 * <CnObjectSidebar
 *   object-type="pipelinq_lead"
 *   :object-id="leadId"
 *   :hidden-tabs="['tasks', 'tags']" />
 *
 * @example Override a tab
 * <CnObjectSidebar object-type="pipelinq_lead" :object-id="leadId">
 *   <template #tab-notes="{ objectId }">
 *     <MyCustomNotesComponent :id="objectId" />
 *   </template>
 * </CnObjectSidebar>
 */
export default {
	name: 'CnObjectSidebar',

	components: {
		NcAppSidebar,
		NcAppSidebarTab,
		Paperclip,
		CommentTextOutline,
		TagOutline,
		CheckboxMarkedOutline,
		History,
		CnFilesTab,
		CnNotesTab,
		CnTagsTab,
		CnTasksTab,
		CnAuditTrailTab,
	},

	props: {
		/** The entity type (e.g., "pipelinq_lead", "procest_case") */
		objectType: {
			type: String,
			required: true,
		},
		/** The object UUID */
		objectId: {
			type: String,
			required: true,
		},
		/** OpenRegister register ID */
		register: {
			type: String,
			default: '',
		},
		/** OpenRegister schema ID */
		schema: {
			type: String,
			default: '',
		},
		/** Array of tab IDs to hide: 'files', 'notes', 'tags', 'tasks', 'auditTrail' */
		hiddenTabs: {
			type: Array,
			default: () => [],
		},
		/** Whether the sidebar is open */
		open: {
			type: Boolean,
			default: true,
		},
		/** Sidebar title (defaults to objectType) */
		title: {
			type: String,
			default: '',
		},
		/** Sidebar subtitle */
		subtitleProp: {
			type: String,
			default: '',
		},
		/** Base API URL for OpenRegister */
		apiBase: {
			type: String,
			default: '/apps/openregister/api',
		},

		// --- Pre-translated labels ---
		filesLabel: { type: String, default: 'Files' },
		notesLabel: { type: String, default: 'Notes' },
		tagsLabel: { type: String, default: 'Tags' },
		tasksLabel: { type: String, default: 'Tasks' },
		auditTrailLabel: { type: String, default: 'Audit Trail' },
	},

	emits: ['update:open'],

	data() {
		return {
			activeTab: 'files',
		}
	},

	computed: {
		sidebarTitle() {
			return this.title || this.objectType || 'Details'
		},
		sidebarSubtitle() {
			return this.subtitleProp || this.objectId || ''
		},
	},

	methods: {
		isTabHidden(tabId) {
			return this.hiddenTabs.includes(tabId)
		},
	},
}
</script>
