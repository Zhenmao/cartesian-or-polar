export default function tooltip({ el, content }) {
  let bRect, tRect;

  const tooltip = d3.select(el).append("div").attr("class", "tooltip");

  function show(data) {
    tooltip.html(content(data)).classed("is-visible", true);
    bRect = el.getBoundingClientRect();
    tRect = tooltip.node().getBoundingClientRect();
  }

  function move(event) {
    const [mx, my] = d3.pointer(event, el);

    let x = mx + 16;
    if (x + tRect.width > bRect.width) {
      x = bRect.width - tRect.width - 16;
      if (x < 0) {
        x = 0;
      }
    }

    let y = my - tRect.height / 2;
    if (y < 0) {
      y = 0;
    } else if (y + tRect.height > bRect.height) {
      y = bRect.height - tRect.height;
    }

    tooltip.style("transform", `translate(${x}px,${y}px)`);
  }

  function hide() {
    tooltip.classed("is-visible", false);
  }

  return {
    show,
    move,
    hide,
  };
}
