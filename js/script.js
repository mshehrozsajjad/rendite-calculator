let R = {};
let charts = {};

const $ = id => document.getElementById(id);
const val = id => parseFloat($(id)?.value) || 0;
const chk = id => $(id)?.checked || false;
const fmt = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmt2 = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (n, d=2) => n.toFixed(d) + '%';

// Track which rent field was last edited
let lastRentEdit = 'sqm';

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        $('tab-' + tab.dataset.tab).classList.add('active');

        // Update charts when Charts tab is shown
        if (tab.dataset.tab === 'charts') {
            updateCharts();
        }
    });
});

// Rent field sync handlers
function setupRentSync() {
    const rentSqmInput = $('i-rentSqm');
    const totalColdRentInput = $('i-totalColdRent');

    rentSqmInput.addEventListener('input', () => {
        lastRentEdit = 'sqm';
        const sqm = val('i-sqm');
        const rentSqm = val('i-rentSqm');
        if (sqm > 0) {
            totalColdRentInput.value = (sqm * rentSqm).toFixed(2);
        }
    });

    totalColdRentInput.addEventListener('input', () => {
        lastRentEdit = 'total';
        const sqm = val('i-sqm');
        const totalRent = val('i-totalColdRent');
        if (sqm > 0) {
            rentSqmInput.value = (totalRent / sqm).toFixed(2);
        }
    });

    // When sqm changes, update the appropriate field
    $('i-sqm').addEventListener('input', () => {
        const sqm = val('i-sqm');
        if (sqm > 0) {
            if (lastRentEdit === 'sqm') {
                const rentSqm = val('i-rentSqm');
                totalColdRentInput.value = (sqm * rentSqm).toFixed(2);
            } else {
                const totalRent = val('i-totalColdRent');
                rentSqmInput.value = (totalRent / sqm).toFixed(2);
            }
        }
    });
}

function calculate() {
    const sqm = val('i-sqm');
    const price = val('i-price');
    const broker = val('i-broker');
    const notary = val('i-notary');
    const registry = val('i-registry');
    const transferTax = val('i-transferTax');
    const otherCosts = val('i-otherCosts');

    const kitchen = val('i-kitchen');
    const reno = val('i-reno');
    const furniture = val('i-furniture');
    const otherInvest = val('i-otherInvest');
    const initInvest = kitchen + reno + furniture + otherInvest;

    const brokerCost = price * broker / 100;
    const notaryCost = price * notary / 100;
    const registryCost = price * registry / 100;
    const transferTaxCost = price * transferTax / 100;
    const totalAcqCosts = brokerCost + notaryCost + registryCost + transferTaxCost + otherCosts;
    const acqCostsPct = (totalAcqCosts / price) * 100;
    const totalInvestment = price + totalAcqCosts + initInvest;
    const limit15 = price * 0.15;

    // Use the total cold rent directly (it's synced with rent per sqm)
    const rentSqm = val('i-rentSqm');
    const calcRent = val('i-totalColdRent');
    const parkingRent = val('i-parkingRent');
    const otherIncome = val('i-otherIncome');
    const netColdRent = calcRent + parkingRent + otherIncome;

    const hgAlloc = val('i-hgAlloc');
    const propTax = val('i-propTax');
    const allocableCosts = hgAlloc + propTax;

    const hgNonAlloc = val('i-hgNonAlloc');
    const wegReserve = val('i-wegReserve');
    const ownMaint = val('i-ownMaint');
    const ownMaintMo = (ownMaint * sqm) / 12;
    const vacancy = val('i-vacancy');
    const vacancyCost = netColdRent * vacancy / 100;
    const otherNonAlloc = val('i-otherNonAlloc');
    const nonAllocCosts = hgNonAlloc + wegReserve + ownMaintMo + vacancyCost + otherNonAlloc;
    const warmRent = netColdRent + allocableCosts;

    const afaRate = val('i-afa');
    const bldShare = val('i-bldShare');
    const depBase = price * bldShare / 100;
    const annualAfa = depBase * afaRate / 100;
    const monthlyAfa = annualAfa / 12;
    const taxRate = val('i-taxRate');

    const costInc = val('i-costInc');
    const rentInc = val('i-rentInc');
    const appreciation = val('i-appreciation');

    // New equity-based loan calculation
    const equity = val('i-equity');
    const requiredLoan = Math.max(0, totalInvestment - equity);

    // Get loan percentages and calculate loan amounts
    const loan1Pct = chk('i-loan1-enabled') ? val('i-loan1-pct') : 0;
    const loan2Pct = chk('i-loan2-enabled') ? val('i-loan2-pct') : 0;
    const loan3Pct = chk('i-loan3-enabled') ? val('i-loan3-pct') : 0;
    const totalPct = loan1Pct + loan2Pct + loan3Pct;

    const loans = [];
    for (let i = 1; i <= 3; i++) {
        if (chk(`i-loan${i}-enabled`) && totalPct > 0) {
            const loanPct = val(`i-loan${i}-pct`);
            const amt = requiredLoan * (loanPct / totalPct);
            const rate = val(`i-loan${i}-rate`);
            const repay = val(`i-loan${i}-repay`);
            const payment = amt * (rate + repay) / 100 / 12;
            const interest = amt * rate / 100 / 12;
            const principal = amt * repay / 100 / 12;
            const payoffYears = repay > 0 ? Math.ceil(100 / repay) : 999;
            loans.push({ amt, rate, repay, payment, interest, principal, payoffYears, pct: loanPct });
        } else {
            loans.push({ amt: 0, rate: 0, repay: 0, payment: 0, interest: 0, principal: 0, payoffYears: 0, pct: 0 });
        }
    }

    const totalLoan = loans.reduce((s, l) => s + l.amt, 0);
    const totalPayment = loans.reduce((s, l) => s + l.payment, 0);
    const totalInterest = loans.reduce((s, l) => s + l.interest, 0);
    const totalPrincipal = loans.reduce((s, l) => s + l.principal, 0);
    const weightedRate = totalLoan > 0 ? loans.reduce((s, l) => s + l.amt * l.rate, 0) / totalLoan : 0;
    const weightedRepay = totalLoan > 0 ? loans.reduce((s, l) => s + l.amt * l.repay, 0) / totalLoan : 0;
    const ltv = totalInvestment > 0 ? totalLoan / totalInvestment * 100 : 0;
    const equityRatio = totalInvestment > 0 ? equity / totalInvestment * 100 : 0;

    const opCashflow = netColdRent - nonAllocCosts - totalPayment;
    const taxableCashflow = warmRent - (nonAllocCosts - ownMaintMo) - totalInterest - monthlyAfa;
    const monthlyTax = taxableCashflow * taxRate / 100;
    const cashflowAfterTax = opCashflow - (taxableCashflow > 0 ? monthlyTax : 0) + (taxableCashflow < 0 ? Math.abs(taxableCashflow) * taxRate / 100 : 0);

    const annualRent = netColdRent * 12;
    const grossYield = (annualRent / price) * 100;
    const netYield = ((netColdRent - nonAllocCosts) * 12 / totalInvestment) * 100;
    const factor = annualRent > 0 ? price / annualRent : 0;
    const coc = equity > 0 ? (cashflowAfterTax * 12 / equity) * 100 : 0;

    const annualPrincipal = totalPrincipal * 12;
    const annualCashflow = cashflowAfterTax * 12;
    const annualAppreciation = price * appreciation / 100;
    const wealthGrowth = annualPrincipal + annualCashflow + annualAppreciation;
    const wealthNoApp = annualPrincipal + annualCashflow;

    R = {
        sqm, price, totalAcqCosts, acqCostsPct, initInvest, limit15, totalInvestment,
        brokerCost, notaryCost, registryCost, transferTaxCost, otherCosts,
        netColdRent, parkingRent, calcRent, allocableCosts, nonAllocCosts, warmRent,
        hgNonAlloc, wegReserve, ownMaintMo, vacancyCost, otherNonAlloc,
        afaRate, bldShare, depBase, annualAfa, monthlyAfa, taxRate,
        costInc, rentInc, appreciation,
        loans, totalLoan, totalPayment, totalInterest, totalPrincipal, weightedRate, weightedRepay, equity, ltv, equityRatio, requiredLoan,
        opCashflow, taxableCashflow, monthlyTax, cashflowAfterTax,
        grossYield, netYield, factor, coc, annualRent,
        wealthGrowth, wealthNoApp, annualPrincipal, annualCashflow, annualAppreciation,
        rentSqm, broker, notary, registry, transferTax
    };

    updateUI();
    generateProjection();
    updateProfessional();
}

