/* ==========================================================
   graph.js
   A small, sandboxed expression compiler + canvas plotter for
   the Graphing mode. User-entered expressions are NEVER passed
   directly to eval()/Function() — every character and every
   letter-sequence ("word") is checked against a strict
   whitelist first, so the only things that can ever execute
   are basic arithmetic and a fixed set of Math.* calls.
   ========================================================== */

const GRAPH_FUNC_MAP = {
    asin: "Math.asin", acos: "Math.acos", atan: "Math.atan",
    sin: "Math.sin", cos: "Math.cos", tan: "Math.tan",
    sqrt: "Math.sqrt", abs: "Math.abs",
    log10: "Math.log10", ln: "Math.log", log: "Math.log10",
    exp: "Math.exp", floor: "Math.floor", ceil: "Math.ceil", round: "Math.round",
    pow: "Math.pow", min: "Math.min", max: "Math.max",
};

const GRAPH_ALLOWED_WORDS = new Set([
    "x", "pi", "e", ...Object.keys(GRAPH_FUNC_MAP),
]);

// Turns a user-typed expression like "sin(x) + 2x^2 - pi" into a safe,
// callable function of x. Returns { fn, error }. `fn` is null if `error`
// is set.
function compileExpression(rawExpr) {
    const expr = (rawExpr || "").trim();
    if (!expr) return { fn: null, error: "Enter an expression." };

    // 1. Character whitelist — only digits, letters, math punctuation,
    //    and whitespace. Nothing that could break out of an arithmetic
    //    expression (no semicolons, quotes, brackets, backticks, etc.).
    if (!/^[0-9a-zA-Z+\-*/^().,\s]*$/.test(expr)) {
        return { fn: null, error: "Expression contains an unsupported character." };
    }

    // 2. Word whitelist — every letter-sequence must be "x", a known
    //    constant, or a known function name. This blocks anything like
    //    "alert(1)" or stray identifiers from ever reaching Function().
    const words = expr.match(/[a-zA-Z]+/g) || [];
    for (const word of words) {
        if (!GRAPH_ALLOWED_WORDS.has(word)) {
            return { fn: null, error: `Unknown term: "${word}"` };
        }
    }

    let processed = expr.replace(/\s+/g, "");

    // 3. Implicit multiplication: "2x" -> "2*x", "2(" -> "2*(",
    //    ")(" / ")x" / ")2" -> insert "*". ("2e" is deliberately left
    //    alone so scientific notation like "1e-5" still works.)
    processed = processed
        .replace(/(\d)(x|pi|\()/g, "$1*$2")
        .replace(/(\))(\d|x|\()/g, "$1*$2");

    // 4. Power operator: ^ -> ** (right-associative in JS, matching
    //    standard math convention).
    processed = processed.replace(/\^/g, "**");

    // 5. Function names -> Math.* calls (longest names first so "asin"
    //    isn't mistakenly left partially unreplaced by "sin").
    const funcNames = Object.keys(GRAPH_FUNC_MAP).sort((a, b) => b.length - a.length);
    const funcRegex = new RegExp("\\b(" + funcNames.join("|") + ")\\(", "g");
    processed = processed.replace(funcRegex, (_, name) => GRAPH_FUNC_MAP[name] + "(");

    // 6. Constants (must run after function substitution, and use word
    //    boundaries so the "e" in "Math.exp" etc. is never touched).
    processed = processed
        .replace(/\bpi\b/g, "Math.PI")
        .replace(/\be\b/g, "Math.E");

    let fn;
    try {
        // eslint-disable-next-line no-new-func
        fn = new Function("x", `"use strict"; return (${processed});`);
        // Smoke-test with a couple of values to catch syntax errors early
        // (e.g. mismatched parentheses) before this is used per-pixel.
        fn(1);
        fn(2);
    } catch (e) {
        return { fn: null, error: "Couldn't parse that expression." };
    }

    return { fn, error: null };
}

// ---------- Canvas plotting ----------

const graphView = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
let graphFn = null;
let graphCanvas = null;
let graphCtx = null;

function niceStep(range) {
    const rough = range / 10;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3.5) step = 2;
    else if (norm < 7.5) step = 5;
    else step = 10;
    return step * mag;
}

