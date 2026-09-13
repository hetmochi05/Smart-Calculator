/* ==========================================================
   converters.js
   One generic unit converter engine that powers every
   non-currency converter (Length, Weight, Volume, Area,
   Speed, Time, Energy, Power, Data, Pressure, Angle,
   Temperature). Each unit converts through a common "base
   unit" for its category using either a simple multiplier
   (factor) or, for Temperature (which has offsets, not just
   scale), explicit toBase/fromBase functions.
   ========================================================== */

const CONVERTER_TYPES = {

    volume: {
        label: "Volume",
        icon: "fa-solid fa-flask",
        defaultFrom: "l",
        defaultTo: "gal",
        units: {
            ml: { label: "Milliliters (ml)", short: "ml", factor: 0.001 },
            l: { label: "Liters (l)", short: "l", factor: 1 },
            m3: { label: "Cubic Meters (m³)", short: "m³", factor: 1000 },
            tsp: { label: "Teaspoons (tsp)", short: "tsp", factor: 0.0049289216 },
            tbsp: { label: "Tablespoons (tbsp)", short: "tbsp", factor: 0.0147867648 },
            cup: { label: "Cups (US)", short: "cup", factor: 0.2365882365 },
            pt: { label: "Pints (US pt)", short: "pt", factor: 0.473176473 },
            qt: { label: "Quarts (US qt)", short: "qt", factor: 0.946352946 },
            gal: { label: "Gallons (US gal)", short: "gal", factor: 3.785411784 },
        },
    },

    length: {
        label: "Length",
        icon: "fa-solid fa-ruler",
        defaultFrom: "m",
        defaultTo: "ft",
        units: {
            mm: { label: "Millimeters (mm)", short: "mm", factor: 0.001 },
            cm: { label: "Centimeters (cm)", short: "cm", factor: 0.01 },
            m: { label: "Meters (m)", short: "m", factor: 1 },
            km: { label: "Kilometers (km)", short: "km", factor: 1000 },
            in: { label: "Inches (in)", short: "in", factor: 0.0254 },
            ft: { label: "Feet (ft)", short: "ft", factor: 0.3048 },
            yd: { label: "Yards (yd)", short: "yd", factor: 0.9144 },
            mi: { label: "Miles (mi)", short: "mi", factor: 1609.344 },
        },
    },

    weight: {
        label: "Weight and Mass",
        icon: "fa-solid fa-weight-hanging",
        defaultFrom: "kg",
        defaultTo: "lb",
        units: {
            mg: { label: "Milligrams (mg)", short: "mg", factor: 0.000001 },
            g: { label: "Grams (g)", short: "g", factor: 0.001 },
            kg: { label: "Kilograms (kg)", short: "kg", factor: 1 },
            t: { label: "Metric Tons (t)", short: "t", factor: 1000 },
            oz: { label: "Ounces (oz)", short: "oz", factor: 0.028349523125 },
            lb: { label: "Pounds (lb)", short: "lb", factor: 0.45359237 },
            st: { label: "Stone (st)", short: "st", factor: 6.35029318 },
        },
    },

    temperature: {
        label: "Temperature",
        icon: "fa-solid fa-temperature-half",
        defaultFrom: "C",
        defaultTo: "F",
        units: {
            C: {
                label: "Celsius (°C)", short: "°C",
                toBase: v => v,
                fromBase: v => v,
            },
            F: {
                label: "Fahrenheit (°F)", short: "°F",
                toBase: v => (v - 32) * 5 / 9,
                fromBase: v => v * 9 / 5 + 32,
            },
            K: {
                label: "Kelvin (K)", short: "K",
                toBase: v => v - 273.15,
                fromBase: v => v + 273.15,
            },
        },
    },

    energy: {
        label: "Energy",
        icon: "fa-solid fa-bolt",
        defaultFrom: "kcal",
        defaultTo: "kJ",
        units: {
            J: { label: "Joules (J)", short: "J", factor: 1 },
            kJ: { label: "Kilojoules (kJ)", short: "kJ", factor: 1000 },
            cal: { label: "Calories (cal)", short: "cal", factor: 4.184 },
            kcal: { label: "Kilocalories (kcal)", short: "kcal", factor: 4184 },
            Wh: { label: "Watt-hours (Wh)", short: "Wh", factor: 3600 },
            kWh: { label: "Kilowatt-hours (kWh)", short: "kWh", factor: 3600000 },
            BTU: { label: "British Thermal Units (BTU)", short: "BTU", factor: 1055.05585262 },
        },
    },

    area: {
        label: "Area",
        icon: "fa-solid fa-vector-square",
        defaultFrom: "m2",
        defaultTo: "ft2",
        units: {
            mm2: { label: "Sq. Millimeters (mm²)", short: "mm²", factor: 0.000001 },
            cm2: { label: "Sq. Centimeters (cm²)", short: "cm²", factor: 0.0001 },
            m2: { label: "Sq. Meters (m²)", short: "m²", factor: 1 },
            ha: { label: "Hectares (ha)", short: "ha", factor: 10000 },
            km2: { label: "Sq. Kilometers (km²)", short: "km²", factor: 1000000 },
            ft2: { label: "Sq. Feet (ft²)", short: "ft²", factor: 0.09290304 },
            yd2: { label: "Sq. Yards (yd²)", short: "yd²", factor: 0.83612736 },
            acre: { label: "Acres", short: "acre", factor: 4046.8564224 },
            mi2: { label: "Sq. Miles (mi²)", short: "mi²", factor: 2589988.110336 },
        },
    },

    speed: {
        label: "Speed",
        icon: "fa-solid fa-gauge-high",
        defaultFrom: "kmh",
        defaultTo: "mph",
        units: {
            mps: { label: "Meters/second (m/s)", short: "m/s", factor: 1 },
            kmh: { label: "Kilometers/hour (km/h)", short: "km/h", factor: 0.2777777778 },
            mph: { label: "Miles/hour (mph)", short: "mph", factor: 0.44704 },
            knot: { label: "Knots (kn)", short: "kn", factor: 0.5144444444 },
            fps: { label: "Feet/second (ft/s)", short: "ft/s", factor: 0.3048 },
        },
    },

    time: {
        label: "Time",
        icon: "fa-solid fa-stopwatch",
        defaultFrom: "hr",
        defaultTo: "min",
        units: {
            ms: { label: "Milliseconds (ms)", short: "ms", factor: 0.001 },
            s: { label: "Seconds (s)", short: "s", factor: 1 },
            min: { label: "Minutes (min)", short: "min", factor: 60 },
            hr: { label: "Hours (hr)", short: "hr", factor: 3600 },
            day: { label: "Days", short: "day", factor: 86400 },
            week: { label: "Weeks", short: "wk", factor: 604800 },
            month: { label: "Months (avg.)", short: "mo", factor: 2629800 },
            year: { label: "Years (365.25 days)", short: "yr", factor: 31557600 },
        },
    },
    
    power: {
        label: "Power",
        icon: "fa-solid fa-plug",
        defaultFrom: "hp",
        defaultTo: "kW",
        units: {
            W: { label: "Watts (W)", short: "W", factor: 1 },
            kW: { label: "Kilowatts (kW)", short: "kW", factor: 1000 },
            MW: { label: "Megawatts (MW)", short: "MW", factor: 1000000 },
            hp: { label: "Horsepower (hp)", short: "hp", factor: 745.699872 },
            BTUh: { label: "BTU per hour", short: "BTU/h", factor: 0.29307107 },
        },
    },

    data: {
        label: "Data",
        icon: "fa-solid fa-database",
        defaultFrom: "GB",
        defaultTo: "MB",
        units: {
            bit: { label: "Bits", short: "bit", factor: 0.125 },
            byte: { label: "Bytes (B)", short: "B", factor: 1 },
            KB: { label: "Kilobytes (KB)", short: "KB", factor: 1024 },
            MB: { label: "Megabytes (MB)", short: "MB", factor: 1048576 },
            GB: { label: "Gigabytes (GB)", short: "GB", factor: 1073741824 },
            TB: { label: "Terabytes (TB)", short: "TB", factor: 1099511627776 },
        },
    },

    pressure: {
        label: "Pressure",
        icon: "fa-solid fa-gauge",
        defaultFrom: "atm",
        defaultTo: "psi",
        units: {
            Pa: { label: "Pascals (Pa)", short: "Pa", factor: 1 },
            kPa: { label: "Kilopascals (kPa)", short: "kPa", factor: 1000 },
            bar: { label: "Bar", short: "bar", factor: 100000 },
            atm: { label: "Atmospheres (atm)", short: "atm", factor: 101325 },
            psi: { label: "PSI", short: "psi", factor: 6894.757293168 },
            mmHg: { label: "mmHg (Torr)", short: "mmHg", factor: 133.322387415 },
        },
    },

    angle: {
        label: "Angle",
        icon: "fa-solid fa-angle-right",
        defaultFrom: "deg",
        defaultTo: "rad",
        units: {
            deg: { label: "Degrees (°)", short: "°", factor: 1 },
            rad: { label: "Radians (rad)", short: "rad", factor: 57.29577951308232 },
            grad: { label: "Gradians (grad)", short: "grad", factor: 0.9 },
        },
    },
};