function updateUI() {
    $('d-initInvest').textContent = fmt(R.initInvest);
    $('d-15limit').textContent = fmt(R.limit15);
    $('d-netColdRent').textContent = fmt(R.netColdRent);
    $('d-allocable').textContent = fmt(R.allocableCosts);
    $('d-warmRent').textContent = fmt(R.warmRent);
    $('d-depBase').textContent = fmt(R.depBase);
    $('d-annualAfa').textContent = fmt(R.annualAfa) + '/yr';

    // Update equity/financing displays
    $('d-totalInvestmentFin').textContent = fmt(R.totalInvestment);
    $('d-requiredLoan').textContent = fmt(R.requiredLoan);
    $('d-ltvRatio').textContent = pct(R.ltv, 1);
    $('d-equityRatio').textContent = pct(R.equityRatio, 1);

    for (let i = 1; i <= 3; i++) {
        const l = R.loans[i-1];
        $(`d-loan${i}-amount`).textContent = fmt(l.amt);
        $(`d-loan${i}-payment`).textContent = fmt(l.payment);
        $(`d-loan${i}-payoff`).textContent = l.payoffYears > 0 && l.payoffYears < 100 ? (new Date().getFullYear() + l.payoffYears) : '--';
    }

    $('t-priceAnalysis').innerHTML = `
        <tr><td>Price per m²</td><td class="text-right text-mono">${fmt(R.price / R.sqm)}</td></tr>
        <tr><td>Rent per m²</td><td class="text-right text-mono">${fmt2(R.rentSqm)}</td></tr>
        <tr><td>Acquisition Costs</td><td class="text-right text-mono">${pct(R.acqCostsPct, 1)}</td></tr>
        <tr><td>Price Factor</td><td class="text-right text-mono">${R.factor.toFixed(1)}x</td></tr>
    `;

    $('t-totalInvest').innerHTML = `
        <tr><td>Purchase Price</td><td class="text-right text-mono">${fmt(R.price)}</td></tr>
        <tr><td>Broker (${R.broker}%)</td><td class="text-right text-mono">${fmt(R.brokerCost)}</td></tr>
        <tr><td>Notary (${R.notary}%)</td><td class="text-right text-mono">${fmt(R.notaryCost)}</td></tr>
        <tr><td>Land Registry</td><td class="text-right text-mono">${fmt(R.registryCost)}</td></tr>
        <tr><td>Transfer Tax (${R.transferTax}%)</td><td class="text-right text-mono">${fmt(R.transferTaxCost)}</td></tr>
        <tr><td>Other Costs</td><td class="text-right text-mono">${fmt(R.otherCosts)}</td></tr>
        <tr><td>Initial Investments</td><td class="text-right text-mono">${fmt(R.initInvest)}</td></tr>
        <tr class="row-total"><td>Total Investment</td><td class="text-right text-mono">${fmt(R.totalInvestment)}</td></tr>
    `;

    $('t-finSummary').innerHTML = `
        <tr><td>Total Loans</td><td class="text-right text-mono">${fmt(R.totalLoan)}</td></tr>
        <tr><td>Weighted Interest Rate</td><td class="text-right text-mono">${pct(R.weightedRate)}</td></tr>
        <tr><td>Weighted Repayment</td><td class="text-right text-mono">${pct(R.weightedRepay)}</td></tr>
        <tr><td>Monthly Payment</td><td class="text-right text-mono">${fmt(R.totalPayment)}</td></tr>
        <tr><td>- Interest</td><td class="text-right text-mono text-danger">${fmt(R.totalInterest)}</td></tr>
        <tr><td>- Principal</td><td class="text-right text-mono text-success">${fmt(R.totalPrincipal)}</td></tr>
    `;

    $('t-equity').innerHTML = `
        <tr><td>Total Investment</td><td class="text-right text-mono">${fmt(R.totalInvestment)}</td></tr>
        <tr><td>Your Equity</td><td class="text-right text-mono">${fmt(R.equity)}</td></tr>
        <tr><td>Total Loans</td><td class="text-right text-mono">${fmt(R.totalLoan)}</td></tr>
        <tr class="row-total"><td>Equity Ratio</td><td class="text-right text-mono">${pct(R.equityRatio, 1)}</td></tr>
        <tr><td>LTV Ratio</td><td class="text-right text-mono">${pct(R.ltv, 1)}</td></tr>
    `;

    const setM = (id, val, cls) => { $(id).textContent = val; $(id).className = 'metric-value lg ' + cls; };
    setM('m-grossYield', pct(R.grossYield), R.grossYield > 5 ? 'positive' : R.grossYield < 3 ? 'negative' : 'warning');
    setM('m-netYield', pct(R.netYield), R.netYield > 3 ? 'positive' : R.netYield < 1 ? 'negative' : 'warning');
    setM('m-factor', R.factor.toFixed(1) + 'x', R.factor < 20 ? 'positive' : R.factor > 25 ? 'negative' : 'warning');
    setM('m-coc', pct(R.coc), R.coc > 5 ? 'positive' : R.coc < 0 ? 'negative' : 'warning');
    setM('m-cashflow', fmt(R.cashflowAfterTax), R.cashflowAfterTax >= 0 ? 'positive' : 'negative');
    setM('m-wealth', fmt(R.wealthGrowth), 'positive');

    $('t-investment').innerHTML = `
        <tr><td>Purchase Price</td><td class="text-right text-mono">${fmt(R.price)}</td></tr>
        <tr><td>Acquisition Costs</td><td class="text-right text-mono">${fmt(R.totalAcqCosts)}</td></tr>
        <tr><td>Initial Investments</td><td class="text-right text-mono">${fmt(R.initInvest)}</td></tr>
        <tr class="row-total"><td>Total</td><td class="text-right text-mono">${fmt(R.totalInvestment)}</td></tr>
        <tr><td>Equity</td><td class="text-right text-mono">${fmt(R.equity)}</td></tr>
        <tr><td>Loans</td><td class="text-right text-mono">${fmt(R.totalLoan)}</td></tr>
    `;

    $('t-rent').innerHTML = `
        <tr><td>Rent (${R.sqm} m² × ${fmt2(R.rentSqm)})</td><td class="text-right text-mono">${fmt(R.calcRent)}</td></tr>
        <tr><td>Parking</td><td class="text-right text-mono">${fmt(R.parkingRent)}</td></tr>
        <tr class="row-highlight"><td>Net Cold Rent</td><td class="text-right text-mono">${fmt(R.netColdRent)}</td></tr>
        <tr><td>+ Allocable Costs</td><td class="text-right text-mono">${fmt(R.allocableCosts)}</td></tr>
        <tr class="row-total"><td>Warm Rent</td><td class="text-right text-mono">${fmt(R.warmRent)}</td></tr>
    `;

    $('t-costs').innerHTML = `
        <tr><td>Hausgeld (non-alloc)</td><td class="text-right text-mono text-danger">${fmt(R.hgNonAlloc)}</td></tr>
        <tr><td>WEG Reserve</td><td class="text-right text-mono text-danger">${fmt(R.wegReserve)}</td></tr>
        <tr><td>Own Maintenance</td><td class="text-right text-mono text-danger">${fmt(R.ownMaintMo)}</td></tr>
        <tr><td>Vacancy Loss</td><td class="text-right text-mono text-danger">${fmt(R.vacancyCost)}</td></tr>
        <tr><td>Other</td><td class="text-right text-mono text-danger">${fmt(R.otherNonAlloc)}</td></tr>
        <tr class="row-total"><td>Total Non-Allocable</td><td class="text-right text-mono">${fmt(R.nonAllocCosts)}</td></tr>
    `;

    $('t-financing').innerHTML = `
        <tr><td>Total Loans</td><td class="text-right text-mono">${fmt(R.totalLoan)}</td></tr>
        <tr><td>Avg. Interest</td><td class="text-right text-mono">${pct(R.weightedRate)}</td></tr>
        <tr><td>Avg. Repayment</td><td class="text-right text-mono">${pct(R.weightedRepay)}</td></tr>
        <tr class="row-total"><td>Monthly Payment</td><td class="text-right text-mono">${fmt(R.totalPayment)}</td></tr>
    `;

    $('t-cashflow').innerHTML = `
        <tr><td>Warm Rent</td><td class="text-right text-mono text-success">${fmt(R.warmRent)}</td></tr>
        <tr><td>Operating Costs</td><td class="text-right text-mono text-danger">-${fmt(R.nonAllocCosts)}</td></tr>
        <tr><td>Interest</td><td class="text-right text-mono text-danger">-${fmt(R.totalInterest)}</td></tr>
        <tr><td>Principal</td><td class="text-right text-mono text-muted">-${fmt(R.totalPrincipal)}</td></tr>
        <tr><td>= Operational CF</td><td class="text-right text-mono">${fmt(R.opCashflow)}</td></tr>
        <tr><td>Tax Effect</td><td class="text-right text-mono ${R.taxableCashflow < 0 ? 'text-success' : 'text-danger'}">${R.taxableCashflow < 0 ? '+' : '-'}${fmt(Math.abs(R.monthlyTax))}</td></tr>
        <tr class="row-success"><td>After Tax</td><td class="text-right text-mono">${fmt(R.cashflowAfterTax)}</td></tr>
    `;

    $('t-tax').innerHTML = `
        <tr><td>Warm Rent</td><td class="text-right text-mono">${fmt(R.warmRent)}</td></tr>
        <tr><td>Op. Costs (excl. reserve)</td><td class="text-right text-mono">-${fmt(R.nonAllocCosts - R.ownMaintMo)}</td></tr>
        <tr><td>Interest</td><td class="text-right text-mono">-${fmt(R.totalInterest)}</td></tr>
        <tr><td>Depreciation (AfA)</td><td class="text-right text-mono">-${fmt(R.monthlyAfa)}</td></tr>
        <tr class="row-highlight"><td>Taxable Income</td><td class="text-right text-mono ${R.taxableCashflow < 0 ? 'text-success' : ''}">${fmt(R.taxableCashflow)}</td></tr>
        <tr><td>Tax Rate</td><td class="text-right text-mono">${pct(R.taxRate, 0)}</td></tr>
        <tr class="row-total"><td>Tax / (Savings)</td><td class="text-right text-mono ${R.taxableCashflow < 0 ? 'text-success' : 'text-danger'}">${R.taxableCashflow < 0 ? '+' + fmt(Math.abs(R.monthlyTax)) : '-' + fmt(R.monthlyTax)}</td></tr>
    `;

    $('t-returns').innerHTML = `
        <tr><td>Annual Cold Rent</td><td class="text-right text-mono">${fmt(R.annualRent)}</td></tr>
        <tr><td>Gross Yield</td><td class="text-right text-mono ${R.grossYield > 5 ? 'text-success' : ''}">${pct(R.grossYield)}</td></tr>
        <tr><td>Price Factor</td><td class="text-right text-mono">${R.factor.toFixed(1)}x</td></tr>
        <tr><td>Net Yield</td><td class="text-right text-mono ${R.netYield > 3 ? 'text-success' : ''}">${pct(R.netYield)}</td></tr>
        <tr class="row-highlight"><td>Cash-on-Cash Return</td><td class="text-right text-mono ${R.coc > 0 ? 'text-success' : 'text-danger'}">${pct(R.coc)}</td></tr>
    `;

    $('t-wealth').innerHTML = `
        <tr><td>Principal Paydown</td><td class="text-right text-mono text-success">${fmt(R.annualPrincipal)}</td></tr>
        <tr><td>Net Cashflow</td><td class="text-right text-mono ${R.annualCashflow >= 0 ? 'text-success' : 'text-danger'}">${fmt(R.annualCashflow)}</td></tr>
        <tr><td>Appreciation (${pct(R.appreciation, 0)})</td><td class="text-right text-mono text-success">${fmt(R.annualAppreciation)}</td></tr>
        <tr class="row-success"><td>Total Wealth Growth</td><td class="text-right text-mono">${fmt(R.wealthGrowth)}</td></tr>
        <tr><td>Without Appreciation</td><td class="text-right text-mono">${fmt(R.wealthNoApp)}</td></tr>
    `;
}

