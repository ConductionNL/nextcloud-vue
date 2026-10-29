<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnIndexHeaderMenu: the labelled Actions menu of an index page's header
  buttons (`headerButtons[]` with `action: "actions-menu"`), drawn in the
  header or beside the page tabs. The page resolves the entries; an in-app
  link entry is handed back on click. Internal to CnIndexPage.
-->
<template>
	<NcActions
		:forceMenu="true"
		:forceName="true"
		:menuName="button.label"
		:aria-label="button.label"
		variant="secondary"
		:data-testid="`cn-index-header-button-${button.key}`">
		<template #icon>
			<DotsHorizontal :size="20" />
		</template>
		<!-- The menu's entries (`items` on the button; the page's header
		     actions when it names none): a header action, a built-in by
		     name, or a link (an entry with `href`, the documentation). -->
		<template v-for="entry in entries" :key="entry.key">
			<!-- A group heading and a separator (`{ heading }` and
			     `separator` in items), as the board's "Ga naar" and
			     "Selectie" groups. -->
			<NcActionCaption
				v-if="entry.kind === 'heading'"
				class="cn-index-header-menu__heading"
				:name="entry.label"
				:data-testid="`cn-index-header-menu-${entry.key}`" />
			<NcActionSeparator
				v-else-if="entry.kind === 'separator'"
				:data-testid="`cn-index-header-menu-${entry.key}`" />
			<NcActionLink
				v-else-if="entry.href"
				:href="entry.href"
				:target="entry.linkTarget || '_blank'"
				rel="noopener noreferrer"
				:data-testid="`cn-index-header-menu-${entry.key}`">
				<template v-if="entry.icon" #icon>
					<CnIcon :name="entry.icon" :size="20" />
				</template>
				{{ entry.label }}
			</NcActionLink>
			<NcActionLink
				v-else-if="entry.link"
				:href="entry.link.href"
				:closeAfterClick="true"
				:data-testid="`cn-index-header-menu-${entry.key}`"
				@click="$emit('link-click', entry, $event)">
				<template v-if="entry.icon" #icon>
					<CnIcon :name="entry.icon" :size="20" />
				</template>
				{{ entry.label }}
			</NcActionLink>
			<NcActionButton
				v-else
				:disabled="entry.disabled"
				:title="entry.title || null"
				:closeAfterClick="true"
				:data-testid="`cn-index-header-menu-${entry.key}`"
				@click="entry.run()">
				<!-- A built-in ships its own icon (`iconComponent`), so it
				     never falls back to the "?" when the app has not
				     registered that icon name. -->
				<template v-if="entry.iconComponent || entry.icon" #icon>
					<component :is="entry.iconComponent" v-if="entry.iconComponent" :size="20" />
					<CnIcon v-else :name="entry.icon" :size="20" />
				</template>
				{{ entry.label }}
			</NcActionButton>
		</template>
	</NcActions>
</template>

<script>
import { NcActionButton, NcActionCaption, NcActionLink, NcActions, NcActionSeparator } from '@nextcloud/vue'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import { CnIcon } from '../CnIcon/index.js'

export default {
	name: 'CnIndexHeaderMenu',

	components: { CnIcon, DotsHorizontal, NcActionButton, NcActionCaption, NcActionLink, NcActions, NcActionSeparator },

	props: {
		/** The resolved header button: `{ key, label }`. */
		button: {
			type: Object,
			required: true,
		},

		/** The menu's entries, as CnIndexPage `headerMenuEntries` returns them. */
		entries: {
			type: Array,
			default: () => [],
		},
	},

	/**
	 * @event link-click An in-app link entry was clicked: `(entry, event)`.
	 */
	emits: ['link-click'],
}
</script>
