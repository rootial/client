import {
  html,
  render,
  useState,
  useLayoutEffect,
  useCallback,
  //@ts-ignore
} from "https://unpkg.com/htm/preact/standalone.module.js";

import {
  PlanetLevel,
  LocatablePlanet,
  Planet,
} from "http://cdn.skypack.dev/@darkforest_eth/types";

// 30 seconds
let REFRESH_INTERVAL = 1000 * 30;
// 1 minutes
let AUTO_INTERVAL = 1000 * 60 * 4;

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
  }, [isOn, loop]);

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

function isOwned(planet) {
  return planet.owner === df.getAccount();
}

function getArrivalsToPlanet(planetId) {
  return df
    .getAllVoyages()
    .filter((arrival) => arrival.toPlanet === planetId)
    .filter((p) => p.arrivalTime > Date.now() / 1000);
}

function getUnconfirmedMovesToPlanet(planetId) {
  return df.getUnconfirmedMoves().filter((move) => move.to === planetId);
}

function getUnconfirmedMovesFromPlanet(planetId) {
  return df.getUnconfirmedMoves().filter((move) => move.from === planetId);
}

function getPendingArrivalNumber(planetId) {
  const unconfirmedMoves = getUnconfirmedMovesToPlanet(planetId);

  const arrivalMoves = getArrivalsToPlanet(planetId);

  return arrivalMoves.length + unconfirmedMoves.length;
}