function generateProjection() {
    const years = [];
    const curYear = new Date().getFullYear();
    let rent = R.netColdRent;
    let costs = R.nonAllocCosts;
    let propertyValue = R.price;
    let cumCF = 0, cumEq = 0;
    let loanBalances = R.loans.map(l => l.amt);

    for (let i = 0; i <= 10; i++) {
        if (i > 0) {
            rent *= (1 + R.rentInc / 100);
            costs *= (1 + R.costInc / 100);
            propertyValue *= (1 + R.appreciation / 100);
        }

        const warmRent = rent + R.allocableCosts;
        const yIncome = rent * 12;
        const yCosts = costs * 12;

        let yInterest = 0, yPrincipal = 0;
        for (let j = 0; j < 3; j++) {
            if (loanBalances[j] > 0) {
                const l = R.loans[j];
                const annInt = loanBalances[j] * l.rate / 100;
                const annPrin = Math.min(loanBalances[j], loanBalances[j] * l.repay / 100);
                yInterest += annInt;
                yPrincipal += annPrin;
                loanBalances[j] -= annPrin;
            }
        }

        const yDebt = yInterest + yPrincipal;
        const yCFPre = yIncome - yCosts - yDebt;
        const yAfa = R.annualAfa;
        const taxableInc = yIncome - yCosts + R.allocableCosts * 12 - yInterest - yAfa;
        const tax = taxableInc > 0 ? taxableInc * R.taxRate / 100 : 0;
        const taxSave = taxableInc < 0 ? Math.abs(taxableInc) * R.taxRate / 100 : 0;
        const yCFPost = yCFPre - tax + taxSave;

        cumCF += yCFPost;
        cumEq += yPrincipal;
        const totalDebt = loanBalances.reduce((s, b) => s + b, 0);

        years.push({
            year: curYear + i, rent, warmRent, yIncome, yCosts, yInterest, yPrincipal, yDebt,
            yCFPre, yAfa, taxableInc, tax, taxSave, yCFPost, cumCF, cumEq, totalDebt, propertyValue
        });
    }

    R.projection = years;

    let head = '<tr><th>Item</th>';
    for (let i = 1; i <= 10; i++) head += `<th>${years[i].year}</th>`;
    head += '</tr>';
    $('proj-head').innerHTML = head;

    const row = (label, getter, cls = '') => {
        let r = `<tr class="${cls}"><td>${label}</td>`;
        for (let i = 1; i <= 10; i++) r += `<td class="text-right text-mono">${getter(years[i])}</td>`;
        return r + '</tr>';
    };

    $('proj-body').innerHTML =
        row('Rental Income', y => fmt(y.yIncome)) +
        row('Operating Costs', y => `<span class="text-danger">-${fmt(y.yCosts)}</span>`) +
        row('Interest', y => `<span class="text-danger">-${fmt(y.yInterest)}</span>`) +
        row('Principal', y => `<span class="text-muted">-${fmt(y.yPrincipal)}</span>`) +
        row('Cashflow Pre-Tax', y => `<span class="${y.yCFPre >= 0 ? 'text-success' : 'text-danger'}">${fmt(y.yCFPre)}</span>`, 'row-highlight') +
        row('AfA Depreciation', y => fmt(y.yAfa)) +
        row('Taxable Income', y => `<span class="${y.taxableInc < 0 ? 'text-success' : ''}">${fmt(y.taxableInc)}</span>`) +
        row('Tax / Savings', y => y.taxableInc < 0 ? `<span class="text-success">+${fmt(y.taxSave)}</span>` : `<span class="text-danger">-${fmt(y.tax)}</span>`) +
        row('Cashflow After Tax', y => `<span class="${y.yCFPost >= 0 ? 'text-success' : 'text-danger'}">${fmt(y.yCFPost)}</span>`, 'row-success') +
        row('Remaining Debt', y => fmt(y.totalDebt)) +
        row('Property Value', y => fmt(y.propertyValue)) +
        row('Cumulative CF', y => `<span class="${y.cumCF >= 0 ? 'text-success' : 'text-danger'}">${fmt(y.cumCF)}</span>`) +
        row('Equity Built', y => `<span class="text-success">${fmt(y.cumEq)}</span>`, 'row-highlight');

    const y10 = years[10];
    $('b-projection').textContent = y10.yCFPost >= 0 ? 'Positive CF' : 'Negative CF';
    $('b-projection').className = 'badge ' + (y10.yCFPost >= 0 ? 'badge-success' : 'badge-danger');
}

