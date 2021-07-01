// # Artifactory
// The artifactory plugin is your one-stop-shop for things related to artifacts.
// * Find artifacts on your planets
// * See when artifacts unlock
// * Withdraw artifacts once they are unlocked
// * See bonuses of your artifacts
// * Deposit artifacts on your planets
// * Find untaken planets with artifacts and jump to them

import {
    html,
    render,
    useState,
    useLayoutEffect,
    //@ts-ignore
} from 'https://unpkg.com/htm/preact/standalone.module.js';

import {
    BiomeNames,
    energy,
    coords,
    isMine,
    isUnowned,
    unlockTime,
    canWithdraw,
    hasArtifact,
    canHaveArtifact,
    canFindArtifact,
    //@ts-ignore
} from 'https://plugins.zkga.me/utils/utils.js';

// 30 seconds
let REFRESH_INTERVAL = 1000 * 30;
// 10 minutes
let AUTO_INTERVAL = 1000 * 60;


function getBlockNumber() {
    return df.contractsAPI.ethConnection.blockNumber;
}

function notExpired(planet) {
    const blockNumber = getBlockNumber();
    return planet && planet.prospectedBlockNumber && blockNumber - planet.prospectedBlockNumber <= 256;
}

function canProspect(planet) {
    return planet.prospectedBlockNumber === undefined;
}


function myPlanetsWithFindable() {
    return Array.from(df.getMyPlanets())
        .filter(df.isPlanetMineable)
        .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
}


function allPlanetsWithArtifacts() {
    return Array.from(df.getAllPlanets())
        .filter(canHaveArtifact)
        .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
}


function findArtifacts() {
    console.log('start to findArtifacts ');
    Array.from(df.getMyPlanets())
        .filter(canHaveArtifact)
        .filter(canFindArtifact)
        .filter(notExpired)
        .filter((planet) => !planet.unconfirmedFindArtifact)
        .forEach(planet => {
            try {
                console.log('start to findArtifacts', planet);
                df.findArtifact(planet.locationId);
            } catch (err) {
                console.log('find artifacts error', planet);
                console.log(err);
            }
        });
}

function prospectArtifacts() {
    console.log('start to prospectArtifacts ');
    Array.from(df.getMyPlanets())
        .filter(canHaveArtifact)
        .filter(canFindArtifact)
        .filter(canProspect)
        .filter((planet) => !planet.unconfirmedProspectPlanet)
        .forEach(planet => {
            try {
                console.log('start to prospectPlanet', planet);
                df.prospectPlanet(planet.locationId);
            } catch (err) {
                console.log('prospect artifacts error', planet);
                console.log(err);
            }
        });
}


function FindButton({ planet }) {
    let [finding, setFinding] = useState(false);

    let button = {
        marginLeft: '5px',
        opacity: finding ? '0.5' : '1',
    };

    function findArtifact() {
        try {
            // Why does this f'ing throw?
            df.findArtifact(planet.locationId);
        } catch (err) {
            console.log(err);
            setFinding(true);
        }
        setFinding(true);
    }
}



function Unfound({ selected }) {
    if (!selected) {
        return
    }

    let planetList = {
        maxHeight: '100px',
        overflowX: 'hidden',
        overflowY: 'scroll',
    };

    let [lastLocationId, setLastLocationId] = useState(null);

    let planets = myPlanetsWithFindable()
        .filter(planet => !planet.hasTriedFindingArtifact)
        .filter(planet => notExpired(planet));

    let planetsChildren = planets.map(planet => {
        let planetEntry = {
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            color: lastLocationId === planet.locationId ? 'pink' : '',
        };

        let biome = BiomeNames[planet.biome];
        let { x, y } = planet.location.coords;

        function centerPlanet() {
            let planet = df.getPlanetWithCoords({ x, y });
            if (planet) {
                ui.centerPlanet(planet);
                setLastLocationId(planet.locationId);
            }
        }

        let text = `${biome} at ${coords(planet)} - ${energy(planet)}% energy`;
        return html`
      <div key=${planet.locationId} style=${planetEntry}>
        <span onClick=${centerPlanet}>${text}</span>
        <${FindButton} planet=${planet} />
      </div>
    `;
    });

    return html`
    <div style=${planetList}>
      ${planetsChildren.length ? planetsChildren : 'No artifacts to find right now.'}
    </div>
  `;
}

