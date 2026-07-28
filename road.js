/**
 * Road Architecture & Dynamic Geometry
 * Viewport-culled rendering, asphalt styling, lane calculations, and distance milestones.
 */

class Road {
    constructor(x, width, numLanes = 3) {
        this.numLanes = numLanes;
        this.updateDimensions(x, width);

        // Infinite road ceiling/floor limits
        const inf = 1000000;
        this.top = -inf;
        this.bottom = inf;
    }

    updateDimensions(x, width) {
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

        this.laneDividers = [];
        for (let i = 1; i <= this.numLanes - 1; i++) {
            const laneX = lerp(this.left, this.right, i / this.numLanes);
            this.laneDividers.push([{ x: laneX, y: -inf }, { x: laneX, y: inf }]);
        }
    }

    getLaneCenter(laneIndex) {
        const clampedIndex = clamp(laneIndex, 0, this.numLanes - 1);
        return this.left + this.laneWidth / 2 + clampedIndex * this.laneWidth;
    }

    /**
     * Viewport-culled road renderer. Only renders line segments within view range.
     */
    draw(context, viewTop = -2000, viewBottom = 2000) {
        context.save();

        // 1. Dark Asphalt Surface
        context.fillStyle = "#161625";
        context.fillRect(this.left, viewTop - 100, this.width, (viewBottom - viewTop) + 200);

        // 2. Outer Shoulder Strips
        context.fillStyle = "#10101c";
        context.fillRect(this.left - 20, viewTop - 100, 20, (viewBottom - viewTop) + 200);
        context.fillRect(this.right, viewTop - 100, 20, (viewBottom - viewTop) + 200);

        // 3. Dashed Lane Dividers (Viewport Culled)
        context.lineWidth = 4;
        context.strokeStyle = "rgba(255, 255, 255, 0.4)";
        context.setLineDash([24, 24]);

        for (let i = 1; i <= this.numLanes - 1; i++) {
            const x = lerp(this.left, this.right, i / this.numLanes);
            context.beginPath();
            context.moveTo(x, viewTop - 50);
            context.lineTo(x, viewBottom + 50);
            context.stroke();
        }

        // 4. Solid Glowing Road Borders
        context.setLineDash([]);
        context.lineWidth = 6;
        context.strokeStyle = "#38bdf8"; // Neon Cyan Blue
        context.shadowColor = "#38bdf8";
        context.shadowBlur = 12;

        // Left Border
        context.beginPath();
        context.moveTo(this.left, viewTop - 50);
        context.lineTo(this.left, viewBottom + 50);
        context.stroke();

        // Right Border
        context.beginPath();
        context.moveTo(this.right, viewTop - 50);
        context.lineTo(this.right, viewBottom + 50);
        context.stroke();

        // Reset Glow Shadow
        context.shadowColor = "transparent";
        context.shadowBlur = 0;

        // 5. Distance Milestone Banners on Asphalt
        this.drawMilestones(context, viewTop, viewBottom);

        context.restore();
    }

    drawMilestones(context, viewTop, viewBottom) {
        const milestoneInterval = 250; // Every 250 meters
        const startY = Math.floor(viewTop / milestoneInterval) * milestoneInterval;
        const endY = Math.ceil(viewBottom / milestoneInterval) * milestoneInterval;

        context.save();
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = "700 13px 'JetBrains Mono', monospace";

        for (let y = startY; y <= endY; y += milestoneInterval) {
            const meters = Math.round(-y);
            if (meters <= 0) continue;

            // Transverse Milestone Line
            context.strokeStyle = "rgba(56, 189, 248, 0.25)";
            context.lineWidth = 2;
            context.setLineDash([8, 8]);
            context.beginPath();
            context.moveTo(this.left, y);
            context.lineTo(this.right, y);
            context.stroke();

            // Milestone Badge
            const badgeText = `🚩 ${formatDistance(meters)}`;
            context.fillStyle = "rgba(15, 23, 42, 0.8)";
            context.fillRect(this.x - 55, y - 12, 110, 24);

            context.strokeStyle = "rgba(56, 189, 248, 0.4)";
            context.setLineDash([]);
            context.strokeRect(this.x - 55, y - 12, 110, 24);

            context.fillStyle = "#38bdf8";
            context.fillText(badgeText, this.x, y);
        }

        context.restore();
    }
}
