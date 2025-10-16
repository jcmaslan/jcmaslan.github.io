# Entropy Emergence: Algorithmic Art Instructions

## Conceptual Overview

Create algorithmic art that visualizes **the transformation of noise into signal through temporal evolution**. The artwork should convey how chaos gradually crystallizes into organized, meaningful patterns over time - a visual metaphor for information theory's core principle.

## Visual Design Specifications

### Color Palette
- **Signal Colors**: Converge to brand colors
  - Camio Orange: `#F7931E` (HSB: 30°)
  - Camio Green: `#5ED341` (HSB: 108°)
- **Background**: Dark (`#080808`)
- **Noise Phase**: Full spectrum, random chaotic colors
- **Signal Phase**: Colors converge to brand palette (50/50 split between orange and green)

### Color Transition Logic
```javascript
// Assign each particle a color identity (orange or green)
this.camioColor = random() > 0.5 ? 'orange' : 'green';

// In display function:
const camioOrange = 30;  // HSB hue
const camioGreen = 108;   // HSB hue
let targetHue = (this.camioColor === 'orange') ? camioOrange : camioGreen;

// Blend from noise to signal
let noiseHue = (this.hueOffset + step * 0.5) % 360;
let convergence = pow(blendFactor, 1.5);  // Dramatic late-stage convergence
let hue = lerp(noiseHue, targetHue, convergence);
```

### Particle System
- **Count**: 2000-8000 particles (default: 4000)
- **Motion**: Blend of noise (chaotic) and signal (organized flow fields)
- **Blend Function**: Sigmoid transition from noise to signal
  ```javascript
  let blendFactor = 1 / (1 + Math.exp(-10 * (progress - 0.5)));
  ```

### Logo Integration
- **Asset**: Brand logo SVG (e.g., `camio-logo-badge-text.svg`)
- **Size**: 10% of viewport height (`10vh`)
- **Position**: Absolute center (convergence point)
- **Appearance**: Expands from scale(0) to scale(1) as signal emerges
- **Timing**: Starts appearing at 30% convergence, fully visible at 100%
- **Implementation**: Embedded SVG as DOM element (not raster) to maintain vector quality

```css
#brand-logo {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    transform-origin: center center;
    height: 10vh;
    width: auto;
    opacity: 0;
    pointer-events: none;
    z-index: 5;
}
```

```javascript
// Scale and fade in together
let progress = (blendFactor - 0.3) / 0.7;
logoElement.style.opacity = progress;
logoElement.style.transform = `translate(-50%, -50%) scale(${progress})`;
```

## User Interface Design

### Display Mode
- **Default**: Fullscreen art, controls hidden
- **Toggle**: Floating circular button (top-left) to show/hide controls
- **Controls Panel**: Fixed overlay sidebar with seed navigation, parameters, and actions

### Control Panel Structure
```
├── Seed Navigation (always visible)
│   ├── Seed display (numeric)
│   ├── Previous / Next buttons
│   └── Random button
├── Parameters (tunable values)
│   ├── Particle Count
│   ├── Transition Rate
│   ├── Noise Intensity
│   ├── Signal Strength
│   └── Evolution Steps
└── Actions
    └── Reset button
```

### URL Parameters
Support query string seed parameter for shareable, reproducible variations:
```
artwork.html?s=apple
artwork.html?s=camio
artwork.html?s=client-name-2024
```

**Implementation:**
```javascript
function hashString(str) {
    // djb2 hash algorithm
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash) % 999999 + 1;
}

function getInitialSeed() {
    const urlParams = new URLSearchParams(window.location.search);
    const seedString = urlParams.get('s');
    return seedString ? hashString(seedString) : 12345;
}
```

## Technical Implementation Details

### Canvas Setup
- **Size**: Square canvas, scales to fit window (min of width/height)
- **Responsive**: Resizes on window resize
- **Background**: Dark to emphasize bright signal colors

### Particle Physics
```javascript
class Particle {
    constructor() {
        // Noise parameters (chaos)
        this.noiseOffsetX = random(10000);
        this.noiseOffsetY = random(10000);

        // Signal parameters (order)
        this.signalPhaseX = random(TWO_PI);
        this.signalPhaseY = random(TWO_PI);

        // Color identity
        this.camioColor = random() > 0.5 ? 'orange' : 'green';
    }

    update(step, blendFactor) {
        // NOISE: High-frequency chaotic motion
        let noiseX = (noise(this.noiseOffsetX + step * 0.02) - 0.5) * noiseIntensity * 20;
        let noiseY = (noise(this.noiseOffsetY + step * 0.02) - 0.5) * noiseIntensity * 20;

        // SIGNAL: Low-frequency organized flow
        let signalFieldX = sin(this.startX * 0.003 + time) * signalStrength;
        let signalFieldY = cos(this.startY * 0.003 + time) * signalStrength;

        // Add swirling attractor toward center
        let dx = this.x - width / 2;
        let dy = this.y - height / 2;
        let angle = atan2(dy, dx);
        signalFieldX += cos(angle + time) * signalStrength * 15;
        signalFieldY += sin(angle + time) * signalStrength * 15;

        // BLEND
        let moveX = lerp(noiseX, signalFieldX, blendFactor);
        let moveY = lerp(noiseY, signalFieldY, blendFactor);

        this.x += moveX;
        this.y += moveY;
    }
}
```