// TODO: Bonuses in this panel?

function Untaken({ selected }) {
    if (!selected) {
        return;
    }

    let planetList = {
        maxHeight: '300px',
        overflowX: 'hidden',
        overflowY: 'scroll',
    };
    const inputGroup = {
        display: 'flex',
        alignItems: 'center',
    };
    const input = {
        flex: '1',
        padding: '5px',
        margin: 'auto 5px',
        outline: 'none',
        color: 'black',
    };

    let { x: homeX, y: homeY } = ui.getHomeCoords()

    let [lastLocationId, setLastLocationId] = useState(null);
    let [centerX, setCenterX] = useState(homeX);
    let [centerY, setCenterY] = useState(homeY);

    const onChangeX = (e) => {
        return setCenterX(e.target.value)
    }

    const onChangeY = (e) => {
        setCenterY(e.target.value)
    }

    const planets = allPlanetsWithArtifacts()
        .filter(isUnowned);

    let planetsArray = planets.map(planet => {
        let x = planet.location.coords.x;
        let y = planet.location.coords.y;
        let distanceFromTargeting = parseInt(Math.sqrt(Math.pow((x - centerX), 2) + Math.pow((y - centerY), 2)));

        return { locationId: planet.locationId, biome: planet.biome, x, y, distanceFromTargeting };
    });

    planetsArray.sort((p1, p2) => (p1.distanceFromTargeting - p2.distanceFromTargeting));

    let planetsChildren = planetsArray.map(planet => {

        let { locationId, x, y, distanceFromTargeting } = planet;
        let biome = BiomeNames[planet.biome];

        let planetEntry = {
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            color: lastLocationId === locationId ? 'pink' : '',
        };

        function centerPlanet() {
            let planet = df.getPlanetWithCoords({ x, y });
            if (planet) {
                ui.centerPlanet(planet);
                setLastLocationId(planet.locationId);
            }
        }

        let text = `${biome} ${distanceFromTargeting} away at (${x}, ${y})`;
        return html`
        <div key=${locationId} style=${planetEntry}>
          <span onClick=${centerPlanet}>${text}</span>
        </div>
      `;
    });

    return html`
    <div style=${inputGroup}>
      <div>X: </div>
      <input
        style=${input}
        value=${centerX}
        onChange=${onChangeX}
        placeholder="center X" />
      <div>Y: </div>
      <input
        style=${input}
        value=${centerY}
        onChange=${onChangeY}
        placeholder="center Y" />
    </div>
    <div style=${planetList}>
      ${planetsChildren.length ? planetsChildren : 'No artifacts to find right now.'}
    </div>
  `;
}

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

function App() {
    let buttonBar = {
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '10px',
    };

    // ['unfound', 'withdraw', 'deposit', 'untaken']
    let [tab, setTab] = useState('unfound');
    let [_, setLoop] = useState(0);

    useLayoutEffect(() => {
        let intervalId = setInterval(() => {
            setLoop(loop => loop + 1)
        }, REFRESH_INTERVAL);

        return () => {
            clearInterval(intervalId);
        }
    }, []);

    return html`
    <div style=${buttonBar}>
      <button onClick=${() => setTab('unfound')}>Unfound</button>
      <button onClick=${() => setTab('untaken')}>Untaken</button>
    </div>
    <div>
      <${Unfound} selected=${tab === 'unfound'} />
      <${Untaken} selected=${tab === 'untaken'} />
    </div>
    <div>
      <span>Auto:</span>
      <${AutoButton} onText="Cancel Prospect" offText="Prospect" loop=${prospectArtifacts} />
      <${AutoButton} onText="Cancel Find" offText="Find" loop=${findArtifacts} />
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