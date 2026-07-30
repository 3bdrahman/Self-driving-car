/**
 * Master Simulation & Performance Engine
 * 500-car mutant swarm, 60 FPS performance, proportional road dimensions,
 * non-overlapping traffic, pure distance-based leader selection, persistent brain state.
 * Fully working Reset & Save buttons that clear localStorage, sprite cache, and restart generation 1 from scratch.
 */

const carCanvas = document.getElementById("carCanvas");
const networkCanvas = document.getElementById("networkCanvas");
const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

let road;
let cars = [];
let traffic = [];
let optimalCar = null;
let generationOverlayIndex = 0;
let generation = 1;
let genStartTime = performance.now();
let bestDistanceThisGen = 0;
let bestReachedThisGen = 0;
let simSpeed = 1;
let mutationRate = 0.1;
const numCars = 500;
let isPaused = false;

const BEST_DIST_KEY = "sdc_bestDistanceEver";
const BEST_BRAIN_KEY = "sdc_bestAutopilot";

const SPAWN_BEHIND_CULL = 1200;
const SPAWN_TARGET = 30;

// Dynamic Canvas Sizing
function syncCanvasSizes() {
    const carPanel = document.getElementById("carPanel");
    const networkPanel = document.getElementById("networkPanel");

    if (carPanel) {
        const cw = Math.max(300, carPanel.clientWidth);
        const ch = Math.max(400, carPanel.clientHeight);
        if (carCanvas.width !== cw || carCanvas.height !== ch) {
            carCanvas.width = cw;
            carCanvas.height = ch;
            if (road) {
                road.updateDimensions(carCanvas.width / 2, 220);
            }
        }
    }

    if (networkPanel && networkPanel.clientWidth > 0) {
        const nw = Math.max(200, networkPanel.clientWidth);
        const nh = Math.max(400, networkPanel.clientHeight);
        if (networkCanvas.width !== nw || networkCanvas.height !== nh) {
            networkCanvas.width = nw;
            networkCanvas.height = nh;
        }
    }
}

road = new Road(window.innerWidth * 0.4, 220, 3);
syncCanvasSizes();
window.addEventListener("resize", syncCanvasSizes);

// Traffic Spawning
const LANE_SPEED_PROFILES = [
    { min: 1.5, max: 2.2 },
    { min: 2.2, max: 3.5 },
    { min: 3.2, max: 4.8 }
];

function laneMaxSpeed(lane) {
    const p = LANE_SPEED_PROFILES[clamp(lane, 0, LANE_SPEED_PROFILES.length - 1)];
    return p.min + Math.random() * (p.max - p.min);
}

function canSpawnAt(lane, y) {
    for (let i = 0; i < traffic.length; i++) {
        const t = traffic[i];
        const tLane = Math.floor((t.x - road.left) / road.laneWidth);
        if (tLane === lane && Math.abs(t.y - y) < 160) {
            return false;
        }
    }
    return true;
}

function spawnTrafficBlock(frontY) {
    const r = Math.random();
    let advanceY = 0;

    if (r < 0.20) {
        advanceY = 450 + Math.random() * 250;
    } else if (r < 0.50) {
        const openLane = Math.floor(Math.random() * road.numLanes);
        const y = frontY - 140 - Math.random() * 80;
        for (let i = 0; i < road.numLanes; i++) {
            if (i !== openLane && canSpawnAt(i, y)) {
                traffic.push(new Car(road.getLaneCenter(i), y, 42, 70, "dummy", laneMaxSpeed(i) * 0.85, getRandomTrafficColor()));
            }
        }
        advanceY = 260 + Math.random() * 150;
    } else {
        const lane = Math.floor(Math.random() * road.numLanes);
        const y = frontY - 140 - Math.random() * 100;
        if (canSpawnAt(lane, y)) {
            traffic.push(new Car(road.getLaneCenter(lane), y, 42, 70, "dummy", laneMaxSpeed(lane), getRandomTrafficColor()));
        }
        advanceY = 190 + Math.random() * 150;
    }

    return frontY - advanceY;
}

function seedInitialTraffic() {
    traffic.length = 0;
    let currentY = -180;
    for (let i = 0; i < 12; i++) {
        currentY = spawnTrafficBlock(currentY);
    }
}

// Population Setup
function generateDuplicates(num) {
    const list = [];
    for (let i = 0; i < num; i++) {
        list.push(new Car(road.getLaneCenter(1), 100, 42, 70, "autopilot", 6.5));
    }
    return list;
}

cars = generateDuplicates(numCars);

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

const savedBrainStr = localStorage.getItem(BEST_BRAIN_KEY);
if (savedBrainStr) {
    const parsed = NeuralNetwork.deserialize(savedBrainStr);
    if (parsed) seedFromBrain(parsed);
}