let currentConverterType = null;

function convertUnitValue(value, fromUnit, toUnit) {
    const baseValue = fromUnit.toBase ? fromUnit.toBase(value) : value * fromUnit.factor;
    return toUnit.fromBase ? toUnit.fromBase(baseValue) : baseValue / toUnit.factor;
}

// Formats a number for display: trims floating-point noise without
// truncating genuinely large/small results.
function formatConverterNumber(n) {
    if (!isFinite(n)) return "Error";
    if (n === 0) return "0";
    const rounded = Number(n.toPrecision(10));
    return rounded.toLocaleString(undefined, { maximumFractionDigits: 10 });
}

function populateConverterUnits(type) {
    const config = CONVERTER_TYPES[type];
    const fromSel = document.getElementById("converterFrom");
    const toSel = document.getElementById("converterTo");
    if (!config || !fromSel || !toSel) return;

    fromSel.innerHTML = "";
    toSel.innerHTML = "";

    Object.keys(config.units).forEach(key => {
        const unit = config.units[key];

        const opt1 = document.createElement("option");
        opt1.value = key;
        opt1.textContent = unit.label;
        fromSel.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = key;
        opt2.textContent = unit.label;
        toSel.appendChild(opt2);
    });

    fromSel.value = config.defaultFrom;
    toSel.value = config.defaultTo;
}

