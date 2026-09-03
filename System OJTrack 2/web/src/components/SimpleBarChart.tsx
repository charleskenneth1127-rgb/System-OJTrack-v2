import React from 'react'

export interface BarChartDatum {
  label: string
  value: number
  color: string
  displayValue: string
}

interface SimpleBarChartProps {
  data: BarChartDatum[]
  /** Defaults to the highest value in the data, rounded up. */
  maxValue?: number
}

/**
 * Hand-rolled vertical bar chart — no charting library needed for a handful
 * of bars. Single hue (magnitude) or per-bar status color (e.g. compliance
 * tier), never a rainbow; gridlines stay recessive; every bar is direct
 * labeled since there are only ever a few of them; the native `title`
 * attribute gives an exact-value tooltip on hover.
 */
const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, maxValue }) => {
  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value))
  const gridSteps = [1, 0.75, 0.5, 0.25, 0]

  return (
    <div className="bar-chart">
      <div className="bar-chart-plot">
        <div className="bar-chart-grid">
          {gridSteps.map((step) => (
            <div className="bar-chart-grid-line" key={step}>
              <span>{Math.round(max * step)}</span>
            </div>
          ))}
        </div>
        <div className="bar-chart-bars">
          {data.map((d) => (
            <div className="bar-chart-column" key={d.label} title={`${d.label}: ${d.displayValue}`}>
              <span className="bar-chart-value">{d.displayValue}</span>
              <div className="bar-chart-bar" style={{ height: `${Math.min(100, (d.value / max) * 100)}%`, background: d.color }} />
            </div>
          ))}
        </div>
      </div>
      <div className="bar-chart-labels">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

export default SimpleBarChart
