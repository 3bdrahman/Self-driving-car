/**
 * Main Controller & Simulation Loop
 * Handles neuroevolution population lifecycle, speed-controlled physics loop,
 * dynamic traffic generation, telemetry HUD updates, and JSON brain persistence.
 */

// ─── Canvas & Context Initialization ───────────────────────────────────────
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
let bestDistanceThisGenAt = performance.now();
let simSpeed = 1;
let mutationRate = 0.1;
let popSize = 300;
let isPaused = false;

const BEST_DIST_KEY = "sdc_bestDistanceEver";
const BEST_BRAIN_KEY = "sdc_bestAutopilotBrain";

// ─── Dynamic Canvas Sizing ────────────────────────────────────────────────
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
                road.updateDimensions(carCanvas.width / 2, carCanvas.width * 0.65);
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

// Initialize World Road
road = new Road(window.innerWidth * 0.4, 300, 3);
syncCanvasSizes();
window.addEventListener("resize", syncCanvasSizes);

// ─── Traffic Generation Rules ──────────────────────────────────────────────
const SPAWN_BEHIND_CULL = 1200;
const SPAWN_TARGET = 50;

const LANE_SPEED_PROFILES = [
    { min: 1.5, max: 2.5 }, // Lane 0: Trucks / Slow
    { min: 2.5, max: 4.0 }, // Lane 1: Commuters
    { min: 3.5, max: 5.5 }  // Lane 2: Fast
];

function laneMaxSpeed(lane) {
    const p = LANE_SPEED_PROFILES[clamp(lane, 0, LANE_SPEED_PROFILES.length - 1)];
    return p.min + Math.random() * (p.max - p.min);
}

function spawnTrafficBlock(frontY) {
    const r = Math.random();
    let advanceY = 0;

    if (r < 0.15) {
        advanceY = 500 + Math.random() * 300;
    } else if (r < 0.40) {
        // Blockade scenario (2 cars blocking lanes)
        const emptyLane = Math.floor(Math.random() * road.numLanes);
        const y = frontY - 120 - Math.random() * 100;
        for (let i = 0; i < road.numLanes; i++) {
            if (i !== emptyLane) {
                traffic.push(new Car(road.getLaneCenter(i), y, 30, 50, "dummy", laneMaxSpeed(i) * 0.8, getRandomTrafficColor()));
            }
        }
        advanceY = 220 + Math.random() * 150;
    } else {
        // Single regular car
        const lane = Math.floor(Math.random() * road.numLanes);
        const y = frontY - 120 - Math.random() * 150;
        traffic.push(new Car(road.getLaneCenter(lane), y, 30, 50, "dummy", laneMaxSpeed(lane), getRandomTrafficColor()));
        advanceY = 160 + Math.random() * 150;
    }

    return frontY - advanceY;
}

function seedInitialTraffic() {
    traffic.length = 0;
    let frontY = 100;
    for (let lane = 0; lane < road.numLanes; lane++) {
        for (let i = 0; i < 15; i++) {
            traffic.push(new Car(road.getLaneCenter(lane), 100 - i * 280, 30, 50, "dummy", laneMaxSpeed(lane), getRandomTrafficColor()));
        }
    }
}

// ─── Population Setup & Tracking ─────────────────────────────────────────
let bestDistanceEver = parseInt(localStorage.getItem(BEST_DIST_KEY), 10);
if (!Number.isFinite(bestDistanceEver)) bestDistanceEver = 0;

function createPopulation(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
        list.push(new Car(road.getLaneCenter(1), 100, 30, 50, "autopilot", 7.0));
    }
    return list;
}

cars = createPopulation(popSize);
optimalCar = cars[0];

// Load Saved Brain if Available
const savedBrainStr = localStorage.getItem(BEST_BRAIN_KEY);
if (savedBrainStr) {
    const parsed = NeuralNetwork.deserialize(savedBrainStr);
    if (parsed) seedFromBrain(parsed);
}

seedInitialTraffic();