seedInitialTraffic();

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
    const elite = NeuralNetwork.clone(brain);
    const freshCount = Math.floor(cars.length * 0.05);
    for (let i = 0; i < cars.length; i++) {
        if (!brain.levels || brain.levels[0].inputs.length !== cars[i].sensor.inputSize + 1) {
            cars[i].autoPilot = new NeuralNetwork(NeuralNetwork.getArchitecture(cars[i].sensor.inputSize + 1));
            continue;
        }
        cars[i].autoPilot = NeuralNetwork.clone(elite);
        if (i === 0) continue;
        if (i < freshCount) {
            cars[i].autoPilot = new NeuralNetwork(NeuralNetwork.getArchitecture(cars[i].sensor.inputSize + 1));
        } else {
            const rate = 0.05 + (i / cars.length) * 0.2;
            NeuralNetwork.mutate(cars[i].autoPilot, rate);
        }
    }
}

function naturalize(elite) {
    generation++;
    resetTrackingArrays();
    resetCarPositions();
    seedInitialTraffic();
    genStartTime = performance.now();
    bestDistanceThisGen = 0;
    bestReachedThisGen = 0;

    if (elite && elite.autoPilot) {
        seedFromBrain(elite.autoPilot);
    }
    optimalCar = cars[0];
    generationOverlayIndex = 0;
}

function forceNextGeneration() {
    naturalize(optimalCar || cars[0]);
}

// Physics & Fitness Step
function stepSimulation() {
    const currentFrontY = optimalCar ? optimalCar.y : cars[0].y;

    // Cull traffic behind
    for (let i = traffic.length - 1; i >= 0; i--) {
        if (traffic[i].y > currentFrontY + SPAWN_BEHIND_CULL) {
            traffic.splice(i, 1);
        }
    }

    // Maintain ahead traffic density
    let frontmostY = Infinity;
    for (let i = 0; i < traffic.length; i++) {
        if (traffic[i].y < frontmostY) frontmostY = traffic[i].y;
    }

    let safety = 50;
    while (traffic.length < SPAWN_TARGET && safety-- > 0) {
        const nextY = frontmostY === Infinity ? currentFrontY - 600 : frontmostY;
        frontmostY = spawnTrafficBlock(nextY);
    }

    for (let i = 0; i < traffic.length; i++) {
        traffic[i].update(road.borders, [], road.left, road.width, road.numLanes);
    }

    for (let i = 0; i < cars.length; i++) {
        cars[i].update(road.borders, traffic, road.left, road.width, road.numLanes);

        if (!cars[i].hit) {
            survivalFrames[i]++;
            const laneIdx = Math.floor((cars[i].x - road.left) / road.laneWidth);
            const clamped = clamp(laneIdx, 0, road.numLanes - 1);
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
            // Only penalize if significantly far from the center (straddling)
            if (laneOffset > 15) onDividerFrames[i]++;

            // Virtual Pace Car: Mathematically eliminates tailgating exploits.
            // The car must maintain an overall average speed of at least 2.8 pixels/frame.
            // Since all NPC traffic moves slower than 2.0, tailgating indefinitely will cause
            // the average speed to slowly bleed out until the AI is disqualified.
            if (survivalFrames[i] > 300) {
                const carDistance = -cars[i].y;
                const avgSpeed = carDistance / survivalFrames[i];
                if (avgSpeed < 2.8) {
                    cars[i].hit = true; // Killed by the Pace Car for being too sluggish
                }
            }
            if (cars[i].y > currentFrontY + 800) {
                cars[i].hit = true;
            }
            if (cars[i].speed < -0.1) backwardsFrames[i]++;
            anglePenaltyFrames[i] += Math.abs(cars[i].angle);

            const d = -cars[i].y;
            if (d > bestDistanceThisGen) {
                bestDistanceThisGen = d;
            }
            if (d > bestReachedThisGen) {
                bestReachedThisGen = d;
            }
        }
    }

    // Leader evaluation: Prioritize distance, but penalize straddling lane dividers
    const aliveCars = cars.filter(c => !c.hit);

    if (aliveCars.length > 0) {
        let leader = aliveCars[0];
        let bestFitness = -Infinity;
        
        for (let i = 0; i < aliveCars.length; i++) {
            const car = aliveCars[i];
            const idx = cars.indexOf(car);
            
            // Base fitness is how far forward the car has driven (negative Y)
            const distance = -car.y;
            
            // Explicitly reward staying alive (survival) to encourage slowing down and waiting
            const survivalBonus = survivalFrames[idx] * 2;
            
            // Massive reward for maintaining high speeds to prioritize overtaking empty lanes
            const speedBonus = (highSpeedFrames[idx] * 4) + (maxSpeedFrames[idx] * 8);
            
            // Light penalty for straddling to discourage twitching, without punishing deliberate overtakes
            const dividerPenalty = onDividerFrames[idx] * 1; 
            
            const fitness = distance + survivalBonus + speedBonus - dividerPenalty;
            
            if (fitness > bestFitness) {
                bestFitness = fitness;
                leader = car;
            }
        }
        optimalCar = leader;
        generationOverlayIndex = cars.indexOf(leader);
    }

    const liveDistThisGen = Math.round(bestDistanceThisGen);
    if (liveDistThisGen > bestDistanceEver) {
        bestDistanceEver = liveDistThisGen;
        try { localStorage.setItem(BEST_DIST_KEY, String(bestDistanceEver)); } catch (_) {}
    }

    // Generations end strictly ONLY when ALL cars have crashed
    if (aliveCars.length === 0) {
        naturalize(optimalCar || cars[0]);
    }
}

