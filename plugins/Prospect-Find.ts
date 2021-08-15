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
    // ['unfound', 'withdraw', 'deposit', 'untaken']
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
    <div>
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