function updateCharts() {
    if (!R.projection || R.projection.length === 0) return;

    const years = R.projection.slice(1).map(y => y.year);
    const chartColors = {
        success: '#059669',
        danger: '#dc2626',
        warning: '#d97706',
        accent: '#0369a1',
        muted: '#9ca3af',
        primary: '#1e3a5f'
    };

    // Chart 1: Annual Cashflow
    const cashflowCtx = $('chart-cashflow');
    if (charts.cashflow) charts.cashflow.destroy();
    charts.cashflow = new Chart(cashflowCtx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Pre-Tax Cashflow',
                data: R.projection.slice(1).map(y => y.yCFPre),
                backgroundColor: chartColors.accent + '80',
                borderColor: chartColors.accent,
                borderWidth: 1
            }, {
                label: 'After-Tax Cashflow',
                data: R.projection.slice(1).map(y => y.yCFPost),
                backgroundColor: R.projection.slice(1).map(y => y.yCFPost >= 0 ? chartColors.success + '80' : chartColors.danger + '80'),
                borderColor: R.projection.slice(1).map(y => y.yCFPost >= 0 ? chartColors.success : chartColors.danger),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => fmt(value)
                    }
                }
            }
        }
    });

    // Chart 2: Wealth Building Components (Stacked Bar)
    const wealthCtx = $('chart-wealth');
    if (charts.wealth) charts.wealth.destroy();
    charts.wealth = new Chart(wealthCtx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Principal Paydown',
                data: R.projection.slice(1).map(y => y.yPrincipal),
                backgroundColor: chartColors.success,
                stack: 'wealth'
            }, {
                label: 'Net Cashflow',
                data: R.projection.slice(1).map(y => y.yCFPost),
                backgroundColor: chartColors.accent,
                stack: 'wealth'
            }, {
                label: 'Appreciation',
                data: R.projection.slice(1).map((y, i) => {
                    const prevValue = i === 0 ? R.price : R.projection[i].propertyValue;
                    return y.propertyValue - prevValue;
                }),
                backgroundColor: chartColors.warning,
                stack: 'wealth'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    ticks: {
                        callback: value => fmt(value)
                    }
                }
            }
        }
    });

    // Chart 3: Debt vs Equity Built
    const debtEquityCtx = $('chart-debt-equity');
    if (charts.debtEquity) charts.debtEquity.destroy();
    charts.debtEquity = new Chart(debtEquityCtx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Remaining Debt',
                data: R.projection.slice(1).map(y => y.totalDebt),
                borderColor: chartColors.danger,
                backgroundColor: chartColors.danger + '20',
                fill: true,
                tension: 0.3
            }, {
                label: 'Equity Built (Cumulative)',
                data: R.projection.slice(1).map(y => y.cumEq),
                borderColor: chartColors.success,
                backgroundColor: chartColors.success + '20',
                fill: true,
                tension: 0.3
            }, {
                label: 'Initial Equity',
                data: R.projection.slice(1).map(() => R.equity),
                borderColor: chartColors.muted,
                borderDash: [5, 5],
                fill: false,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => fmt(value)
                    }
                }
            }
        }
    });

    // Chart 4: Property Value vs Debt
    const valueDebtCtx = $('chart-value-debt');
    if (charts.valueDebt) charts.valueDebt.destroy();
    charts.valueDebt = new Chart(valueDebtCtx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Property Value',
                data: R.projection.slice(1).map(y => y.propertyValue),
                borderColor: chartColors.success,
                backgroundColor: chartColors.success + '20',
                fill: true,
                tension: 0.3
            }, {
                label: 'Remaining Debt',
                data: R.projection.slice(1).map(y => y.totalDebt),
                borderColor: chartColors.danger,
                backgroundColor: chartColors.danger + '20',
                fill: true,
                tension: 0.3
            }, {
                label: 'Net Equity Position',
                data: R.projection.slice(1).map(y => y.propertyValue - y.totalDebt),
                borderColor: chartColors.accent,
                borderWidth: 3,
                fill: false,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => fmt(value)
                    }
                }
            }
        }
    });
}

