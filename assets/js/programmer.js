/* ==========================================================
   programmer.js
   Programmer calculator: HEX / DEC / OCT / BIN entry and
   display, bitwise ops (AND/OR/XOR/NOT/<</>>), and standard
   arithmetic, all masked to a selectable word size (8/16/32/64
   bit) with proper two's-complement overflow. Uses BigInt
   throughout — a regular JS number loses precision above 2^53,
   which is well inside the 64-bit range this needs to support.
   ========================================================== */

let progWordSize = 32;          // 8, 16, 32, or 64
let progBase = 10;              // 16, 10, 8, or 2
let progEntry = "0";            // digits currently being typed, in progBase
let progPendingOp = null;       // "+" "-" "*" "/" "%" "AND" "OR" "XOR" "LSH" "RSH" or null
let progPendingValue = null;    // BigInt operand stored when an operator was pressed
let progJustEvaluated = false;  // true right after "=", so next digit starts fresh

function progMaskUnsigned(v) {
    return BigInt.asUintN(progWordSize, v);
}

function progMaskSigned(v) {
    return BigInt.asIntN(progWordSize, v);
}

// Parses the current entry string (in progBase) into a canonical
// word-size-masked unsigned BigInt. Empty/invalid entry -> 0n.
function progEntryToBigInt() {
    const str = progEntry || "0";
    try {
        let v;
        if (progBase === 2) v = BigInt("0b" + str);
        else if (progBase === 8) v = BigInt("0o" + str);
        else if (progBase === 16) v = BigInt("0x" + str);
        else v = BigInt(str);
        return progMaskUnsigned(v);
    } catch (e) {
        return 0n;
    }
}

function progFormatInBase(rawUnsigned, base) {
    if (base === 10) {
        return progMaskSigned(rawUnsigned).toString(10);
    }
    return rawUnsigned.toString(base).toUpperCase();
}

// Groups a raw base string into nibbles/bytes for readability, e.g.
// binary in groups of 4, hex in groups of 4 as well. Decimal is left
// ungrouped (it already reads naturally, and grouping would look like
// thousands separators which we don't want to imply here).
function progGroupDigits(str, base) {
    if (base === 10) return str;
    const groupSize = base === 2 ? 4 : 4;
    const reversed = str.split("").reverse();
    const chunks = [];
    for (let i = 0; i < reversed.length; i += groupSize) {
        chunks.push(reversed.slice(i, i + groupSize).reverse().join(""));
    }
    return chunks.reverse().join(" ");
}

function progMaxDigitsFor(base) {
    // How many characters `progWordSize` bits can hold in this base,
    // used only to sanity-cap runaway entry length.
    return Math.ceil(progWordSize / Math.log2(base)) + 1;
}

function progIsValidDigit(ch, base) {
    const val = parseInt(ch, 36);
    return !isNaN(val) && val < base;
}

function progAppendDigit(ch) {
    if (!progIsValidDigit(ch, progBase)) return; // dimmed/disabled digits are also blocked here defensively

    if (progJustEvaluated) {
        progEntry = ch === "0" ? "0" : ch;
        progJustEvaluated = false;
    } else if (progEntry === "0") {
        progEntry = ch;
    } else if (progEntry.length < progMaxDigitsFor(progBase)) {
        progEntry += ch;
    }
    progRender();
}

function progBackspace() {
    progJustEvaluated = false;
    progEntry = progEntry.length > 1 ? progEntry.slice(0, -1) : "0";
    progRender();
}

function progClearEntry() {
    progEntry = "0";
    progJustEvaluated = false;
    progRender();
}

function progClearAll() {
    progEntry = "0";
    progPendingOp = null;
    progPendingValue = null;
    progJustEvaluated = false;
    progRender();
}

function progApplyBinaryOp(a, b, op) {
    switch (op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return b === 0n ? 0n : a / b;
        case "%": return b === 0n ? 0n : a % b;
        case "AND": return a & b;
        case "OR": return a | b;
        case "XOR": return a ^ b;
        case "LSH": return a << (b % BigInt(progWordSize));
        case "RSH": return a >> (b % BigInt(progWordSize));
        default: return b;
    }
}

function progEvaluatePending() {
    if (progPendingOp === null) return;
    const current = progEntryToBigInt();
    const result = progMaskUnsigned(progApplyBinaryOp(progPendingValue, current, progPendingOp));
    progEntry = progFormatInBase(result, progBase);
    progPendingOp = null;
    progPendingValue = null;
    progJustEvaluated = true;
}

