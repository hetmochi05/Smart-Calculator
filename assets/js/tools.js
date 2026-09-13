/* ==========================================================
   tools.js
   Tool screen switching, Age Calculator with accurate leap-year
   aware calendar arithmetic, birthday countdown & zodiac, and
   Currency Converter with offline caching & inverse rates.
   ========================================================== */

// ---------- Screen switching ----------
const screens = document.querySelectorAll('.screen');

function showScreen(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    // When returning to calcScreen, ensure layout and font sizing adjust
    if (id === 'calcScreen') {
        renderResult(currentValue);
    }
    // Graphing's canvas has zero size while hidden, so it must be
    // (re)sized only once it's actually visible.
    if (id === 'graphScreen' && typeof onShowGraphScreen === 'function') {
        onShowGraphScreen();
    }
}

const openHubBtn = document.getElementById('openHubBtn');
if (openHubBtn) openHubBtn.addEventListener('click', () => showScreen('hubScreen'));

// Back buttons each declare their own target via data-back="screenId"
// (defaults to calcScreen if omitted, for backward compatibility).
document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.getAttribute('data-back') || 'calcScreen'));
});

// Hub (mode picker) item clicks: either jump straight to a built screen
// (optionally setting the calculator mode first), or open the reusable
// "Coming Soon" placeholder for modes still on the roadmap.
document.querySelectorAll('.hub-item').forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        const mode = item.getAttribute('data-set-mode');
        const comingSoonName = item.getAttribute('data-coming-soon');
        const converterType = item.getAttribute('data-converter-type');

        if (converterType) {
            openConverter(converterType);
        } else if (target) {
            if (mode) setCalculatorMode(mode);
            showScreen(target);
        } else if (comingSoonName) {
            openComingSoon(comingSoonName, item.getAttribute('data-coming-icon') || 'fa-solid fa-hourglass-half');
        }
    });
});

function openComingSoon(name, iconClass) {
    const titleEl = document.getElementById('comingSoonTitle');
    const headingEl = document.getElementById('comingSoonHeading');
    const messageEl = document.getElementById('comingSoonMessage');
    const iconEl = document.getElementById('comingSoonIcon');
    const bigIconEl = document.getElementById('comingSoonBigIcon');

    if (titleEl) titleEl.textContent = name;
    if (headingEl) headingEl.textContent = `${name} — Coming Soon`;
    if (messageEl) messageEl.textContent = `${name} mode is on the roadmap and will be added in a future update.`;
    if (iconEl) iconEl.className = `${iconClass} app-icon`;
    if (bigIconEl) bigIconEl.className = `${iconClass} coming-soon-big-icon`;

    showScreen('comingSoonScreen');
}

// ==================================================
// ================= Age Calculator =================
// ==================================================

const ageBirthDateEl = document.getElementById('ageBirthDate');
const ageAsOfDateEl = document.getElementById('ageAsOfDate');
const ageCalculateBtn = document.getElementById('ageCalculateBtn');
const ageResultEl = document.getElementById('ageResult');
const ageErrorEl = document.getElementById('ageError');
const ageYearsEl = document.getElementById('ageYears');
const ageMonthsEl = document.getElementById('ageMonths');
const ageDaysEl = document.getElementById('ageDays');
const ageTotalMonthsEl = document.getElementById('ageTotalMonths');
const ageTotalMonthsDaysEl = document.getElementById('ageTotalMonthsDays');
const ageTotalWeeksEl = document.getElementById('ageTotalWeeks');
const ageTotalWeeksDaysEl = document.getElementById('ageTotalWeeksDays');
const ageTotalDaysEl = document.getElementById('ageTotalDays');
const ageTotalHoursEl = document.getElementById('ageTotalHours');
const ageTotalMinutesEl = document.getElementById('ageTotalMinutes');
const ageTotalSecondsEl = document.getElementById('ageTotalSeconds');

// Additional elements for Age UI (Next Birthday & Zodiac)
const ageNextBdayEl = document.getElementById('ageNextBday');
const ageZodiacEl = document.getElementById('ageZodiac');

function todayISO() {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

if (ageAsOfDateEl) ageAsOfDateEl.value = todayISO();

// Leap-year safe month addition with day clamping. `preferredDay` lets
// callers always anchor to the ORIGINAL birth day-of-month (e.g. 29 for a
// Feb 29 birthday) instead of drifting: without this, chaining addMonths
// off an already-clamped intermediate date (e.g. Feb 28, because some year
// in between wasn't a leap year) would permanently "forget" the real
// target day and could throw off later month/year boundaries.
function addMonths(date, m, preferredDay) {
    const d = new Date(date.getTime());
    const targetDay = preferredDay !== undefined ? preferredDay : d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + m);
    const daysInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(targetDay, daysInTargetMonth));
    return d;
}

