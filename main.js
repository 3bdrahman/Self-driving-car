const carCanvas = document.getElementById("carCanvas");

carCanvas.width = 300;
const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width = 400;
const carContext = carCanvas.getContext("2d");
const networkContext = networkCanvas.getContext("2d");
const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);
const num = 300;
const cars = generateDuplicates(num);

const SPAWN_AHEAD = 1500;
const CULL_BEHIND = 1500;
const SPAWN_TARGET = 50;
const SPAWN_GAP = 200;
const traffic = [];

function spawnTrafficBlock(centerY) {
    const count = 1 + Math.floor(Math.random() * 4);
    for (let k = 0; k < count; k++) {
        const lane = Math.floor(Math.random() * road.numLanes);
        const y = centerY - 600 - Math.random() * 1000;
        const speedTier = Math.random();
        let maxSpeed;
        if (speedTier < 0.25) {
            maxSpeed = 1.0 + Math.random() * 0.8;
        } else if (speedTier < 0.55) {
            maxSpeed = 2.0 + Math.random() * 1.0;
        } else if (speedTier < 0.85) {
            maxSpeed = 3.0 + Math.random() * 1.0;
        } else {
            maxSpeed = 4.0 + Math.random() * 1.5;
        }
        traffic.push(new Car(road.getLaneCenter(lane), y, 30, 50, "dummy", maxSpeed, getRandomColor()));
    }
}

for (let block = 0; block < 15; block++) {
    spawnTrafficBlock(100 - block * 350);
}

let optimalCar = cars[0];
const laneSet = cars.map(() => new Set());
const laneChanges = new Array(cars.length).fill(0);
const sameLaneFrames = new Array(cars.length).fill(0);
const highSpeedFrames = new Array(cars.length).fill(0);
const maxSpeedFrames = new Array(cars.length).fill(0);
const brakeFrames = new Array(cars.length).fill(0);
const steeringFrames = new Array(cars.length).fill(0);
const stopFrames = new Array(cars.length).fill(0);
const backwardsFrames = new Array(cars.length).fill(0);
let prevLane = cars.map(() => -1);

if (sessionStorage.getItem("bestAutopilot") && !localStorage.getItem("bestAutopilot")) {
    sessionStorage.removeItem("bestAutopilot");
}
const savedBrain = localStorage.getItem("bestAutopilot");
if (savedBrain) {
    const parsedBrain = JSON.parse(savedBrain);
    if (parsedBrain && parsedBrain.levels) {
        for (let i = 0; i < cars.length; i++) {
            cars[i].autoPilot = JSON.parse(JSON.stringify(parsedBrain));
            if (i != 0) {
                NeuralNetwork.mutate(cars[i].autoPilot, 0.35);
            }
        }
    }
}

animate();
function generateDuplicates(num) {
    const cars = [];
    for (let i = 0; i <= num; i++) {
        cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, "autopilot", 7.0));
    }
    return cars;
}
function save() {
    localStorage.setItem("bestAutopilot",
        JSON.stringify(optimalCar.autoPilot));
}
function destroy() {
    localStorage.removeItem("bestAutopilot");
    sessionStorage.removeItem("bestAutopilot");
}

function animate(time) {
    const optimalY = optimalCar ? optimalCar.y : cars[0].y;
    for (let i = traffic.length - 1; i >= 0; i--) {
        if (traffic[i].y > optimalY + CULL_BEHIND) {
            traffic.splice(i, 1);
        }
    }
    let frontmostY = Infinity;
    for (let i = 0; i < traffic.length; i++) {
        if (traffic[i].y < frontmostY) frontmostY = traffic[i].y;
    }
    let safety = 10;
    while (traffic.length < SPAWN_TARGET && safety-- > 0) {
        const centerY = (frontmostY === Infinity ? optimalY - 800 : frontmostY - SPAWN_GAP);
        spawnTrafficBlock(centerY);
        frontmostY = centerY;
    }

    for (let i = 0; i < traffic.length; i++) {
        traffic[i].update(road.borders, []);
    }

    for (let i = 0; i < cars.length; i++) {
        cars[i].update(road.borders, traffic);
        if (!cars[i].hit) {
            const laneIdx = Math.round((cars[i].x - road.getLaneCenter(0)) / road.laneWidth);
            const clamped = Math.max(0, Math.min(laneIdx, road.numLanes - 1));
            
            if (!laneSet[i].has(clamped)) {
                laneChanges[i]++;
            }
            laneSet[i].add(clamped);

            if (clamped === prevLane[i]) {
                sameLaneFrames[i]++;
            } else {
                sameLaneFrames[i] = 0;
            }
            prevLane[i] = clamped;

            if (cars[i].speed > 3.0) highSpeedFrames[i]++;
            if (cars[i].speed > cars[i].maxSpeed * 0.95) maxSpeedFrames[i]++;
            if (cars[i].controls.backwards && cars[i].speed > 0) brakeFrames[i]++;
            if (Math.abs(cars[i].speed) < 0.3) stopFrames[i]++;
            if (cars[i].speed < -0.1) backwardsFrames[i]++;
            if (cars[i].controls.left) steeringFrames[i]++;
            if (cars[i].controls.right) steeringFrames[i]++;
        }
    }
    const aliveIndices = cars.map((c, i) => c.hit ? -1 : i).filter(i => i >= 0);
    if (aliveIndices.length > 0) {
        let bestI = aliveIndices[0];
        const fitness = (i) => {
            const distance = -cars[i].y;
            const laneChangeBonus = 50.0 * laneChanges[i];
            const speedBonus = 2.0 * highSpeedFrames[i] + 4.0 * maxSpeedFrames[i];
            const brakePenalty = 12.0 * brakeFrames[i];
            const sameLanePenalty = 0.15 * sameLaneFrames[i];
            const stopPenalty = 30.0 * stopFrames[i];
            const backwardsPenalty = 50.0 * backwardsFrames[i];
            const steeringReward = 0.5 * steeringFrames[i];
            return distance + laneChangeBonus + speedBonus - brakePenalty - sameLanePenalty - stopPenalty - backwardsPenalty + steeringReward;
        };
        let bestScore = fitness(bestI);
        for (const i of aliveIndices) {
            const score = fitness(i);
            if (score > bestScore) { bestScore = score; bestI = i; }
        }
        optimalCar = cars[bestI];
    }
    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;
    carContext.save();
    carContext.translate(0, -optimalCar.y + carCanvas.height * 0.7);
    road.draw(carContext);
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].draw(carContext, "blue");
    }
    carContext.globalAlpha = 0.2;
    for (let i = 0; i < cars.length; i++) {
        cars[i].draw(carContext, "purple");
    }
    carContext.globalAlpha = 1;
    optimalCar.draw(carContext, "purple", true);

    carContext.restore();
    networkContext.lineDashOffset = -time / 50;
    NetworkVisualizer.drawNetwork(networkContext, optimalCar.autoPilot);

    requestAnimationFrame(animate);
}