function runConverterConversion() {
    if (!currentConverterType) return;
    const config = CONVERTER_TYPES[currentConverterType];
    const amountEl = document.getElementById("converterAmount");
    const fromSel = document.getElementById("converterFrom");
    const toSel = document.getElementById("converterTo");
    const resultMainEl = document.getElementById("converterResultMain");
    if (!config || !amountEl || !fromSel || !toSel || !resultMainEl) return;

    const amount = parseFloat(amountEl.value);
    const fromUnit = config.units[fromSel.value];
    const toUnit = config.units[toSel.value];

    if (isNaN(amount) || !fromUnit || !toUnit) {
        resultMainEl.textContent = "";
        return;
    }

    const result = convertUnitValue(amount, fromUnit, toUnit);
    resultMainEl.textContent =
        `${formatConverterNumber(amount)} ${fromUnit.short} = ${formatConverterNumber(result)} ${toUnit.short}`;
}

function openConverter(type) {
    const config = CONVERTER_TYPES[type];
    if (!config) return;

    currentConverterType = type;

    const titleEl = document.getElementById("converterTitle");
    const iconEl = document.getElementById("converterIcon");
    const amountEl = document.getElementById("converterAmount");

    if (titleEl) titleEl.textContent = config.label;
    if (iconEl) iconEl.className = `${config.icon} app-icon`;
    if (amountEl) amountEl.value = 1;

    populateConverterUnits(type);
    runConverterConversion();
    showScreen("converterScreen");
}

const converterAmountEl = document.getElementById("converterAmount");
const converterFromEl = document.getElementById("converterFrom");
const converterToEl = document.getElementById("converterTo");
const converterSwapBtn = document.getElementById("converterSwapBtn");

if (converterAmountEl) converterAmountEl.addEventListener("input", runConverterConversion);
if (converterFromEl) converterFromEl.addEventListener("change", runConverterConversion);
if (converterToEl) converterToEl.addEventListener("change", runConverterConversion);

if (converterSwapBtn) {
    converterSwapBtn.addEventListener("click", () => {
        const temp = converterFromEl.value;
        converterFromEl.value = converterToEl.value;
        converterToEl.value = temp;
        runConverterConversion();
    });
}