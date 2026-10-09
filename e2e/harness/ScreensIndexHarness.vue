<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Layout facts of screens-index-list-parity, screens-card-parity and
  screens-chrome-parity that only a real browser can measure
  (?screensindex=table|cards). The real CnIndexPage renders in the board look
  (`cnLook: board`); `&plain=1` mounts the same page without it. `&w=<px>` sets
  the width of the box the page sits in.
-->
<template>
	<div :class="plain ? '' : 'cn-look-board'" :style="{ width: width + 'px' }" data-testid="screensindex-box">
		<CnIndexPage
			title="Cases"
			:schema="schema"
			:objects="rows"
			:loading="false"
			:showRefresh="false"
			:viewMode="scenario"
			:showTitle="true"
			:pagination="{ total: 42, page: 1, pages: 3, limit: 14 }"
			:headerButtons="[{ action: 'add', label: 'New case', variant: 'primary' }, { action: 'export', label: 'Download', variant: 'secondary' }]" />
	</div>
</template>

<script>
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../src/css/index.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

export default {
	name: 'ScreensIndexHarness',

	components: { CnIndexPage },

	provide() {
		return { cnLook: params.get('plain') === '1' ? 'nextcloud' : 'board' }
	},

	data() {
		const rows = []
		for (let i = 1; i <= 5; i++) {
			rows.push({ id: String(i), title: `Case ${i}`, status: i % 2 ? 'open' : 'closed', owner: 'Anouk Bakker' })
		}
		return {
			scenario: params.get('screensindex') || 'table',
			plain: params.get('plain') === '1',
			width: Number(params.get('w') || 1200),
			rows,
			schema: {
				title: 'Case',
				properties: {
					title: { type: 'string', title: 'Title' },
					status: { type: 'string', title: 'Status', enum: ['open', 'closed'] },
					owner: { type: 'string', title: 'Owner' },
				},
			},
		}
	},
}
</script>
