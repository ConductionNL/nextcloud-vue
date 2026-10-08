/**
 * RelianceTable — the OpenRegister reliance of every component, filterable by
 * tier and searchable by name, read from the JSON that
 * scripts/openregister-reliance.js generates before every docs build.
 *
 * Usage in MDX:
 *
 *     import RelianceTable from '@site/src/components/RelianceTable'
 *
 *     <RelianceTable />
 */

import Link from '@docusaurus/Link'
import React, { useMemo, useState } from 'react'
import reliance from '../../../docs/components/_generated/reliance.json'

const TIERS = ['none', 'light', 'medium', 'heavy']

const TIER_HELP = {
	none: 'No OpenRegister reference, directly or through imports. Transfer candidates.',
	light: '1 to 3 references in total.',
	medium: '4 to 10 references in total.',
	heavy: '11 or more references in total.',
}

export default function RelianceTable() {
	const [tier, setTier] = useState('none')
	const [query, setQuery] = useState('')

	const rows = useMemo(() => Object.entries(reliance.components)
		.map(([name, entry]) => ({ name, ...entry }))
		.filter((row) => (tier === 'all' || row.tier === tier) && row.name.toLowerCase().includes(query.trim().toLowerCase()))
		.sort((a, b) => (a.direct + a.transitive) - (b.direct + b.transitive) || a.name.localeCompare(b.name)), [tier, query])

	const counts = useMemo(() => Object.values(reliance.components).reduce((acc, entry) => ({ ...acc, [entry.tier]: (acc[entry.tier] || 0) + 1 }), {}), [])

	return (
		<div className="reliance-table">
			<div className="reliance-table__controls" role="group" aria-label="Filter components by OpenRegister reliance">
				{['all', ...TIERS].map((option) => (
					<button
						key={option}
						type="button"
						className={'button button--sm ' + (tier === option ? 'button--primary' : 'button--secondary')}
						aria-pressed={tier === option}
						title={TIER_HELP[option]}
						onClick={() => setTier(option)}
					>
						{option === 'all' ? `All (${Object.keys(reliance.components).length})` : `${option} (${counts[option] || 0})`}
					</button>
				))}
				<input
					type="search"
					aria-label="Search components by name"
					placeholder="Search by name"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</div>
			{tier !== 'all' && <p className="reliance-table__help">{TIER_HELP[tier]}</p>}
			<table>
				<thead>
					<tr>
						<th>Component</th>
						<th>Tier</th>
						<th>Direct</th>
						<th>Through imports</th>
						<th>Via</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.name}>
							<td>{row.page ? <Link to={`/docs/components/${row.page}`}>{row.name}</Link> : row.name}</td>
							<td>{row.tier}</td>
							<td>{row.direct}</td>
							<td>{row.transitive}</td>
							<td>
								{row.via.slice(0, 4).join(', ')}
								{row.via.length > 4 ? ` and ${row.via.length - 4} more` : ''}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{rows.length === 0 && <p>No component matches.</p>}
		</div>
	)
}
