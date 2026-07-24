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
const FITNESS_LANE_QUADRATIC = 6.0;        // (laneOffset^2) — one term, replaces two bonuses
const FITNESS_LANE_CHANGE_BONUS_MAX = 200; // cap so stationary weavers can't farm it
const SURVIVAL_CREDIT = 0.5;               // per frame alive — base signal
const DISTANCE_WEIGHT = 1.0;               // forward progress
const FRESH_RANDOM_FRACTION = 0.05;        // genetic diversity injection

// Generation advances when:
//   (a) the population has effectively collapsed — fewer than COLLAPSE_FRACTION
//       of the original cars survive long enough to still drive, OR
//   (b) the elite has made no further y-progress for PROGRESS_STALL_MS straight
//       — the brain clearly can't improve in its current form.
// No wall-clock floor: the first generation runs to a real conclusion.
const COLLAPSE_FRACTION = 0.05;
const PROGRESS_STALL_MS = 30000;
const BEST_DIST_KEY = "bestDistanceEver";

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
let generation = 1;
let genStartTime = performance.now();
let bestDistanceThisGen = 0;
let bestDistanceThisGenAt = genStartTime;
let bestReachedThisGen = 0;

const laneSet = cars.map(() => new Set());
const laneChanges = new Array(cars.length).fill(0);
const sameLaneFrames = new Array(cars.length).fill(0);
const highSpeedFrames = new Array(cars.length).fill(0);
const maxSpeedFrames = new Array(cars.length).fill(0);
const brakeFrames = new Array(cars.length).fill(0);
const stopFrames = new Array(cars.length).fill(0);
const backwardsFrames = new Array(cars.length).fill(0);
const anglePenaltyFrames = new Array(cars.length).fill(0);
const laneCenterPenaltyFrames = new Array(cars.length).fill(0);
const onDividerFrames = new Array(cars.length).fill(0);
let prevLane = cars.map(() => -1);
const survivalFrames = new Array(cars.length).fill(0);

let bestDistanceEver = parseInt(localStorage.getItem(BEST_DIST_KEY), 10);
if (!Number.isFinite(bestDistanceEver)) bestDistanceEver = 0;

if (sessionStorage.getItem("bestAutopilot") && !localStorage.getItem("bestAutopilot")) {
    sessionStorage.removeItem("bestAutopilot");
}
const savedBrain = localStorage.getItem("bestAutopilot");
if (savedBrain) {
    const parsedBrain = JSON.parse(savedBrain);
    if (parsedBrain && parsedBrain.levels) {
        seedFromBrain(parsedBrain);
    }
}

animate();

