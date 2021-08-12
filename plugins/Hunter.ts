import {
  html,
  render,
  useState,
  useCallback,
  // @ts-ignore
} from "https://unpkg.com/htm/preact/standalone.module.js";
const PLANET_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => ({
  value: level,
  text: level.toString(),
}));

const PLANET_ANY_TYPE = -1;

const PLANET_TYPES = [
  { value: PLANET_ANY_TYPE, text: "Any" },
  { value: 0, text: "Planet" },
  { value: 1, text: "Asteroid Field" },
  { value: 2, text: "Foundry" },
  { value: 3, text: "Spacetime Rip" },
  { value: 4, text: "Quasar" },
];

function CreateSelectFilter({ items, selectedValue, onSelect }) {
  const selectStyle = {
    background: "rgb(8,8,8)",
    width: "140px",
    padding: "3px 5px",
    border: "1px solid white",
    borderRadius: "3px",
  };

  return html`
    <select
      style=${selectStyle}
      value=${selectedValue}
      onChange=${(e) => onSelect(Number(e.target.value))}
    >
      ${items.map(
        ({ value, text }) => html`<option value=${value}>${text}</option>`
      )}
    </select>
  `;
}

function LevelFilter({ levels, selectedLevels, onSelectLevel }) {
  const buttonStyle = {
    border: "1px solid #ffffff",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",

    width: "40px",
    height: "25px",
    padding: "0 0.3em",
    color: "white",
    textAlign: "center",
    transition: "background-color 0.2s, color 0.2s",
    borderRadius: "3px",
  };

  const buttonSelectedStyle = {
    ...buttonStyle,
    color: "white",
    background: "#00ADE1",
    borderRadius: 0,
  };

  const buttonsRow = {
    display: "flex",
    flexDirection: "row",
  };

  const button = ({ value, text, onClick, selected = false }) => html`
    <div
      style=${selected ? buttonSelectedStyle : buttonStyle}
      onClick=${() => onClick(value)}
    >
      ${text}
    </div>
  `;
  const inRange = (value) =>
    value <= Math.max(...selectedLevels) &&
    value >= Math.min(...selectedLevels);
  return html`
    <div style=${buttonsRow}>
      ${levels.map(({ value, text }) =>
        button({
          value,
          text,
          onClick: onSelectLevel,
          selected: inRange(value),
        })
      )}
    </div>
  `;
}

function PercentageFilter({ value, onChange }) {
  return html`
    <input
      style=${{ width: "160px", height: "24px" }}
      type="range"
      min="0"
      max="100"
      step="5"
      value=${value}
      onChange=${onChange}
    />
    <span style=${{ float: "right" }}>${value}%</span>
  `;
}

function CreateButton({ loading, onClick, ctaText, styles = {} }) {
  const buttonStyle = {
    // margin: "10px 0",
    background: "rgb(8,8,8)",
    display: "flex",
    padding: "2px 8px",
    border: "1px solid white",
    borderRadius: "8px",
    textAlign: "center",
  };

  const hoverStyle = {
    color: "#080808",
    background: "#ffffff",
  };

  const [hover, setHover] = useState(false);
  return html` <button
    disabled=${loading}
    style=${{
      ...buttonStyle,
      ...(hover ? hoverStyle : {}),
      ...styles,
    }}
    onClick=${onClick}
    onMouseEnter=${() => setHover(true)}
    onMouseLeave=${() => setHover(false)}
  >
    ${ctaText}
  </button>`;
}

let viewport = ui.getViewport();

