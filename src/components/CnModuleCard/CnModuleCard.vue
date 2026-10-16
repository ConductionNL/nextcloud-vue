<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<article
		class="cn-module-card"
		:aria-labelledby="headingId"
		data-testid="cn-module-card"
		:data-module-id="module.id">
		<div class="cn-module-card__head">
			<span
				v-if="module.icon"
				class="cn-module-card__icon"
				:class="{ 'cn-module-card__icon--off': !module.enabled }"
				aria-hidden="true">
				<CnIcon :name="module.icon" :size="22" />
			</span>
			<h3 :id="headingId" class="cn-module-card__title">
				{{ module.label }}
			</h3>
			<CnStatusBadge
				class="cn-module-card__state"
				:label="module.enabled ? t('nextcloud-vue', 'In the menu') : t('nextcloud-vue', 'Off')"
				:variant="module.enabled ? 'success' : 'default'"
				data-testid="cn-module-card-state" />
		</div>
		<p v-if="module.description" class="cn-module-card__description">
			{{ module.description }}
		</p>
		<template v-if="module.pages.length > 0">
			<span class="cn-module-card__pages-line" data-testid="cn-module-card-pages-line">{{ pagesLine }}</span>
			<ul class="cn-module-card__pages" :aria-label="t('nextcloud-vue', 'Pages')">
				<li v-for="page in module.pages" :key="page.key">
					<a
						class="cn-module-card__page"
						:href="page.url"
						@click="follow(page, $event)">{{ page.label }}</a>
				</li>
			</ul>
		</template>
		<div v-if="module.open || (!module.enabled && module.settings)" class="cn-module-card__footer">
			<a
				v-if="module.open"
				class="cn-module-card__open"
				:href="module.open.url"
				:aria-label="t('nextcloud-vue', 'Open {module}', { module: module.label })"
				data-testid="cn-module-card-open"
				@click="follow(module.open, $event)">
				{{ t('nextcloud-vue', 'Open') }}
				<ChevronRight :size="18" />
			</a>
			<span v-if="!module.enabled && module.settings" class="cn-module-card__settings" data-testid="cn-module-card-settings">
				{{ module.settings.prefix || t('nextcloud-vue', 'Put it in the menu:') }}
				<a
					:href="module.settings.url"
					:target="module.settings.external ? '_blank' : null"
					:rel="module.settings.external ? 'noopener noreferrer' : null"
					@click="follow(module.settings, $event)">{{ module.settings.label || t('nextcloud-vue', 'Admin settings') }}</a>
			</span>
		</div>
	</article>
</template>

<script>
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { followLinkClick } from '../../utils/linkNavigation.js'
import { CnIcon } from '../CnIcon/index.js'

/** A module with more pages than this names its highlights instead of every page. */
const LISTED_PAGES = 4

/**
 * CnModuleCard - one module on a `type: "links"` page (board PqModules): an
 * icon, the title and a state badge (in the menu, or off), a description,
 * the module's pages as a line and as links, an Open button, and for a
 * module that is off a link to where an admin puts it in the menu.
 *
 * Rendered by CnLinkCardsPage for each entry of `config.modules`; the page
 * resolves the links and the text before handing the module over.
 *
 * @spec openspec/changes/screens-links-module-cards/specs/link-cards-page/spec.md#requirement-a-links-page-can-show-modules
 */
export default {
	name: 'CnModuleCard',

	components: { ChevronRight, CnIcon, CnStatusBadge },

	props: {
		/**
		 * The resolved module: `{ id, label, description, icon, enabled,
		 * pages: [{ key, label, url, location, highlight }], open: { url,
		 * location }|null, settings: { url, location, external, label, prefix }|null }`.
		 */
		module: {
			type: Object,
			required: true,
		},

		/** Id of the card's heading, unique on the page. */
		headingId: {
			type: String,
			required: true,
		},
	},

	computed: {
		/**
		 * "4 pages: Overview, Leads, Prospects, Pipeline", or for a larger
		 * module "15 pages, including Campaigns, Blasts and Mailing lists"
		 * from the pages marked `highlight` (else the first three).
		 *
		 * @return {string} The line.
		 */
		pagesLine() {
			const pages = this.module.pages
			if (pages.length <= LISTED_PAGES) {
				return n('nextcloud-vue', '%n page: {pages}', '%n pages: {pages}', pages.length, { pages: pages.map((page) => page.label).join(', ') })
			}
			const marked = pages.filter((page) => page.highlight)
			const named = (marked.length > 0 ? marked : pages).slice(0, 3).map((page) => page.label)
			const last = named.pop()
			const list = named.length > 0 ? t('nextcloud-vue', '{list} and {last}', { list: named.join(', '), last }) : last
			return n('nextcloud-vue', '%n page, including {pages}', '%n pages, including {pages}', pages.length, { pages: list })
		},
	},

	methods: {
		t,

		/**
		 * Route a plain click on an in-app link, so the page does not reload.
		 *
		 * @param {{location: (object|null)}} target The resolved link.
		 * @param {MouseEvent} event The click.
		 */
		follow(target, event) {
			if (target && target.location) {
				followLinkClick(event, target.location, this.$router)
			}
		},
	},
}
</script>

<style scoped>
.cn-module-card {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 20px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-container-large, 12px);
	background: var(--color-main-background);
}

.cn-module-card__head {
	display: flex;
	align-items: center;
	gap: 12px;
}

.cn-module-card__icon {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 42px;
	border-radius: var(--border-radius-large, 10px);
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-primary-element));
}

.cn-module-card__title {
	flex: 1 1 auto;
	margin: 0;
	font-size: 17px;
	font-weight: 700;
}

.cn-module-card__state {
	flex: none;
}

.cn-module-card__description {
	margin: 0;
	font-size: 15px;
	line-height: 1.5;
}

.cn-module-card__pages-line {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-module-card__pages {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 12px;
	margin: 0;
	padding: 0;
	list-style: none;
	font-size: 14px;
}

.cn-module-card__page {
	font-weight: 600;
	color: var(--color-primary-element);
}

.cn-module-card__footer {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 14px;
	margin-top: auto;
	padding-top: 4px;
}

.cn-module-card__open {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	box-sizing: border-box;
	height: 36px;
	padding: 0 14px;
	font-size: 14px;
	font-weight: 600;
	text-decoration: none;
}

.cn-module-card__open {
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-module-card__icon--off {
	background: var(--color-background-dark);
	color: var(--color-main-text);
}

.cn-module-card__settings {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-module-card__open:focus-visible,
.cn-module-card__settings a:focus-visible,
.cn-module-card__page:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}
</style>