function generateDuplicates(num) {
    const cars = [];
    for (let i = 0; i < num; i++) {
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
    localStorage.removeItem(BEST_DIST_KEY);
    bestDistanceEver = 0;
}

function resetTrackingArrays() {
    laneSet.forEach(s => s.clear());
    laneChanges.fill(0);
    sameLaneFrames.fill(0);
    highSpeedFrames.fill(0);
    maxSpeedFrames.fill(0);
    brakeFrames.fill(0);
    stopFrames.fill(0);
    backwardsFrames.fill(0);
    anglePenaltyFrames.fill(0);
    laneCenterPenaltyFrames.fill(0);
    onDividerFrames.fill(0);
    prevLane.fill(-1);
    survivalFrames.fill(0);
}

function resetCarPositions() {
    for (let i = 0; i < cars.length; i++) {
        cars[i].x = road.getLaneCenter(1);
        cars[i].y = 100;
        cars[i].angle = 0;
        cars[i].speed = 0;
        cars[i].hit = false;
    }
}

function seedFromBrain(brain) {
    const elite = JSON.parse(JSON.stringify(brain));
    const freshCount = Math.floor(cars.length * FRESH_RANDOM_FRACTION);
    for (let i = 0; i < cars.length; i++) {
        cars[i].autoPilot = JSON.parse(JSON.stringify(elite));
        if (i === 0) continue;
        if (i < freshCount) {
            // genetic supply: fully random new brain, same topology
            cars[i].autoPilot = new NeuralNetwork(
                [cars[i].sensor.inputSize, 6, 4]
            );
        } else {
            // mutate around the elite with a small per-car rate so the field
            // is not collapsed to one point
            const rate = 0.05 + (i / cars.length) * 0.2;
            NeuralNetwork.mutate(cars[i].autoPilot, rate);
        }
    }
}

function naturalize(elite) {
    generation++;
    resetTrackingArrays();
    resetCarPositions();
    const now = performance.now();
    genStartTime = now;
    bestDistanceThisGen = 0;
    bestReachedThisGen = 0;
    bestDistanceThisGenAt = now;
    seedFromBrain(elite.autoPilot);
    optimalCar = cars[0];
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
            survivalFrames[i]++;
            const laneIdx = Math.floor((cars[i].x - road.left) / road.laneWidth);
            const clamped = Math.max(0, Math.min(laneIdx, road.numLanes - 1));
            const laneCenter = road.getLaneCenter(clamped);
            const laneOffset = Math.abs(cars[i].x - laneCenter) / road.laneWidth;

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
            laneCenterPenaltyFrames[i] += laneOffset;
            if (laneOffset > 0.4) onDividerFrames[i]++;

            if (cars[i].controls.backwards && cars[i].speed > 0) brakeFrames[i]++;
            if (Math.abs(cars[i].speed) < 0.3) stopFrames[i]++;
            if (cars[i].speed < -0.1) backwardsFrames[i]++;
            anglePenaltyFrames[i] += Math.abs(cars[i].angle);

            const d = -cars[i].y;
            if (d > bestDistanceThisGen) {
                bestDistanceThisGen = d;
                bestDistanceThisGenAt = performance.now();
            }
            // Also track absolute best-progressed-car across the whole gen.
            // If individual survivors keep moving but never beat the previous
            // record, the population isn't converging — advance the generation.
            if (d > bestReachedThisGen) {
                bestReachedThisGen = d;
            }
        }
    }

    const aliveIndices = cars.map((c, i) => c.hit ? -1 : i).filter(i => i >= 0);

    if (aliveIndices.length > 0) {
        let bestI = aliveIndices[0];
        const fitness = (i) => {
            const distance = DISTANCE_WEIGHT * (-cars[i].y);
            // Quadratic penalty: laneOffset in [0, 0.5], squared so a centered
            // car (offset=0) gets no penalty, and a divider-sitting car (0.5)
            // gets 0.25 * weight = 1.5 per frame. Smooth, single-term.
            const laneCenterTerm = FITNESS_LANE_QUADRATIC * laneCenterPenaltyFrames[i] * laneCenterPenaltyFrames[i];
            const onDividerTerm = laneCenterPenaltyFrames[i] >= 0.4
                ? 4.0 * onDividerFrames[i]
                : 0; // tiny extra punishment layered on top of the quadratic at extremes
            const laneChangeCapped = Math.min(laneChanges[i], 5) * (FITNESS_LANE_CHANGE_BONUS_MAX / 5);
            const speedBonus = 2.0 * highSpeedFrames[i] + 4.0 * maxSpeedFrames[i];
            const brakePenalty = 12.0 * brakeFrames[i];
            const stopPenalty = 30.0 * stopFrames[i];
            const backwardsPenalty = 50.0 * backwardsFrames[i];
            const anglePenalty = 0.5 * anglePenaltyFrames[i];
            const survivalCredit = SURVIVAL_CREDIT * survivalFrames[i];
            return distance
                + survivalCredit
                + laneChangeCapped
                + speedBonus
                - brakePenalty
                - stopPenalty
                - backwardsPenalty
                - anglePenalty
                - laneCenterTerm
                - onDividerTerm;
        };
        let bestScore = fitness(bestI);
        for (const i of aliveIndices) {
            const score = fitness(i);
            if (score > bestScore) { bestScore = score; bestI = i; }
        }
        optimalCar = cars[bestI];
    }

    const liveDistThisGen = Math.round(bestDistanceThisGen);
    if (liveDistThisGen > bestDistanceEver) {
        bestDistanceEver = liveDistThisGen;
        try { localStorage.setItem(BEST_DIST_KEY, String(bestDistanceEver)); } catch (_) {}
    }

    const now = performance.now();
    const stalled = (now - bestDistanceThisGenAt) > PROGRESS_STALL_MS;
    const collapsed = aliveIndices.length < cars.length * COLLAPSE_FRACTION;
    if (aliveIndices.length === 0 || collapsed || stalled) {
        naturalize(optimalCar || cars[0]);
    }

    document.getElementById("genDisplay").textContent = "Generation: " + generation;
    document.getElementById("aliveDisplay").textContent = "Alive: " + aliveIndices.length;
    const thisGen = Math.round(-(optimalCar ? optimalCar.y : 0));
    document.getElementById("bestDistDisplay").textContent =
        "Best ever: " + bestDistanceEver + "m  |  This gen: " + Math.max(thisGen, liveDistThisGen) + "m";

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
