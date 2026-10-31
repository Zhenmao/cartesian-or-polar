export default function polar({
  el,
  data,
  yDomain,
  yTicks,
  xTicks,
  colorDomain,
  colorRange,
  tooltip,
}) {
  ///////////////////////////////////////////////////////////
  //// Setup ////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  let xFocus = null;
  let focusData = null;
  const width = 640;
  const height = 640;
  const marginTop = 16;
  const marginRight = 28;
  const marginBottom = 16;
  const marginLeft = 4;
  const rMax =
    Math.min(
      width - marginLeft - marginRight,
      height - marginTop - marginBottom,
    ) / 2;
  const rMin = rMax * 0.35;
  const rDot = 4;

  const xScale = d3
    .scaleLinear()
    .domain([1, 53])
    .range([0, Math.PI * 2]);

  const yScale = d3.scaleLinear().domain(yDomain).range([rMin, rMax]);

  const colorScale = d3.scaleOrdinal().domain(colorDomain).range(colorRange);

  const area = d3
    .areaRadial()
    .angle((d) => xScale(d.week))
    .innerRadius(rMin)
    .outerRadius((d) => yScale(d.ppm))
    .curve(d3.curveCatmullRom);

  ///////////////////////////////////////////////////////////
  //// Process data /////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  const byYear = d3.rollup(
    data,
    (v) => v.filter((d) => d.week <= 52),
    (d) => d.year,
  );
  // Add an extra point from the first week of the next year to the end of the current year so the cycle is closed
  d3.pairs(colorDomain).forEach(([currYear, nextYear]) => {
    byYear.get(currYear).push(byYear.get(nextYear)[0]);
  });

  ///////////////////////////////////////////////////////////
  //// Render ///////////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  const container = d3.select(el).classed("chart", true);
  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-marginLeft - rMax, -marginTop - rMax, width, height]);

  //// Areas ////////////////////////////////////////////////
  svg
    .append("g")
    .attr("class", "areas")
    .selectChildren()
    .data(byYear)
    .join("path")
    .sort(([aYear], [bYear]) => d3.descending(aYear, bYear))
    .attr("class", "area")
    .attr("fill", ([year]) => colorScale(year))
    .attr("d", ([, v]) => area(v));

  //// Y axis ///////////////////////////////////////////////
  svg
    .append("g")
    .attr("class", "axis")
    .selectChildren()
    .data(yTicks)
    .join("g")
    .attr("class", "tick")
    .call((g) => g.append("circle").attr("r", (d) => yScale(d)))
    .call((g) =>
      g
        .append("text")
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "central")
        .attr("x", (d) => yScale(d))
        .attr("dx", 4)
        .text((d) => d),
    );

  //// X axis ///////////////////////////////////////////////
  svg
    .append("g")
    .attr("class", "axis")
    .selectChildren()
    .data(xTicks)
    .join("g")
    .attr("class", "tick")
    .attr(
      "transform",
      (d) =>
        `rotate(${(xScale(d.week) * 180) / Math.PI - 90})translate(${rMin - 12},0)`,
    )
    .call((g) =>
      g
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("transform", (d) =>
          xScale(d.week) + Math.PI / 2 < Math.PI ? "rotate(90)" : "rotate(-90)",
        )
        .text((d) => d.label),
    );

  //// Labels ///////////////////////////////////////////////
  svg
    .append("g")
    .attr("class", "labels")
    .selectChildren()
    .data(byYear)
    .join("text")
    .attr("class", "label")
    .attr("text-anchor", "start")
    .attr("dominant-baseline", "central")
    .attr("y", ([year, v], i) => {
      const y1 = i === 0 ? rMin : yScale(byYear.get(year - 1)[0].ppm);
      const y2 = yScale(v[0].ppm);
      return -(y1 + y2) / 2;
    })
    .attr("dx", 4)
    .text(([year]) => year);

  //// Focus ////////////////////////////////////////////////
  const focusG = svg.append("g").attr("class", "focus");

  focusG
    .append("line")
    .attr("class", "focus__line")
    .attr("y1", -rMin)
    .attr("y2", -rMax);

  let focusDot = focusG
    .append("g")
    .attr("class", "focus__dots")
    .selectChildren(".focus__dot");

  function renderFocus() {
    focusG.classed("is-visible", xFocus !== null);
    if (xFocus === null) return;

    focusG.attr("transform", `rotate(${(xScale(xFocus) * 180) / Math.PI})`);

    focusDot = focusDot
      .data(focusData, (d) => d.year)
      .join((enter) =>
        enter
          .append("circle")
          .attr("class", "focus__dot")
          .attr("fill", (d) => d.color)
          .attr("r", rDot),
      )
      .attr("cy", (d) => -yScale(d.data.ppm));
  }

  ///////////////////////////////////////////////////////////
  //// Interactivity ////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  svg.on("mouseenter", moved).on("mousemove", moved).on("mouseleave", left);

  function moved(event) {
    const [mx, my] = d3.pointer(event, svg.node());
    const angle =
      (Math.atan2(my, mx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
    const x = Math.round(xScale.invert(angle)) % 53 || 1;

    if (xFocus !== x) {
      svg.dispatch("xfocuschange", {
        detail: x,
        bubbles: true,
      });

      tooltip.show(focusData);
    }

    tooltip.move(event);
  }

  function left() {
    svg.dispatch("xfocuschange", {
      detail: null,
      bubbles: true,
    });

    tooltip.hide();
  }

  function updateXFocus(_) {
    xFocus = _;
    focusData = [...byYear.entries()]
      .map(([year, v]) => ({
        year,
        data: v[xFocus - 1],
        color: colorScale(year),
      }))
      .filter((d) => !!d.data);
    renderFocus();
  }

  return {
    updateXFocus,
  };
}