function createPlanetFilter({
  planetLevels,
  setPlanetLevels,
  planetType,
  setPlanetType,
  planetEnergyPercentage,
  setPlanetEnergyPercentage,
  onlyArtifacts,
  setOnlyArtifacts,
  title,
}) {
  const container = {
    // display: 'flex',
    // flexDirection: 'column',
    // justifyContent: 'flex-start',
    borderWidth: "1px",
    borderRadius: "4px",
    padding: "16px",
    position: "relative",
  };

  const planetLevelFilter = html`<div style=${{ marginBottom: "3px" }}>
      Planet Level Ranges
    </div>
    <${LevelFilter}
      levels=${PLANET_LEVELS}
      selectedLevels=${planetLevels}
      onSelectLevel=${(level) => {
        if (planetLevels.length == 2) {
          setPlanetLevels([level]);
        } else {
          setPlanetLevels([level, planetLevels[0]]);
        }
      }}
    />`;

  const planetTypeFilter = html`<div>
    <div style=${{ marginBottom: "3px" }}>Planet Type</div>
    <${CreateSelectFilter}
      items=${PLANET_TYPES}
      selectedValue=${planetType}
      onSelect=${setPlanetType}
    />
  </div>`;

  const percentageFilter = html`
    <div style=${{ marginLeft: "40px" }}>
      <div style=${{ marginBottom: "6px" }}>Max energy percent</div>
      <${PercentageFilter}
        value=${planetEnergyPercentage}
        onChange=${(e) => setPlanetEnergyPercentage(e.target.value)}
      />
    </div>
  `;

  const onlyArtifactsCheckBox = html`
    <div style=${{ marginLeft: "40px" }}>
      <div style=${{ marginBottom: "6px" }}>Only Artifact</div>
      <input
        type="checkbox"
        checked=${onlyArtifacts}
        onChange=${() => {
          setOnlyArtifacts(!onlyArtifacts);
          console.log(onlyArtifacts);
        }}
      />
    </div>
  `;

  const flexRow = {
    display: "flex",
    flexDirection: "row",
  };

  const selectRangeButton = html`
    <${CreateButton} ctaText="Set Range" onClick=${() => {}} />
  `;

  const selectSinglePlanetButton = html`
    <div style=${{ marginLeft: "8px" }}>
      <${CreateButton} ctaText="Set Planet" onClick=${() => {}} />
    </div>
  `;
  return html`
    <div style=${container}>
      <div
        style=${{
          // display: 'inline-block',
          position: "absolute",
          top: "-12px",
          left: "50%",
          right: "50%",
          background: "black",
          // textAlign: "center",
          padding: "0 16px",
          fontWeight: "bold",
          width: "fit-content",
          transform: "translate(-50%)",
          // display: 'flex',
        }}
      >
        ${title}
      </div>
      ${planetLevelFilter}
      <div style=${{ marginTop: "8px" }}></div>
      <div style=${{ ...flexRow }}>
        ${planetTypeFilter} ${!!setPlanetEnergyPercentage && percentageFilter}
        ${!!setOnlyArtifacts && onlyArtifactsCheckBox}
      </div>
      <div style=${{ ...flexRow, marginTop: "16px" }}>
        ${selectRangeButton} ${selectSinglePlanetButton}
      </div>
    </div>
  `;
}

function App({}) {
  const [sourcePlanetLevels, setSourcePlanetLevels] = useState([1, 9]);
  const [sourcePlanetType, setSourcePlanetType] = useState(PLANET_ANY_TYPE);
  const [sourcePlanetEnergyPercent, setSourcePlanetEnergyPercent] =
    useState(80);
  const [targetPlanetLevels, setTargetPlanetLevels] = useState([1, 9]);
  const [targetPlanetType, setTargetPlanetType] = useState(PLANET_ANY_TYPE);
  const [onlyArtifacts, setOnlyArtifacts] = useState(true);

  const resetFilters = useCallback(() => {
    setSourcePlanetLevels([1, 9]);
    setSourcePlanetType(PLANET_ANY_TYPE);
    setSourcePlanetEnergyPercent(80);

    setTargetPlanetLevels([1, 9]);
    setTargetPlanetType(PLANET_ANY_TYPE);
    setOnlyArtifacts(true);
  }, [
    setSourcePlanetLevels,
    setSourcePlanetType,
    setSourcePlanetEnergyPercent,
    setSourcePlanetLevels,
    setTargetPlanetType,
    setOnlyArtifacts,
  ]);
  const footer = html`
    <div
      style=${{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        border: "0 solid white",
        borderTopWidth: "1.5px",
        padding: "16px 24px",
      }}
    >
      <${CreateButton} ctaText="Attack!" onClick=${() => {}} />
      <${CreateButton}
        styles=${{
          marginLeft: "4px",
          borderWidth: 0,
          textDecoration: "underline",
        }}
        ctaText="Reset Filters"
        onClick=${resetFilters}
      />
    </div>
  `;

  return html`<div
      style=${{
        margin: "16px 4px 72px",
      }}
    >
      <${createPlanetFilter}
        planetLevels=${sourcePlanetLevels}
        setPlanetLevels=${setSourcePlanetLevels}
        planetType=${sourcePlanetType}
        setPlanetType=${setSourcePlanetType}
        planetEnergyPercentage=${sourcePlanetEnergyPercent}
        setPlanetEnergyPercentage=${setSourcePlanetEnergyPercent}
        title="Source Planet"
      />
      <div
        style=${{
          marginTop: "40px",
        }}
      ></div>
      <${createPlanetFilter}
        planetLevels=${targetPlanetLevels}
        setPlanetLevels=${setTargetPlanetLevels}
        planetType=${targetPlanetType}
        setPlanetType=${setTargetPlanetType}
        onlyArtifacts=${onlyArtifacts}
        setOnlyArtifacts=${setOnlyArtifacts}
        title="Target Planet"
      />
    </div>
    ${footer} `;
}

export default class Plugin {
  constructor() {
    this.beginCoords = null;
    this.endCoords = null;
    this.beginXY = document.createElement("div");
    this.endXY = document.createElement("div");
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

  async render(container) {
    container.style.width = "450px";

    // window.addEventListener("mousemove", this.onMouseMove);
    // window.addEventListener("click", this.onClick);

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
    window.removeEventListener("mousemove", this.onMouseMove);
  }
}
