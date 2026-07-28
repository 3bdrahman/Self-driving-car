/**
 * Utility Functions for Self-Driving Car Simulation
 * High-performance vector math, intersection tests, and color helpers.
 */

function lerp(A, B, t) {
    return A + (B - A) * t;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function formatDistance(meters) {
    if (meters >= 1000) {
        return (meters / 1000).toFixed(2) + " km";
    }
    return Math.round(meters) + " m";
}

/**
 * Computes line segment intersection between AB and CD.
 * Returns { x, y, offset } or null.
 */
function getIntersection(A, B, C, D) {
    const tTop = (D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x);
    const uTop = (C.y - A.y) * (A.x - B.x) - (C.x - A.x) * (A.y - B.y);
    const bottom = (D.y - C.y) * (B.x - A.x) - (D.x - C.x) * (B.y - A.y);

    if (bottom !== 0) {
        const t = tTop / bottom;
        const u = uTop / bottom;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: lerp(A.x, B.x, t),
                y: lerp(A.y, B.y, t),
                offset: t
            };
        }
    }
    return null;
}

/**
 * Fast AABB (Axis-Aligned Bounding Box) intersection test.
 */
function aabbIntersects(poly1, poly2) {
    let minX1 = Infinity, maxX1 = -Infinity, minY1 = Infinity, maxY1 = -Infinity;
    for (let i = 0; i < poly1.length; i++) {
        const p = poly1[i];
        if (p.x < minX1) minX1 = p.x;
        if (p.x > maxX1) maxX1 = p.x;
        if (p.y < minY1) minY1 = p.y;
        if (p.y > maxY1) maxY1 = p.y;
    }

    let minX2 = Infinity, maxX2 = -Infinity, minY2 = Infinity, maxY2 = -Infinity;
    for (let i = 0; i < poly2.length; i++) {
        const p = poly2[i];
        if (p.x < minX2) minX2 = p.x;
        if (p.x > maxX2) maxX2 = p.x;
        if (p.y < minY2) minY2 = p.y;
        if (p.y > maxY2) maxY2 = p.y;
    }

    return !(maxX1 < minX2 || minX1 > maxX2 || maxY1 < minY2 || minY1 > maxY2);
}

/**
 * Polygon intersection check with AABB broadphase optimization.
 * poly: array of Point objects [{x,y}, ...] representing closed polygon
 * borders: array of 2-point line segments [[p1, p2], ...] or closed polygon
 */
function polygonIntersects(poly1, poly2) {
    // 1. Broadphase AABB test
    if (!aabbIntersects(poly1, poly2)) {
        return false;
    }

    // 2. Narrowphase line-segment intersection checks
    const len1 = poly1.length;
    const len2 = poly2.length;

    for (let i = 0; i < len1; i++) {
        const p1 = poly1[i];
        const p2 = poly1[(i + 1) % len1];

        for (let j = 0; j < len2; j++) {
            const p3 = poly2[j];
            const p4 = poly2[(j + 1) % len2];

            if (getIntersection(p1, p2, p3, p4)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Checks intersection between polygon and a line segment [[p1, p2]]
 */
function polygonIntersectsSegment(poly, segment) {
    const len = poly.length;
    for (let i = 0; i < len; i++) {
        if (getIntersection(poly[i], poly[(i + 1) % len], segment[0], segment[1])) {
            return true;
        }
    }
    return false;
}

/**
 * Converts a activation or weight value [-1..1] into an RGBA color string.
 * Negative values -> Red/Yellow glow, Positive values -> Blue/Cyan glow.
 */
function getRGB(val) {
    const alpha = Math.min(1, Math.abs(val));
    const R = val < 0 ? 255 : 0;
    const G = val < 0 ? Math.round(100 * alpha) : Math.round(220 * alpha);
    const B = val > 0 ? 255 : 0;
    return `rgba(${R}, ${G}, ${B}, ${alpha.toFixed(2)})`;
}

/**
 * Curated color palette for traffic vehicles.
 */
const TRAFFIC_COLORS = [
    "#ef4444", // Crimson Red
    "#3b82f6", // Electric Blue
    "#f59e0b", // Amber Yellow
    "#10b981", // Emerald Green
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4"  // Cyan
];

function getRandomTrafficColor() {
    return TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
}