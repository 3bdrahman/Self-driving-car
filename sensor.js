/**
 * Vehicle Perception Sensor Module
 * 9 long-range radar rays (320px range) covering a 144 degree forward arc
 * for early obstacle perception, dense side awareness, and smooth proactive
 * lane changing under heavy traffic.
 */

class Sensor {
    constructor(car) {
        this.car = car;
        this.rayCount = 9;
        this.rayLength = 106;
        this.raySpread = Math.PI * 0.8; // 144 degree forward arc

        // 9 rays x 2 channels (distance + object kind: border / traffic) = 18 inputs
        this.inputSize = this.rayCount * 2;

        this.rays = [];
        this.readings = [];
    }

    update(roadBorders, traffic) {
        this.#castRays();
        this.readings = [];
        for (let i = 0; i < this.rays.length; i++) {
            this.readings.push(
                this.getReading(this.rays[i], roadBorders, traffic)
            );
        }
    }

    getReading(ray, roadBorders, traffic) {
        const touches = [];

        // Check road borders
        for (let i = 0; i < roadBorders.length; i++) {
            const touch = getIntersection(ray[0], ray[1], roadBorders[i][0], roadBorders[i][1]);
            if (touch) {
                touches.push({ ...touch, type: "border" });
            }
        }

        // Fast spatial filter for traffic
        const carY = this.car.y;
        const carX = this.car.x;
        const limit = this.rayLength + 80;

        for (let i = 0; i < traffic.length; i++) {
            const t = traffic[i];
            if (Math.abs(carY - t.y) > limit || Math.abs(carX - t.x) > limit) {
                continue;
            }

            const poly = t.polygon;
            for (let j = 0; j < poly.length; j++) {
                const trafficTouch = getIntersection(ray[0], ray[1], poly[j], poly[(j + 1) % poly.length]);
                if (trafficTouch) {
                    touches.push({ ...trafficTouch, type: "traffic" });
                }
            }
        }

        if (touches.length === 0) return null;

        let minOffset = Infinity;
        let closestHit = null;
        for (let i = 0; i < touches.length; i++) {
            if (touches[i].offset < minOffset) {
                minOffset = touches[i].offset;
                closestHit = touches[i];
            }
        }
        return closestHit;
    }

    #castRays() {
        this.rays = [];
        for (let i = 0; i < this.rayCount; i++) {
            const rayAngle = lerp(
                this.raySpread / 2,
                -this.raySpread / 2,
                this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1)
            ) + this.car.angle;

            const start = { x: this.car.x, y: this.car.y };
            const end = {
                x: this.car.x - Math.sin(rayAngle) * this.rayLength,
                y: this.car.y - Math.cos(rayAngle) * this.rayLength
            };
            this.rays.push([start, end]);
        }
    }

    draw(context) {
        context.save();

        for (let i = 0; i < this.rayCount; i++) {
            let end = this.rays[i][1];
            let hitType = null;

            if (this.readings[i]) {
                end = this.readings[i];
                hitType = this.readings[i].type;
            }

            // Differentiate colors: Green = clear, Yellow = road border, Red = traffic obstacle
            let rayColor = "#00ff88"; 
            if (hitType === "border") rayColor = "#eab308";
            if (hitType === "traffic") rayColor = "#ef4444";

            context.beginPath();
            context.lineWidth = 2;
            context.strokeStyle = rayColor;
            context.moveTo(this.rays[i][0].x, this.rays[i][0].y);
            context.lineTo(end.x, end.y);
            context.stroke();

            context.beginPath();
            context.lineWidth = 1;
            context.strokeStyle = "rgba(255, 255, 255, 0.15)";
            context.moveTo(end.x, end.y);
            context.lineTo(this.rays[i][1].x, this.rays[i][1].y);
            context.stroke();

            if (hitType) {
                context.beginPath();
                context.arc(end.x, end.y, 4, 0, Math.PI * 2);
                context.fillStyle = rayColor;
                context.fill();
            }
        }

        context.restore();
    }
}