function progSetOperator(op) {
    if (progPendingOp !== null && !progJustEvaluated) {
        // Chain operations left-to-right, same convention as the
        // main calculator's repeat-equals behavior.
        progEvaluatePending();
    }
    progPendingValue = progEntryToBigInt();
    progPendingOp = op;
    progJustEvaluated = true; // next digit starts a fresh operand
}

function progApplyNot() {
    const current = progEntryToBigInt();
    const result = progMaskUnsigned(~current);
    progEntry = progFormatInBase(result, progBase);
    progJustEvaluated = true;
    progRender();
}

function progSetBase(newBase) {
    // Re-express the current entry in the new base without changing
    // its underlying value.
    const value = progEntryToBigInt();
    progBase = newBase;
    progEntry = progFormatInBase(value, progBase);
    progUpdateDigitAvailability();
    progRender();
}

function progSetWordSize(bits) {
    progWordSize = bits;
    // Re-mask the current value to the new word size (may truncate,
    // same as real hardware switching register width).
    const value = progMaskUnsigned(progEntryToBigInt());
    progEntry = progFormatInBase(value, progBase);
    progPendingOp = null;
    progPendingValue = null;
    progRender();
}

function progUpdateDigitAvailability() {
    document.querySelectorAll(".prog-digit").forEach(btn => {
        const digit = btn.getAttribute("data-digit");
        const enabled = progIsValidDigit(digit, progBase);
        btn.disabled = !enabled;
        btn.classList.toggle("prog-digit-disabled", !enabled);
    });
}

function progRender() {
    const rawUnsigned = progEntryToBigInt();

    const mainEl = document.getElementById("progMainDisplay");
    if (mainEl) mainEl.textContent = progGroupDigits(progEntry, progBase);

    const rows = {
        16: document.getElementById("progRowHex"),
        10: document.getElementById("progRowDec"),
        8: document.getElementById("progRowOct"),
        2: document.getElementById("progRowBin"),
    };
    Object.keys(rows).forEach(baseStr => {
        const base = Number(baseStr);
        const rowEl = rows[base];
        if (!rowEl) return;
        const valueEl = rowEl.querySelector(".prog-row-value");
        if (valueEl) valueEl.textContent = progGroupDigits(progFormatInBase(rawUnsigned, base), base);
        rowEl.classList.toggle("active", base === progBase);
    });

    document.querySelectorAll(".prog-base-tab").forEach(tab => {
        tab.classList.toggle("active", Number(tab.getAttribute("data-base")) === progBase);
    });

    document.querySelectorAll(".prog-word-tab").forEach(tab => {
        tab.classList.toggle("active", Number(tab.getAttribute("data-bits")) === progWordSize);
    });
}

function initProgrammerScreen() {
    document.querySelectorAll(".prog-digit").forEach(btn => {
        btn.addEventListener("click", () => progAppendDigit(btn.getAttribute("data-digit")));
    });

    document.querySelectorAll(".prog-arith[data-op], .prog-bitop[data-op]").forEach(btn => {
        btn.addEventListener("click", () => progSetOperator(btn.getAttribute("data-op")));
    });

    const notBtn = document.getElementById("progNotBtn");
    if (notBtn) notBtn.addEventListener("click", progApplyNot);

    const equalsBtn = document.getElementById("progEqualsBtn");
    if (equalsBtn) equalsBtn.addEventListener("click", () => { progEvaluatePending(); progRender(); });

    const clearBtn = document.getElementById("progClearBtn");
    if (clearBtn) clearBtn.addEventListener("click", progClearAll);

    const ceBtn = document.getElementById("progClearEntryBtn");
    if (ceBtn) ceBtn.addEventListener("click", progClearEntry);

    const backspaceBtn = document.getElementById("progBackspaceBtn");
    if (backspaceBtn) backspaceBtn.addEventListener("click", progBackspace);

    document.querySelectorAll(".prog-base-tab").forEach(tab => {
        tab.addEventListener("click", () => progSetBase(Number(tab.getAttribute("data-base"))));
    });

    document.querySelectorAll(".prog-word-tab").forEach(tab => {
        tab.addEventListener("click", () => progSetWordSize(Number(tab.getAttribute("data-bits"))));
    });

    progUpdateDigitAvailability();
    progRender();
}

let progScreenInitialized = false;
function onShowProgrammerScreen() {
    if (!progScreenInitialized) {
        initProgrammerScreen();
        progScreenInitialized = true;
    } else {
        progRender();
    }
}