<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A Nextcloud dashboard widget in a short cell (?l7=nc-widget-limit): the
  activity widget with `limit: 2` in a 240px box (160px for the list; launchpad's cell has 172px), as launchpad's start page
  places it. `&nolimit=1` mounts it without the limit. The spec stubs the
  OCS widget-items endpoint and the `OCA.Dashboard` global.
-->
<template>
	<div data-testid="nc-widget-limit" style="width: 360px; height: 240px; display: flex; flex-direction: column; border: 1px solid #ccc">
		<CnNcWidgetWidget :content="content" />
	</div>
</template>

<script>
import CnNcWidgetWidget from '../../../src/components/CnNcWidgetWidget/CnNcWidgetWidget.vue'

const noLimit = typeof window !== 'undefined' && /[?&]nolimit=1/.test(window.location.search)

export default {
	name: 'NcWidgetLimit',

	components: { CnNcWidgetWidget },

	data() {
		return {
			content: noLimit ? { widgetId: 'activity' } : { widgetId: 'activity', limit: 2, showAllLabel: 'Alle activiteit' },
		}
	},
}
</script>
