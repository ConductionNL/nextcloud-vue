<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A notice card in a detail page's side column under the board look
  (?l8=side-notice-card): DqSociaalDomein's special-category warning, and an
  info notice, as CnDetailPage's side column hosts them. `&type=banner`
  shows the same content as a banner, for comparison.
-->
<template>
	<div class="cn-look-board" style="width: 340px; padding: 16px" data-testid="side-notice-card">
		<div v-for="widget in widgets"
			:key="widget.id"
			class="cn-detail-page__side-item"
			:class="{ 'cn-detail-page__side-item--notice': widget.type === 'banner' }"
			:data-testid="`side-${widget.id}`"
			style="margin-bottom: 12px">
			<CnDetailWidgetHost :widget="widget" chrome="card" :showCardTitle="true" />
		</div>
	</div>
</template>

<script>
import CnDetailWidgetHost from '../../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../../src/css/index.css'

export default {
	name: 'SideNoticeCard',

	components: { CnDetailWidgetHost },

	provide() {
		return {
			cnLook: 'board',
			cnTranslate: (key) => ({ 'Special category data: health.': 'Bijzondere persoonsgegevens: gezondheid.', 'Every view is logged with its purpose.': 'Elke inzage wordt gelogd met het doel.' })[key] ?? key,
		}
	},

	data() {
		const type = new URLSearchParams(window.location.search).get('type') || 'notice'
		return {
			widgets: [
				{ id: 'special', type, content: { variant: 'warning', title: 'Special category data: health.', text: 'Every view is logged with its purpose.' } },
				{ id: 'info', type, content: { variant: 'info', text: 'Every view is logged with its purpose.' } },
			],
		}
	},
}
</script>
