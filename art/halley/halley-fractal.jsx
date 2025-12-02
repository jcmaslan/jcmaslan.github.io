function HalleyFractal() {
  const canvasRef = useRef(null);
  const isInitialized = useRef(false);
  
  // Parse URL hash on initial load
  const getInitialState = () => {
    const defaults = {
      resolution: 300,
      formula: 'z³ - 1',
      maxIter: 50,
      colorScheme: 'rainbow',
      bounds: { minX: -3, maxX: 3, minY: -3, maxY: 3 },
      aspectRatio: '1:1'
    };

    if (typeof window === 'undefined') return defaults;

    try {
      const hash = window.location.hash.slice(1);
      if (!hash) return defaults;

      const params = new URLSearchParams(hash);

      return {
        resolution: parseInt(params.get('res')) || defaults.resolution,
        formula: params.get('f') ? decodeURIComponent(params.get('f')) : defaults.formula,
        maxIter: parseInt(params.get('iter')) || defaults.maxIter,
        colorScheme: params.get('color') || defaults.colorScheme,
        aspectRatio: params.get('aspect') || defaults.aspectRatio,
        bounds: {
          minX: parseFloat(params.get('x1')) || defaults.bounds.minX,
          maxX: parseFloat(params.get('x2')) || defaults.bounds.maxX,
          minY: parseFloat(params.get('y1')) || defaults.bounds.minY,
          maxY: parseFloat(params.get('y2')) || defaults.bounds.maxY
        }
      };
    } catch (e) {
      return defaults;
    }
  };

  const initialState = getInitialState();

  const [resolution, setResolution] = useState(initialState.resolution);
  const [formula, setFormula] = useState(initialState.formula);
  const [maxIter, setMaxIter] = useState(initialState.maxIter);
  const [colorScheme, setColorScheme] = useState(initialState.colorScheme);
  const [bounds, setBounds] = useState(initialState.bounds);
  const [aspectRatio, setAspectRatio] = useState(initialState.aspectRatio);

  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [iterationData, setIterationData] = useState(null);
  const [showCopied, setShowCopied] = useState(false);

  // Calculate canvas dimensions based on aspect ratio
  const canvasDimensions = useMemo(() => {
    const ratios = {
      '1:1': { width: resolution, height: resolution },
      '4:3': { width: resolution, height: Math.round(resolution * 3 / 4) },
      '16:9': { width: resolution, height: Math.round(resolution * 9 / 16) },
      '21:9': { width: resolution, height: Math.round(resolution * 9 / 21) },
      '9:16': { width: Math.round(resolution * 9 / 16), height: resolution }
    };
    return ratios[aspectRatio] || ratios['1:1'];
  }, [resolution, aspectRatio]);

  // Update URL hash when state changes
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }

    const params = new URLSearchParams();
    params.set('f', encodeURIComponent(formula));
    params.set('res', resolution.toString());
    params.set('aspect', aspectRatio);
    params.set('iter', maxIter.toString());
    params.set('color', colorScheme);
    params.set('x1', bounds.minX.toFixed(10));
    params.set('x2', bounds.maxX.toFixed(10));
    params.set('y1', bounds.minY.toFixed(10));
    params.set('y2', bounds.maxY.toFixed(10));

    const newHash = params.toString();
    if (window.location.hash.slice(1) !== newHash) {
      window.history.replaceState(null, '', `#${newHash}`);
    }
  }, [formula, resolution, aspectRatio, maxIter, colorScheme, bounds]);

  // Copy URL to clipboard
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  // Complex number operations
  const cAdd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
  const cSub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
  const cMul = (a, b) => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  });
  const cDiv = (a, b) => {
    const denom = b.re * b.re + b.im * b.im;
    if (denom === 0) return { re: Infinity, im: Infinity };
    return {
      re: (a.re * b.re + a.im * b.im) / denom,
      im: (a.im * b.re - a.re * b.im) / denom
    };
  };
  const cPow = (z, n) => {
    let result = { re: 1, im: 0 };
    for (let i = 0; i < n; i++) {
      result = cMul(result, z);
    }
    return result;
  };
  const cMag = (z) => Math.sqrt(z.re * z.re + z.im * z.im);

  // Complex trigonometric and exponential functions
  const cSin = (z) => ({
    re: Math.sin(z.re) * Math.cosh(z.im),
    im: Math.cos(z.re) * Math.sinh(z.im)
  });
  
  const cCos = (z) => ({
    re: Math.cos(z.re) * Math.cosh(z.im),
    im: -Math.sin(z.re) * Math.sinh(z.im)
  });
  
  const cExp = (z) => {
    const expRe = Math.exp(z.re);
    return {
      re: expRe * Math.cos(z.im),
      im: expRe * Math.sin(z.im)
    };
  };

  const cSinh = (z) => ({
    re: Math.sinh(z.re) * Math.cos(z.im),
    im: Math.cosh(z.re) * Math.sin(z.im)
  });

  const cCosh = (z) => ({
    re: Math.cosh(z.re) * Math.cos(z.im),
    im: Math.sinh(z.re) * Math.sin(z.im)
  });

  // Function definitions with their derivatives and descriptions
  const functions = {
    'z³ - 1': {
      f: (z) => cSub(cPow(z, 3), { re: 1, im: 0 }),
      df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
      d2f: (z) => cMul({ re: 6, im: 0 }, z),
      desc: 'Classic 3-fold symmetry; clean, well-defined basins'
    },
    'z⁴ - 1': {
      f: (z) => cSub(cPow(z, 4), { re: 1, im: 0 }),
      df: (z) => cMul({ re: 4, im: 0 }, cPow(z, 3)),
      d2f: (z) => cMul({ re: 12, im: 0 }, cPow(z, 2)),
      desc: 'Fourfold symmetry; crisp, stable attraction basins'
    },
    'z⁵ - 1': {
      f: (z) => cSub(cPow(z, 5), { re: 1, im: 0 }),
      df: (z) => cMul({ re: 5, im: 0 }, cPow(z, 4)),
      d2f: (z) => cMul({ re: 20, im: 0 }, cPow(z, 3)),
      desc: 'Fivefold star-like patterns; more intricate boundaries'
    },
    'z⁶ - 1': {
      f: (z) => cSub(cPow(z, 6), { re: 1, im: 0 }),
      df: (z) => cMul({ re: 6, im: 0 }, cPow(z, 5)),
      d2f: (z) => cMul({ re: 30, im: 0 }, cPow(z, 4)),
      desc: 'Sixfold symmetry; general n-symmetric basins'
    },
    'z⁷ - 1': {
      f: (z) => cSub(cPow(z, 7), { re: 1, im: 0 }),
      df: (z) => cMul({ re: 7, im: 0 }, cPow(z, 6)),
      d2f: (z) => cMul({ re: 42, im: 0 }, cPow(z, 5)),
      desc: 'Sevenfold symmetry; good for exploring scaling'
    },
    'z⁸ - 1': {
      f: (z) => cSub(cPow(z, 8), { re: 1, im: 0 }),
      df: (z) => cMul({ re: 8, im: 0 }, cPow(z, 7)),
      d2f: (z) => cMul({ re: 56, im: 0 }, cPow(z, 6)),
      desc: 'Eightfold symmetry; intricate radial patterns'
    },
    'z³ - 0.5': {
      f: (z) => cSub(cPow(z, 3), { re: 0.5, im: 0 }),
      df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
      d2f: (z) => cMul({ re: 6, im: 0 }, z),
      desc: 'Mildly broken symmetry; produces chaotic distortions'
    },
    'z⁴ - 2': {
      f: (z) => cSub(cPow(z, 4), { re: 2, im: 0 }),
      df: (z) => cMul({ re: 4, im: 0 }, cPow(z, 3)),
      d2f: (z) => cMul({ re: 12, im: 0 }, cPow(z, 2)),
      desc: 'Strong symmetry breaking; wide chaotic filaments'
    },
    'z⁴ + z² - 1': {
      f: (z) => cSub(cAdd(cPow(z, 4), cPow(z, 2)), { re: 1, im: 0 }),
      df: (z) => cAdd(cMul({ re: 4, im: 0 }, cPow(z, 3)), cMul({ re: 2, im: 0 }, z)),
      d2f: (z) => cAdd(cMul({ re: 12, im: 0 }, cPow(z, 2)), { re: 2, im: 0 }),
      desc: 'Complex basin boundaries with multiple attractors'
    },
    'z⁵ + z - 1': {
      f: (z) => cSub(cAdd(cPow(z, 5), z), { re: 1, im: 0 }),
      df: (z) => cAdd(cMul({ re: 5, im: 0 }, cPow(z, 4)), { re: 1, im: 0 }),
      d2f: (z) => cMul({ re: 20, im: 0 }, cPow(z, 3)),
      desc: 'Multiple competing roots; tangled, intricate boundaries'
    },
    'z³ - z': {
      f: (z) => cSub(cPow(z, 3), z),
      df: (z) => cSub(cMul({ re: 3, im: 0 }, cPow(z, 2)), { re: 1, im: 0 }),
      d2f: (z) => cMul({ re: 6, im: 0 }, z),
      desc: 'Extra critical points; highly detailed dendritic structures'
    },
    'z⁵ - z²': {
      f: (z) => cSub(cPow(z, 5), cPow(z, 2)),
      df: (z) => cSub(cMul({ re: 5, im: 0 }, cPow(z, 4)), cMul({ re: 2, im: 0 }, z)),
      d2f: (z) => cSub(cMul({ re: 20, im: 0 }, cPow(z, 3)), { re: 2, im: 0 }),
      desc: 'Rich interactions between roots; very fine detail'
    },
    'z⁵ - z³': {
      f: (z) => cSub(cPow(z, 5), cPow(z, 3)),
      df: (z) => cSub(cMul({ re: 5, im: 0 }, cPow(z, 4)), cMul({ re: 3, im: 0 }, cPow(z, 2))),
      d2f: (z) => cSub(cMul({ re: 20, im: 0 }, cPow(z, 3)), cMul({ re: 6, im: 0 }, z)),
      desc: 'Intricate dendritic structures with rich detail'
    },
    'z⁶ + z³ - 1': {
      f: (z) => cSub(cAdd(cPow(z, 6), cPow(z, 3)), { re: 1, im: 0 }),
      df: (z) => cAdd(cMul({ re: 6, im: 0 }, cPow(z, 5)), cMul({ re: 3, im: 0 }, cPow(z, 2))),
      d2f: (z) => cAdd(cMul({ re: 30, im: 0 }, cPow(z, 4)), cMul({ re: 6, im: 0 }, z)),
      desc: 'Complex root layout; dense fractal features'
    },
    'z³ + (0.3+0.5i)': {
      f: (z) => cAdd(cPow(z, 3), { re: 0.3, im: 0.5 }),
      df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
      d2f: (z) => cMul({ re: 6, im: 0 }, z),
      desc: 'Asymmetric, Julia-like basin patterns'
    },
    'z³ + (-0.2+0.8i)': {
      f: (z) => cAdd(cPow(z, 3), { re: -0.2, im: 0.8 }),
      df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
      d2f: (z) => cMul({ re: 6, im: 0 }, z),
      desc: 'Strong asymmetry; chaotic microstructures'
    },
    'z³ + (1+i)': {
      f: (z) => cAdd(cPow(z, 3), { re: 1, im: 1 }),
      df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
      d2f: (z) => cMul({ re: 6, im: 0 }, z),
      desc: 'Highly distorted basins; dramatic asymmetry'
    },
    'z³ + (0.5+0.2i)': {
      f: (z) => cAdd(cPow(z, 3), { re: 0.5, im: 0.2 }),
      df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
      d2f: (z) => cMul({ re: 6, im: 0 }, z),
      desc: 'General complex-parameter form; tunable chaos'
    },
    'z⁴ + (0.2+0.4i)': {
      f: (z) => cAdd(cPow(z, 4), { re: 0.2, im: 0.4 }),
      df: (z) => cMul({ re: 4, im: 0 }, cPow(z, 3)),
      d2f: (z) => cMul({ re: 12, im: 0 }, cPow(z, 2)),
      desc: 'Four-fold symmetry with complex asymmetry'
    },
    '(z² + 1)/(z³ - 1)': {
      f: (z) => cDiv(cAdd(cPow(z, 2), { re: 1, im: 0 }), cSub(cPow(z, 3), { re: 1, im: 0 })),
      df: (z) => {
        const num = cAdd(cPow(z, 2), { re: 1, im: 0 });
        const den = cSub(cPow(z, 3), { re: 1, im: 0 });
        const dnum = cMul({ re: 2, im: 0 }, z);
        const dden = cMul({ re: 3, im: 0 }, cPow(z, 2));
        return cDiv(cSub(cMul(dnum, den), cMul(num, dden)), cMul(den, den));
      },
      d2f: (z) => {
        // Numerical approximation for complex second derivative
        const h = 0.0001;
        const f = (w) => {
          const num = cAdd(cPow(w, 2), { re: 1, im: 0 });
          const den = cSub(cPow(w, 3), { re: 1, im: 0 });
          const dnum = cMul({ re: 2, im: 0 }, w);
          const dden = cMul({ re: 3, im: 0 }, cPow(w, 2));
          return cDiv(cSub(cMul(dnum, den), cMul(num, dden)), cMul(den, den));
        };
        const fp = f(cAdd(z, { re: h, im: 0 }));
        const fm = f(cSub(z, { re: h, im: 0 }));
        return cDiv(cSub(fp, fm), { re: 2 * h, im: 0 });
      },
      desc: 'Roots and poles compete, producing exotic tilings'
    },
    '(z³ - 2)/(z - 1)': {
      f: (z) => cDiv(cSub(cPow(z, 3), { re: 2, im: 0 }), cSub(z, { re: 1, im: 0 })),
      df: (z) => {
        const num = cSub(cPow(z, 3), { re: 2, im: 0 });
        const den = cSub(z, { re: 1, im: 0 });
        const dnum = cMul({ re: 3, im: 0 }, cPow(z, 2));
        const dden = { re: 1, im: 0 };
        return cDiv(cSub(cMul(dnum, den), cMul(num, dden)), cMul(den, den));
      },
      d2f: (z) => {
        const h = 0.0001;
        const df = (w) => {
          const num = cSub(cPow(w, 3), { re: 2, im: 0 });
          const den = cSub(w, { re: 1, im: 0 });
          const dnum = cMul({ re: 3, im: 0 }, cPow(w, 2));
          return cDiv(cSub(cMul(dnum, den), num), cMul(den, den));
        };
        const fp = df(cAdd(z, { re: h, im: 0 }));
        const fm = df(cSub(z, { re: h, im: 0 }));
        return cDiv(cSub(fp, fm), { re: 2 * h, im: 0 });
      },
      desc: 'Strong singularity at z=1; chaotic filaments'
    },
    'sin(z)': {
      f: (z) => cSin(z),
      df: (z) => cCos(z),
      d2f: (z) => cMul({ re: -1, im: 0 }, cSin(z)),
      desc: 'Infinite periodic zeros → repeating tile-like patterns'
    },
    'cos(z) - 1': {
      f: (z) => cSub(cCos(z), { re: 1, im: 0 }),
      df: (z) => cMul({ re: -1, im: 0 }, cSin(z)),
      d2f: (z) => cMul({ re: -1, im: 0 }, cCos(z)),
      desc: 'Zeros at multiples of 2π; repeating basin cells'
    },
    'exp(z) - 1': {
      f: (z) => cSub(cExp(z), { re: 1, im: 0 }),
      df: (z) => cExp(z),
      d2f: (z) => cExp(z),
      desc: 'Infinite zeros with exponential growth; self-similar structure'
    },
    'z³ + sin(z)': {
      f: (z) => cAdd(cPow(z, 3), cSin(z)),
      df: (z) => cAdd(cMul({ re: 3, im: 0 }, cPow(z, 2)), cCos(z)),
      d2f: (z) => cSub(cMul({ re: 6, im: 0 }, z), cSin(z)),
      desc: 'Blends polynomial basins with sinusoidal distortions'
    },
    'z⁴ + exp(-z)': {
      f: (z) => cAdd(cPow(z, 4), cExp(cMul({ re: -1, im: 0 }, z))),
      df: (z) => cSub(cMul({ re: 4, im: 0 }, cPow(z, 3)), cExp(cMul({ re: -1, im: 0 }, z))),
      d2f: (z) => cAdd(cMul({ re: 12, im: 0 }, cPow(z, 2)), cExp(cMul({ re: -1, im: 0 }, z))),
      desc: 'Polynomial growth vs. exponential decay; unusual textures'
    },
    'sin(z²) - 1': {
      f: (z) => cSub(cSin(cPow(z, 2)), { re: 1, im: 0 }),
      df: (z) => cMul(cMul({ re: 2, im: 0 }, z), cCos(cPow(z, 2))),
      d2f: (z) => {
        const z2 = cPow(z, 2);
        const cos_z2 = cCos(z2);
        const sin_z2 = cSin(z2);
        const term1 = cMul({ re: 2, im: 0 }, cos_z2);
        const term2 = cMul(cMul({ re: -4, im: 0 }, cPow(z, 2)), sin_z2);
        return cAdd(term1, term2);
      },
      desc: 'Curved, chaotic zero sets; swirling fractal structures'
    },
    'sinh(z) - 1': {
      f: (z) => cSub(cSinh(z), { re: 1, im: 0 }),
      df: (z) => cCosh(z),
      d2f: (z) => cSinh(z),
      desc: 'Hyperbolic symmetries; different structure from trig functions'
    },
    'z·exp(z) - 1': {
      f: (z) => cSub(cMul(z, cExp(z)), { re: 1, im: 0 }),
      df: (z) => cAdd(cExp(z), cMul(z, cExp(z))),
      d2f: (z) => cAdd(cMul({ re: 2, im: 0 }, cExp(z)), cMul(z, cExp(z))),
      desc: 'Lambert W function related; exotic mixed patterns'
    }
  };

  // Color schemes
  const getColor = (iterations, maxIter, scheme) => {
    if (iterations >= maxIter) return { r: 0, g: 0, b: 0 };
    
    const t = iterations / maxIter;
    
    switch (scheme) {
      case 'rainbow': {
        const hue = t * 360;
        return hslToRgb(hue, 80, 50);
      }
      case 'fire': {
        return {
          r: Math.floor(Math.min(255, t * 3 * 255)),
          g: Math.floor(Math.max(0, Math.min(255, (t - 0.33) * 3 * 255))),
          b: Math.floor(Math.max(0, Math.min(255, (t - 0.66) * 3 * 255)))
        };
      }
      case 'ocean': {
        return {
          r: Math.floor(t * 100),
          g: Math.floor(100 + t * 155),
          b: Math.floor(150 + t * 105)
        };
      }
      case 'neon': {
        const hue = (t * 180 + 180) % 360;
        return hslToRgb(hue, 100, 50 + t * 30);
      }
      case 'grayscale': {
        const v = Math.floor(t * 255);
        return { r: v, g: v, b: v };
      }
      case 'plasma': {
        return {
          r: Math.floor(128 + 127 * Math.sin(t * Math.PI * 2)),
          g: Math.floor(128 + 127 * Math.sin(t * Math.PI * 2 + 2.094)),
          b: Math.floor(128 + 127 * Math.sin(t * Math.PI * 2 + 4.188))
        };
      }
      default:
        return { r: 255, g: 255, b: 255 };
    }
  };

  const hslToRgb = (h, s, l) => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
      r: Math.floor((r + m) * 255),
      g: Math.floor((g + m) * 255),
      b: Math.floor((b + m) * 255)
    };
  };

  // Halley's method iteration
  const halleyIterate = (z, func) => {
    const fz = func.f(z);
    const dfz = func.df(z);
    const d2fz = func.d2f(z);
    
    // Halley's formula: z - f(z)/f'(z) / (1 - f(z)*f''(z)/(2*f'(z)^2))
    const numerator = cDiv(fz, dfz);
    const dfz2 = cMul(dfz, dfz);
    const term = cDiv(cMul(fz, d2fz), cMul({ re: 2, im: 0 }, dfz2));
    const denominator = cSub({ re: 1, im: 0 }, term);
    const correction = cDiv(numerator, denominator);
    
    return cSub(z, correction);
  };

  const renderFractal = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const func = functions[formula];
    if (!func) return;

    setIsRendering(true);
    setProgress(0);

    const { width, height } = canvasDimensions;
    const imageData = ctx.createImageData(width, height);
    const epsilon = 0.00001;

    const { minX, maxX, minY, maxY } = bounds;
    const xStep = (maxX - minX) / width;
    const yStep = (maxY - minY) / height;

    // Process in chunks for responsiveness
    const chunkSize = Math.max(1, Math.floor(height / 32));

    for (let startRow = 0; startRow < height; startRow += chunkSize) {
      const endRow = Math.min(startRow + chunkSize, height);

      for (let py = startRow; py < endRow; py++) {
        for (let px = 0; px < width; px++) {
          const x = minX + px * xStep;
          const y = maxY - py * yStep;

          let z = { re: x, im: y };
          let iterations = 0;
          let prevMag = 0;

          for (let k = 0; k < maxIter; k++) {
            try {
              z = halleyIterate(z, func);
              const mag = z.re * z.re + z.im * z.im;

              if (k > 0 && Math.abs(mag - prevMag) < epsilon) {
                iterations = k;
                break;
              }
              prevMag = mag;
              iterations = k + 1;

              if (mag > 1e10 || isNaN(mag)) {
                iterations = maxIter;
                break;
              }
            } catch {
              iterations = maxIter;
              break;
            }
          }

          const color = getColor(iterations, maxIter, colorScheme);
          const idx = (py * width + px) * 4;
          imageData.data[idx] = color.r;
          imageData.data[idx + 1] = color.g;
          imageData.data[idx + 2] = color.b;
          imageData.data[idx + 3] = 255;
        }
      }

      setProgress(Math.floor((endRow / height) * 100));
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    ctx.putImageData(imageData, 0, 0);
    setIsRendering(false);
    setProgress(100);
  }, [formula, maxIter, colorScheme, bounds, canvasDimensions]);

  // Marching Squares lookup table for contour tracing
  const MS_EDGES = [
    [], // 0
    [[0, 0.5, 0.5, 1]], // 1
    [[0.5, 0, 1, 0.5]], // 2
    [[0, 0.5, 1, 0.5]], // 3
    [[0.5, 1, 1, 0.5]], // 4
    [[0, 0.5, 0.5, 0], [0.5, 1, 1, 0.5]], // 5 (saddle)
    [[0.5, 0, 0.5, 1]], // 6
    [[0, 0.5, 0.5, 0]], // 7
    [[0, 0.5, 0.5, 0]], // 8
    [[0.5, 0, 0.5, 1]], // 9
    [[0, 0.5, 0.5, 1], [0.5, 0, 1, 0.5]], // 10 (saddle)
    [[0.5, 0, 1, 0.5]], // 11
    [[0, 0.5, 1, 0.5]], // 12
    [[0.5, 1, 1, 0.5]], // 13
    [[0, 0.5, 0.5, 1]], // 14
    [] // 15
  ];

  // Trace contours using Marching Squares algorithm
  const traceContours = (grid, width, height, threshold) => {
    const segments = [];
    
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        // Get cell corners
        const tl = grid[y * width + x] >= threshold ? 1 : 0;
        const tr = grid[y * width + x + 1] >= threshold ? 1 : 0;
        const bl = grid[(y + 1) * width + x] >= threshold ? 1 : 0;
        const br = grid[(y + 1) * width + x + 1] >= threshold ? 1 : 0;
        
        const cellType = tl * 8 + tr * 4 + br * 2 + bl;
        const edges = MS_EDGES[cellType];
        
        for (const edge of edges) {
          segments.push({
            x1: x + edge[0],
            y1: y + edge[1],
            x2: x + edge[2],
            y2: y + edge[3]
          });
        }
      }
    }
    
    return segments;
  };

  // Connect segments into continuous paths
  const connectSegments = (segments) => {
    if (segments.length === 0) return [];
    
    const paths = [];
    const used = new Set();
    const tolerance = 0.01;
    
    const pointsMatch = (x1, y1, x2, y2) => 
      Math.abs(x1 - x2) < tolerance && Math.abs(y1 - y2) < tolerance;
    
    // Build adjacency map
    const findConnecting = (x, y, excludeIdx) => {
      for (let i = 0; i < segments.length; i++) {
        if (used.has(i) || i === excludeIdx) continue;
        const seg = segments[i];
        if (pointsMatch(x, y, seg.x1, seg.y1)) return { idx: i, reverse: false };
        if (pointsMatch(x, y, seg.x2, seg.y2)) return { idx: i, reverse: true };
      }
      return null;
    };
    
    for (let startIdx = 0; startIdx < segments.length; startIdx++) {
      if (used.has(startIdx)) continue;
      
      const path = [];
      let currentIdx = startIdx;
      let reverse = false;
      
      // Trace forward
      while (currentIdx !== null && !used.has(currentIdx)) {
        used.add(currentIdx);
        const seg = segments[currentIdx];
        
        if (reverse) {
          path.push({ x: seg.x2, y: seg.y2 });
          const next = findConnecting(seg.x1, seg.y1, currentIdx);
          if (next) {
            currentIdx = next.idx;
            reverse = next.reverse;
          } else {
            path.push({ x: seg.x1, y: seg.y1 });
            currentIdx = null;
          }
        } else {
          path.push({ x: seg.x1, y: seg.y1 });
          const next = findConnecting(seg.x2, seg.y2, currentIdx);
          if (next) {
            currentIdx = next.idx;
            reverse = next.reverse;
          } else {
            path.push({ x: seg.x2, y: seg.y2 });
            currentIdx = null;
          }
        }
      }
      
      if (path.length >= 2) {
        paths.push(path);
      }
    }
    
    return paths;
  };

  // Simplify path using Ramer-Douglas-Peucker algorithm
  const simplifyPath = (points, tolerance) => {
    if (points.length <= 2) return points;
    
    const sqDist = (p, a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
      const projX = a.x + t * dx;
      const projY = a.y + t * dy;
      return (p.x - projX) ** 2 + (p.y - projY) ** 2;
    };
    
    let maxDist = 0;
    let maxIdx = 0;
    const first = points[0];
    const last = points[points.length - 1];
    
    for (let i = 1; i < points.length - 1; i++) {
      const dist = sqDist(points[i], first, last);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }
    
    if (maxDist > tolerance * tolerance) {
      const left = simplifyPath(points.slice(0, maxIdx + 1), tolerance);
      const right = simplifyPath(points.slice(maxIdx), tolerance);
      return [...left.slice(0, -1), ...right];
    }
    
    return [first, last];
  };

  // Convert path to smooth SVG bezier curves using Catmull-Rom splines
  const pathToSmoothSVG = (points, closed = false) => {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)} L${points[1].x.toFixed(2)},${points[1].y.toFixed(2)}`;
    }
    
    let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
    
    // Use quadratic beziers for smoother curves
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      
      // Catmull-Rom to Bezier conversion
      const tension = 0.5;
      const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
      
      d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
    }
    
    if (closed) d += ' Z';
    return d;
  };

  // Generate traced SVG with smooth vector paths
  const generateTracedSVG = useCallback(async () => {
    const func = functions[formula];
    if (!func) return null;

    setIsExporting(true);
    setProgress(0);

    const { width, height } = canvasDimensions;
    const epsilon = 0.00001;

    const { minX, maxX, minY, maxY } = bounds;
    const xStep = (maxX - minX) / width;
    const yStep = (maxY - minY) / height;

    // Phase 1: Calculate iteration grid
    const iterations = new Float32Array(width * height);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const x = minX + px * xStep;
        const y = maxY - py * yStep;
        
        let z = { re: x, im: y };
        let iter = 0;
        let prevMag = 0;
        
        for (let k = 0; k < maxIter; k++) {
          try {
            z = halleyIterate(z, func);
            const mag = z.re * z.re + z.im * z.im;
            
            if (k > 0 && Math.abs(mag - prevMag) < epsilon) {
              iter = k;
              break;
            }
            prevMag = mag;
            iter = k + 1;
            
            if (mag > 1e10 || isNaN(mag)) {
              iter = maxIter;
              break;
            }
          } catch {
            iter = maxIter;
            break;
          }
        }


        iterations[py * width + px] = iter;
      }

      if (py % 32 === 0) {
        setProgress(Math.floor((py / height) * 40));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Phase 2: Find unique iteration levels and trace contours
    const iterSet = new Set(iterations);
    const iterLevels = Array.from(iterSet).sort((a, b) => a - b);
    
    // Group iteration levels into color bands
    const colorBands = new Map();
    for (const iter of iterLevels) {
      const color = getColor(iter, maxIter, colorScheme);
      const colorStr = `rgb(${color.r},${color.g},${color.b})`;
      if (!colorBands.has(colorStr)) {
        colorBands.set(colorStr, []);
      }
      colorBands.get(colorStr).push(iter);
    }
    
    // Phase 3: Generate paths for each color band
    const svgPaths = [];
    let bandIdx = 0;
    const totalBands = colorBands.size;
    
    for (const [color, levels] of colorBands) {
      if (color === 'rgb(0,0,0)') {
        bandIdx++;
        continue;
      }
      
      // Create binary mask for this color band
      const mask = new Uint8Array(width * height);
      for (let i = 0; i < iterations.length; i++) {
        mask[i] = levels.includes(iterations[i]) ? 1 : 0;
      }

      // Trace contours for this band
      const segments = traceContours(mask, width, height, 0.5);
      const paths = connectSegments(segments);

      // Simplify and smooth paths
      const simplifyTolerance = Math.max(0.3, Math.max(width, height) / 800);
      const pathStrings = paths
        .map(p => simplifyPath(p, simplifyTolerance))
        .filter(p => p.length >= 3)
        .map(p => pathToSmoothSVG(p, true));
      
      if (pathStrings.length > 0) {
        svgPaths.push({ color, paths: pathStrings });
      }
      
      bandIdx++;
      setProgress(40 + Math.floor((bandIdx / totalBands) * 55));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // Phase 4: Build SVG with filled regions
    // For proper filling, we need to use a different approach - render as layered regions
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <title>Halley's Method Fractal - ${formula}</title>
  <desc>Formula: ${formula} | Bounds: [${minX.toFixed(6)}, ${maxX.toFixed(6)}] × [${minY.toFixed(6)}, ${maxY.toFixed(6)}] | Iterations: ${maxIter} | Traced with smooth curves</desc>
  <rect width="100%" height="100%" fill="black"/>
`;

    // Create filled regions by tracing each iteration level as filled polygons
    // Group adjacent cells into polygon regions
    const regionColors = new Map();

    // Flood fill to find connected regions
    const visited = new Uint8Array(width * height);
    const regions = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;
        
        const iter = iterations[idx];
        const color = getColor(iter, maxIter, colorScheme);
        const colorStr = `rgb(${color.r},${color.g},${color.b})`;
        
        if (colorStr === 'rgb(0,0,0)') {
          visited[idx] = 1;
          continue;
        }
        
        // Flood fill to find connected region
        const region = [];
        const stack = [{ x, y }];
        
        while (stack.length > 0) {
          const { x: cx, y: cy } = stack.pop();
          const cidx = cy * width + cx;

          if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
          if (visited[cidx]) continue;
          if (iterations[cidx] !== iter) continue;

          visited[cidx] = 1;
          region.push({ x: cx, y: cy });

          stack.push({ x: cx + 1, y: cy });
          stack.push({ x: cx - 1, y: cy });
          stack.push({ x: cx, y: cy + 1 });
          stack.push({ x: cx, y: cy - 1 });
        }
        
        if (region.length > 0) {
          regions.push({ color: colorStr, cells: region });
        }
      }
    }
    
    // Convert regions to optimized SVG paths using edge tracing
    for (const region of regions) {
      if (region.cells.length === 1) {
        // Single cell - use rect
        const c = region.cells[0];
        svgContent += `  <rect x="${c.x}" y="${c.y}" width="1.1" height="1.1" fill="${region.color}"/>\n`;
      } else if (region.cells.length < 50) {
        // Small region - use individual rects merged by color
        svgContent += `  <g fill="${region.color}">\n`;
        for (const c of region.cells) {
          svgContent += `    <rect x="${c.x}" y="${c.y}" width="1.1" height="1.1"/>\n`;
        }
        svgContent += `  </g>\n`;
      } else {
        // Large region - trace boundary and create path
        const cellSet = new Set(region.cells.map(c => `${c.x},${c.y}`));
        const boundary = [];
        
        // Find boundary cells (cells with at least one non-region neighbor)
        for (const cell of region.cells) {
          const hasOutsideNeighbor = 
            !cellSet.has(`${cell.x - 1},${cell.y}`) ||
            !cellSet.has(`${cell.x + 1},${cell.y}`) ||
            !cellSet.has(`${cell.x},${cell.y - 1}`) ||
            !cellSet.has(`${cell.x},${cell.y + 1}`);
          
          if (hasOutsideNeighbor) {
            boundary.push(cell);
          }
        }
        
        // For complex regions, use filled rects grouped efficiently
        // Group by rows for run-length encoding
        const rows = new Map();
        for (const c of region.cells) {
          if (!rows.has(c.y)) rows.set(c.y, []);
          rows.get(c.y).push(c.x);
        }
        
        svgContent += `  <g fill="${region.color}">\n`;
        for (const [y, xs] of rows) {
          xs.sort((a, b) => a - b);
          let runStart = xs[0];
          let runEnd = xs[0];
          
          for (let i = 1; i <= xs.length; i++) {
            if (i < xs.length && xs[i] === runEnd + 1) {
              runEnd = xs[i];
            } else {
              svgContent += `    <rect x="${runStart}" y="${y}" width="${runEnd - runStart + 1.1}" height="1.1"/>\n`;
              if (i < xs.length) {
                runStart = xs[i];
                runEnd = xs[i];
              }
            }
          }
        }
        svgContent += `  </g>\n`;
      }
    }
    
    svgContent += `</svg>`;
    
    setIsExporting(false);
    setProgress(100);
    
    return svgContent;
  }, [formula, maxIter, colorScheme, bounds, canvasDimensions]);

  // Generate SVG with true vector contour paths (outline style)
  const generateContourSVG = useCallback(async () => {
    const func = functions[formula];
    if (!func) return null;

    setIsExporting(true);
    setProgress(0);

    const { width, height } = canvasDimensions;
    const epsilon = 0.00001;

    const { minX, maxX, minY, maxY } = bounds;
    const xStep = (maxX - minX) / width;
    const yStep = (maxY - minY) / height;

    // Calculate iteration grid
    const iterations = new Float32Array(width * height);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const x = minX + px * xStep;
        const y = maxY - py * yStep;
        
        let z = { re: x, im: y };
        let iter = 0;
        let prevMag = 0;
        
        for (let k = 0; k < maxIter; k++) {
          try {
            z = halleyIterate(z, func);
            const mag = z.re * z.re + z.im * z.im;
            
            if (k > 0 && Math.abs(mag - prevMag) < epsilon) {
              iter = k;
              break;
            }
            prevMag = mag;
            iter = k + 1;
            
            if (mag > 1e10 || isNaN(mag)) {
              iter = maxIter;
              break;
            }
          } catch {
            iter = maxIter;
            break;
          }
        }


        iterations[py * width + px] = iter;
      }

      if (py % 32 === 0) {
        setProgress(Math.floor((py / height) * 50));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Find iteration levels to trace
    const iterSet = new Set(iterations);
    const iterLevels = Array.from(iterSet).sort((a, b) => a - b);

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <title>Halley's Method Fractal Contours - ${formula}</title>
  <desc>Formula: ${formula} | Contour-traced vector paths</desc>
  <rect width="100%" height="100%" fill="black"/>
  <g fill="none" stroke-width="0.5">
`;
    
    // Trace contours at each iteration level
    for (let i = 0; i < iterLevels.length; i++) {
      const level = iterLevels[i];
      const color = getColor(level, maxIter, colorScheme);
      const colorStr = `rgb(${color.r},${color.g},${color.b})`;
      
      if (colorStr === 'rgb(0,0,0)') continue;

      const segments = traceContours(iterations, width, height, level + 0.5);
      const paths = connectSegments(segments);

      const simplifyTolerance = Math.max(0.2, Math.max(width, height) / 1000);
      
      for (const path of paths) {
        if (path.length < 3) continue;
        const simplified = simplifyPath(path, simplifyTolerance);
        const pathStr = pathToSmoothSVG(simplified, false);
        if (pathStr) {
          svgContent += `    <path d="${pathStr}" stroke="${colorStr}"/>\n`;
        }
      }
      
      if (i % 5 === 0) {
        setProgress(50 + Math.floor((i / iterLevels.length) * 50));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    svgContent += `  </g>\n</svg>`;
    
    setIsExporting(false);
    setProgress(100);
    
    return svgContent;
  }, [formula, maxIter, colorScheme, bounds, canvasDimensions]);

  const downloadTracedSVG = async () => {
    const svgContent = await generateTracedSVG();
    if (!svgContent) return;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halley-fractal-traced-${formula.replace(/[^a-z0-9]/gi, '')}-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadContourSVG = async () => {
    const svgContent = await generateContourSVG();
    if (!svgContent) return;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halley-fractal-contours-${formula.replace(/[^a-z0-9]/gi, '')}-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download current canvas as PNG
  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    const { width, height } = canvasDimensions;
    link.download = `halley-fractal-${formula.replace(/[^a-z0-9]/gi, '')}-${width}x${height}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    renderFractal();
  }, [renderFractal]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default behavior for arrow keys and +/- to avoid page scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '_'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
          handlePan(0, 1);
          break;
        case 'ArrowDown':
          handlePan(0, -1);
          break;
        case 'ArrowLeft':
          handlePan(-1, 0);
          break;
        case 'ArrowRight':
          handlePan(1, 0);
          break;
        case '+':
        case '=': // Also catch '=' for keyboards where + requires shift
          handleZoom(2);
          break;
        case '-':
        case '_': // Also catch '_' for keyboards where - requires shift
          handleZoom(0.5);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bounds]); // Re-attach when bounds change

  const handleZoom = (factor) => {
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const rangeX = (bounds.maxX - bounds.minX) / factor;
    const rangeY = (bounds.maxY - bounds.minY) / factor;
    
    setBounds({
      minX: centerX - rangeX / 2,
      maxX: centerX + rangeX / 2,
      minY: centerY - rangeY / 2,
      maxY: centerY + rangeY / 2
    });
  };

  const handlePan = (dx, dy) => {
    // Pan by 25% of the current view range
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;
    const panX = dx * rangeX * 0.25;
    const panY = dy * rangeY * 0.25;
    
    setBounds({
      minX: bounds.minX + panX,
      maxX: bounds.maxX + panX,
      minY: bounds.minY + panY,
      maxY: bounds.maxY + panY
    });
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { width, height } = canvasDimensions;
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const x = bounds.minX + (px / width) * (bounds.maxX - bounds.minX);
    const y = bounds.maxY - (py / height) * (bounds.maxY - bounds.minY);
    
    const rangeX = (bounds.maxX - bounds.minX) / 2;
    const rangeY = (bounds.maxY - bounds.minY) / 2;
    
    setBounds({
      minX: x - rangeX / 2,
      maxX: x + rangeX / 2,
      minY: y - rangeY / 2,
      maxY: y + rangeY / 2
    });
  };

  const resetView = () => {
    setBounds({ minX: -3, maxX: 3, minY: -3, maxY: 3 });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-white">
          Halley's Method Fractal Art
        </h1>
        <p className="text-gray-400 text-center mb-6 text-sm">
          Click to zoom • Arrow keys to pan • +/- to zoom in/out
        </p>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Canvas */}
          <div className="flex-1">
            <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl shadow-purple-500/20">
              <canvas
                ref={canvasRef}
                width={canvasDimensions.width}
                height={canvasDimensions.height}
                onClick={handleCanvasClick}
                className="w-full cursor-crosshair"
                style={{ imageRendering: 'pixelated' }}
              />
              {(isRendering || isExporting) && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${isExporting ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm">
                      {isExporting ? 'Generating SVG...' : 'Rendering...'} {progress}%
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Adjust settings to restart
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Zoom and Pan Controls */}
            <div className="flex flex-col gap-2 mt-3">
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleZoom(2)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                  title="Zoom In"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleZoom(0.5)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                  title="Zoom Out"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35M8 11h6"/>
                  </svg>
                </button>
                <button
                  onClick={resetView}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                  title="Reset View"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                  </svg>
                </button>
              </div>
              
              {/* Pan Controls */}
              <div className="flex justify-center">
                <div className="grid grid-cols-3 gap-1">
                  <div></div>
                  <button
                    onClick={() => handlePan(0, 1)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                    title="Pan Up"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                  </button>
                  <div></div>
                  <button
                    onClick={() => handlePan(-1, 0)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                    title="Pan Left"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <div className="px-3 py-2 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3"/>
                    </svg>
                  </div>
                  <button
                    onClick={() => handlePan(1, 0)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                    title="Pan Right"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                  <div></div>
                  <button
                    onClick={() => handlePan(0, -1)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                    title="Pan Down"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12l7 7 7-7"/>
                    </svg>
                  </button>
                  <div></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="lg:w-64 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Formula</label>
              <select
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <optgroup label="Classic Symmetric">
                  {['z³ - 1', 'z⁴ - 1', 'z⁵ - 1', 'z⁶ - 1', 'z⁷ - 1', 'z⁸ - 1'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </optgroup>
                <optgroup label="Symmetry Breaking">
                  {['z³ - 0.5', 'z⁴ - 2', 'z⁴ + z² - 1', 'z⁵ + z - 1', 'z³ - z', 'z⁵ - z²', 'z⁵ - z³', 'z⁶ + z³ - 1'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </optgroup>
                <optgroup label="Complex Parameter (Julia-like)">
                  {['z³ + (0.3+0.5i)', 'z³ + (-0.2+0.8i)', 'z³ + (1+i)', 'z³ + (0.5+0.2i)', 'z⁴ + (0.2+0.4i)'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </optgroup>
                <optgroup label="Rational (Poles & Roots)">
                  {['(z² + 1)/(z³ - 1)', '(z³ - 2)/(z - 1)'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </optgroup>
                <optgroup label="Transcendental">
                  {['sin(z)', 'cos(z) - 1', 'exp(z) - 1', 'sinh(z) - 1', 'z³ + sin(z)', 'z⁴ + exp(-z)', 'sin(z²) - 1', 'z·exp(z) - 1'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </optgroup>
              </select>
              {functions[formula] && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  {functions[formula].desc}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Color Scheme</label>
              <select
                value={colorScheme}
                onChange={(e) => setColorScheme(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="rainbow">Rainbow</option>
                <option value="fire">Fire</option>
                <option value="ocean">Ocean</option>
                <option value="neon">Neon</option>
                <option value="plasma">Plasma</option>
                <option value="grayscale">Grayscale</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
              <div className="grid grid-cols-5 gap-1">
                {['1:1', '4:3', '16:9', '21:9', '9:16'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2 py-1.5 text-xs rounded transition ${
                      aspectRatio === ratio
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Resolution: {canvasDimensions.width} × {canvasDimensions.height}px
              </label>
              <input
                type="range"
                min="100"
                max="18000"
                step="100"
                value={resolution}
                onChange={(e) => setResolution(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>100px</span>
                <span>18,000px</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {resolution <= 300 ? '⚡ Fast' : resolution <= 600 ? '⏱️ Medium' : resolution <= 1200 ? '🐢 Slow' : resolution <= 3600 ? '🐌 Very slow' : '⏳ Extremely slow'}
              </p>
              <p className="text-xs text-blue-400 mt-1">
                Print size @ 300 DPI: {(canvasDimensions.width / 300).toFixed(1)}" × {(canvasDimensions.height / 300).toFixed(1)}"
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Iterations: {maxIter}
              </label>
              <input
                type="range"
                min="20"
                max="150"
                step="10"
                value={maxIter}
                onChange={(e) => setMaxIter(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Current View</h3>
                <button
                  onClick={copyShareLink}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition"
                  title="Copy shareable link"
                >
                  {showCopied ? (
                    <>
                      <svg className="w-3 h-3 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                      <span>Share</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-xs text-gray-400 space-y-1 font-mono">
                <p>X: [{bounds.minX.toFixed(6)}, {bounds.maxX.toFixed(6)}]</p>
                <p>Y: [{bounds.minY.toFixed(6)}, {bounds.maxY.toFixed(6)}]</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click Share to copy a link with your current view
              </p>
            </div>
            
            {/* SVG Export Section */}
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Export
              </h3>

              <div className="space-y-2">
                <button
                  onClick={downloadPNG}
                  disabled={isExporting || isRendering}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                    isExporting || isRendering
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Download PNG
                </button>
                
                <button
                  onClick={downloadTracedSVG}
                  disabled={isExporting || isRendering}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm ${
                    isExporting || isRendering
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {isExporting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                      </svg>
                      Generating... {progress}%
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                      Traced SVG (Filled)
                    </>
                  )}
                </button>
                
                <button
                  onClick={downloadContourSVG}
                  disabled={isExporting || isRendering}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm ${
                    isExporting || isRendering
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <circle cx="12" cy="12" r="7"/>
                    <circle cx="12" cy="12" r="11"/>
                  </svg>
                  Contour SVG (Lines)
                </button>
              </div>
              
              <div className="mt-3 p-2 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-400">
                  <strong className="text-orange-400">PNG:</strong> Fast, exact pixel output.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  <strong className="text-gray-300">Traced SVG:</strong> Filled vector regions.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  <strong className="text-gray-300">Contour SVG:</strong> Smooth curve outlines.
                </p>
                <p className="text-xs text-gray-500 mt-2 italic">
                  All exports use current resolution setting.
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium mb-2">About</h3>
              <p className="text-xs text-gray-400">
                This fractal is generated using <a href="https://en.wikipedia.org/wiki/Halley%27s_method">Halley's method</a>, a root-finding algorithm. 
                Each pixel's color represents how quickly the algorithm converges when 
                starting from that point in the complex plane.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
