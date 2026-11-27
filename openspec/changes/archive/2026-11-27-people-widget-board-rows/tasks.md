# Tasks: people-widget-board-rows

- [x] 1. `CnPeopleWidget`: `showSearch` (from `content.showSearch`, default true) gates the header; the list layout's items carry `cn-board-ruled-rows`.
- [x] 2. `look-board.css`: no own padding in a widget card; ruled list rows, name and line sizes.
- [x] 3. Unit tests `tests/components/CnPeopleWidgetBoardRows.spec.js` and `tests/css/lookBoardPeopleRows.spec.js`.
- [x] 4. Measured with compdiff `--inject-css` on launchpad LpVandaag (demo seed): "Vind een collega op expertise" 5 -> 3 flags, "Verjaardagen" row inset 27 -> 19 (drawn 19), rows ruled as drawn.
