import {
  html,
  render,
  useState,
  useCallback,
  // @ts-ignore
} from "https://unpkg.com/htm/preact/standalone.module.js";


let viewport = ui.getViewport();

function App({}) {

}

export default class Plugin {
  constructor() {
    this.beginCoords = null;
    this.endCoords = null;
  }

  onMouseMove = () => {
    let coords = ui.getHoveringOverCoords();
    if (coords) {
      if (this.beginCoords == null) {
        this.beginXY.innerText = `Begin: (${coords.x}, ${coords.y})`;
        return;
      }

      if (this.endCoords == null) {
        this.endXY.innerText = `End: (${coords.x}, ${coords.y})`;
        return;
      }
    }
  };

  onClick = () => {
    let coords = ui.getHoveringOverCoords();
    if (coords) {
      if (this.beginCoords == null) {
        this.beginCoords = coords;
        return;
      }

      if (this.endCoords == null) {
        this.endCoords = coords;
        return;
      }
    }
  };

  render(container) {
    container.parentElement.style.minHeight = 'unset';
    container.style.minHeight = 'unset';

    container.style.width = '400px';

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('click', this.onClick);

    render(html`<${App} />`, container);
  }

  draw(ctx) {
    let begin = this.beginCoords;
    let end = this.endCoords || ui.getHoveringOverCoords();
    if (begin && end) {
      let beginX = Math.min(begin.x, end.x);
      let beginY = Math.max(begin.y, end.y);
      let endX = Math.max(begin.x, end.x);
      let endY = Math.min(begin.y, end.y);
      let width = endX - beginX;
      let height = beginY - endY;

      ctx.save();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        viewport.worldToCanvasX(beginX),
        viewport.worldToCanvasY(beginY),
        viewport.worldToCanvasDist(width),
        viewport.worldToCanvasDist(height)
      );
      ctx.restore();
    }
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMouseMove);
  }
}
