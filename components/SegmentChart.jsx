'use client';
// Client Component: horizontal bar chart of items per UNSPSC segment (Plotly)
import Plot from './Plot';

export default function SegmentChart({ rows }) {
  // Plotly draws the first bar at the bottom, so reverse to show the largest on top
  const r = [...rows].reverse();
  const data = [{
    type: 'bar',
    orientation: 'h',
    x: r.map((x) => x.n),
    y: r.map((x) => `${x.code.slice(0, 2)} · ${x.title.length > 38 ? x.title.slice(0, 36) + '…' : x.title}`),
    marker: { color: '#00843d' },
    hovertext: r.map((x) => x.title),
    hovertemplate: '%{hovertext}<br>%{x} item(s)<extra></extra>'
  }];
  return <Plot data={data} height={Math.max(220, rows.length * 38 + 60)} layout={{ margin: { t: 8, r: 16, b: 36, l: 250 }, xaxis: { title: { text: 'Items' }, dtick: 1 } }} />;
}
