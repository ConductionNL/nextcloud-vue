# Design: screens-chart-canvas-fits

- `.cn-chart-widget__canvas { overflow: hidden }`: the root already says a chart is never a scroll region.
- `.apexcharts-canvas svg { display: block }`: no line box under the chart, so the box is as tall as the chart.
