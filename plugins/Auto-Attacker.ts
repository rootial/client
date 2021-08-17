import {
  html,
  render,
  useState,
  useLayoutEffect,
  useCallback,
  //@ts-ignore
} from "https://unpkg.com/htm/preact/standalone.module.js";

import { EMPTY_ADDRESS } from "https://cdn.skypack.dev/@darkforest_eth/constants";
import {
  PlanetLevel,
  LocatablePlanet,
  Planet,
} from "http://cdn.skypack.dev/@darkforest_eth/types";

// 30 seconds
let REFRESH_INTERVAL = 1000 * 30;
// 1 minutes
let AUTO_INTERVAL = 1000 * 60 * 3;

const CENTER_LOCATION_ID =
  "22e18702c95bef1f3998bf4385760f4ecfbc01ea33295bdc08bebac2689a7c88";

const TEST_LOCATION_ID =
  "0000983a002ea1786bc3b60c23ad0cbb17f6757d466c5c74a58610895ce83221";

const MIN_ENERGY_RATIO = 0.75;

const NUM_OF_NEAREST_PLANET_SELECTED = 4;

function centerPlanet(id) {
  ui.centerLocationId(id);
}

function planetLocationIdShort(locationId) {
  return locationId.substring(4, 9);
}

function AutoButton({ loop, onText, offText }) {
  let button = {
    marginLeft: "10px",
  };

  let [isOn, setIsOn] = useState(false);
  let [timerId, setTimerId] = useState(null);

  function toggle() {
    setIsOn(!isOn);
  }

  useLayoutEffect(() => {
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }

    if (isOn) {
      // Run once before interval
      loop();
      let timerId = setInterval(loop, AUTO_INTERVAL);
      setTimerId(timerId);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isOn]);

  return html`
    <button style=${button} onClick=${toggle}>
      ${isOn ? onText : offText}
    </button>
  `;
}

function AddSelectedPlanet({ onAddPlanet }) {
  let button = {};
  const addPlanet = useCallback(() => {
    const planet = ui.getSelectedPlanet();
    onAddPlanet(planet.locationId);
  }, [onAddPlanet, ui]);

  return html`
    <button style=${button} onClick=${addPlanet}>add selected</button>
  `;
}

function isLocatable(planet: Planet): planet is LocatablePlanet {
  return (planet as LocatablePlanet).location !== undefined;
}

function getArrivalsForPlanet(planetId) {
  return df
    .getAllVoyages()
    .filter((arrival) => arrival.toPlanet === planetId)
    .filter((p) => p.arrivalTime > Date.now() / 1000);
}

function getUnconfirmedMovesFromPlanet(planetId) {
  return df.getUnconfirmedMoves().filter((move) => move.from === planetId);
}

// select nearest planets with specified planet level
function selectNearestPlanets(
  planetLevel,
  limitOfNum,
  energyRatio,
  centerLocationId
) {
  const candidates = df
    .getMyPlanets()
    .filter((p) => p.planetLevel === planetLevel && isLocatable(p))
    .filter((p) => (1.0 * p.energy) / p.energyCap > energyRatio)
    .filter((p) => {
      const unconfirmedMoves = getUnconfirmedMovesFromPlanet(p.planetId);
      // skip if unconfirmed from current planet
      return unconfirmedMoves.length === 0;
    })
    .map((p) => [p, df.getDist(p.locationId, centerLocationId)])
    .sort((a, b) => a[1] - b[1]);
  const numOfPlanets = Math.min(limitOfNum, candidates.length);
  return candidates.slice(0, numOfPlanets).map((candidate) => candidate[0]);
}

function getPendingArrivalNumber(locationId) {
  const unconfirmedMoves = df
    .getUnconfirmedMoves()
    .filter((move) => move.to === locationId);

  const arrivalMoves = getArrivalsForPlanet(locationId);

  return arrivalMoves.length + unconfirmedMoves.length;
}

