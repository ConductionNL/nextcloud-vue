import { columnsFromSchema, formatValue, filtersFromSchema } from '@/utils/schema.js'

// ---------- Test schema fixtures ----------

const testSchema = {
	title: 'Publication',
	properties: {
		title: {
			type: 'string',
			title: 'Title',
			maxLength: 255,
			facetable: true,
			order: 1,
		},
		summary: {
			type: 'string',
			title: 'Summary',
			facetable: false,
			order: 2,
		},
		description: {
			type: 'string',
			format: 'markdown',
			title: 'Description',
			facetable: false,
			order: 3,
		},
		status: {
			type: 'string',
			title: 'Status',
			enum: ['draft', 'published', 'archived'],
			facetable: true,
			order: 4,
		},
		listed: {
			type: 'boolean',
			title: 'Listed',
			facetable: true,
			order: 5,
		},
		themes: {
			type: 'array',
			items: { type: 'string' },
			title: 'Themes',
			facetable: true,
			order: 6,
		},
		viewCount: {
			type: 'integer',
			title: 'Views',
			facetable: false,
			order: 7,
		},
		contactEmail: {
			type: 'string',
			format: 'email',
			title: 'Contact Email',
			facetable: false,
			order: 8,
		},
		caseType: {
			type: 'string',
			format: 'uuid',
			title: 'Case Type',
			facetable: false,
		},
		createdAt: {
			type: 'string',
			format: 'date-time',
			title: 'Created',
			facetable: false,
		},
		metadata: {
			type: 'object',
			title: 'Metadata',
			facetable: false,
		},
		hidden: {
			type: 'string',
			title: 'Hidden Field',
			visible: false,
		},
	},
	configuration: {
		objectNameField: 'title',
		objectDescriptionField: 'description',
	},
}

// ---------- columnsFromSchema ----------

describe('columnsFromSchema', () => {

	it('generates columns from schema properties', () => {
		const columns = columnsFromSchema(testSchema)
		expect(columns.length).toBeGreaterThan(0)
		expect(columns[0]).toHaveProperty('key')
		expect(columns[0]).toHaveProperty('label')
		expect(columns[0]).toHaveProperty('sortable')
		expect(columns[0]).toHaveProperty('type')
	})

	it('sorts columns by order hint', () => {
		const columns = columnsFromSchema(testSchema)
		const keys = columns.map((c) => c.key)
		// Ordered properties should come first
		expect(keys.indexOf('title')).toBeLessThan(keys.indexOf('summary'))
		expect(keys.indexOf('summary')).toBeLessThan(keys.indexOf('description'))
		expect(keys.indexOf('status')).toBeLessThan(keys.indexOf('viewCount'))
	})

	it('uses property title as column label', () => {
		const columns = columnsFromSchema(testSchema)
		const titleCol = columns.find((c) => c.key === 'title')
		expect(titleCol.label).toBe('Title')
	})

	it('excludes properties with visible: false', () => {
		const columns = columnsFromSchema(testSchema)
		const keys = columns.map((c) => c.key)
		expect(keys).not.toContain('hidden')
	})

	it('excludes object-type properties by default', () => {
		const columns = columnsFromSchema(testSchema)
		const keys = columns.map((c) => c.key)
		expect(keys).not.toContain('metadata')
	})

	it('applies exclude option', () => {
		const columns = columnsFromSchema(testSchema, { exclude: ['description', 'summary'] })
		const keys = columns.map((c) => c.key)
		expect(keys).not.toContain('description')
		expect(keys).not.toContain('summary')
		expect(keys).toContain('title')
	})

	it('applies include option (whitelist)', () => {
		const columns = columnsFromSchema(testSchema, { include: ['title', 'status'] })
		expect(columns).toHaveLength(2)
		expect(columns.map((c) => c.key)).toEqual(['title', 'status'])
	})

	it('applies per-column overrides', () => {
		const columns = columnsFromSchema(testSchema, {
			overrides: { status: { width: '200px', sortable: false } },
		})
		const statusCol = columns.find((c) => c.key === 'status')
		expect(statusCol.width).toBe('200px')
		expect(statusCol.sortable).toBe(false)
	})

	it('sets default width for uuid columns', () => {
		const columns = columnsFromSchema(testSchema)
		const uuidCol = columns.find((c) => c.key === 'caseType')
		expect(uuidCol.width).toBe('140px')
	})

	it('sets default width for boolean columns', () => {
		const columns = columnsFromSchema(testSchema)
		const boolCol = columns.find((c) => c.key === 'listed')
		expect(boolCol.width).toBe('80px')
	})

	it('stores enum values on column', () => {
		const columns = columnsFromSchema(testSchema)
		const statusCol = columns.find((c) => c.key === 'status')
		expect(statusCol.enum).toEqual(['draft', 'published', 'archived'])
	})

	it('returns empty array for null/missing schema', () => {
		expect(columnsFromSchema(null)).toEqual([])
		expect(columnsFromSchema({})).toEqual([])
		expect(columnsFromSchema({ properties: null })).toEqual([])
	})

	it('falls back to key name when title is missing', () => {
		const schema = {
			properties: {
				someField: { type: 'string' },
			},
		}
		const columns = columnsFromSchema(schema)
		expect(columns[0].label).toBe('someField')
	})
})

// ---------- formatValue ----------