function addYears(date, y) {
    return addMonths(date, y * 12);
}

function calculatePreciseAge(birth, asOf) {
    if (birth > asOf) return null;

    const originalDay = birth.getDate();

    let years = asOf.getFullYear() - birth.getFullYear();
    if (addMonths(birth, years * 12, originalDay) > asOf) {
        years--;
    }

    let months = 0;
    while (months < 12 && addMonths(birth, years * 12 + months + 1, originalDay) <= asOf) {
        months++;
    }

    const birthWithMonths = addMonths(birth, years * 12 + months, originalDay);
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.round((asOf - birthWithMonths) / msPerDay);

    return { years, months, days };
}

function getZodiacSign(month, day) {
    const signs = [
        { name: "Capricorn", icon: "♑", start: [1, 1], end: [1, 19] },
        { name: "Aquarius", icon: "♒", start: [1, 20], end: [2, 18] },
        { name: "Pisces", icon: "♓", start: [2, 19], end: [3, 20] },
        { name: "Aries", icon: "♈", start: [3, 21], end: [4, 19] },
        { name: "Taurus", icon: "♉", start: [4, 20], end: [5, 20] },
        { name: "Gemini", icon: "♊", start: [5, 21], end: [6, 20] },
        { name: "Cancer", icon: "♋", start: [6, 21], end: [7, 22] },
        { name: "Leo", icon: "♌", start: [7, 23], end: [8, 22] },
        { name: "Virgo", icon: "♍", start: [8, 23], end: [9, 22] },
        { name: "Libra", icon: "♎", start: [9, 23], end: [10, 22] },
        { name: "Scorpio", icon: "♏", start: [10, 23], end: [11, 21] },
        { name: "Sagittarius", icon: "♐", start: [11, 22], end: [12, 21] },
        { name: "Capricorn", icon: "♑", start: [12, 22], end: [12, 31] }
    ];
    for (const s of signs) {
        if ((month === s.start[0] && day >= s.start[1]) || (month === s.end[0] && day <= s.end[1])) {
            return `${s.icon} ${s.name}`;
        }
    }
    return "✨ Capricorn";
}

