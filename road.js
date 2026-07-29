/**
 * Clean Realistic Road Module
 * Fixed proportional width (220px across 3 lanes), white borders, and dashed lane dividers.
 */

class Road {
    constructor(x, width = 220, numLanes = 3) {
        this.numLanes = numLanes;
        this.updateDimensions(x, width);

        const inf = 1000000;
        this.top = -inf;
        this.bottom = inf;
    }

    updateDimensions(x, width = 220) {
        this.x = x;
        this.width = width;
        this.left = x - width / 2;
        this.right = x + width / 2;
        this.laneWidth = this.width / this.numLanes;

        const inf = 1000000;
        const topLeft = { x: this.left, y: -inf };
        const topRight = { x: this.right, y: -inf };
        const bottomLeft = { x: this.left, y: inf };
        const bottomRight = { x: this.right, y: inf };

        this.borders = [
            [topLeft, bottomLeft],
            [topRight, bottomRight]
        ];
    }

    getLaneCenter(laneIndex) {
        const clampedIndex = Math.max(0, Math.min(laneIndex, this.numLanes - 1));
        return this.left + this.laneWidth / 2 + clampedIndex * this.laneWidth;
    }

    draw(context, viewTop = -2000, viewBottom = 2000) {
        context.save();

        const dashPeriod = 40;
        const startY = Math.floor((viewTop - 150) / dashPeriod) * dashPeriod;
        const endY = Math.ceil((viewBottom + 150) / dashPeriod) * dashPeriod;

        // 1. Dark Asphalt Surface
        context.fillStyle = "#1e1e2e";
        context.fillRect(this.left, startY, this.width, endY - startY);

        // 2. Dashed White Lane Dividers (World-Anchored)
        context.lineWidth = 4;
        context.strokeStyle = "rgba(255, 255, 255, 0.8)";
        context.setLineDash([20, 20]);
        context.lineDashOffset = 0; // World coordinates move naturally via camera translation

        for (let i = 1; i <= this.numLanes - 1; i++) {
            const x = lerp(this.left, this.right, i / this.numLanes);
            context.beginPath();
            context.moveTo(x, startY);
            context.lineTo(x, endY);
            context.stroke();
        }

        // 3. Solid White Road Borders
        context.setLineDash([]);
        context.lineWidth = 5;
        context.strokeStyle = "#ffffff";

        context.beginPath();
        context.moveTo(this.left, startY);
        context.lineTo(this.left, endY);
        context.stroke();

        context.beginPath();
        context.moveTo(this.right, startY);
        context.lineTo(this.right, endY);
        context.stroke();

        context.restore();
    }
}