// Main Render Loop (60 FPS)
function animate(time = 0) {
    syncCanvasSizes();

    if (!isPaused) {
        for (let step = 0; step < simSpeed; step++) {
            stepSimulation();
        }
    }

    const overlayCar = optimalCar || cars[generationOverlayIndex] || cars[0];
    const aliveCount = cars.filter(c => !c.hit).length;
    const thisGenDist = Math.round(-(overlayCar ? overlayCar.y : 0));

    document.getElementById("genDisplay").textContent = "Generation: " + generation;
    document.getElementById("aliveDisplay").textContent = "Alive: " + aliveCount + " / " + cars.length;
    document.getElementById("bestDistDisplay").textContent =
        "Best ever: " + formatDistance(bestDistanceEver) + "  |  This gen: " + formatDistance(Math.max(thisGenDist, Math.round(bestDistanceThisGen)));

    carCtx.clearRect(0, 0, carCanvas.width, carCanvas.height);
    networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);

    carCtx.save();
    const cameraY = -(overlayCar ? overlayCar.y : 0) + carCanvas.height * 0.7;
    carCtx.translate(0, cameraY);

    const viewTop = (overlayCar ? overlayCar.y : 0) - carCanvas.height * 0.7;
    const viewBottom = (overlayCar ? overlayCar.y : 0) + carCanvas.height * 0.3;

    road.draw(carCtx, viewTop, viewBottom);

    for (let i = 0; i < traffic.length; i++) {
        if (traffic[i].y >= viewTop - 100 && traffic[i].y <= viewBottom + 100) {
            traffic[i].draw(carCtx, "dummy");
        }
    }

    // Only draw active (alive) ghost cars
    carCtx.save();
    for (let i = 0; i < cars.length; i++) {
        if (cars[i] === overlayCar) continue;
        if (!cars[i].hit && cars[i].y >= viewTop - 100 && cars[i].y <= viewBottom + 100) {
            cars[i].draw(carCtx, "ghost");
        }
    }
    carCtx.restore();

    // Highlight the current front-running best car
    if (overlayCar) {
        overlayCar.draw(carCtx, "best", true);
    }

    carCtx.restore();

    if (networkCanvas.width > 0 && overlayCar && overlayCar.autoPilot) {
        networkCtx.save();
        networkCtx.lineDashOffset = -time / 50;
        NetworkVisualizer.drawNetwork(networkCtx, overlayCar.autoPilot);
        networkCtx.restore();
    }

    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// Helper for user feedback toast notifications
function showToast(msg) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 2800);
}

// Storage & Control Handlers
function saveBrain() {
    if (optimalCar && optimalCar.autoPilot) {
        const jsonStr = NeuralNetwork.serialize(optimalCar.autoPilot);
        localStorage.setItem(BEST_BRAIN_KEY, jsonStr);
        showToast("💾 Model saved to browser storage!");
    }
}
function save() { saveBrain(); }

function resetBrain() {
    try {
        localStorage.removeItem(BEST_BRAIN_KEY);
        localStorage.removeItem(BEST_DIST_KEY);
    } catch (_) {}

    if (typeof spriteCache !== "undefined" && spriteCache.clear) {
        spriteCache.clear();
    }

    bestDistanceEver = 0;
    bestDistanceThisGen = 0;
    bestReachedThisGen = 0;
    generation = 1;

    cars = generateDuplicates(numCars);
    resetTrackingArrays();
    resetCarPositions();
    seedInitialTraffic();
    optimalCar = cars[0];
    generationOverlayIndex = 0;
    showToast("🗑 Storage cleared! Restarted Gen 1.");
}
function destroy() { resetBrain(); }



function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById("pauseBtn");
    if (btn) btn.textContent = isPaused ? "▶ Resume" : "⏸ Pause";
}

document.addEventListener("DOMContentLoaded", () => {
    const speedSlider = document.getElementById("simSpeed");
    const speedLabel = document.getElementById("speedLabel");
    if (speedSlider) {
        speedSlider.addEventListener("input", () => {
            simSpeed = parseInt(speedSlider.value, 10);
            if (speedLabel) speedLabel.textContent = `${simSpeed}×`;
        });
    }

    const mutSlider = document.getElementById("mutationSpeed");
    const mutLabel = document.getElementById("mutationLabel");
    if (mutSlider) {
        mutSlider.addEventListener("input", () => {
            mutationRate = parseFloat(mutSlider.value);
            if (mutLabel) mutLabel.textContent = `${Math.round(mutationRate * 100)}%`;
        });
    }
});
