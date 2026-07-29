# 🏎️ Autonomous Neuroevolution Self-Driving Simulation (v3.0)

A high-performance, production-grade 2D self-driving car simulation powered by a genetic neuroevolution algorithm, interactive neural network visualizer, continuous automotive physics, and real-time evolutionary controls.

![Self-Driving Car Simulation](gifs/6.00.gif)

---

## 🌟 Key Highlights & Features (v3.0)

### 🧠 Neural Network & Genetic Evolution
- **Feed-Forward Architecture**: 11 input perception signals $\rightarrow$ 6 hidden neurons $\rightarrow$ 4 binary motor output neurons (Accelerate, Steer Left, Steer Right, Reverse).
- **500-Car Mutant Swarm**: Scaled parallel population with adjustable mutation rates ($1\% - 50\%$) for high genetic diversity and rapid convergence.
- **Strict Lifespan Evaluation**: Generations run until **all 500 agents** have completed their run, ensuring maximum fitness evaluation for every individual agent.
- **Deterministic Leader Selection**: The active front-runner is mathematically tracked in real-time, locking camera and neural visualizer focus on the leading survivor.

### 📡 Radar Perception Engine
- **280px Extended Sensor Range**: 5 forward perception rays covering a $135^\circ$ spread for early obstacle detection.
- **Multi-Class Perception**: Differentiates between solid outer road borders and traffic obstacle vehicles.
- **Normalized Lane Offset Input**: Provides the neural network with explicit lateral position awareness relative to lane centers.

### 🚘 Automotive Physics & Organic Lane Stabilization
- **Continuous Responsive Steering**: Responsive speed-proportional steering ($60\text{ FPS}$) for agile multi-car bottleneck dodging.
- **Organic Lane-Centering Spring**: Soft restoring force that aligns vehicles cleanly near lane centers when driving straight, eliminating illegal lane straddling.
- **Pre-Rendered Sprite Caching**: Off-screen canvas caching for vehicle sprites, maintaining a rock-solid 60 FPS even with 500 active agents.

### 💾 Complete Model Storage & Import/Export System
- **💾 Save (Browser)**: Saves the elite model weights to `localStorage`.
- **🗑 Reset Storage**: Clears browser storage, sprite cache, and restarts Generation 1 from scratch.
- **📤 Export File**: Downloads the elite model as a version-2 `.json` file to your computer.
- **📥 Import File**: Uploads and seeds a saved `.json` neural model into the active population.
- **🔔 Toast Notifications**: Interactive visual popups confirm all save, export, import, and reset operations.

### 📊 HUD & Metric Displays
- **Automatic Unit Conversion**: Displays progress in meters (`m`) for distances $<1000\text{m}$, and automatically converts to kilometers (`km`, 2 decimal places) for distances $\ge 1000\text{m}$.
- **Real-Time Visualizer**: Interactive canvas visualizer showing weight polarities, node activations, and output pulses in real-time.

---

## 📁 Project Architecture

| File | Purpose |
| :--- | :--- |
| `index.html` | Application container, floating HUD, storage controls bar, and script imports |
| `styles.css` | Modern glassmorphism UI, typography, HUD overlay, and toast notification styling |
| `main.js` | Main simulation loop (60 FPS), traffic spawner, leader tracking, and storage handlers |
| `car.js` | Vehicle physics, controls, sensor integration, lane centering, and 3-mode renderer |
| `sensor.js` | 5-ray radar perception engine (280px range, spatial ray intersections) |
| `network.js` | Binary-step neural network, feed-forward matrix ops, mutation, and serialization |
| `networkVisualizer.js` | Real-time animated neural network visualizer canvas |
| `road.js` | Dynamic road border geometry, lane coordinates, and scrolling lane markers |
| `controls.js` | Manual keyboard input listeners and autopilot control states |
| `utils.js` | Math helpers, segment intersections, distance formatting, and traffic palette |

---

## 🚀 Quickstart & Local Setup

### Running Locally

No heavy build steps or external npm packages required! Simply serve the static files:

```bash
# Option 1: Python 3 built-in HTTP server
python3 -m http.server 8000

# Option 2: Node.js npx serve
npx serve .

# Option 3: PHP built-in server
php -S localhost:8000
```

Then open `http://localhost:8000` in your web browser.

---

## 🛠️ GitHub Pages Deployment

To host this simulation as a live interactive demo on GitHub Pages:

1. Push your repository to GitHub.
2. Go to **Repository Settings** $\rightarrow$ **Pages**.
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` (or `master`) / `(root)`.
4. Click **Save**. Your live demo will be published at `https://<your-username>.github.io/<repository-name>/`.

---

## 🎮 How to Train & Interact

1. **Watch Evolution**: Observe Generation 1 as mutant agents learn to navigate traffic.
2. **Speed Up Training**: Use the **Speed** slider ($1\times - 10\times$) in the bottom-left controls bar to accelerate training cycles.
3. **Adjust Mutation Rate**: Modify the **Mutation** slider ($1\% - 50\%$) to test fine-tuning vs aggressive exploration.
4. **Save High-Performing Models**: Click **`💾 Save (Browser)`** when an agent achieves a long distance run.
5. **Export Models**: Click **`📤 Export File`** to download top-performing brains as JSON files for sharing or archiving.