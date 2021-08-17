import {
  html,
  render,
  useCallback,
  useState,
} from "https://unpkg.com/htm/preact/standalone.module.js";

import {
  PlanetLevel,
  PlanetType,
  PlanetTypeNames,
  WorldCoords,
} from "https://cdn.skypack.dev/@darkforest_eth/types";
import { EMPTY_ADDRESS } from "@darkforest_eth/constants";

const PLANET_LEVELS = Object.values(PlanetLevel).map((level) => ({
  value: level,
  text: level.toString(),
}));

const PLANET_ANY_TYPE = -1;

const PLANET_TYPES = [
  { value: PLANET_ANY_TYPE, text: "Any" },
  ...Object.values(PlanetType)
    .filter((type) => type !== PlanetType.Unknown)
    .map((type) => ({
      value: type,
      text: PlanetTypeNames[type],
    })),
];

let beginCoords: WorldCoords = null;
let endCoords: WorldCoords = null;

let planetMoves = new Set();
let planetMovesMap = new Map();

// function planetMovesCount(locationId, move) {
//   planetMovesMap
// }
function clearRangeCoords() {
  beginCoords = null;
  endCoords = null;
}

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
  setPlanetRange,
  planetRange,
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
    <${CreateButton}
      ctaText="Set Range"
      onClick=${() => {
        setPlanetRange({ beginCoords: beginCoords, endCoords: endCoords });
        clearRangeCoords();
        console.log(planetRange);
      }}
    />
  `;

  let selectRange = "";
  if (planetRange.beginCoords && planetRange.endCoords) {
    selectRange = `Begin:(${planetRange.beginCoords.x}, ${planetRange.beginCoords.y}), 
          End:(${planetRange.endCoords.x}, ${planetRange.endCoords.y})`;
  }

  const selectSinglePlanetButton = html`
    <div style=${{ marginLeft: "8px" }}>
      <${CreateButton} ctaText="Set Selected Planet" onClick=${() => {}} />
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
      <div style=${{ marginTop: "8px", height: "16px" }}>${selectRange}</div>
    </div>
  `;
}

function App({}) {
  const [sourcePlanetLevels, setSourcePlanetLevels] = useState([
    PlanetLevel.ZERO,
    PlanetLevel.NINE,
  ]);
  const [sourcePlanetType, setSourcePlanetType] = useState(PLANET_ANY_TYPE);
  const [sourcePlanetEnergyPercent, setSourcePlanetEnergyPercent] =
    useState(80);

  const [sourcePlanetRange, setSourcePlanetRange] = useState({});

  const [targetPlanetLevels, setTargetPlanetLevels] = useState([
    PlanetLevel.ZERO,
    PlanetLevel.NINE,
  ]);
  const [targetPlanetType, setTargetPlanetType] = useState(PLANET_ANY_TYPE);
  const [onlyArtifacts, setOnlyArtifacts] = useState(false);
  const [targetPlanetRange, setTargetPlanetRange] = useState({});

  const onAttack = () => {
    const sourcePlanets = getEligiblePlanets(
      sourcePlanetLevels,
      sourcePlanetType,
      sourcePlanetRange
    );
    console.log('sourcePlanets', sourcePlanets);

    console.log('moves size before', planetMoves.size);
    planetMoves.clear();

    for (let planet of sourcePlanets) {
      capturePlanets(
        planet.locationId,
        sourcePlanetEnergyPercent,
        onlyArtifacts,
        targetPlanetLevels,
        targetPlanetType,
        targetPlanetRange
      );
    }
  };

  const resetFilters = useCallback(() => {
    setSourcePlanetLevels([PlanetLevel.ZERO, PlanetLevel.NINE]);
    setSourcePlanetType(PLANET_ANY_TYPE);
    setSourcePlanetEnergyPercent(80);

    setTargetPlanetLevels([PlanetLevel.ZERO, PlanetLevel.NINE]);
    setTargetPlanetType(PLANET_ANY_TYPE);
    setOnlyArtifacts(false);
    clearRangeCoords();
    setSourcePlanetRange({});
    setTargetPlanetRange({});
  }, [
    setSourcePlanetLevels,
    setSourcePlanetType,
    setSourcePlanetEnergyPercent,
    setSourcePlanetLevels,
    setTargetPlanetType,
    setOnlyArtifacts,
  ]);

  console.log('size', planetMoves.size);
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
      <${CreateButton} ctaText="Attack!" onClick=${onAttack} />
      <${CreateButton}
        styles=${{
          marginLeft: "4px",
          marginRight: "4px",
          borderWidth: 0,
          textDecoration: "underline",
        }}
        ctaText="Reset Filters"
        onClick=${resetFilters}
      />
      <div>
        ${`capture ${planetMoves.size} planets`}
      </div>
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
        setPlanetRange=${setSourcePlanetRange}
        planetRange=${sourcePlanetRange}
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
        targetPlanetRange
        setPlanetRange=${setTargetPlanetRange}
        planetRange=${targetPlanetRange}
        title="Target Planet"
      />
    </div>
    ${footer} `;
}

