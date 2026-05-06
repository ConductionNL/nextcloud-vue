module.exports = {
	Link: {
		link: {
			color: '#0082c9',
			textDecoration: 'none',
			'&:link': { color: '#0082c9' },
			'&:visited': { color: '#0082c9' },
			'&:hover': { color: '#0082c9', cursor: 'pointer' },
			'&:active': { color: '#0082c9' },
		},
	},
	Table: {
		table: {
			width: '100%',
			borderCollapse: 'collapse',
			marginBottom: 48,
		},
		tableHead: {
			borderBottom: '1px solid var(--color-border)',
		},
		cellHeading: {
			paddingRight: 16,
			paddingBottom: 8,
			textAlign: 'left',
			fontWeight: 'bold',
			fontSize: 13,
			whiteSpace: 'nowrap',
		},
		cell: {
			paddingRight: 16,
			paddingTop: 8,
			paddingBottom: 8,
			verticalAlign: 'top',
			fontSize: 13,
			borderBottom: '1px solid var(--color-border)',
		},
		dataRow: {
			'&:hover': {
				backgroundColor: 'var(--color-background-dark)',
			},
		},
	},
}
