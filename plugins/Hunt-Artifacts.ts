import {
    move,
    setConcurrency,
} from 'https://gistcdn.githack.com/rootial/ca33e35501b8edc00fa918d40fb15731/raw/f855bcd2a24bd2ea8bfb092d697d20112f94ce92/queued_move.js';

class Plugin {
    constructor() {
        this.maxEnergyPercent = 50;
        this.minPlanetLevel = 3;
    }

    render(container) {
        container.style.width = '200px';

        let stepperLabel = document.createElement('label');
        stepperLabel.innerText = 'Max % energy to spend';
        stepperLabel.style.display = 'block';

        let stepper = document.createElement('input');
        stepper.type = 'range';
        stepper.min = '0';
        stepper.max = '100';
        stepper.step = '5';
        stepper.value = `${this.maxEnergyPercent}`;
        stepper.style.width = '80%';
        stepper.style.height = '24px';

        let levelLabel = document.createElement('label');
        levelLabel.innerText = 'Min. planets to capture';
        levelLabel.style.display = 'block';

        let level = document.createElement('select');
        level.style.background = 'rgb(8,8,8)';
        level.style.width = '100%';
        level.style.marginTop = '10px';
        level.style.marginBottom = '10px';
        [0, 1, 2, 3, 4, 5, 6, 7].forEach(lvl => {
            let opt = document.createElement('option');
            opt.value = `${lvl}`;
            opt.innerText = `Level ${lvl}`;
            level.appendChild(opt);
        });
        level.value = `${this.minPlanetLevel}`;

        level.onchange = (evt) => {
            try {
                this.minPlanetLevel = parseInt(evt.target.value);
            } catch (e) {
                console.error('could not parse planet level', e);
            }
        }

        let percent = document.createElement('span');
        percent.innerText = `${stepper.value}%`;
        percent.style.float = 'right';

        stepper.onchange = (evt) => {
            percent.innerText = `${evt.target.value}%`;
            try {
                this.maxEnergyPercent = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse energy percent', e);
            }
        };

        let message = document.createElement('div');

        let button = document.createElement('button');
        button.style.width = '100%';
        button.style.marginBottom = '10px';
        button.innerHTML = 'Hunt from selected';
        button.onclick = () => {
            let planet = ui.getSelectedPlanet();
            if (planet) {
                message.innerText = 'Please wait...';
                // TODO: Min planet level?
                let moves = captureArtifacts(planet.locationId, this.maxEnergyPercent);
                message.innerText = `Capturing ${moves} planets.`;
            } else {
                message.innerText = 'No planet selected.';
            }
        };

        let globalButton = document.createElement('button');
        globalButton.style.width = '100%';
        globalButton.style.marginBottom = '10px';
        globalButton.innerHTML = 'Globally hunt!';
        globalButton.onclick = () => {
            message.innerText = 'Please wait...';

            let moves = 0;
            for (let planet of df.getMyPlanets()) {
                // TODO: Make asteroid check configurable
                if (!isAsteroid(planet)) {
                    setTimeout(() => {
                        moves += captureArtifacts(planet.locationId, this.maxEnergyPercent);
                        message.innerText = `Capturing ${moves} planets.`;
                    }, 0);
                }
            }
        };

        container.appendChild(stepperLabel);
        container.appendChild(stepper);
        container.appendChild(percent);
        container.appendChild(button);
        container.appendChild(globalButton);
        container.appendChild(message);
    }
}

export default Plugin;

function isAsteroid(planet) {
    return planet.planetResource === 1;
}

function captureArtifacts(fromId, maxDistributeEnergyPercent) {
    const to = df.getPlanetWithId(fromId);
    const from = df.getPlanetWithId(fromId);

    // Rejected if has pending outbound moves
    const unconfirmed = df.getUnconfirmedMoves().filter((move) => move.from === fromId);
    if (unconfirmed.length !== 0) {
        return;
    }

    const candidates_ = df
        .getPlanetsInRange(fromId, maxDistributeEnergyPercent)
        .filter(
            (p) => df.isPlanetMineable(p) && p.owner === '0x0000000000000000000000000000000000000000',
        )
        .map((to) => {
            return [to, distance(from, to)];
        })
        .sort((a, b) => a[1] - b[1]);

    let i = 0;
    const energyBudget = Math.floor((maxDistributeEnergyPercent / 100) * to.energy);

    let energySpent = 0;
    let moves = 0;
    setConcurrency(4);
    while (energyBudget - energySpent > 0 && i < candidates_.length) {
        const energyLeft = energyBudget - energySpent;

        // Remember its a tuple of candidates and their distance
        const candidate = candidates_[i++][0];

        // Rejected if has unconfirmed pending arrivals
        const unconfirmed = df.getUnconfirmedMoves().filter((move) => move.to === candidate.locationId);
        if (unconfirmed.length !== 0) {
            continue;
        }

        // Rejected if has pending arrivals
        const arrivals = getArrivalsForPlanet(candidate.locationId);
        if (arrivals.length !== 0) {
            continue;
        }

        const energyArriving =
            candidate.energyCap * 0.15 + candidate.energy * (candidate.defense / 100);
        // needs to be a whole number for the contract
        const energyNeeded = Math.ceil(
            df.getEnergyNeededForMove(fromId, candidate.locationId, energyArriving),
        );
        if (energyLeft - energyNeeded < 0) {
            continue;
        }

        move(fromId, candidate.locationId, energyNeeded, 0);
        energySpent += energyNeeded;
        moves += 1;
    }

    return moves;
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
        (fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2,
    );
}