function updateProfessional() {
    const futureYear = val('i-futureYear');
    const idx = Math.min(futureYear, R.projection.length - 1);
    const y = R.projection[idx] || R.projection[R.projection.length - 1];

    $('t-future').innerHTML = `
        <tr><td>Analysis Year</td><td class="text-right text-mono">${y.year}</td></tr>
        <tr><td>Years from Purchase</td><td class="text-right text-mono">${idx}</td></tr>
        <tr class="row-highlight"><td>Annual Rent</td><td class="text-right text-mono">${fmt(y.yIncome)}</td></tr>
        <tr><td>Monthly Rent</td><td class="text-right text-mono">${fmt(y.rent)}</td></tr>
        <tr><td>Rent per m²</td><td class="text-right text-mono">${fmt2(y.rent / R.sqm)}</td></tr>
        <tr class="row-highlight"><td>Property Value</td><td class="text-right text-mono">${fmt(y.propertyValue)}</td></tr>
        <tr><td>Value per m²</td><td class="text-right text-mono">${fmt(y.propertyValue / R.sqm)}</td></tr>
        <tr class="row-success"><td>Monthly Cashflow</td><td class="text-right text-mono">${fmt(y.yCFPost / 12)}</td></tr>
    `;

    let cfPositiveYear = '--', cumCFPositiveYear = '--', cumCFPlusEqYear = '--';
    for (let i = 1; i < R.projection.length; i++) {
        if (cfPositiveYear === '--' && R.projection[i].yCFPost > 0) cfPositiveYear = R.projection[i].year;
        if (cumCFPositiveYear === '--' && R.projection[i].cumCF > 0) cumCFPositiveYear = R.projection[i].year;
        if (cumCFPlusEqYear === '--' && R.projection[i].cumCF + R.projection[i].cumEq > R.equity) cumCFPlusEqYear = R.projection[i].year;
    }

    $('t-breakeven').innerHTML = `
        <tr><td>Cashflow Positive (first)</td><td class="text-right text-mono">${cfPositiveYear}</td></tr>
        <tr><td>Cumulative CF Positive</td><td class="text-right text-mono">${cumCFPositiveYear}</td></tr>
        <tr><td>CF + Equity > Initial Equity</td><td class="text-right text-mono">${cumCFPlusEqYear}</td></tr>
        <tr class="row-highlight"><td>Cumulative CF to Date</td><td class="text-right text-mono ${y.cumCF >= 0 ? 'text-success' : 'text-danger'}">${fmt(y.cumCF)}</td></tr>
    `;

    const maxInterest = R.cashflowAfterTax > 0 ? (R.cashflowAfterTax * 12 + R.totalInterest * 12) / R.totalLoan * 100 : R.weightedRate;
    $('t-interestRisk').innerHTML = `
        <tr><td>Current Weighted Rate</td><td class="text-right text-mono">${pct(R.weightedRate)}</td></tr>
        <tr><td>Monthly Interest</td><td class="text-right text-mono">${fmt(R.totalInterest)}</td></tr>
        <tr class="row-highlight"><td>Max Rate for CF=0</td><td class="text-right text-mono">${pct(maxInterest)}</td></tr>
        <tr><td>Buffer</td><td class="text-right text-mono text-success">+${pct(Math.max(0, maxInterest - R.weightedRate))}</td></tr>
    `;

    const futureRent = y.yIncome;
    const valueFactor20 = futureRent * 20;
    const valueFactor25 = futureRent * 25;
    $('t-valuation').innerHTML = `
        <tr><td>Annual Rent (Year ${idx})</td><td class="text-right text-mono">${fmt(futureRent)}</td></tr>
        <tr><td>Current Factor</td><td class="text-right text-mono">${R.factor.toFixed(1)}x</td></tr>
        <tr><td>Value @ 20x Factor</td><td class="text-right text-mono">${fmt(valueFactor20)}</td></tr>
        <tr><td>Value @ 25x Factor</td><td class="text-right text-mono">${fmt(valueFactor25)}</td></tr>
        <tr class="row-highlight"><td>Projected Value</td><td class="text-right text-mono">${fmt(y.propertyValue)}</td></tr>
    `;

    const wealthPos = y.propertyValue - y.totalDebt - R.equity + y.cumCF;
    $('t-wealthPos').innerHTML = `
        <tr><td>Property Value</td><td class="text-right text-mono">${fmt(y.propertyValue)}</td></tr>
        <tr><td>Remaining Debt</td><td class="text-right text-mono text-danger">-${fmt(y.totalDebt)}</td></tr>
        <tr><td>Initial Equity</td><td class="text-right text-mono text-danger">-${fmt(R.equity)}</td></tr>
        <tr><td>Cumulative Cashflow</td><td class="text-right text-mono ${y.cumCF >= 0 ? 'text-success' : 'text-danger'}">${y.cumCF >= 0 ? '+' : ''}${fmt(y.cumCF)}</td></tr>
        <tr class="row-success"><td>Net Wealth Gain</td><td class="text-right text-mono">${fmt(wealthPos)}</td></tr>
    `;

    const loanReserve = y.propertyValue - y.totalDebt;
    const ltvFuture = y.totalDebt / y.propertyValue * 100;
    $('t-loanReserve').innerHTML = `
        <tr><td>Property Value</td><td class="text-right text-mono">${fmt(y.propertyValue)}</td></tr>
        <tr><td>Remaining Debt</td><td class="text-right text-mono">-${fmt(y.totalDebt)}</td></tr>
        <tr class="row-highlight"><td>Equity in Property</td><td class="text-right text-mono text-success">${fmt(loanReserve)}</td></tr>
        <tr><td>LTV Ratio</td><td class="text-right text-mono">${pct(ltvFuture, 1)}</td></tr>
    `;
}