function getNextBirthdayInfo(birth, asOf) {
    let nextYear = asOf.getFullYear();
    const birthMonth = birth.getMonth();
    const birthDay = birth.getDate();

    let nextBday = new Date(nextYear, birthMonth, birthDay);
    if (birthMonth === 1 && birthDay === 29 && nextBday.getMonth() !== 1) {
        nextBday = new Date(nextYear, 1, 28);
    }

    if (nextBday < asOf) {
        nextYear++;
        nextBday = new Date(nextYear, birthMonth, birthDay);
        if (birthMonth === 1 && birthDay === 29 && nextBday.getMonth() !== 1) {
            nextBday = new Date(nextYear, 1, 28);
        }
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((nextBday - asOf) / msPerDay);
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayName = weekdays[nextBday.getDay()];

    return { daysLeft, weekdayName };
}

function calculateAge() {
    ageErrorEl.hidden = true;
    ageResultEl.hidden = true;

    const birthStr = ageBirthDateEl.value;
    const asOfStr = ageAsOfDateEl.value || todayISO();

    if (!birthStr) {
        ageErrorEl.textContent = 'Please enter a date of birth.';
        ageErrorEl.hidden = false;
        return;
    }

    const birth = new Date(birthStr + 'T00:00:00');
    const asOf = new Date(asOfStr + 'T00:00:00');

    if (isNaN(birth.getTime()) || isNaN(asOf.getTime())) {
        ageErrorEl.textContent = 'Please enter valid dates.';
        ageErrorEl.hidden = false;
        return;
    }

    if (birth > asOf) {
        ageErrorEl.textContent = 'Date of birth must be on or before the "as of" date.';
        ageErrorEl.hidden = false;
        return;
    }

    const accurate = calculatePreciseAge(birth, asOf);
    if (!accurate) return;

    const { years, months, days } = accurate;

    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.round((asOf - birth) / msPerDay);

    ageYearsEl.textContent = years;
    ageMonthsEl.textContent = months;
    ageDaysEl.textContent = days;

    const totalMonths = years * 12 + months;
    const totalWeeks = Math.floor(totalDays / 7);
    const weeksRemainderDays = totalDays % 7;
    const totalHours = totalDays * 24;
    const totalMinutes = totalHours * 60;
    const totalSeconds = totalMinutes * 60;

    ageTotalMonthsEl.textContent = totalMonths.toLocaleString();
    ageTotalMonthsDaysEl.textContent = days.toLocaleString();
    ageTotalWeeksEl.textContent = totalWeeks.toLocaleString();
    ageTotalWeeksDaysEl.textContent = weeksRemainderDays.toLocaleString();
    ageTotalDaysEl.textContent = totalDays.toLocaleString();
    ageTotalHoursEl.textContent = totalHours.toLocaleString();
    ageTotalMinutesEl.textContent = totalMinutes.toLocaleString();
    ageTotalSecondsEl.textContent = totalSeconds.toLocaleString();

    // Next Birthday & Zodiac display if elements exist
    if (ageNextBdayEl) {
        const nextBday = getNextBirthdayInfo(birth, asOf);
        if (nextBday.daysLeft === 0) {
            ageNextBdayEl.innerHTML = `🎉 <strong>Today is your birthday! Happy Birthday!</strong>`;
        } else {
            ageNextBdayEl.innerHTML = `🎂 Next birthday in <strong>${nextBday.daysLeft} day${nextBday.daysLeft === 1 ? '' : 's'}</strong> (${nextBday.weekdayName})`;
        }
    }

    if (ageZodiacEl) {
        const zodiac = getZodiacSign(birth.getMonth() + 1, birth.getDate());
        ageZodiacEl.textContent = zodiac;
    }

    ageResultEl.hidden = false;
}

if (ageCalculateBtn) ageCalculateBtn.addEventListener('click', calculateAge);
if (ageBirthDateEl) ageBirthDateEl.addEventListener('change', calculateAge);
if (ageAsOfDateEl) ageAsOfDateEl.addEventListener('change', calculateAge);

// =======================================================
// ================= Currency Calculator =================
// =======================================================

const CURRENCY_NAMES = {
    USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen',
    CAD: 'Canadian Dollar', AUD: 'Australian Dollar', CHF: 'Swiss Franc', CNY: 'Chinese Yuan',
    INR: 'Indian Rupee', NZD: 'New Zealand Dollar', SGD: 'Singapore Dollar', HKD: 'Hong Kong Dollar',
    SEK: 'Swedish Krona', NOK: 'Norwegian Krone', MXN: 'Mexican Peso', BRL: 'Brazilian Real',
    ZAR: 'South African Rand', KRW: 'South Korean Won', TRY: 'Turkish Lira', PLN: 'Polish Zloty',
    THB: 'Thai Baht', IDR: 'Indonesian Rupiah', HUF: 'Hungarian Forint', CZK: 'Czech Koruna',
    ILS: 'Israeli Shekel', CLP: 'Chilean Peso', PHP: 'Philippine Peso', AED: 'UAE Dirham',
    SAR: 'Saudi Riyal', MYR: 'Malaysian Ringgit', RON: 'Romanian Leu', DKK: 'Danish Krone',
    PKR: 'Pakistani Rupee', BDT: 'Bangladeshi Taka', EGP: 'Egyptian Pound', VND: 'Vietnamese Dong',
    KWD: 'Kuwaiti Dinar', QAR: 'Qatari Riyal', COP: 'Colombian Peso', ARS: 'Argentine Peso',
    NGN: 'Nigerian Naira', KZT: 'Kazakhstani Tenge', UAH: 'Ukrainian Hryvnia', BGN: 'Bulgarian Lev',
    ISK: 'Icelandic Krona', OMR: 'Omani Rial', BHD: 'Bahraini Dinar', LKR: 'Sri Lankan Rupee',
    NPR: 'Nepalese Rupee', TWD: 'New Taiwan Dollar', PEN: 'Peruvian Sol'
};

const currencyAmountEl = document.getElementById('currencyAmount');
const currencyFromEl = document.getElementById('currencyFrom');
const currencyToEl = document.getElementById('currencyTo');
const currencySwapBtn = document.getElementById('currencySwapBtn');
const currencyConvertBtn = document.getElementById('currencyConvertBtn');
const currencyResultEl = document.getElementById('currencyResult');
const currencyResultMainEl = document.getElementById('currencyResultMain');
const currencyResultSubEl = document.getElementById('currencyResultSub');
const currencyErrorEl = document.getElementById('currencyError');
const currencyLoadingEl = document.getElementById('currencyLoading');

function populateCurrencyDropdowns() {
    if (!currencyFromEl || !currencyToEl) return;
    const codes = Object.keys(CURRENCY_NAMES).sort();
    codes.forEach(code => {
        const label = `${code} — ${CURRENCY_NAMES[code]}`;

        const opt1 = document.createElement('option');
        opt1.value = code;
        opt1.textContent = label;
        currencyFromEl.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = code;
        opt2.textContent = label;
        currencyToEl.appendChild(opt2);
    });
    currencyFromEl.value = 'USD';
    currencyToEl.value = 'EUR';
}

populateCurrencyDropdowns();

// Quick chips for currency selection
document.querySelectorAll('[data-currency-quick]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const code = e.currentTarget.getAttribute('data-currency-quick');
        const target = e.currentTarget.getAttribute('data-target') || 'to';
        if (target === 'from' && currencyFromEl) currencyFromEl.value = code;
        else if (currencyToEl) currencyToEl.value = code;
        autoConvert();
    });
});