### Logo Embedding (Avoiding CORS)
Embed SVG directly in HTML rather than loading from file:

```html
<div id="canvas-container">
    <!-- p5.js canvas renders here -->

    <!-- Brand logo overlay -->
    <svg id="brand-logo" viewBox="..." xmlns="...">
        <!-- SVG content here -->
    </svg>
</div>
```

**Key Points:**
- SVG as DOM element, not loaded via p5.js `loadImage()`
- Maintains vector quality (no pixelation)
- Preserves aspect ratio automatically via `viewBox`
- No external file dependencies or CORS issues

### Animation Loop
```javascript
function draw() {
    // Calculate convergence progress (sigmoid)
    let progress = currentStep / maxSteps;
    let blendFactor = 1 / (1 + Math.exp(-10 * (progress - 0.5)));

    // Update particles
    for (let particle of particles) {
        particle.update(currentStep, blendFactor);
        particle.display(currentStep, blendFactor);
    }

    // Update logo (scale and opacity)
    if (blendFactor > 0.3) {
        let logoProgress = (blendFactor - 0.3) / 0.7;
        logoElement.style.opacity = logoProgress;
        logoElement.style.transform = `translate(-50%, -50%) scale(${logoProgress})`;
    }

    currentStep++;
}
```

## Artistic Philosophy

### Metaphor
The artwork embodies **information theory's core principle**: extracting meaningful signal from chaotic noise through temporal processing. The brand identity literally "emerges" from entropy as the organizing principle that crystallizes chaos into coherent patterns.

### Key Visual Moments
1. **0-30% Progress**: Pure chaos - random colors, scattered motion
2. **30-70% Progress**: Organization emerges - brand colors appear, flows form, logo begins to materialize
3. **70-100% Progress**: Coherence achieved - brand colors dominate, logo fully visible, organized flow patterns

### Parameters for Artistic Control
- **Particle Count**: Visual density (higher = more texture)
- **Transition Rate**: Speed of chaos-to-order transformation
- **Noise Intensity**: How chaotic the initial state is
- **Signal Strength**: How organized the final state becomes
- **Evolution Steps**: Duration of the transformation

## Replication Checklist

When creating similar artwork:

- [ ] Define conceptual transformation (what emerges from what?)
- [ ] Choose brand colors for signal convergence
- [ ] Implement particle system with noise + signal motion
- [ ] Use sigmoid blend function for smooth transition
- [ ] Embed brand logo SVG as DOM element
- [ ] Implement scale + fade animation for logo
- [ ] Add query string seed parameter support
- [ ] Create fullscreen default view with hidden controls
- [ ] Implement seed navigation (prev/next/random)
- [ ] Add parameter controls for artistic tuning
- [ ] Ensure self-contained HTML (no external dependencies except p5.js CDN)

## File Structure

Single self-contained HTML file:
```
artwork.html
├── <style> (Anthropic branding, responsive layout)
├── <body>
│   ├── Toggle button (hamburger menu)
│   ├── Sidebar (controls panel, hidden by default)
│   └── Canvas container
│       ├── p5.js canvas (generative art)
│       └── Brand logo SVG (overlay)
└── <script>
    ├── String hashing
    ├── Parameter management
    ├── p5.js algorithm
    │   ├── Particle class
    │   ├── setup()
    │   ├── draw()
    │   └── initializeSystem()
    └── UI handlers
```

## Example Usage

**Default:**
```
entropy_emergence.html
→ Seed: 12345 (default)
```

**String Seed:**
```
entropy_emergence.html?s=camio
→ Seed: 210833 (hash of "camio")
```

**Seed Navigation:**
- Use Previous/Next to explore sequential variations
- Use Random for unexpected discoveries
- Manual seed input for specific reproductions

---

**Note**: This approach creates living, breathing algorithmic art where each seed reveals a unique facet of the chaos-to-order transformation while maintaining the core visual metaphor of brand identity emerging from entropy.
