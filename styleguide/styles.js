module.exports = {
	Button: {
		button: {
			// &&& repeats the class 3× → specificity 0,3,0 which beats the
			// Nextcloud button reset: button:not(.button-vue,[class^=vs__]) = 0,2,1
			'&&&': {
				padding: '8px 0',
				fontSize: 'var(--default-font-size)',
				color: 'var(--color-text-maxcontrast)',
				background: 'transparent',
				textTransform: 'uppercase',
				transition: 'color 750ms ease-out',
				border: 'none',
				borderRadius: 0,
				fontWeight: 'normal',
				width: 'auto',
				minHeight: 'auto',
				cursor: 'pointer',
				margin: 0,
			},
			'&&&:hover': {
				outline: 'none',
				color: 'var(--color-primary)',
				background: 'transparent',
				transition: 'color 150ms ease-in',
			},
			'&&&:focus': {
				outline: 'none',
				color: 'var(--color-primary)',
				background: 'transparent',
				transition: 'color 150ms ease-in',
			},
		},
	},
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
