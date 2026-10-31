import cartesian from "./cartesian.js";
import polar from "./polar.js";
import tooltip from "./tooltip.js";

d3.csv("data/co2_weekly.csv", d3.autoType).then((csv) => {
  ///////////////////////////////////////////////////////////
  //// Data processing //////////////////////////////////////
  ///////////////////////////////////////////////////////////
  // https://observablehq.com/@climatecentral/top-years-of-co2
  function weekOfYear(d) {
    const start = Date.UTC(d.year, 0, 0);
    const date = Date.UTC(d.year, d.month - 1, d.day);
    const doy = Math.floor((date - start) / 86400000); // 1..366
    return Math.ceil(doy / 7);
  }

  const data = csv.map((d) => ({
    ...d,
    week: weekOfYear(d),
  }));

  const xTicks = [
    { label: "JAN", week: 1 },
    { label: "APR", week: 14 },
    { label: "JUL", week: 27 },
    { label: "OCT", week: 40 },
  ];

  const tickStep = 5;
  let [yMin, yMax] = d3.extent(data, (d) => d.ppm);
  yMin = Math.floor(yMin / tickStep) * tickStep;
  yMax = Math.ceil(yMax / tickStep) * tickStep;
  const yDomain = [yMin, yMax];
  const yTicks = d3.range(yMin, yMax + 1, tickStep);

  const colorDomain = [...new Set(data.map((d) => d.year))];
  const colorRange = d3
    .range(colorDomain.length)
    .map((i) => `var(--color-${colorDomain.length - i})`);

  ///////////////////////////////////////////////////////////
  //// Initialization ///////////////////////////////////////
  ///////////////////////////////////////////////////////////
  const comparisonEl = document.querySelector("#comparison");
  const t = tooltip({ el: comparisonEl, content: tooltipContent });

  const weekToMonth = (week) => {
    // Approximate: divide year into 12 equal slices of weeks
    const monthIdx = Math.min(11, Math.floor((week - 1) / (52 / 12)));
    return [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ][monthIdx];
  };

  function tooltipContent(data) {
    const week = data[0].data.week;
    const month = weekToMonth(week);
    return /*html*/ `
    <div class="tooltip__header">
      WEEK ${week} · ${month}
    </div>
    <div class="tooltip__body">
      ${data
        .map(
          ({ year, data, color }) => /*html*/ `
        <div class="tooltip__row">
          <div class="row__dot" style="background-color: ${color}"></div>
          <div class="row__label">${year}</div>
          <div class="row__value">${data.ppm.toFixed(2)} ppm</div>
        </div>
      `,
        )
        .join("")}
    </div>
    `;
  }

  const c = cartesian({
    el: document.querySelector("#cartesian"),
    data,
    yDomain,
    yTicks,
    xTicks,
    colorDomain,
    colorRange,
    tooltip: t,
  });

  const p = polar({
    el: document.querySelector("#polar"),
    data,
    yDomain,
    yTicks,
    xTicks,
    colorDomain,
    colorRange,
    tooltip: t,
  });

  d3.select(comparisonEl).on("xfocuschange", (event) => {
    const xFocus = event.detail;
    c.updateXFocus(xFocus);
    p.updateXFocus(xFocus);
  });
});