let convertTimeout;
function autoConvert() {
    clearTimeout(convertTimeout);
    convertTimeout = setTimeout(() => {
        const amount = parseFloat(currencyAmountEl.value);
        if (!isNaN(amount) && amount > 0) {
            convertCurrency();
        } else {
            currencyResultEl.hidden = true;
            currencyErrorEl.hidden = true;
        }
    }, 250);
}

async function convertCurrency() {
    currencyErrorEl.hidden = true;
    currencyResultEl.hidden = true;

    const amount = parseFloat(currencyAmountEl.value);
    const from = currencyFromEl.value;
    const to = currencyToEl.value;

    if (isNaN(amount) || amount <= 0) {
        currencyErrorEl.textContent = "Please enter a valid amount greater than 0.";
        currencyErrorEl.hidden = false;
        return;
    }

    if (from === to) {
        currencyResultMainEl.textContent = `${amount.toLocaleString()} ${from} = ${amount.toLocaleString()} ${to}`;
        currencyResultSubEl.textContent = "1 " + from + " = 1 " + to + " (Same currency)";
        currencyResultEl.hidden = false;
        return;
    }

    currencyLoadingEl.hidden = false;
    if (currencyConvertBtn) currencyConvertBtn.disabled = true;

    const cacheKey = `smart_calc_rates_${from}`;
    let ratesData = null;
    let isOfflineCache = false;

    // Check localStorage cache (valid for 6 hours)
    try {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            const cacheAge = Date.now() - (cached.timestamp || 0);
            if (cacheAge < 6 * 60 * 60 * 1000) {
                ratesData = cached.data;
            }
        }
    } catch { }

    if (!ratesData) {
        try {
            const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
            if (res.ok) {
                const data = await res.json();
                if (data.result === 'success') {
                    ratesData = data;
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify({
                            timestamp: Date.now(),
                            data: ratesData
                        }));
                    } catch { }
                }
            }
        } catch {
            // Network failure: check if any older cache exists
            try {
                const cachedStr = localStorage.getItem(cacheKey);
                if (cachedStr) {
                    ratesData = JSON.parse(cachedStr).data;
                    isOfflineCache = true;
                }
            } catch { }
        }
    }

    currencyLoadingEl.hidden = true;
    if (currencyConvertBtn) currencyConvertBtn.disabled = false;

    if (!ratesData || !ratesData.rates || typeof ratesData.rates[to] !== 'number') {
        currencyErrorEl.textContent = "Could not fetch exchange rates. Please check your internet connection.";
        currencyErrorEl.hidden = false;
        return;
    }

    const rate = ratesData.rates[to];
    const converted = amount * rate;
    const inverseRate = rate !== 0 ? 1 / rate : 0;

    const updatedAt = new Date((ratesData.time_last_update_unix || Math.floor(Date.now() / 1000)) * 1000);
    const formattedDate = updatedAt.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
    const formattedTime = updatedAt.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
    });

    currencyResultMainEl.textContent = `${amount.toLocaleString()} ${from} = ${converted.toLocaleString(undefined, {
        maximumFractionDigits: 4
    })} ${to}`;

    currencyResultSubEl.innerHTML = `
        <div class="rate-pills">
            <span>1 ${from} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${to}</span>
            <span>1 ${to} = ${inverseRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${from}</span>
        </div>
        <div class="currency-update">
            <i class="fa-solid fa-clock"></i>
            ${isOfflineCache ? '<span class="offline-badge">Cached</span> ' : ''}Rates updated: ${formattedDate} • ${formattedTime}
        </div>
    `;

    currencyResultEl.hidden = false;
}

if (currencyConvertBtn) currencyConvertBtn.addEventListener('click', convertCurrency);
if (currencyAmountEl) currencyAmountEl.addEventListener("input", autoConvert);
if (currencyFromEl) currencyFromEl.addEventListener("change", autoConvert);
if (currencyToEl) currencyToEl.addEventListener("change", autoConvert);

if (currencySwapBtn) {
    currencySwapBtn.addEventListener("click", () => {
        const temp = currencyFromEl.value;
        currencyFromEl.value = currencyToEl.value;
        currencyToEl.value = temp;
        autoConvert();
    });
}