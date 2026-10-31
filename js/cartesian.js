export default function cartesian({
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
  const marginTop = 24;
  const marginRight = 32;
  const marginBottom = 24;
  const marginLeft = 16;
  const rDot = 4;

  const xScale = d3
    .scaleLinear()
    .domain([1, 52])
    .range([marginLeft, width - marginRight]);

  const yScale = d3
    .scaleLinear()
    .domain(yDomain)
    .range([height - marginBottom, marginTop]);

  const colorScale = d3.scaleOrdinal().domain(colorDomain).range(colorRange);

  const area = d3
    .area()
    .x((d) => xScale(d.week))
    .y0(yScale.range()[0])
    .y1((d) => yScale(d.ppm))
    .curve(d3.curveCatmullRom);

  ///////////////////////////////////////////////////////////
  //// Process data /////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  const byYear = d3.rollup(
    data,
    (v) => v.filter((d) => d.week <= 52),
    (d) => d.year,
  );

  ///////////////////////////////////////////////////////////
  //// Render ///////////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  const container = d3.select(el).classed("chart", true);
  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

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
    .attr("transform", `translate(${width - marginRight},0)`)
    .selectChildren()
    .data(yTicks)
    .join("g")
    .attr("class", "tick")
    .attr("transform", (d) => `translate(0,${yScale(d)})`)
    .call((g) => g.append("line").attr("x2", -width + marginLeft + marginRight))
    .call((g) =>
      g
        .append("text")
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "central")
        .attr("dx", 4)
        .text((d) => d),
    );

  //// X axis ///////////////////////////////////////////////
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .selectChildren()
    .data(xTicks)
    .join("g")
    .attr("class", "tick")
    .attr("transform", (d) => `translate(${xScale(d.week)},0)`)
    .call((g) =>
      g
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "hanging")
        .attr("dy", 4)
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
    .attr("x", marginLeft)
    .attr("y", ([year, v], i) => {
      const y1 =
        i === 0 ? height - marginBottom : yScale(byYear.get(year - 1)[0].ppm);
      const y2 = yScale(v[0].ppm);
      return (y1 + y2) / 2;
    })
    .attr("dx", 4)
    .text(([year]) => year);

  //// Focus ////////////////////////////////////////////////
  const focusG = svg.append("g").attr("class", "focus");

  focusG
    .append("line")
    .attr("class", "focus__line")
    .attr("y1", height - marginBottom)
    .attr("y2", marginTop);

  let focusDot = focusG
    .append("g")
    .attr("class", "focus__dots")
    .selectChildren(".focus__dot");

  function renderFocus() {
    focusG.classed("is-visible", xFocus !== null);
    if (xFocus === null) return;

    focusG.attr("transform", `translate(${xScale(xFocus)},0)`);

    focusDot = focusDot
      .data(focusData, (d) => d.year)
      .join((enter) =>
        enter
          .append("circle")
          .attr("class", "focus__dot")
          .attr("fill", (d) => d.color)
          .attr("r", rDot),
      )
      .attr("cy", (d) => yScale(d.data.ppm));
  }

  ///////////////////////////////////////////////////////////
  //// Interactivity ////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  svg.on("mouseenter", moved).on("mousemove", moved).on("mouseleave", left);

  function moved(event) {
    const [mx] = d3.pointer(event, svg.node());
    const x = Math.min(52, Math.max(1, Math.round(xScale.invert(mx))));

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