function getPendingArrivingEnergy(planetId) {
  const arrivals = getArrivalsToPlanet(planetId);
  const unconfirmedMoves = getUnconfirmedMovesToPlanet(planetId);

  const totalUnconfirmedEnergy = unconfirmedMoves.reduce(
    (totalEnergy, nextMove) => totalEnergy + nextMove.forces,
    0
  );

  const totalArrivingEnergy = arrivals.reduce(
    (totalEnergy, arrival) => totalEnergy + arrival.energyArriving,
    0
  );
  return totalUnconfirmedEnergy + totalArrivingEnergy;
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

// find all planets that can reach to locationId using 100% energy
function getPlanetsCanReachTo(locationId) {
  const targetPlanet = df.getPlanetWithId(locationId);
  // only search 25% area that location planet can reach
  const candidates = df.getPlanetsInRange(locationId, 25);
  return candidates
    .filter(
      (p) =>
        targetPlanet.planetLevel >= PlanetLevel.ONE &&
        p.planetLevel === targetPlanet.planetLevel - 1 &&
        isLocatable(p)
    )
    .filter((p) => {
      // planet can reach location planet with max 100% energy
      const energyArriving = df.getEnergyArrivingForMove(
        p.locationId,
        locationId,
        undefined,
        p.energyCap * 0.75
      );
      return energyArriving / targetPlanet.energy > 0.1;
    })
    .map((p) => [p, df.getDist(p.locationId, locationId)])
    .sort((a, b) => a[1] - b[1])
    .map((v) => v[0]);
}

function attackPlanet(fromId, toId) {
  const toPlanet = df.getPlanetWithId(toId);
  const fromPlanet = df.getPlanetWithId(fromId);

  const unconfirmedMoves = getUnconfirmedMovesFromPlanet(fromId);
  const pendingArrival = getPendingArrivalNumber(toId);
  if (pendingArrival > 4 || unconfirmedMoves.length > 0) {
    return;
  }

  const totalPendingArrivingEnergy = getPendingArrivingEnergy(toId);
  const energyArriving =
    toPlanet.energyCap * 0.02 +
    toPlanet.energy * (toPlanet.defense / 100.0) -
    totalPendingArrivingEnergy;

  if (energyArriving <= 0) return true;

  const energyNeeded = Math.ceil(
    df.getEnergyNeededForMove(fromId, toId, energyArriving)
  );

  if (energyNeeded < fromPlanet.energy) {
    console.log(
      "attack from ",
      fromPlanet,
      " to planet ",
      toPlanet,
      " with enough energy ",
      energyNeeded
    );
    df.move(fromId, toId, energyNeeded, 0);
  } else {
    const energyArrivingRatio =
      df.getEnergyArrivingForMove(fromId, toId, undefined, fromPlanet.energy) /
      fromPlanet.energyCap;
    if (energyArrivingRatio > 0.1) {
      console.log(
        "attack from ",
        fromPlanet,
        " to planet ",
        toPlanet,
        " with part energy  ",
        fromPlanet.energy
      );
      df.move(fromId, toId, fromPlanet.energy, 0);
    }
  }
  return false;
}

function search(targetLocationId) {
  const targetPlanet = df.getPlanetWithId(targetLocationId)
  if(isOwned(targetPlanet)) {
    console.log('target planet is occupied ', targetPlanet);
    return;
  }
  const visited = new Set<string>();
  const queue = [targetLocationId];
  while (queue.length > 0) {
    const toId = queue.shift();
    const toPlanet = df.getPlanetWithId(toId);
    visited.add(toId);
    if (toPlanet === undefined) {
      console.log(toPlanet);
    }
    // occupied then skip
    if (isOwned(toPlanet)) continue;

    console.log(
      "search to occupy planet ",
      toPlanet,
      ` of level ${toPlanet.planetLevel}`
    );
    const candidates = getPlanetsCanReachTo(toId);
    for (let planet of candidates.slice(0, 5)) {
      const fromId = planet.locationId;
      if (visited.has(fromId)) continue;

      // send energy to attack if it's own by myself
      if (isOwned(planet)) {
        console.log("try to attack from ", planet, "to planet", toPlanet);
        const enoughEnergy = attackPlanet(fromId, toId);
        // sent enough energy to planet then break
        if (enoughEnergy) {
          console.log("enough energy sent to planet ", toPlanet);
          if (toId === targetLocationId) {
            console.log('target planet should be destoryed');
            return;
          }
          break;
        }
      } else if (planet.planetLevel != PlanetLevel.ZERO) {
        console.log("in queue planetId", fromId);
        queue.push(fromId);
      }
    }
  }
}

// attack the nearest planet of same level from given planet
function attackFromPlanet(fromPlanet, centerLocationId, planetLevelLimit) {
  const unconfirmedMoves = getUnconfirmedMovesFromPlanet(fromPlanet.locationId);
  console.log('source planet ', fromPlanet, "unconfirmed moves ", unconfirmedMoves.length);
  if (unconfirmedMoves.length > 0) return;

  const candidates = df
    .getPlanetsInRange(fromPlanet.locationId, 100)
    .filter(
      (p) =>
        p.planetLevel <= planetLevelLimit &&
        !isOwned(p) &&
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

  const onAttack = useCallback(() => {
    console.log("selectedPlanetIds", selectedLocationIds);

    autoAttack(
        [
          PlanetLevel.ZERO,
          PlanetLevel.ONE,
          PlanetLevel.TWO,
          PlanetLevel.THREE,
        ],
        NUM_OF_NEAREST_PLANET_SELECTED,
        MIN_ENERGY_RATIO,
        CENTER_LOCATION_ID
    );
    let i = 0;
    while(i < selectedLocationIds.length) {
      const locationId = selectedLocationIds[i++];
      console.log('try to approach and attack planet', locationId);
      search(locationId);

      autoAttack(
        [
          PlanetLevel.ZERO,
        ],
        NUM_OF_NEAREST_PLANET_SELECTED,
        MIN_ENERGY_RATIO,
        locationId
      );
    }
  }, [selectedLocationIds]);

  const locationIdsListStyle = {
    maxHeight: "350px",
    overflowX: "hidden",
    overflowY: "scroll",
  };

  const locationIdsList = selectedLocationIds.map(
    (locationId) => html`${locationId}`
  );

  const addPlanet = (newLocationId) => {
    setSelectedLocationIds([...selectedLocationIds, newLocationId]);
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
    df.contractsAPI.contractCaller.queue.invocationIntervalMs = 50;
    df.contractsAPI.contractCaller.queue.maxConcurrency = 50;
    df.contractsAPI.txExecutor.queue.invocationIntervalMs = 300 ;
    df.contractsAPI.txExecutor.queue.maxConcurrency = 1;
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
