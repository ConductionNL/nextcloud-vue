<!--
  CnDetailCard — A card container for detail page sections.

  Visually matches the dashboard widget card style (rounded border, header, content).
  Used inside CnDetailPage to organize entity detail information into cards.
-->
<template>
	<div
		class="cn-detail-card"
		:class="{ 'cn-detail-card--collapsed': isCollapsed, 'cn-detail-card--chromeless': chromeless }">
		<!-- Header -->
		<div
			v-if="!chromeless && (title || $slots.icon)"
			class="cn-detail-card__header"
			:class="{ 'cn-detail-card__header--clickable': collapsible }"
			@click="collapsible && toggleCollapse()">
			<div class="cn-detail-card__header-left">
				<button
					v-if="collapsible && chevronStart"
					type="button"
					class="cn-detail-card__collapse-btn cn-detail-card__collapse-btn--start"
					:aria-label="collapseLabel"
					:aria-expanded="isCollapsed ? 'false' : 'true'">
					<ChevronDown
						:size="20"
						:class="{ 'cn-detail-card__chevron--rotated': isCollapsed }" />
				</button>
				<slot name="icon">
					<component
						:is="icon"
						v-if="icon"
						:size="20"
						class="cn-detail-card__icon" />
				</slot>
				<div v-if="subtitle" class="cn-detail-card__heading">
					<h3 class="cn-detail-card__title">
						{{ title }}
					</h3>
					<span class="cn-detail-card__subtitle" data-testid="cn-detail-card-subtitle">{{ subtitle }}</span>
				</div>
				<h3 v-else class="cn-detail-card__title">
					{{ title }}
				</h3>
			</div>
			<div class="cn-detail-card__header-right">
				<CnWidgetHeaderActionButtons v-if="declaredHeaderActions.length > 0" :actions="declaredHeaderActions" />
				<slot name="actions" />
				<button
					v-if="collapsible && !chevronStart"
					type="button"
					class="cn-detail-card__collapse-btn"
					:aria-label="collapseLabel"
					:aria-expanded="isCollapsed ? 'false' : 'true'">
					<ChevronDown
						:size="20"
						:class="{ 'cn-detail-card__chevron--rotated': isCollapsed }" />
				</button>
			</div>
		</div>

		<!-- Content -->
		<div v-show="!isCollapsed" class="cn-detail-card__content" :class="{ 'cn-detail-card__content--flush': flush }">
			<!-- @slot notice The card's state banners, above the body (R1). -->
			<div v-if="$slots.notice || cardNotices.list.length > 0" class="cn-detail-card__notices">
				<slot name="notice">
					<CnCardNotices
						:notices="cardNotices.list"
						:objectData="cardNotices.object"
						:objectId="cardNotices.objectId"
						@noticeAction="(entry, notice) => $emit('notice-action', entry, notice)"
						@noticeDismiss="onNoticeDismiss" />
				</slot>
			</div>
			<slot />
		</div>

		<!-- Footer -->
		<div v-if="$slots.footer" v-show="!isCollapsed" class="cn-detail-card__footer">
			<slot name="footer" />
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import CnCardNotices from '../CnCardNotices/CnCardNotices.vue'
import CnWidgetHeaderActionButtons from '../CnWidgetWrapper/CnWidgetHeaderActionButtons.vue'
import { WIDGET_NOTICES } from '../../utils/cardNotices.js'
import { WIDGET_HEADER_ACTIONS } from '../../utils/widgetHeaderActions.js'

/**
 * CnDetailCard — Card container for detail page sections.
 *
 * Basic usage
 * ```vue
 * <CnDetailCard title="Core Info">
 *   <div class="info-grid">...</div>
 * </CnDetailCard>
 * ```
 *
 * With icon and actions
 * ```vue
 * <CnDetailCard title="Pipeline" :icon="ChartIcon">
 *   <template #actions>
 *     <NcButton>Edit</NcButton>
 *   </template>
 *   <PipelineProgress :stages="stages" />
 * </CnDetailCard>
 * ```
 *
 * Collapsible
 * ```vue
 * <CnDetailCard title="Products" :collapsible="true">
 *   <ProductList :items="products" />
 * </CnDetailCard>
 * ```
 */