export default class Plugin {
  constructor() {
    beginCoords = null;
    endCoords = null;
    this.root = null;
    this.container = null

    df.contractsAPI.contractCaller.queue.invocationIntervalMs = 50;
    df.contractsAPI.contractCaller.queue.maxConcurrency = 100;
    df.contractsAPI.txExecutor.queue.invocationIntervalMs = 500 ;
    df.contractsAPI.txExecutor.queue.maxConcurrency = 7;
    this.beginXY = document.createElement("div");

    this.endXY = document.createElement("div");
  }

  onMouseMove = () => {
    let coords = ui.getHoveringOverCoords();
    if (coords) {
      if (beginCoords == null) {
        this.beginXY.innerText = `Begin: (${coords.x}, ${coords.y})`;
        return;
      }

      if (endCoords == null) {
        this.endXY.innerText = `End: (${coords.x}, ${coords.y})`;
        return;
      }
    }
  };

  onClick = () => {
    let coords = ui.getHoveringOverCoords();
    if (coords) {
      if (beginCoords == null) {
        beginCoords = coords;
        return;
      }

      if (endCoords == null) {
        endCoords = coords;
        return;
      }
    }
  };

  async render(container) {
    this.container = container;

    container.style.width = "450px";

    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("click", this.onClick);

    this.root = render(html`<${App} />`, container);
  }

  draw(ctx) {
    let begin = beginCoords;
    let end = endCoords || ui.getHoveringOverCoords();
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
    window.removeEventListener("click", this.onClick);
    render(null, this.container, this.root);
  }
}

class PlanetFilter {
  planet = null;
  constructor(planet) {
    this.planet = planet;
  }

  notClaimed() {
    return this.planet.owner === EMPTY_ADDRESS;
  }

  selectedLevels(selectedPlanetLevels) {
    return (
      this.planet.planetLevel <= Math.max(...selectedPlanetLevels) &&
      this.planet.planetLevel >= Math.min(...selectedPlanetLevels)
    );
  }

  selectedType(selectedPlanetType) {
    return (
      selectedPlanetType === PLANET_ANY_TYPE ||
      selectedPlanetType === this.planet.planetType
    );
  }

  mustHaveArtifact(mustHave) {
    return !mustHave || df.isPlanetMineable(this.planet);
  }

  inSelectedRange(selectedRange) {
    let begin = {
      x: Math.min(selectedRange.beginCoords.x, selectedRange.endCoords.x),
      y: Math.max(selectedRange.beginCoords.y, selectedRange.endCoords.y),
    };
    let end = {
      x: Math.max(selectedRange.beginCoords.x, selectedRange.endCoords.x),
      y: Math.min(selectedRange.beginCoords.y, selectedRange.endCoords.y),
    };
    const planetCoords = this.planet.location.coords;
    return (
      planetCoords.x >= begin.x &&
      planetCoords.x <= end.x &&
      planetCoords.y <= begin.y &&
      planetCoords.y >= end.y
    );
  }
}

function getEligiblePlanets(
  selectedPlanetLevels,
  selectedPlanetType,
  planetRange
) {
  return df.getMyPlanets().filter((planet) => {
    const planetFilter = new PlanetFilter(planet);
    return (
      planetFilter.selectedType(selectedPlanetType) &&
      planetFilter.selectedLevels(selectedPlanetLevels) &&
      planetFilter.inSelectedRange(planetRange)
    );
  }).sort((a, b) => b.energy - a.energy);
}

