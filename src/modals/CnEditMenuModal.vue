<!--
  CnEditMenuModal — edit the working manifest's left navigation (ADR-041 / ADR-004).

  Mutates the passed `working` manifest copy ONLY (never the base): add, remove,
  reorder, relabel, re-icon, re-route and nest `menu[]` entries. Renders the menu
  as a TREE (CnMenuTreeNode) — each item is a compact row with an edit cog that
  reveals its Label / Icon / Route fields, plus reorder / delete / add-sub-item.
  Isolated NcModal file per ADR-004 modal isolation.
-->
<template>
	<NcModal size="normal" @close="$emit('close')">
		<div class="cn-edit-menu">
			<h2 class="cn-edit-menu__title">
				{{ t('nextcloud-vue', 'Edit menu') }}
			</h2>

			<CnMenuTreeNode :list="menu" :depth="0" :max-depth="1" />

			<div class="cn-edit-menu__footer">
				<NcButton type="secondary" @click="add">
					<template #icon><Plus :size="20" /></template>
					{{ t('nextcloud-vue', 'Add menu item') }}
				</NcButton>
				<NcButton type="primary" @click="$emit('close')">
					{{ t('nextcloud-vue', 'Done') }}
				</NcButton>
			</div>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnMenuTreeNode from '../components/CnMenuTreeNode/CnMenuTreeNode.vue'

export default {
	name: 'CnEditMenuModal',

	components: { NcModal, NcButton, Plus, CnMenuTreeNode },

	props: {
		/**
		 * The working manifest copy whose `menu[]` is edited in place. Never the
		 * base — the editor holds the base separately.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/** The working manifest's menu array (always an array). */
		menu() {
			if (this.working && !Array.isArray(this.working.menu)) this.working.menu = []
			return this.working ? this.working.menu : []
		},
	},

	methods: {
		t,
		/** Append a new blank top-level menu entry (ordered last). */
		add() {
			const maxOrder = this.menu.reduce((m, i) => Math.max(m, typeof i.order === 'number' ? i.order : 0), 0)
			this.menu.push({ id: `menu-${this.menu.length + 1}`, label: '', icon: '', route: '', order: maxOrder + 10 })
		},
	},
}
</script>

<style scoped>
.cn-edit-menu {
	padding: 20px;
}

.cn-edit-menu__title {
	margin-top: 0;
}

.cn-edit-menu__footer {
	display: flex;
	justify-content: space-between;
	margin-top: 16px;
}
</style>
