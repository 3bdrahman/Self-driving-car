/**
 * Utility Functions & AABB Spatial Collision Detection
 */

function lerp(A, B, t) {
    return A + (B - A) * t;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

/**
 * Formats distance values cleanly:
 * Uses meters (e.g. "650m") for < 1000m, and converts to kilometers (e.g. "1.25km") for >= 1000m.
 */
function formatDistance(meters) {
    const val = Math.max(0, Math.round(meters));
    if (val < 1000) {
        return `${val}m`;
    }
    return `${(val / 1000).toFixed(2)}km`;
}

/**
 * Returns distinct amber/crimson/red colors for traffic obstacles,
 * ensuring traffic never collides visually with green or purple swarm cars.
 */
function getRandomTrafficColor() {
    const trafficPalette = [
        "#e11d48", // Crimson Red
        "#ea580c", // Dark Orange
        "#d97706", // Amber Gold
        "#475569", // Slate Grey
        "#dc2626"  // Bright Red
    ];
    return trafficPalette[Math.floor(Math.random() * trafficPalette.length)];
}

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

function polygonIntersects(poly1, poly2) {
    for (let i = 0; i < poly1.length; i++) {
        for (let j = 0; j < poly2.length; j++) {
            const touch = getIntersection(
                poly1[i],
                poly1[(i + 1) % poly1.length],
                poly2[j],
                poly2[(j + 1) % poly2.length]
            );
            if (touch) return true;
        }
    }
    return false;
}

function polygonIntersectsSegment(poly, segment) {
    for (let i = 0; i < poly.length; i++) {
        const touch = getIntersection(
            poly[i],
            poly[(i + 1) % poly.length],
            segment[0],
            segment[1]
        );
        if (touch) return true;
    }
    return false;
}

function getRGB(value) {
    const alpha = Math.abs(value);
    const R = value < 0 ? 255 : 0;
    const G = value > 0 ? 255 : 0;
    const B = value > 0 ? 200 : 0;
    return `rgba(${R},${G},${B},${alpha})`;
}