function capturePlanets(
  fromId,
  maxDistributeEnergyPercent,
  mustHaveArtifact,
  targetPlanetLevels,
  targetPlanetType,
  targetPlanetRange
) {
  const planet = df.getPlanetWithId(fromId);
  const from = df.getPlanetWithId(fromId);

  // Rejected if has pending outbound moves
  const unconfirmed = df
    .getUnconfirmedMoves()
    .filter((move) => move.from === fromId);

  if (unconfirmed.length !== 0) {
    return;
  }

  const candidates_ = df
    .getPlanetsInRange(fromId, maxDistributeEnergyPercent)
    .filter((p) => {
      const planetFilter = new PlanetFilter(p);
      return (
        planetFilter.notClaimed() &&
        planetFilter.selectedLevels(targetPlanetLevels) &&
        planetFilter.inSelectedRange(targetPlanetRange) &&
        planetFilter.selectedType(targetPlanetType) &&
        planetFilter.mustHaveArtifact(mustHaveArtifact)
      );
    })
    .map((to) => {
      return [to, distance(from, to)];
    })
    .sort((a, b) => b[0].planetLevel - a[0].planetLevel);

  let i = 0;
  const energyBudget = Math.floor(
    (maxDistributeEnergyPercent / 100) * planet.energy
  );

  let energySpent = 0;
  while (energyBudget - energySpent > 0 && i < candidates_.length) {
    const energyLeft = energyBudget - energySpent;

    // Remember its a tuple of candidates and their distance
    const candidate = candidates_[i++][0];

    // Rejected if it is processed before and level < 3
    if (planetMoves.has(candidate.locationId) && candidate.planetLevel < PlanetLevel.THREE) {
      continue;
    }

    const unconfirmed = df
      .getUnconfirmedMoves()
      .filter((move) => move.to === candidate.locationId);
    const arrivals = getArrivalsForPlanet(candidate.locationId);

    console.log('unconfirmed moves', unconfirmed.length);
    if (unconfirmed.length + arrivals.length > 4) {
      continue;
    }

    const totalUnconfirmedEnergy = unconfirmed.reduce(
      (totalEnergy, nextMove) => totalEnergy + nextMove.forces,
    0);

    const totalArrivingEnergy = arrivals.reduce((totalEnergy, arrival) => totalEnergy + arrival.energyArriving, 0);

    const energyArriving =
      candidate.energyCap * 0.02 + candidate.energy * (candidate.defense / 100) - totalArrivingEnergy;
    // needs to be a whole number for the contract
    const energyNeeded = Math.ceil(
      df.getEnergyNeededForMove(fromId, candidate.locationId, energyArriving)
    );
    // can't destory the planet using left energy
    if (energyLeft - energyNeeded < 0) {
      // move energy left all to high level planets
      if (candidate.planetLevel >= PlanetLevel.THREE) {
        const energyArrivingRatioMax = df.getEnergyArrivingForMove(fromId, candidate.locationId, undefined, energyLeft) / from.energyCap;
        // energy arriving ratio > 10% of energy cap
        if (energyArrivingRatioMax > 0.1) {
          df.move(fromId, candidate.locationId, energyLeft, 0);
          energySpent += energyLeft;
          planetMoves.add(candidate.locationId);
        }
      }
    } else {
      df.move(fromId, candidate.locationId, energyNeeded, 0);
      energySpent += energyNeeded;
      planetMoves.add(candidate.locationId);
    }
  }
}

function getArrivalsForPlanet(planetId) {
  return df
    .getAllVoyages()
    .filter((arrival) => arrival.toPlanet === planetId)
    .filter((p) => p.arrivalTime > Date.now() / 1000);
}

//returns tuples of [planet,distance]
function distance(from, to) {
  let fromloc = from.location;
  let toloc = to.location;
  return Math.sqrt(
    (fromloc.coords.x - toloc.coords.x) ** 2 +
      (fromloc.coords.y - toloc.coords.y) ** 2
  );
}