export default {
	name: 'CnDetailCard',

	components: {
		ChevronDown,
		CnCardNotices,
		CnWidgetHeaderActionButtons,
	},

	/**
	 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
	 */
	provide() {
		// A card inside this one does not draw the widget's header actions again.
		return { [WIDGET_HEADER_ACTIONS]: null, [WIDGET_NOTICES]: null }
	},

	inject: {
		/**
		 * The widget's manifest `headerActions`, resolved and provided by the
		 * detail host. Null inside another card.
		 */
		cnWidgetHeaderActions: { from: WIDGET_HEADER_ACTIONS, default: null },
		/** The widget's notices, provided by the detail host. Null inside another card. */
		cnWidgetNotices: { from: WIDGET_NOTICES, default: null },
	},

	props: {
		/**
		 * Render the card's content without the card: no border, no background,
		 * no padding, and no header.
		 *
		 * For a surface that already supplies both, such as a tab panel whose
		 * open tab names it. Drawing the card there nests a card inside a card
		 * and shows the title twice.
		 */
		chromeless: {
			type: Boolean,
			default: false,
		},

		/** Card header title */
		title: {
			type: String,
			default: '',
		},

		/** A muted line under the title, as given (translate before passing). */
		subtitle: {
			type: String,
			default: '',
		},

		/** Optional MDI icon component for the header */
		icon: {
			type: [Object, Function],
			default: null,
		},

		/** Whether the card can be collapsed */
		collapsible: {
			type: Boolean,
			default: false,
		},

		/**
		 * Draw the collapse chevron before the title instead of after the
		 * header actions (only relevant when collapsible is true).
		 */
		chevronStart: {
			type: Boolean,
			default: false,
		},

		/** Initial collapsed state (only relevant when collapsible is true) */
		collapsed: {
			type: Boolean,
			default: false,
		},

		/**
		 * Remove content padding — allows tables and lists to go edge-to-edge.
		 */
		flush: {
			type: Boolean,
			default: false,
		},

		/**
		 * The card's state banners, drawn at the top of the body (R1): each a
		 * `notice` content (`{ variant, role?, layout?, title?, text,
		 * actions?, dismissible?, visibleWhen? }`).
		 *
		 * @type {Array<object>}
		 */
		notices: {
			type: Array,
			default: () => [],
		},
	},

	emits: ['update:collapsed', 'notice-action', 'notice-dismiss'],

	data() {
		return {
			isCollapsed: this.collapsed,
		}
	},

	computed: {
		/**
		 * The notices this card draws: its own, then the detail host's.
		 *
		 * @return {{list: Array<object>, object: object|null, objectId: string|number}} The notices and their record.
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		cardNotices() {
			const provided = this.cnWidgetNotices
			const host = provided && typeof provided === 'object' && 'value' in provided ? provided.value : provided
			const own = Array.isArray(this.notices) ? this.notices : []
			const hosted = host && Array.isArray(host.list) ? host.list : []
			return { list: [...own, ...hosted], object: (host && host.object) || null, objectId: (host && host.objectId) || '' }
		},

		/**
		 * The collapse button's name for the state it would change to.
		 *
		 * @return {string} "Expand" or "Collapse", translated.
		 * @spec openspec/changes/detail-card-leading-chevron/specs/detail-card/spec.md#requirement-a-collapsible-card-can-lead-with-its-chevron
		 */
		collapseLabel() {
			return this.isCollapsed ? t('nextcloud-vue', 'Expand') : t('nextcloud-vue', 'Collapse')
		},

		/**
		 * The provided header actions, unwrapped.
		 *
		 * @return {Array<object>} The buttons, or none.
		 * @spec openspec/changes/widget-header-actions/specs/widget-header-actions/spec.md#requirement-the-card-that-titles-a-widget-draws-its-header-actions
		 */
		declaredHeaderActions() {
			const provided = this.cnWidgetHeaderActions
			const list = provided && typeof provided === 'object' && 'value' in provided ? provided.value : provided
			return Array.isArray(list) ? list : []
		},
	},

	watch: {
		collapsed(val) {
			this.isCollapsed = val
		},
	},

	methods: {
		/**
		 * A notice was closed: tell the host and the parent.
		 *
		 * @param {object} notice The closed notice.
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		onNoticeDismiss(notice) {
			const provided = this.cnWidgetNotices
			const host = provided && typeof provided === 'object' && 'value' in provided ? provided.value : provided
			if (host && typeof host.dismiss === 'function') {
				host.dismiss(notice)
			}
			this.$emit('notice-dismiss', notice)
		},

		toggleCollapse() {
			this.isCollapsed = !this.isCollapsed
			this.$emit('update:collapsed', this.isCollapsed)
		},
	},
}
</script>

<style scoped>
/* Chromeless: the surface around it already draws the card and names it. */
.cn-detail-card--chromeless {
	background: none;
	border: none;
	border-radius: 0;
	box-shadow: none;
	padding: 0;
}

.cn-detail-card {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	overflow: hidden;
}

.cn-detail-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid var(--color-border);
	flex-shrink: 0;
}

.cn-detail-card__header--clickable {
	cursor: pointer;
	user-select: none;
}

.cn-detail-card__header--clickable:hover {
	background: var(--color-background-hover);
}

.cn-detail-card--collapsed .cn-detail-card__header {
	border-bottom: none;
}

.cn-detail-card__header-left {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.cn-detail-card__header-right {
	display: flex;
	align-items: center;
	gap: 4px;
	flex-shrink: 0;
}

.cn-detail-card__icon {
	color: var(--color-primary-element);
	flex-shrink: 0;
}

.cn-detail-card__heading {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.cn-detail-card__subtitle {
	font-size: 13px;
	line-height: 1.3;
	color: var(--color-text-maxcontrast);
}

.cn-detail-card__title {
	font-weight: 600;
	font-size: 14px;
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-detail-card__collapse-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	background: none;
	border: none;
	padding: 4px;
	cursor: pointer;
	color: var(--color-text-maxcontrast);
	border-radius: var(--border-radius);
}

.cn-detail-card__collapse-btn--start {
	margin-inline-start: -4px;
}

.cn-detail-card__collapse-btn:hover {
	background: var(--color-background-dark);
}

.cn-detail-card__chevron--rotated {
	transform: rotate(-90deg);
	transition: transform 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
	.cn-detail-card__chevron--rotated {
		transition: none;
	}
}

.cn-detail-card__content {
	padding: 16px;
}

.cn-detail-card__content--flush {
	padding: 0;
}

.cn-detail-card__notices {
	margin-bottom: 12px;
}

.cn-detail-card__content--flush > .cn-detail-card__notices {
	margin: 0 var(--cn-card-notice-inset, 16px) 8px;
}

.cn-detail-card__footer {
	padding: 8px 16px;
	border-top: 1px solid var(--color-border);
}
</style>