function dataToPixel(x, y, w, h) {
    const px = ((x - graphView.xMin) / (graphView.xMax - graphView.xMin)) * w;
    const py = h - ((y - graphView.yMin) / (graphView.yMax - graphView.yMin)) * h;
    return [px, py];
}

function pixelToData(px, py, w, h) {
    const x = graphView.xMin + (px / w) * (graphView.xMax - graphView.xMin);
    const y = graphView.yMin + (1 - py / h) * (graphView.yMax - graphView.yMin);
    return [x, y];
}

function renderGraph() {
    if (!graphCtx || !graphCanvas) return;
    const w = graphCanvas.width;
    const h = graphCanvas.height;
    const ctx = graphCtx;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#15171c";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    const stepX = niceStep(graphView.xMax - graphView.xMin);
    const stepY = niceStep(graphView.yMax - graphView.yMin);

    ctx.beginPath();
    for (let gx = Math.ceil(graphView.xMin / stepX) * stepX; gx <= graphView.xMax; gx += stepX) {
        const [px] = dataToPixel(gx, 0, w, h);
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
    }
    for (let gy = Math.ceil(graphView.yMin / stepY) * stepY; gy <= graphView.yMax; gy += stepY) {
        const [, py] = dataToPixel(0, gy, w, h);
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
    }
    ctx.stroke();

    // Axes
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const [, yAxisPx] = dataToPixel(0, 0, w, h);
    const [xAxisPx] = dataToPixel(0, 0, w, h);
    ctx.moveTo(0, yAxisPx);
    ctx.lineTo(w, yAxisPx);
    ctx.moveTo(xAxisPx, 0);
    ctx.lineTo(xAxisPx, h);
    ctx.stroke();

    // Axis number labels
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "11px Inter, sans-serif";
    for (let gx = Math.ceil(graphView.xMin / stepX) * stepX; gx <= graphView.xMax; gx += stepX) {
        if (Math.abs(gx) < stepX / 1000) continue;
        const [px] = dataToPixel(gx, 0, w, h);
        ctx.fillText(Number(gx.toPrecision(6)).toString(), px + 3, yAxisPx - 3);
    }
    for (let gy = Math.ceil(graphView.yMin / stepY) * stepY; gy <= graphView.yMax; gy += stepY) {
        if (Math.abs(gy) < stepY / 1000) continue;
        const [, py] = dataToPixel(0, gy, w, h);
        ctx.fillText(Number(gy.toPrecision(6)).toString(), xAxisPx + 3, py - 3);
    }

    if (!graphFn) return;

    // Curve — sample once per pixel column, break the line across
    // discontinuities/asymptotes instead of drawing a near-vertical spike.
    ctx.strokeStyle = "#ff9800";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let penDown = false;
    let prevPy = null;

    for (let px = 0; px <= w; px++) {
        const [x] = pixelToData(px, 0, w, h);
        let y;
        try {
            y = graphFn(x);
        } catch (e) {
            y = NaN;
        }

        if (typeof y !== "number" || !isFinite(y)) {
            penDown = false;
            prevPy = null;
            continue;
        }

        const [, py] = dataToPixel(x, y, w, h);

        if (penDown && prevPy !== null && Math.abs(py - prevPy) > h * 0.9) {
            // Likely an asymptote — break the line instead of joining it
            penDown = false;
        }

        if (!penDown) {
            ctx.moveTo(px, py);
            penDown = true;
        } else {
            ctx.lineTo(px, py);
        }
        prevPy = py;
    }
    ctx.stroke();
}

