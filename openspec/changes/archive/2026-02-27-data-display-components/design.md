# Design: Data Display Components

## Components
- **CnCardGrid**: Mirrors CnDataTable API (same headers, items, pagination props) but renders as a responsive card grid instead of a table
- **CnObjectCard**: Renders an individual object as a card with configurable title, subtitle, and metadata fields
- **CnCellRenderer**: Type-aware value formatting — handles strings, dates, booleans, arrays, objects, URLs, and status values
- **CnKpiGrid**: Dashboard metrics grid displaying key performance indicators with labels, values, and optional trend indicators

## Key Decisions
- CnCardGrid and CnDataTable share the same data interface for easy view switching
- CnCellRenderer is used internally by both CnDataTable and CnCardGrid
