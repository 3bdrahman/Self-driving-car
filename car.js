/**
 * Car Module & Pre-rendered Sprite Cache
 * Vehicle motion mechanics with continuous responsive steering,
 * organic lane-centering spring stabilization, polygon intersection, and 3 render modes.
 */

const CAR_IMG_SRC = "car.png";
const carImage = new Image();
carImage.src = CAR_IMG_SRC;

const spriteCache = new Map();

function getTintedCarSprite(color, width, height) {
    const key = `${color}_${width}_${height}`;
    if (spriteCache.has(key)) {
        return spriteCache.get(key);
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    const ctx = canvas.getContext("2d");

    if (carImage.complete && carImage.naturalWidth > 0) {
        ctx.drawImage(carImage, 0, 0, width, height);

        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(carImage, 0, 0, width, height);
        
        // ONLY cache the fully rendered sprite
        spriteCache.set(key, canvas);
    } else {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        // Do NOT cache this fallback rectangle; try again next frame
    }

    return canvas;
}

class Car {
    constructor(x, y, width, height, controlType, maxSpeed = 0, color = "blue") {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 0;
        this.acceleration = 0.2;
        this.maxSpeed = maxSpeed;
        this.angle = 0;
        this.friction = 0.05;
        this.color = color;
        this.controlType = controlType;

        this.useAutoPilot = controlType === "autopilot";
        if (controlType !== "dummy") {
            this.sensor = new Sensor(this);
            this.autoPilot = new NeuralNetwork(NeuralNetwork.getArchitecture(this.sensor.inputSize + 1));
        }

        this.controls = new Controls(controlType);
        this.hit = false;
        this.polygon = this.createPolygon();
    }

    update(roadBorders, traffic, roadLeft = 0, roadWidth = 220, numLanes = 3) {
        if (!this.hit) {
            this.move(roadLeft, roadWidth, numLanes);
            this.polygon = this.createPolygon();
            this.hit = this.isHit(roadBorders, traffic);
        }

        if (this.sensor && !this.hit) {
            this.sensor.update(roadBorders, traffic);
            const inputs = this.encodeSensorInputs(this.sensor.readings, roadLeft, roadWidth, numLanes);
            const outputs = NeuralNetwork.feedForward(inputs, this.autoPilot);

            if (this.useAutoPilot) {
                this.controls.forward = outputs[0] === 1;
                this.controls.left = outputs[1] === 1;
                this.controls.right = outputs[2] === 1;
                this.controls.backwards = outputs[3] === 1;
            }
        }
    }

    move(roadLeft = 0, roadWidth = 220, numLanes = 3) {
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.backwards) {
            this.speed -= this.acceleration;
        }

        if (this.speed !== 0) {
            const flip = this.speed > 0 ? 1 : -1;
            // Responsive automotive steering rate
            const turnRate = 0.024 * (Math.abs(this.speed) / (this.maxSpeed || 1.0));

            if (this.controls.right) {
                this.angle -= turnRate * flip;
            }
            if (this.controls.left) {
                this.angle += turnRate * flip;
            }
        }

        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }

        if (this.useAutoPilot) {
            if (this.speed < 0) this.speed = 0;
        } else {
            if (this.speed < -this.maxSpeed / 2) {
                this.speed = -this.maxSpeed / 2;
            }
        }

        if (this.speed > 0) {
            this.speed -= this.friction;
        }
        if (this.speed < 0) {
            this.speed += this.friction;
        }

        if (Math.abs(this.speed) < this.friction) {
            this.speed = 0;
        }

        // Dummy traffic obstacle cars move straight down their assigned spawn lane
        if (this.controlType === "dummy") {
            this.y -= Math.cos(this.angle) * this.speed;
            return;
        }

        // Organic Lane-Centering Spring Stabilization when not actively steering
        if (this.speed !== 0 && !this.controls.left && !this.controls.right) {
            if (this.angle > 0) {
                this.angle = Math.max(0, this.angle - 0.02);
            } else if (this.angle < 0) {
                this.angle = Math.min(0, this.angle + 0.02);
            }

            if (roadWidth > 0) {
                const laneW = roadWidth / numLanes;
                const relX = this.x - roadLeft;
                const currentLane = clamp(Math.floor(relX / laneW), 0, numLanes - 1);
                const laneCenterX = roadLeft + laneW / 2 + currentLane * laneW;
                const offset = laneCenterX - this.x;

                // Soft 4% restoring nudge toward lane center without locking micro-adjustments
                if (Math.abs(offset) > 2) {
                    this.x += offset * 0.04;
                }
            }
        }

        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }

    isHit(roadBorders, traffic) {
        for (let i = 0; i < roadBorders.length; i++) {
            if (polygonIntersectsSegment(this.polygon, roadBorders[i])) {
                return true;
            }
        }
        for (let i = 0; i < traffic.length; i++) {
            const t = traffic[i];
            if (Math.abs(this.y - t.y) > 100 || Math.abs(this.x - t.x) > 100) continue;
            if (polygonIntersects(this.polygon, t.polygon)) {
                return true;
            }
        }
        return false;
    }

    encodeSensorInputs(readings, roadLeft = 0, roadWidth = 220, numLanes = 3) {
        const inputs = [];
        const kindMap = { border: 1.0, traffic: 0.5 };
        for (const r of readings) {
            if (r === null) {
                inputs.push(0, 0);
            } else {
                inputs.push(1 - r.offset, kindMap[r.type] ?? 0);
            }
        }

        const laneW = roadWidth / numLanes;
        const relX = this.x - roadLeft;
        const currentLane = clamp(Math.floor(relX / laneW), 0, numLanes - 1);
        const targetCenterX = roadLeft + laneW / 2 + currentLane * laneW;
        const normalizedOffset = (this.x - targetCenterX) / (laneW / 2);
        inputs.push(clamp(normalizedOffset, -1.0, 1.0));

        return inputs;
    }

    createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const theta = Math.atan2(this.width, this.height);

        points.push({
            x: this.x - Math.sin(this.angle - theta) * rad,
            y: this.y - Math.cos(this.angle - theta) * rad
        });
        points.push({
            x: this.x - Math.sin(this.angle + theta) * rad,
            y: this.y - Math.cos(this.angle + theta) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - theta) * rad,
            y: this.y - Math.cos(Math.PI + this.angle - theta) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + theta) * rad,
            y: this.y - Math.cos(Math.PI + this.angle + theta) * rad
        });

        return points;
    }

    draw(context, mode = "best", drawSensors = false) {
        if (mode === "ghost") {
            if (this.hit) return;
            context.save();
            context.translate(this.x, this.y);
            context.rotate(-this.angle);
            context.fillStyle = "rgba(100, 60, 200, 0.35)";
            context.beginPath();
            context.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 4);
            context.fill();
            context.restore();
            return;
        }

        context.save();
        context.translate(this.x, this.y);
        context.rotate(-this.angle);

        const activeColor = this.hit ? "red" : (mode === "best" ? "#00ff88" : this.color);

        if (mode === "best" && !this.hit) {
            context.shadowColor = "#00ff88";
            context.shadowBlur = 18;
        }

        const sprite = getTintedCarSprite(activeColor, this.width, this.height);
        context.drawImage(sprite, -this.width / 2, -this.height / 2, this.width, this.height);

        context.shadowColor = "transparent";
        context.shadowBlur = 0;
        context.restore();

        if (this.sensor && drawSensors) {
            this.sensor.draw(context);
        }
    }
}