// attack the nearest planet of same level from given planet
function attackFromPlanet(fromPlanet, centerLocationId, planetLevelLimit) {
  const candidates = df
    .getPlanetsInRange(fromPlanet.locationId, 100)
    .filter(
      (p) =>
        p.planetLevel <= planetLevelLimit &&
        p.owner === EMPTY_ADDRESS &&
        isLocatable(p)
    )
    .map((p) => [p, df.getDist(p.locationId, centerLocationId)])
    .sort((a, b) => {
      const planetLevelOfA = a[0].planetLevel;
      const planetLevelOfB = b[0].planetLevel;
      // sort by planet level descending order firstly
      if (planetLevelOfA != planetLevelOfB)
        return planetLevelOfB - planetLevelOfA;
      // sort by distance to center planet by ascending order then
      return a[1] - b[1];
    });

  let i = 0;
  while (i < candidates.length) {
    const toPlanet = candidates[i++][0];

    const movesNumber = getPendingArrivalNumber(toPlanet.locationId);
    // skip if there is a pending move
    if (movesNumber > 0) {
      continue;
    }
    const energyArriving =
      toPlanet.energyCap * 0.1 + toPlanet.energy * (toPlanet.defense / 100.0);

    const energyNeeded = Math.ceil(
      df.getEnergyNeededForMove(
        fromPlanet.locationId,
        toPlanet.locationId,
        energyArriving
      )
    );

    // energy needed to move half of energy above
    const energyNeededForHalf = Math.ceil(
      df.getEnergyArrivingForMove(
        fromPlanet.locationId,
        toPlanet.locationId,
        energyArriving / 2.0
      )
    );
    if (energyNeeded < fromPlanet.energy) {
      console.log(
        "move from: ",
        fromPlanet,
        "to: ",
        toPlanet,
        "with energy: ",
        energyNeeded
      );
      df.move(fromPlanet.locationId, toPlanet.locationId, energyNeeded, 0);
      return toPlanet;
    } else if (energyNeededForHalf < fromPlanet.energy) {
      console.log(
        "move from: ",
        fromPlanet,
        "to: ",
        toPlanet,
        "with half energy: ",
        energyNeededForHalf
      );
      df.move(
        fromPlanet.locationId,
        toPlanet.locationId,
        energyNeededForHalf,
        0
      );
      return toPlanet;
    }
  }
}

function autoAttack(
  selectedPlanetLevels,
  limitOfNum,
  energyRatio,
  centerLocationId
) {
  const shortCenterLocationId = planetLocationIdShort(centerLocationId);
  console.log(
    "Begin auto attack task with levels=",
    selectedPlanetLevels,
    "limit=",
    limitOfNum,
    "energyRatio=",
    energyRatio,
    "centerLocationId",
    shortCenterLocationId
  );

  for (let planetLevel of selectedPlanetLevels) {
    const sourcePlanets = selectNearestPlanets(
      planetLevel,
      limitOfNum,
      energyRatio,
      centerLocationId
    );
    console.log(
      `Find ${sourcePlanets.length} source planets nearest to ${shortCenterLocationId}` +
        `with level=${planetLevel} energy ratio=${energyRatio}`
    );
    for (let i = 0; i < sourcePlanets.length; i++) {
      const sourcePlanet = sourcePlanets[i];
      // for planets behind in the list, allow them to attack planets of planetLeve + 1
      const planetLevelLimit =
        i < sourcePlanets.length / 2 ? planetLevel : planetLevel + 1;
      console.log(
        "Start to attack from source planet: ",
        sourcePlanet,
        "with planetLevelLimit=",
        planetLevelLimit,
        "for centerLocationId",
        shortCenterLocationId
      );

      attackFromPlanet(sourcePlanet, centerLocationId, planetLevelLimit);
    }
  }
}

function App() {
  let [_, setLoop] = useState(0);
  const [selectedLocationIds, setSelectedLocationIds] = useState([]);

  useLayoutEffect(() => {
    let intervalId = setInterval(() => {
      setLoop((loop) => loop + 1);
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const onAttack = () => {
    console.log("selectedPlanetIds", selectedLocationIds);
    for (let locationId of selectedLocationIds) {
      autoAttack(
        [
          PlanetLevel.ZERO,
          PlanetLevel.ONE,
          PlanetLevel.TWO,
          PlanetLevel.THREE,
          PlanetLevel.FOUR,
        ],
        NUM_OF_NEAREST_PLANET_SELECTED,
        MIN_ENERGY_RATIO,
        locationId
      );
    }
  };

  const locationIdsListStyle = {
    maxHeight: "350px",
    overflowX: "hidden",
    overflowY: "scroll",
  };

  const locationIdsList = selectedLocationIds.map(
    (locationId) => html`${locationId}`
  );

  const addPlanet = (newLocationId) => {
    setSelectedLocationIds([newLocationId, ...selectedLocationIds]);
  };

  console.log("selected", selectedLocationIds);
  return html`
    <div>
      <${AddSelectedPlanet} onAddPlanet=${addPlanet} />
      <${AutoButton} onText="Stop" offText="Start" loop=${onAttack} />
    </div>
    <h1>Selected Planets ${selectedLocationIds.length}</h1>
    <div style=${locationIdsListStyle}>
      ${locationIdsList.length > 0 ? locationIdsList : "No Planet Added"}
    </div>
  `;
}

class Plugin {
  constructor() {
    this.root = null;
    this.container = null;
  }

  async render(container) {
    this.container = container;

    container.style.width = "250px";

    this.root = render(html`<${App} />`, container);
  }

  destroy() {
    render(null, this.container, this.root);
  }
}

export default Plugin;