function resetForm() {
    document.querySelectorAll('input[type="number"]').forEach(el => el.value = el.defaultValue);
    document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = el.id === 'i-loan1-enabled');
    document.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
    lastRentEdit = 'sqm';
    calculate();
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 15;

    const addHeader = () => {
        doc.setFillColor(30, 58, 95);
        doc.rect(0, 0, pw, 32, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Property Investment Analysis Report', 14, 14);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text($('i-address').value || 'Investment Property', 14, 22);
        doc.setFontSize(9);
        doc.text('Generated: ' + new Date().toLocaleDateString('de-DE') + ' | Rendite Pro v2.0', 14, 28);
    };

    const addSection = (title) => {
        if (y > ph - 30) { doc.addPage(); y = 15; }
        doc.setTextColor(30, 58, 95);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, y);
        y += 5;
        doc.setTextColor(0, 0, 0);
    };

    const addTable = (head, body, opts = {}) => {
        doc.autoTable({
            startY: y,
            head: [head],
            body: body,
            theme: opts.theme || 'striped',
            headStyles: { fillColor: [30, 58, 95], fontSize: 7, cellPadding: 1.5 },
            styles: { fontSize: 7, cellPadding: 1.5 },
            columnStyles: opts.columnStyles || {},
            margin: { left: 14, right: 14 },
            ...opts
        });
        y = doc.lastAutoTable.finalY + 6;
    };

    // Page 1: Summary
    addHeader();
    y = 40;

    addSection('KEY INVESTMENT METRICS');
    addTable(
        ['Metric', 'Value', 'Metric', 'Value', 'Metric', 'Value'],
        [
            ['Gross Yield', pct(R.grossYield), 'Net Yield', pct(R.netYield), 'Price Factor', R.factor.toFixed(1) + 'x'],
            ['Cash-on-Cash', pct(R.coc), 'Monthly CF', fmt(R.cashflowAfterTax), 'Wealth/Year', fmt(R.wealthGrowth)]
        ],
        { theme: 'grid' }
    );

    addSection('PROPERTY & INVESTMENT');
    addTable(
        ['Property Details', '', 'Investment Breakdown', ''],
        [
            ['Living Area', R.sqm + ' m²', 'Purchase Price', fmt(R.price)],
            ['Purchase Price', fmt(R.price), 'Acquisition Costs', fmt(R.totalAcqCosts)],
            ['Price per m²', fmt(R.price / R.sqm), 'Initial Investments', fmt(R.initInvest)],
            ['Rent per m²', fmt2(R.rentSqm), 'Total Investment', fmt(R.totalInvestment)],
        ],
        { columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } } }
    );

    addSection('ACQUISITION COSTS BREAKDOWN');
    addTable(
        ['Cost Type', 'Rate', 'Amount'],
        [
            ['Broker Fee', pct(R.broker, 2), fmt(R.brokerCost)],
            ['Notary Fee', pct(R.notary, 2), fmt(R.notaryCost)],
            ['Land Registry', pct(R.registry, 2), fmt(R.registryCost)],
            ['Transfer Tax', pct(R.transferTax, 2), fmt(R.transferTaxCost)],
            ['Other Costs', '-', fmt(R.otherCosts)],
            ['TOTAL', pct(R.acqCostsPct, 2), fmt(R.totalAcqCosts)],
        ],
        { columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } } }
    );

    addSection('MONTHLY INCOME & COSTS');
    addTable(
        ['Income', 'Amount', 'Non-Allocable Costs', 'Amount'],
        [
            ['Cold Rent (' + R.sqm + 'm² × ' + fmt2(R.rentSqm) + ')', fmt(R.calcRent), 'Hausgeld (non-alloc)', fmt(R.hgNonAlloc)],
            ['Parking Income', fmt(R.parkingRent), 'WEG Reserve', fmt(R.wegReserve)],
            ['Net Cold Rent', fmt(R.netColdRent), 'Own Maintenance', fmt(R.ownMaintMo)],
            ['+ Allocable Costs', fmt(R.allocableCosts), 'Vacancy Loss', fmt(R.vacancyCost)],
            ['WARM RENT', fmt(R.warmRent), 'TOTAL COSTS', fmt(R.nonAllocCosts)],
        ],
        { columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } } }
    );

    // Page 2: Financing & Tax
    doc.addPage();
    y = 15;

    addSection('FINANCING STRUCTURE');
    const loanRows = [];
    for (let i = 0; i < 3; i++) {
        const l = R.loans[i];
        if (l.amt > 0) {
            loanRows.push([
                'Loan ' + (i + 1),
                fmt(l.amt),
                pct(l.rate, 2),
                pct(l.repay, 2),
                fmt(l.payment),
                l.payoffYears < 100 ? (new Date().getFullYear() + l.payoffYears) : '-'
            ]);
        }
    }
    loanRows.push(['TOTAL', fmt(R.totalLoan), pct(R.weightedRate, 2), pct(R.weightedRepay, 2), fmt(R.totalPayment), '-']);
    addTable(
        ['Loan', 'Amount', 'Interest', 'Repayment', 'Monthly', 'Payoff'],
        loanRows,
        { columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } } }
    );

    addSection('EQUITY POSITION');
    addTable(
        ['Item', 'Amount'],
        [
            ['Total Investment', fmt(R.totalInvestment)],
            ['Your Equity', fmt(R.equity)],
            ['Total Loans', fmt(R.totalLoan)],
            ['Equity Ratio', pct(R.equityRatio, 1)],
            ['LTV Ratio', pct(R.ltv, 1)],
        ],
        { columnStyles: { 1: { halign: 'right' } } }
    );

    addSection('MONTHLY CASHFLOW');
    addTable(
        ['Item', 'Amount'],
        [
            ['Warm Rent', '+' + fmt(R.warmRent)],
            ['Operating Costs', '-' + fmt(R.nonAllocCosts)],
            ['Interest Payment', '-' + fmt(R.totalInterest)],
            ['Principal Payment', '-' + fmt(R.totalPrincipal)],
            ['Operational Cashflow', fmt(R.opCashflow)],
            ['Tax Effect', (R.taxableCashflow < 0 ? '+' : '-') + fmt(Math.abs(R.monthlyTax))],
            ['CASHFLOW AFTER TAX', fmt(R.cashflowAfterTax)],
        ],
        { columnStyles: { 1: { halign: 'right' } } }
    );

    addSection('TAX CALCULATION (MONTHLY)');
    addTable(
        ['Item', 'Amount'],
        [
            ['Warm Rent', fmt(R.warmRent)],
            ['Operating Costs (excl. reserve)', '-' + fmt(R.nonAllocCosts - R.ownMaintMo)],
            ['Interest Expense', '-' + fmt(R.totalInterest)],
            ['Depreciation (AfA ' + R.afaRate + '%)', '-' + fmt(R.monthlyAfa)],
            ['Taxable Income', fmt(R.taxableCashflow)],
            ['Tax Rate', pct(R.taxRate, 0)],
            ['Tax / (Savings)', (R.taxableCashflow < 0 ? '+' : '-') + fmt(Math.abs(R.monthlyTax))],
        ],
        { columnStyles: { 1: { halign: 'right' } } }
    );

    addSection('DEPRECIATION (AfA)');
    addTable(
        ['Item', 'Value'],
        [
            ['Purchase Price', fmt(R.price)],
            ['Building Share', pct(R.bldShare, 0)],
            ['Depreciation Base', fmt(R.depBase)],
            ['AfA Rate', pct(R.afaRate, 1)],
            ['Annual Depreciation', fmt(R.annualAfa)],
            ['Monthly Depreciation', fmt(R.monthlyAfa)],
        ],
        { columnStyles: { 1: { halign: 'right' } } }
    );

    // Page 3: 10-Year Projection
    doc.addPage();
    y = 15;

    addSection('10-YEAR CASHFLOW PROJECTION');
    const projHead = ['Item'];
    for (let i = 1; i <= 10; i++) projHead.push(R.projection[i].year.toString());

    const projBody = [
        ['Rental Income', ...R.projection.slice(1).map(y => fmt(y.yIncome))],
        ['Operating Costs', ...R.projection.slice(1).map(y => '-' + fmt(y.yCosts))],
        ['Interest', ...R.projection.slice(1).map(y => '-' + fmt(y.yInterest))],
        ['Principal', ...R.projection.slice(1).map(y => '-' + fmt(y.yPrincipal))],
        ['CF Pre-Tax', ...R.projection.slice(1).map(y => fmt(y.yCFPre))],
        ['Depreciation', ...R.projection.slice(1).map(y => fmt(y.yAfa))],
        ['Taxable Income', ...R.projection.slice(1).map(y => fmt(y.taxableInc))],
        ['Tax/Savings', ...R.projection.slice(1).map(y => y.taxableInc < 0 ? '+' + fmt(y.taxSave) : '-' + fmt(y.tax))],
        ['CF After Tax', ...R.projection.slice(1).map(y => fmt(y.yCFPost))],
        ['Remaining Debt', ...R.projection.slice(1).map(y => fmt(y.totalDebt))],
        ['Property Value', ...R.projection.slice(1).map(y => fmt(y.propertyValue))],
        ['Cumulative CF', ...R.projection.slice(1).map(y => fmt(y.cumCF))],
        ['Equity Built', ...R.projection.slice(1).map(y => fmt(y.cumEq))],
    ];

    doc.autoTable({
        startY: y,
        head: [projHead],
        body: projBody,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95], fontSize: 6, cellPadding: 1 },
        styles: { fontSize: 6, cellPadding: 1, halign: 'right' },
        columnStyles: { 0: { halign: 'left', cellWidth: 28 } },
        margin: { left: 10, right: 10 }
    });
    y = doc.lastAutoTable.finalY + 8;

    // Page 4: Charts Data (Wealth Building & Equity Analysis)
    doc.addPage();
    y = 15;

    addSection('ANNUAL CASHFLOW ANALYSIS');
    const cashflowHead = ['Year', 'Rental Income', 'Operating Costs', 'Loan Payment', 'Pre-Tax CF', 'After-Tax CF'];
    const cashflowBody = R.projection.slice(1).map(yr => [
        yr.year,
        fmt(yr.yIncome),
        fmt(yr.yCosts),
        fmt(yr.yInterest + yr.yPrincipal),
        fmt(yr.yCFPre),
        fmt(yr.yCFPost)
    ]);
    addTable(cashflowHead, cashflowBody, {
        columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
    });

    addSection('WEALTH BUILDING COMPONENTS (ANNUAL)');
    const wealthHead = ['Year', 'Principal Paydown', 'Net Cashflow', 'Appreciation', 'Total Wealth'];
    const wealthBody = R.projection.slice(1).map((yr, i) => {
        const prevValue = i === 0 ? R.price : R.projection[i].propertyValue;
        const appreciation = yr.propertyValue - prevValue;
        const totalWealth = yr.yPrincipal + yr.yCFPost + appreciation;
        return [
            yr.year,
            fmt(yr.yPrincipal),
            fmt(yr.yCFPost),
            fmt(appreciation),
            fmt(totalWealth)
        ];
    });
    addTable(wealthHead, wealthBody, {
        columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    addSection('DEBT VS EQUITY POSITION');
    const debtEquityHead = ['Year', 'Property Value', 'Remaining Debt', 'Equity in Property', 'LTV Ratio', 'Cumulative CF'];
    const debtEquityBody = R.projection.slice(1).map(yr => {
        const equityInProperty = yr.propertyValue - yr.totalDebt;
        const ltvRatio = yr.propertyValue > 0 ? (yr.totalDebt / yr.propertyValue * 100) : 0;
        return [
            yr.year,
            fmt(yr.propertyValue),
            fmt(yr.totalDebt),
            fmt(equityInProperty),
            pct(ltvRatio, 1),
            fmt(yr.cumCF)
        ];
    });
    addTable(debtEquityHead, debtEquityBody, {
        columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
    });

    // Page 5: Professional Metrics
    doc.addPage();
    y = 15;

    const futureYear = val('i-futureYear');
    const idx = Math.min(futureYear, R.projection.length - 1);
    const yF = R.projection[idx];

    addSection('PROFESSIONAL METRICS - YEAR ' + yF.year);

    addTable(
        ['Future Value Metrics', 'Value'],
        [
            ['Analysis Year', yF.year],
            ['Years from Purchase', idx],
            ['Annual Rent', fmt(yF.yIncome)],
            ['Monthly Rent', fmt(yF.rent)],
            ['Rent per m²', fmt2(yF.rent / R.sqm)],
            ['Property Value', fmt(yF.propertyValue)],
            ['Value per m²', fmt(yF.propertyValue / R.sqm)],
            ['Monthly Cashflow', fmt(yF.yCFPost / 12)],
        ],
        { columnStyles: { 1: { halign: 'right' } } }
    );

    let cfPositiveYear = '--', cumCFPositiveYear = '--';
    for (let i = 1; i < R.projection.length; i++) {
        if (cfPositiveYear === '--' && R.projection[i].yCFPost > 0) cfPositiveYear = R.projection[i].year;
        if (cumCFPositiveYear === '--' && R.projection[i].cumCF > 0) cumCFPositiveYear = R.projection[i].year;
    }

    addSection('BREAK-EVEN ANALYSIS');
    addTable(
        ['Metric', 'Year/Value'],
        [
            ['First Year with Positive CF', cfPositiveYear],
            ['Cumulative CF Positive', cumCFPositiveYear],
            ['Cumulative CF at Year ' + idx, fmt(yF.cumCF)],
            ['Equity Built at Year ' + idx, fmt(yF.cumEq)],
        ],
        { columnStyles: { 1: { halign: 'right' } } }
    );

    const maxInterest = R.cashflowAfterTax > 0 ? (R.cashflowAfterTax * 12 + R.totalInterest * 12) / R.totalLoan * 100 : R.weightedRate;

    addSection('INTEREST RATE RISK');
    addTable(
        ['Metric', 'Value'],
        [
            ['Current Weighted Rate', pct(R.weightedRate)],
            ['Annual Interest Cost', fmt(R.totalInterest * 12)],
            ['Max Rate for CF=0', pct(maxInterest)],
            ['Rate Buffer', '+' + pct(Math.max(0, maxInterest - R.weightedRate))],
        ],
        { columnStyles: { 1: { halign: 'right' } } }
    );

    addSection('VALUATION BY RENT FACTOR');
    addTable(
        ['Factor', 'Property Value'],
        [
            ['Current Factor (' + R.factor.toFixed(1) + 'x)', fmt(R.price)],
            ['At 20x Factor', fmt(yF.yIncome * 20)],
            ['At 22x Factor', fmt(yF.yIncome * 22)],
            ['At 25x Factor', fmt(yF.yIncome * 25)],
            ['Projected (' + R.appreciation + '% p.a.)', fmt(yF.propertyValue)],
        ],
        { columnStyles: { 1: { halign: 'right' } } }
    );

    const wealthPos = yF.propertyValue - yF.totalDebt - R.equity + yF.cumCF;
    const loanReserve = yF.propertyValue - yF.totalDebt;

    addSection('WEALTH POSITION AT YEAR ' + idx);
    addTable(
        ['Item', 'Amount'],
        [
            ['Property Value', fmt(yF.propertyValue)],
            ['Remaining Debt', '-' + fmt(yF.totalDebt)],
            ['Equity in Property', fmt(loanReserve)],
            ['Initial Equity Invested', '-' + fmt(R.equity)],
            ['Cumulative Cashflow', (yF.cumCF >= 0 ? '+' : '') + fmt(yF.cumCF)],
            ['NET WEALTH GAIN', fmt(wealthPos)],
        ],
        { columnStyles: { 1: { halign: 'right' } } }
    );

    addSection('ANNUAL WEALTH BUILDING');
    addTable(
        ['Component', 'Annual Amount'],
        [
            ['Principal Paydown', fmt(R.annualPrincipal)],
            ['Net Cashflow', fmt(R.annualCashflow)],
            ['Property Appreciation (' + pct(R.appreciation, 0) + ')', fmt(R.annualAppreciation)],
            ['TOTAL WEALTH GROWTH', fmt(R.wealthGrowth)],
            ['Without Appreciation', fmt(R.wealthNoApp)],
        ],
        { columnStyles: { 1: { halign: 'right' } } }
    );

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text('Rendite Pro v2.0 - German Property Investment Analysis', 14, ph - 7);
        doc.text('Page ' + i + ' of ' + pageCount, pw - 25, ph - 7);
        doc.setDrawColor(200);
        doc.line(14, ph - 10, pw - 14, ph - 10);
    }

    const fileName = ($('i-address').value || 'property-analysis').toLowerCase().replace(/[^a-z0-9]/g, '-') + '-report.pdf';
    doc.save(fileName);
}

document.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', calculate);
    el.addEventListener('input', calculate);
});

document.addEventListener('DOMContentLoaded', () => {
    $('i-date').value = new Date().toISOString().split('T')[0];
    setupRentSync();
    calculate();
});