function seedFromBrain(brain) {
    const elite = NeuralNetwork.clone(brain);
    const freshCount = Math.floor(cars.length * 0.05);

    for (let i = 0; i < cars.length; i++) {
        if (i === 0) {
            cars[i].autoPilot = NeuralNetwork.clone(elite); // Elite survivor exact clone
        } else if (i < freshCount) {
            cars[i].autoPilot = new NeuralNetwork([cars[i].sensor.inputSize, 12, 4]); // Fresh diversity
        } else {
            cars[i].autoPilot = NeuralNetwork.clone(elite);
            const rate = mutationRate * (0.2 + (i / cars.length) * 0.8);
            NeuralNetwork.mutate(cars[i].autoPilot, rate);
        }
    }
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

function naturalize(elite) {
    generation++;
    resetCarPositions();
    seedInitialTraffic();
    const now = performance.now();
    genStartTime = now;
    bestDistanceThisGen = 0;
    bestReachedThisGen = 0;
    bestDistanceThisGenAt = now;

    if (elite && elite.autoPilot) {
        seedFromBrain(elite.autoPilot);
    }
    optimalCar = cars[0];
    generationOverlayIndex = 0;
}

// ─── Simulation Step (Physics + Fitness) ──────────────────────────────────
function stepSimulation() {
    const optimalY = optimalCar ? optimalCar.y : cars[0].y;

    // Cull old traffic far behind
    for (let i = traffic.length - 1; i >= 0; i--) {
        if (traffic[i].y > optimalY + SPAWN_BEHIND_CULL) {
            traffic.splice(i, 1);
        }
    }

    // Maintain traffic density ahead
    let frontmostY = Infinity;
    for (let i = 0; i < traffic.length; i++) {
        if (traffic[i].y < frontmostY) frontmostY = traffic[i].y;
    }

    let safety = 50;
    while (traffic.length < SPAWN_TARGET && safety-- > 0) {
        const nextY = frontmostY === Infinity ? optimalY - 600 : frontmostY;
        frontmostY = spawnTrafficBlock(nextY);
    }

    // Update Traffic
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].update(road.borders, []);
    }

    // Update Swarm Cars
    for (let i = 0; i < cars.length; i++) {
        cars[i].update(road.borders, traffic);

        if (!cars[i].hit) {
            const distance = -cars[i].y;
            if (distance > bestDistanceThisGen) {
                bestDistanceThisGen = distance;
                bestDistanceThisGenAt = performance.now();
            }
            if (distance > bestReachedThisGen) {
                bestReachedThisGen = distance;
            }
        }
    }

    // Select Current Optimal (Leading) Car by Fitness
    const aliveCars = cars.filter(c => !c.hit);

    if (aliveCars.length > 0) {
        let maxFit = -Infinity;
        let leadCar = aliveCars[0];

        for (let i = 0; i < aliveCars.length; i++) {
            const c = aliveCars[i];
            const dist = -c.y;
            const laneIdx = Math.floor((c.x - road.left) / road.laneWidth);
            const clamped = clamp(laneIdx, 0, road.numLanes - 1);
            const laneCenter = road.getLaneCenter(clamped);
            const laneOffset = Math.abs(c.x - laneCenter) / road.laneWidth;

            // Correct per-step fitness equation
            const fitness = dist + (c.speed * 2) - (laneOffset * 1.5) - (Math.abs(c.angle) * 5);
            if (fitness > maxFit) {
                maxFit = fitness;
                leadCar = c;
            }
        }
        optimalCar = leadCar;
    }

    // Update Global High Score
    const liveDist = Math.round(bestDistanceThisGen);
    if (liveDist > bestDistanceEver) {
        bestDistanceEver = liveDist;
        try { localStorage.setItem(BEST_DIST_KEY, String(bestDistanceEver)); } catch (_) {}
    }

    // Check Next Generation Trigger Conditions
    const now = performance.now();
    const stalled = (now - bestDistanceThisGenAt) > 25000; // 25s stall limit
    const collapsed = aliveCars.length < cars.length * 0.05;

    if (aliveCars.length === 0 || collapsed || stalled) {
        naturalize(optimalCar || cars[0]);
    }
}

