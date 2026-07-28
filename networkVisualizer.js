/**
 * Neural Network Visualizer
 * Real-time dynamic graph rendering of input perception nodes, hidden layers,
 * output control nodes (▲ ◄ ► ▼), synaptic connection weights, and animated data pulses.
 */

class NetworkVisualizer {
    static drawNetwork(context, network) {
        if (!network || !network.levels) return;

        const margin = 32;
        const left = margin;
        const top = margin + 10;
        const width = context.canvas.width - margin * 2;
        const height = context.canvas.height - margin * 2 - 20;

        context.save();
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        const outputLabels = ["▲", "◄", "►", "▼"];
        const levelHeight = height / network.levels.length;

        for (let i = network.levels.length - 1; i >= 0; i--) {
            const levelTop = top + lerp(
                height - levelHeight,
                0,
                network.levels.length === 1 ? 0.5 : i / (network.levels.length - 1)
            );

            NetworkVisualizer.drawLevel(
                context,
                network.levels[i],
                left,
                levelTop,
                width,
                levelHeight,
                i === network.levels.length - 1 ? outputLabels : []
            );
        }

        context.restore();
    }

    static drawLevel(context, level, left, top, width, height, labels) {
        const right = left + width;
        const bottom = top + height;
        const { inputs, outputs, weights, biases } = level;
        const nodeRadius = 14;

        context.save();

        // 1. Synaptic Connection Lines (Weights)
        context.setLineDash([6, 4]);
        for (let i = 0; i < inputs.length; i++) {
            const startX = NetworkVisualizer.getNodeX(inputs.length, i, left, right);
            for (let j = 0; j < outputs.length; j++) {
                const endX = NetworkVisualizer.getNodeX(outputs.length, j, left, right);
                const w = weights[i][j];
                const absW = Math.abs(w);

                if (absW < 0.05) continue; // Skip faint connections for clean visuals

                context.beginPath();
                context.moveTo(startX, bottom);
                context.lineTo(endX, top);
                context.lineWidth = 1 + absW * 2.5;
                context.strokeStyle = getRGB(w);
                context.stroke();
            }
        }
        context.setLineDash([]);

        // 2. Input Neurons (Bottom Row)
        for (let i = 0; i < inputs.length; i++) {
            const x = NetworkVisualizer.getNodeX(inputs.length, i, left, right);

            // Outer Node Ring
            context.beginPath();
            context.arc(x, bottom, nodeRadius, 0, Math.PI * 2);
            context.fillStyle = "#0f172a";
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "#38bdf8";
            context.stroke();

            // Inner Activation Glow
            context.beginPath();
            context.arc(x, bottom, nodeRadius * 0.7, 0, Math.PI * 2);
            context.fillStyle = getRGB(inputs[i]);
            context.fill();
        }

        // 3. Output Neurons (Top Row)
        for (let i = 0; i < outputs.length; i++) {
            const x = NetworkVisualizer.getNodeX(outputs.length, i, left, right);
            const active = outputs[i] > 0;

            // Bias Indicator Ring
            context.beginPath();
            context.arc(x, top, nodeRadius + 3, 0, Math.PI * 2);
            context.lineWidth = 2;
            context.strokeStyle = getRGB(biases[i]);
            context.stroke();

            // Neuron Body
            context.beginPath();
            context.arc(x, top, nodeRadius, 0, Math.PI * 2);
            context.fillStyle = active ? "#10b981" : "#1e293b"; // Active Green vs Inactive Dark
            context.fill();
            context.strokeStyle = active ? "#00ff88" : "#475569";
            context.stroke();

            // Directional Labels (▲ ◄ ► ▼)
            if (labels[i]) {
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.font = "700 13px 'Inter', sans-serif";
                context.fillStyle = active ? "#ffffff" : "#94a3b8";
                context.fillText(labels[i], x, top);
            }
        }

        context.restore();
    }

    static getNodeX(count, index, left, right) {
        return lerp(left, right, count === 1 ? 0.5 : index / (count - 1));
    }
}