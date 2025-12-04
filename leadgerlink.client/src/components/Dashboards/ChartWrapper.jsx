import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

/*
  ChartWrapper.jsx
  - Renders a Highcharts chart with static demo data depending on `chartType`.
  - Uses flex layout so header + chart area sizing is stable.
  - Ensures pie charts use a bounded "size" so they don't overflow the container.
  - Adds legends:
     - Pie: vertical legend on the right (shows slice names/colors without hover)
     - Other charts: bottom legend (compact) when multiple series present
  - Adjusted chart height calculation so the chart drawing area subtracts wrapper/header padding
    to prevent the plotted chart from growing past the visible container and being clipped.
  - Respects user-provided `options.colors` palette by removing default per-series `color`
    when the user did not explicitly set series color values.
*/
export default function ChartWrapper({ chartType = "chart", height = 260, options: userOptions = null, children }) {
  const minHeight = typeof height === "number" ? `${height}px` : String(height);

  const style = {
    minHeight,
    height: minHeight, // ensure wrapper has explicit height
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(180deg,#ffffff,#f7f7f7)",
    border: "1px solid #e6e6e6",
    borderRadius: 4,
    padding: 12,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.01)",
  };

  const lc = (chartType || "").toLowerCase();

  const buildDefaultOptions = () => {
    if (lc.includes("pie")) {
      return {
        chart: { type: "pie", backgroundColor: "transparent" },
        title: { text: null },
        tooltip: { pointFormat: "{series.name}: <b>{point.percentage:.1f}%</b>" },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: "pointer",
            dataLabels: { enabled: false },
            showInLegend: true
          }
        },
        series: [{ name: "Share", colorByPoint: true, data: [{ name: "Item A", y: 45 }, { name: "Item B", y: 25 }, { name: "Item C", y: 15 }, { name: "Item D", y: 15 }] }],
        legend: {
          enabled: true,
          layout: "vertical",
          align: "right",
          verticalAlign: "middle",
          itemMarginTop: 6,
          itemStyle: { fontSize: "12px" }
        },
        credits: { enabled: false },
      };
    }

    if (lc.includes("line") || lc.includes("sales")) {
      return {
        chart: { type: "line", backgroundColor: "transparent" },
        title: { text: null },
        xAxis: { categories: ["W1", "W2", "W3", "W4", "W5", "W6"], gridLineWidth: 0 },
        yAxis: { title: { text: null } },
        series: [{ name: "Sales", data: [12, 28, 18, 38, 30, 48], color: "#6c757d" }],
        credits: { enabled: false },
        plotOptions: { line: { marker: { enabled: true } } },
        legend: { enabled: false } // disabled by default for single-series lines
      };
    }

    // default to column (bar) for inventory / employee bars
    return {
      chart: { type: "column", backgroundColor: "transparent" },
      title: { text: null },
      xAxis: { categories: ["A", "B", "C", "D", "E"], gridLineWidth: 0 },
      yAxis: { title: { text: null } },
      series: [{ name: "Value", data: [18, 32, 40, 55, 78], color: "#9aa0a6" }],
      credits: { enabled: false },
      plotOptions: { column: { borderRadius: 3 } },
      legend: { enabled: false }
    };
  };

  const defaultOptions = buildDefaultOptions();
  const merged = userOptions ? Highcharts.merge(defaultOptions, userOptions) : defaultOptions;

  // Respect palette passed via userOptions.colors:
  // If user provided a colors palette but did NOT provide explicit per-series colors,
  // remove any default `color` fields left from defaults so Highcharts uses the palette.
  if (userOptions && Array.isArray(userOptions.colors) && userOptions.colors.length > 0 && Array.isArray(merged.series)) {
    const userSeries = Array.isArray(userOptions.series) ? userOptions.series : [];
    merged.series = merged.series.map((s, idx) => {
      const userS = userSeries[idx];
      const userProvidedColor = userS && (userS.color !== undefined && userS.color !== null);
      if (!userProvidedColor && s && s.color !== undefined) {
        const copy = { ...s };
        delete copy.color;
        return copy;
      }
      return s;
    });
  }

  const normalizeHeight = (h) => {
    if (typeof h === "number") return h;
    const str = String(h).trim();
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    if (str.endsWith("px")) {
      const v = parseInt(str.slice(0, -2), 10);
      return Number.isFinite(v) ? v : undefined;
    }
    return undefined;
  };

  const chartHeight = normalizeHeight(height);

  // reserve space for wrapper header + vertical padding/margins so the chart drawing area fits inside container
  const wrapperHeaderReserve = 36; // approx header + margin (px)
  const wrapperPaddingReserve = 24; // top + bottom padding (px) from style
  const minimalChartHeight = 120;

  // Ensure chart object exists
  merged.chart = merged.chart || {};

  // For non-pie charts: set chart.height to (requested height - reserved) so drawing area fits
  if (chartHeight && !lc.includes("pie")) {
    const effective = Math.max(minimalChartHeight, chartHeight - wrapperHeaderReserve - wrapperPaddingReserve);
    merged.chart.height = effective;
  }

  // For pie charts enforce a bounded pie size so it won't overflow.
  if (lc.includes("pie")) {
    merged.plotOptions = merged.plotOptions || {};
    merged.plotOptions.pie = merged.plotOptions.pie || {};
    const defaultPieSize = chartHeight ? Math.max(40, Math.floor((chartHeight - wrapperHeaderReserve - wrapperPaddingReserve) * 0.55)) : "65%";
    if (merged.series && Array.isArray(merged.series) && merged.series.length > 0) {
      if (merged.series[0].size === undefined) {
        merged.series[0].size = defaultPieSize;
      }
      // ensure slices show up in legend
      merged.plotOptions.pie.showInLegend = true;
    } else {
      merged.series = [{ name: "Share", colorByPoint: true, data: [{ name: "A", y: 1 }], size: defaultPieSize }];
    }
    merged.chart = merged.chart || {};
    merged.chart.spacing = merged.chart.spacing ?? [6, 6, 6, 6];

    // If user explicitly disabled legend in options, respect it; otherwise ensure legend visible
    merged.legend = merged.legend ?? {
      enabled: true,
      layout: "vertical",
      align: "right",
      verticalAlign: "middle",
      itemMarginTop: 6,
      itemStyle: { fontSize: "12px" }
    };
  } else {
    // For multi-series charts show a compact bottom legend by default (user can override)
    if (!merged.legend) {
      // enable legend only when there are multiple series
      if (Array.isArray(merged.series) && merged.series.length > 1) {
        merged.legend = { enabled: true, layout: "horizontal", align: "center", verticalAlign: "bottom", itemStyle: { fontSize: "12px" } };
      } else {
        merged.legend = merged.legend ?? { enabled: false };
      }
    }
  }

  // Ensure the Highcharts internal container fills the chart area
  const containerProps = { style: { width: "100%", height: "100%" } };

  return (
    <div className="chart-wrapper" style={style}>
      <div style={{ flex: "0 0 auto" }} className="d-flex justify-content-between align-items-center mb-2">
        <div className="small text-muted">{chartType}</div>
      </div>

      <div style={{ flex: "1 1 auto", minHeight: 0 }}>
        <HighchartsReact highcharts={Highcharts} options={merged} containerProps={containerProps} />
      </div>
    </div>
  );
}