function resizeGraphCanvas() {
    if (!graphCanvas) return;
    const rect = graphCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    graphCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    graphCanvas.height = Math.max(1, Math.round(rect.height * dpr));
    if (graphCtx) graphCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderGraph();
}

function setGraphExpression(exprStr) {
    const errorEl = document.getElementById("graphErrorMsg");
    const { fn, error } = compileExpression(exprStr);

    if (error) {
        graphFn = null;
        if (errorEl) {
            errorEl.textContent = error;
            errorEl.hidden = false;
        }
    } else {
        graphFn = fn;
        if (errorEl) errorEl.hidden = true;
    }
    renderGraph();
}

function zoomGraph(factor) {
    const cx = (graphView.xMin + graphView.xMax) / 2;
    const cy = (graphView.yMin + graphView.yMax) / 2;
    const halfW = ((graphView.xMax - graphView.xMin) / 2) * factor;
    const halfH = ((graphView.yMax - graphView.yMin) / 2) * factor;
    graphView.xMin = cx - halfW;
    graphView.xMax = cx + halfW;
    graphView.yMin = cy - halfH;
    graphView.yMax = cy + halfH;
    renderGraph();
}

function resetGraphView() {
    graphView.xMin = -10;
    graphView.xMax = 10;
    graphView.yMin = -6;
    graphView.yMax = 6;
    renderGraph();
}

function initGraphScreen() {
    graphCanvas = document.getElementById("graphCanvas");
    if (!graphCanvas) return;
    graphCtx = graphCanvas.getContext("2d");

    resizeGraphCanvas();

    let panning = false;
    let lastX = 0, lastY = 0;

    graphCanvas.addEventListener("pointerdown", e => {
        panning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        graphCanvas.setPointerCapture(e.pointerId);
    });
    graphCanvas.addEventListener("pointermove", e => {
        if (!panning) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        const w = graphCanvas.clientWidth || 1;
        const h = graphCanvas.clientHeight || 1;
        const dataDx = (dx / w) * (graphView.xMax - graphView.xMin);
        const dataDy = (dy / h) * (graphView.yMax - graphView.yMin);
        graphView.xMin -= dataDx;
        graphView.xMax -= dataDx;
        graphView.yMin += dataDy;
        graphView.yMax += dataDy;
        renderGraph();
    });
    graphCanvas.addEventListener("pointerup", () => { panning = false; });
    graphCanvas.addEventListener("pointercancel", () => { panning = false; });

    graphCanvas.addEventListener("wheel", e => {
        e.preventDefault();
        zoomGraph(e.deltaY > 0 ? 1.1 : 0.9);
    }, { passive: false });

    window.addEventListener("resize", resizeGraphCanvas);
}

const graphExprInput = document.getElementById("graphExprInput");
if (graphExprInput) {
    graphExprInput.addEventListener("input", () => setGraphExpression(graphExprInput.value));
}

const graphZoomInBtn = document.getElementById("graphZoomInBtn");
const graphZoomOutBtn = document.getElementById("graphZoomOutBtn");
const graphResetBtn = document.getElementById("graphResetBtn");

if (graphZoomInBtn) graphZoomInBtn.addEventListener("click", () => zoomGraph(0.8));
if (graphZoomOutBtn) graphZoomOutBtn.addEventListener("click", () => zoomGraph(1.25));
if (graphResetBtn) graphResetBtn.addEventListener("click", resetGraphView);

// The canvas has zero size while its screen is hidden (display: none), so
// real sizing/rendering is deferred until the Graphing screen is actually
// shown. showScreen() in tools.js calls this each time.
let graphScreenInitialized = false;
function onShowGraphScreen() {
    if (!graphScreenInitialized) {
        initGraphScreen();
        setGraphExpression(graphExprInput ? graphExprInput.value : "sin(x)");
        graphScreenInitialized = true;
    } else {
        resizeGraphCanvas();
    }
}