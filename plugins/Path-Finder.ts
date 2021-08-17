import {
  html,
  render,
  useState,
  useLayoutEffect,
  useCallback,
  //@ts-ignore
} from 'https://unpkg.com/htm/preact/standalone.module.js';

import { EMPTY_ADDRESS } from "https://cdn.skypack.dev/@darkforest_eth/constants";
import {
  PlanetLevel,
  LocatablePlanet,
  Planet,
} from "http://cdn.skypack.dev/@darkforest_eth/types";

// 30 seconds
let REFRESH_INTERVAL = 1000 * 30;
// 1 minutes
let AUTO_INTERVAL = 1000 * 60 * 2;

let currentPlanet;

const CENTER_LOCATION_ID = "22e18702c95bef1f3998bf4385760f4ecfbc01ea33295bdc08bebac2689a7c88";



function AutoButton({ loop, onText, offText }) {
  let button = {
    marginLeft: '10px',
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
    <button style=${button} onClick=${toggle}>${isOn ? onText : offText}</button>
  `;
}

function isLocatable(planet: Planet): planet is LocatablePlanet {
  return (planet as LocatablePlanet).location !== undefined;
}

// select nearest planets with specified planet level
function selectNearestPlanets(planetLevel, limitOfNum, energyRatio) {
  const candidates = df.getMyPlanets().filter((p) => p.planetLevel === planetLevel)
    .filter((p) => 1.0 * p.energy / p.energyCap > energyRatio && isLocatable(p))
    .filter((p) => {
      const unconfirmedMoves = df.getUnconfirmedMoves().filter((move) => move.from === p.locationId);
      // skip if unconfirmed from current planet
      return unconfirmedMoves.length === 0;
    })
    .map((p) => [
      p, df.getDist(p.locationId, CENTER_LOCATION_ID)
    ]).sort((a, b) => a[1] - b[1]);
  const numOfPlanets = Math.min(limitOfNum, candidates.length);
  return candidates.slice(0, numOfPlanets).map((candidate) => candidate[0]);
}

function getPendingArrivalNumber(locationId) {
  const unconfirmedMoves = df.getUnconfirmedMoves().filter((move) => move.to === locationId);

  const arrivalMoves = getArrivalsForPlanet(locationId);

  return arrivalMoves.length + unconfirmedMoves.length;
}

// attack the nearest planet of same level from given planet
function attackFromPlanet(fromPlanet) {

  const candidates = df.getPlanetsInRange(fromPlanet.locationId, 100)
  .filter((p) => p.planetLevel === fromPlanet.planetLevel && p.owner === EMPTY_ADDRESS && isLocatable(p))
  .map((p) => [
    p, df.getDist(p.locationId, CENTER_LOCATION_ID)
  ]).sort((a, b) => a[1] - b[1]);

  let i = 0;
  while(i < candidates.length) {
    const toPlanet = candidates[i++][0];

    const movesNumber = getPendingArrivalNumber(toPlanet.locationId);
    // skip if there is a pending move
    if (movesNumber > 0) {
      continue;
    }
    const energyArriving = toPlanet.energyCap * 0.1 + toPlanet.energy * (toPlanet.defense / 100.0);

    const energyNeeded = Math.ceil(
        df.getEnergyNeededForMove(fromPlanet.locationId, toPlanet.locationId, energyArriving)
    );
    if (energyNeeded < fromPlanet.energy) {
      console.log('move from: ', fromPlanet, 'to: ', toPlanet, 'with energy: ', energyNeeded);
      df.move(fromPlanet.locationId, toPlanet.locationId, energyNeeded, 0);
      return toPlanet;
    }
  }
}

function go(selectedPlanetLevels, limitOfNum, energyRatio) {
  console.log('go go go go!!', selectedPlanetLevels);
  for (let planetLevel of selectedPlanetLevels) {
    const sourcePlanets = selectNearestPlanets(planetLevel, limitOfNum, energyRatio);
    console.log(`find ${sourcePlanets.length} source planets with level=${planetLevel} energy ratio=${energyRatio}`);
    for (let sourcePlanet of sourcePlanets) {
      console.log('start to attack from source planet: ', sourcePlanet);
      attackFromPlanet(sourcePlanet);
    }
  }
}

function getArrivalsForPlanet(planetId) {
  return df
  .getAllVoyages()
  .filter((arrival) => arrival.toPlanet === planetId)
  .filter((p) => p.arrivalTime > Date.now() / 1000);
}

function App() {
  let [_, setLoop] = useState(0);

  useLayoutEffect(() => {
    let intervalId = setInterval(() => {
      setLoop(loop => loop + 1)
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    }
  }, []);

  const onAttack = useCallback(() => {
    go([PlanetLevel.ZERO, PlanetLevel.ONE], 2, 0.75);
  }, [PlanetLevel, go]);

  return html`
    <div>
      <${AutoButton} onText="Stop" offText="Start" loop=${onAttack} />
    </div>
  `;
}

class Plugin {
  constructor() {
    this.root = null;
    this.container = null
  }

  async render(container) {
    this.container = container;

    container.style.width = '250px';

    this.root = render(html`<${App} />`, container);
  }

  destroy() {
    render(null, this.container, this.root);
  }
}

export default Plugin;