describe('formatValue', () => {

	it('returns dash for null/undefined/empty', () => {
		expect(formatValue(null)).toBe('—')
		expect(formatValue(undefined)).toBe('—')
		expect(formatValue('')).toBe('—')
	})

	it('formats boolean true as checkmark', () => {
		expect(formatValue(true, { type: 'boolean' })).toBe('✓')
	})

	it('formats boolean false as dash', () => {
		expect(formatValue(false, { type: 'boolean' })).toBe('—')
	})

	it('formats integers with locale', () => {
		const result = formatValue(1234567, { type: 'integer' })
		// Locale-specific, but should contain the number
		expect(result).toBeTruthy()
		expect(result).not.toBe('—')
	})

	it('formats numbers with locale', () => {
		const result = formatValue(1234.56, { type: 'number' })
		expect(result).toBeTruthy()
	})

	it('returns NaN string for non-numeric numbers', () => {
		expect(formatValue('not-a-number', { type: 'integer' })).toBe('not-a-number')
	})

	it('formats empty arrays as dash', () => {
		expect(formatValue([], { type: 'array' })).toBe('—')
	})

	it('joins short arrays with commas', () => {
		expect(formatValue(['a', 'b', 'c'], { type: 'array' })).toBe('a, b, c')
	})

	it('truncates long arrays with count', () => {
		const result = formatValue(['a', 'b', 'c', 'd', 'e'], { type: 'array' })
		expect(result).toBe('a, b, c +2')
	})

	it('formats date-time strings', () => {
		const result = formatValue('2026-02-19T21:56:43+00:00', { type: 'string', format: 'date-time' })
		expect(result).toBeTruthy()
		expect(result).not.toBe('—')
		expect(result).toContain(',') // date + time separator
	})

	it('formats date strings (no time)', () => {
		const result = formatValue('2026-02-19', { type: 'string', format: 'date' })
		expect(result).toBeTruthy()
		expect(result).not.toBe('—')
	})

	it('returns original string for invalid dates', () => {
		expect(formatValue('not-a-date', { type: 'string', format: 'date-time' })).toBe('not-a-date')
	})

	it('truncates UUID to 8 chars', () => {
		const uuid = '27b56f26-0745-449f-96ef-bde754f66d5c'
		expect(formatValue(uuid, { type: 'string', format: 'uuid' })).toBe('27b56f26...')
	})

	it('does not truncate short UUIDs', () => {
		expect(formatValue('abc', { type: 'string', format: 'uuid' })).toBe('abc')
	})

	it('formats email as-is', () => {
		expect(formatValue('test@example.com', { type: 'string', format: 'email' })).toBe('test@example.com')
	})

	it('strips markdown formatting', () => {
		const md = '# Heading\n**bold** and _italic_\n[link](http://example.com)'
		const result = formatValue(md, { type: 'string', format: 'markdown' })
		expect(result).not.toContain('#')
		expect(result).not.toContain('**')
		expect(result).not.toContain('[link]')
		expect(result).toContain('bold')
		expect(result).toContain('italic')
		expect(result).toContain('link')
	})

	it('truncates long strings', () => {
		const long = 'a'.repeat(200)
		const result = formatValue(long, { type: 'string' })
		expect(result.length).toBeLessThanOrEqual(103) // 100 + '...'
	})

	it('does not truncate short strings', () => {
		expect(formatValue('short', { type: 'string' })).toBe('short')
	})

	it('respects custom truncate option', () => {
		const long = 'a'.repeat(50)
		const result = formatValue(long, { type: 'string' }, { truncate: 20 })
		expect(result.length).toBeLessThanOrEqual(23) // 20 + '...'
	})

	it('formats objects as [Object]', () => {
		expect(formatValue({ a: 1 }, { type: 'object' })).toBe('[Object]')
	})

	it('works without property definition', () => {
		expect(formatValue('hello')).toBe('hello')
		expect(formatValue(42)).toBe('42')
	})

	it('formats URI values', () => {
		const result = formatValue('https://example.com/path/to/resource', { type: 'string', format: 'uri' })
		expect(result).toContain('example.com')
	})
})

// ---------- filtersFromSchema ----------

describe('filtersFromSchema', () => {

	it('returns filters for facetable properties only', () => {
		const filters = filtersFromSchema(testSchema)
		const keys = filters.map((f) => f.key)
		expect(keys).toContain('title')
		expect(keys).toContain('status')
		expect(keys).toContain('listed')
		expect(keys).toContain('themes')
		// Non-facetable
		expect(keys).not.toContain('description')
		expect(keys).not.toContain('viewCount')
	})

	it('maps boolean properties to checkbox type', () => {
		const filters = filtersFromSchema(testSchema)
		const listedFilter = filters.find((f) => f.key === 'listed')
		expect(listedFilter.type).toBe('checkbox')
	})

	it('maps enum properties to select with options', () => {
		const filters = filtersFromSchema(testSchema)
		const statusFilter = filters.find((f) => f.key === 'status')
		expect(statusFilter.type).toBe('select')
		expect(statusFilter.options).toHaveLength(3)
		expect(statusFilter.options[0]).toEqual({ id: 'draft', label: 'draft' })
	})

	it('maps other properties to select (dynamic options)', () => {
		const filters = filtersFromSchema(testSchema)
		const titleFilter = filters.find((f) => f.key === 'title')
		expect(titleFilter.type).toBe('select')
		expect(titleFilter.options).toEqual([])
	})

	it('sorts by order hint', () => {
		const filters = filtersFromSchema(testSchema)
		const keys = filters.map((f) => f.key)
		expect(keys.indexOf('title')).toBeLessThan(keys.indexOf('status'))
	})

	it('returns empty array for null/missing schema', () => {
		expect(filtersFromSchema(null)).toEqual([])
		expect(filtersFromSchema({})).toEqual([])
	})

	it('sets label from property title', () => {
		const filters = filtersFromSchema(testSchema)
		const listed = filters.find((f) => f.key === 'listed')
		expect(listed.label).toBe('Listed')
	})

	it('initializes value as null', () => {
		const filters = filtersFromSchema(testSchema)
		for (const filter of filters) {
			expect(filter.value).toBeNull()
		}
	})
})