// ─── Main Render Loop ──────────────────────────────────────────────────────
function animate(time = 0) {
    syncCanvasSizes();

    if (!isPaused) {
        for (let step = 0; step < simSpeed; step++) {
            stepSimulation();
        }
    }

    const aliveCount = cars.filter(c => !c.hit).length;
    const thisGenDist = Math.round(-(optimalCar ? optimalCar.y : 0));

    // Update Telemetry HUD Elements
    document.getElementById("genDisplay").textContent = `Generation: ${generation}`;
    document.getElementById("aliveDisplay").textContent = `Alive: ${aliveCount} / ${cars.length}`;
    document.getElementById("bestDistDisplay").textContent =
        `Best Ever: ${formatDistance(bestDistanceEver)}  |  This Gen: ${formatDistance(Math.max(thisGenDist, bestDistanceThisGen))}`;

    // Clear Canvases
    carCtx.clearRect(0, 0, carCanvas.width, carCanvas.height);
    networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);

    // Camera follow matrix centered on optimal car
    carCtx.save();
    const cameraY = -optimalCar.y + carCanvas.height * 0.7;
    carCtx.translate(0, cameraY);

    const viewTop = optimalCar.y - carCanvas.height * 0.7;
    const viewBottom = optimalCar.y + carCanvas.height * 0.3;

    // Draw World (Road + Milestones)
    road.draw(carCtx, viewTop, viewBottom);

    // Draw Traffic
    for (let i = 0; i < traffic.length; i++) {
        if (traffic[i].y >= viewTop - 100 && traffic[i].y <= viewBottom + 100) {
            traffic[i].draw(carCtx, "dummy");
        }
    }

    // Draw Swarm (Ghost cars)
    for (let i = 0; i < cars.length; i++) {
        if (cars[i] === optimalCar) continue;
        if (cars[i].y >= viewTop - 100 && cars[i].y <= viewBottom + 100) {
            cars[i].draw(carCtx, "ghost");
        }
    }

    // Draw Elite Model on Top with Sensor Rays
    if (optimalCar) {
        optimalCar.draw(carCtx, "best", true);
    }

    carCtx.restore();

    // Draw Neural Network Visualizer
    if (networkCanvas.width > 0 && optimalCar && optimalCar.autoPilot) {
        NetworkVisualizer.drawNetwork(networkCtx, optimalCar.autoPilot);
    }

    requestAnimationFrame(animate);
}

// Start Loop
requestAnimationFrame(animate);

// ─── External Controls & UI Event Handlers ────────────────────────────────
function saveBrain() {
    if (optimalCar && optimalCar.autoPilot) {
        const json = NeuralNetwork.serialize(optimalCar.autoPilot);
        localStorage.setItem(BEST_BRAIN_KEY, json);
        alert("💾 Brain successfully saved to Local Storage!");
    }
}

function resetBrain() {
    localStorage.removeItem(BEST_BRAIN_KEY);
    localStorage.removeItem(BEST_DIST_KEY);
    bestDistanceEver = 0;
    generation = 1;
    cars = createPopulation(popSize);
    seedInitialTraffic();
    optimalCar = cars[0];
    alert("🗑 Brain & high scores reset!");
}

function exportBrainJSON() {
    if (!optimalCar || !optimalCar.autoPilot) return;
    const json = NeuralNetwork.serialize(optimalCar.autoPilot);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sdc-brain-gen${generation}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importBrainJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const brain = NeuralNetwork.deserialize(e.target.result);
        if (brain) {
            seedFromBrain(brain);
            alert("📥 Neural Network brain successfully imported!");
        } else {
            alert("❌ Invalid brain JSON file format!");
        }
    };
    reader.readAsText(file);
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById("pauseBtn");
    if (btn) btn.textContent = isPaused ? "▶ Resume" : "⏸ Pause";
}

// Attach Slider Handlers
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
