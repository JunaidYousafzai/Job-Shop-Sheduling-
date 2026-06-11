/* =============================================
   JOB SHOP SCHEDULING OPTIMIZER — GENETIC ALGORITHM
   Full functional implementation
   ============================================= */

// ===== STATE =====
let jobsData = []; // [{id, operations:[{machine,duration}]}]
const JOB_COLORS = ['#f97316','#3b82f6','#22c55e','#a855f7','#ef4444','#06b6d4','#eab308','#ec4899','#14b8a6','#f43f5e','#8b5cf6','#84cc16','#fb923c','#2dd4bf','#f472b6','#facc15','#38bdf8','#a3e635','#c084fc','#fb7185'];

// ===== DOM REFS =====
const $ = id => document.getElementById(id);
const jobsContainer = $('jobsContainer');
const previewTable = $('previewBody');
const previewStats = $('previewStats');
const dataPreview = $('dataPreview');
const runBtn = $('runBtn');

// ===== TABS =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        $(btn.dataset.tab + 'Tab').classList.add('active');
    });
});

// ===== MANUAL INPUT =====
let jobCounter = 0;

function addJob(machineVals, durationVals) {
    jobCounter++;
    const jid = jobCounter;
    const card = document.createElement('div');
    card.className = 'job-card';
    card.dataset.jid = jid;
    const ops = machineVals || ['']; 
    const durs = durationVals || [''];
    card.innerHTML = `
        <div class="job-header">
            <span class="job-title">Job ${jid}</span>
            <div class="job-actions">
                <button class="btn btn-xs btn-accent add-op-btn">+ Op</button>
                <button class="btn btn-xs btn-danger remove-job-btn">✕</button>
            </div>
        </div>
        <div class="ops-list">${ops.map((m, i) => opRowHTML(i + 1, m, durs[i] || '')).join('')}</div>`;
    jobsContainer.appendChild(card);
    card.querySelector('.add-op-btn').onclick = () => {
        const list = card.querySelector('.ops-list');
        const idx = list.children.length + 1;
        list.insertAdjacentHTML('beforeend', opRowHTML(idx, '', ''));
        bindOpRemove(card);
        syncFromManual();
    };
    card.querySelector('.remove-job-btn').onclick = () => { card.remove(); syncFromManual(); };
    bindOpRemove(card);
    card.querySelectorAll('.op-input').forEach(inp => inp.addEventListener('input', syncFromManual));
    syncFromManual();
}

function opRowHTML(idx, machine, duration) {
    return `<div class="op-row">
        <span class="op-label">O${idx}</span>
        <input class="op-input" type="number" placeholder="Machine" min="1" value="${machine}">
        <input class="op-input" type="number" placeholder="Duration" min="1" value="${duration}">
        <button class="btn btn-xs btn-danger remove-op-btn" title="Remove">✕</button>
    </div>`;
}

function bindOpRemove(card) {
    card.querySelectorAll('.remove-op-btn').forEach(btn => {
        btn.onclick = () => {
            if (card.querySelectorAll('.op-row').length > 1) { btn.closest('.op-row').remove(); syncFromManual(); }
        };
    });
    card.querySelectorAll('.op-input').forEach(inp => inp.addEventListener('input', syncFromManual));
}

function syncFromManual() {
    jobsData = [];
    document.querySelectorAll('.job-card').forEach((card, ji) => {
        const ops = [];
        card.querySelectorAll('.op-row').forEach((row, oi) => {
            const inputs = row.querySelectorAll('.op-input');
            const m = parseInt(inputs[0].value);
            const d = parseInt(inputs[1].value);
            if (m > 0 && d > 0) ops.push({ machine: m, duration: d });
        });
        if (ops.length > 0) jobsData.push({ id: ji + 1, operations: ops });
    });
    updatePreview();
}

$('addJobBtn').onclick = () => addJob();

// ===== SAMPLE DATA (FT06: 6 jobs x 6 machines) =====
const SAMPLE_FT06 = [
    { id:1, operations:[{machine:3,duration:1},{machine:1,duration:3},{machine:2,duration:6},{machine:4,duration:7},{machine:6,duration:3},{machine:5,duration:6}] },
    { id:2, operations:[{machine:2,duration:8},{machine:3,duration:5},{machine:5,duration:10},{machine:6,duration:10},{machine:1,duration:10},{machine:4,duration:4}] },
    { id:3, operations:[{machine:3,duration:5},{machine:4,duration:4},{machine:6,duration:8},{machine:1,duration:9},{machine:2,duration:1},{machine:5,duration:7}] },
    { id:4, operations:[{machine:2,duration:5},{machine:1,duration:5},{machine:3,duration:5},{machine:4,duration:3},{machine:5,duration:8},{machine:6,duration:9}] },
    { id:5, operations:[{machine:3,duration:9},{machine:2,duration:3},{machine:5,duration:5},{machine:6,duration:4},{machine:1,duration:3},{machine:4,duration:1}] },
    { id:6, operations:[{machine:2,duration:3},{machine:4,duration:3},{machine:6,duration:9},{machine:1,duration:10},{machine:5,duration:4},{machine:3,duration:1}] }
];

function loadSample() {
    jobsContainer.innerHTML = '';
    jobCounter = 0;
    SAMPLE_FT06.forEach(j => {
        addJob(j.operations.map(o => o.machine), j.operations.map(o => o.duration));
    });
}
$('loadSampleBtn').onclick = loadSample;
$('loadSampleCsvBtn').onclick = loadSample;

// ===== CSV =====
const dropZone = $('dropZone');
const csvInput = $('csvFileInput');
dropZone.onclick = () => csvInput.click();
dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add('dragover'); };
dropZone.ondragleave = () => dropZone.classList.remove('dragover');
dropZone.ondrop = e => { e.preventDefault(); dropZone.classList.remove('dragover'); handleCSV(e.dataTransfer.files[0]); };
csvInput.onchange = e => { if (e.target.files[0]) handleCSV(e.target.files[0]); };

function handleCSV(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const lines = e.target.result.trim().split('\n').map(l => l.trim()).filter(l => l);
        const hasHeader = isNaN(parseInt(lines[0].split(',')[0]));
        const dataLines = hasHeader ? lines.slice(1) : lines;
        const map = {};
        for (const line of dataLines) {
            const [j, o, m, d] = line.split(',').map(s => parseInt(s.trim()));
            if (isNaN(j) || isNaN(m) || isNaN(d)) continue;
            if (!map[j]) map[j] = [];
            map[j].push({ machine: m, duration: d });
        }
        jobsContainer.innerHTML = '';
        jobCounter = 0;
        jobsData = [];
        Object.keys(map).sort((a, b) => a - b).forEach(jid => {
            const ops = map[jid];
            addJob(ops.map(o => o.machine), ops.map(o => o.duration));
        });
        // Switch to manual tab to show data
        $('tabManual').click();
    };
    reader.readAsText(file);
}

$('downloadSampleBtn').onclick = () => {
    let csv = 'Job,Operation,Machine,Duration\n';
    SAMPLE_FT06.forEach(j => j.operations.forEach((o, i) => { csv += `${j.id},${i + 1},${o.machine},${o.duration}\n`; }));
    downloadFile('sample_jssp.csv', csv);
};

function downloadFile(name, content) {
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
    a.download = name; a.click();
}

// ===== DATA PREVIEW =====
function updatePreview() {
    if (jobsData.length === 0) { dataPreview.style.display = 'none'; runBtn.disabled = true; return; }
    dataPreview.style.display = 'block';
    runBtn.disabled = false;
    const totalOps = jobsData.reduce((s, j) => s + j.operations.length, 0);
    const machines = new Set();
    jobsData.forEach(j => j.operations.forEach(o => machines.add(o.machine)));
    previewStats.innerHTML = `<span>${jobsData.length} Jobs</span><span>${totalOps} Operations</span><span>${machines.size} Machines</span>`;
    previewTable.innerHTML = '';
    jobsData.forEach(j => j.operations.forEach((o, i) => {
        previewTable.innerHTML += `<tr><td>${j.id}</td><td>${i + 1}</td><td>M${o.machine}</td><td>${o.duration}</td></tr>`;
    }));
}

// =============================================
// GENETIC ALGORITHM ENGINE
// =============================================

function decodeSchedule(chromosome, jobs) {
    const nJobs = jobs.length;
    const opCounter = new Array(nJobs).fill(0);
    const machineTime = {};
    const jobTime = new Array(nJobs).fill(0);
    const schedule = []; // {job, op, machine, start, end, duration}

    for (const gene of chromosome) {
        const ji = gene;
        const oi = opCounter[ji];
        const op = jobs[ji].operations[oi];
        const m = op.machine;
        if (!(m in machineTime)) machineTime[m] = 0;
        const start = Math.max(machineTime[m], jobTime[ji]);
        const end = start + op.duration;
        schedule.push({ job: jobs[ji].id, jobIdx: ji, op: oi + 1, machine: m, start, end, duration: op.duration });
        machineTime[m] = end;
        jobTime[ji] = end;
        opCounter[ji]++;
    }
    const makespan = Math.max(...Object.values(machineTime));
    return { schedule, makespan };
}

function createChromosome(jobs) {
    const genes = [];
    jobs.forEach((j, ji) => { for (let i = 0; i < j.operations.length; i++) genes.push(ji); });
    // Fisher-Yates shuffle
    for (let i = genes.length - 1; i > 0; i--) {
        const r = Math.floor(Math.random() * (i + 1));
        [genes[i], genes[r]] = [genes[r], genes[i]];
    }
    return genes;
}

function tournamentSelect(pop, fitnesses, tSize) {
    let bestIdx = Math.floor(Math.random() * pop.length);
    for (let i = 1; i < tSize; i++) {
        const idx = Math.floor(Math.random() * pop.length);
        if (fitnesses[idx] < fitnesses[bestIdx]) bestIdx = idx;
    }
    return pop[bestIdx].slice();
}

function orderCrossover(p1, p2) {
    const len = p1.length;
    const start = Math.floor(Math.random() * len);
    const end = start + Math.floor(Math.random() * (len - start));
    const child = new Array(len).fill(-1);
    for (let i = start; i <= end; i++) child[i] = p1[i];
    // Count how many of each job are already placed
    const placed = {};
    for (let i = start; i <= end; i++) {
        placed[child[i]] = (placed[child[i]] || 0) + 1;
    }
    // Fill remaining from p2 maintaining order
    let ci = (end + 1) % len;
    for (let i = 0; i < len; i++) {
        const idx = (end + 1 + i) % len;
        const gene = p2[idx];
        // Check if we can still place this gene
        const totalNeeded = p1.filter(g => g === gene).length;
        const alreadyPlaced = placed[gene] || 0;
        if (alreadyPlaced < totalNeeded) {
            child[ci] = gene;
            placed[gene] = alreadyPlaced + 1;
            ci = (ci + 1) % len;
        }
    }
    return child;
}

function swapMutation(chrom, rate) {
    if (Math.random() < rate) {
        const a = Math.floor(Math.random() * chrom.length);
        const b = Math.floor(Math.random() * chrom.length);
        [chrom[a], chrom[b]] = [chrom[b], chrom[a]];
    }
    return chrom;
}

function runGA(jobs, params, onProgress) {
    const { popSize, generations, mutRate, crossRate, tournSize, elitism } = params;
    let population = [];
    for (let i = 0; i < popSize; i++) population.push(createChromosome(jobs));

    let fitnesses = population.map(c => decodeSchedule(c, jobs).makespan);
    const history = [];
    let bestEver = Infinity, bestChrom = null, bestGen = 0;

    for (let gen = 0; gen < generations; gen++) {
        // Track best
        const genBest = Math.min(...fitnesses);
        const genBestIdx = fitnesses.indexOf(genBest);
        if (genBest < bestEver) { bestEver = genBest; bestChrom = population[genBestIdx].slice(); bestGen = gen; }
        history.push(bestEver);

        // New population
        const newPop = [];
        // Elitism
        const sorted = fitnesses.map((f, i) => ({ f, i })).sort((a, b) => a.f - b.f);
        for (let i = 0; i < elitism; i++) newPop.push(population[sorted[i].i].slice());

        while (newPop.length < popSize) {
            let child;
            if (Math.random() < crossRate) {
                const p1 = tournamentSelect(population, fitnesses, tournSize);
                const p2 = tournamentSelect(population, fitnesses, tournSize);
                child = orderCrossover(p1, p2);
            } else {
                child = tournamentSelect(population, fitnesses, tournSize);
            }
            child = swapMutation(child, mutRate);
            newPop.push(child);
        }
        population = newPop;
        fitnesses = population.map(c => decodeSchedule(c, jobs).makespan);
        if (onProgress) onProgress(gen, generations);
    }
    // Final check
    const finalBest = Math.min(...fitnesses);
    if (finalBest < bestEver) { bestEver = finalBest; bestChrom = population[fitnesses.indexOf(finalBest)].slice(); bestGen = generations - 1; }
    history.push(bestEver);

    const bestSchedule = decodeSchedule(bestChrom, jobs);
    return { bestMakespan: bestEver, bestGen, history, schedule: bestSchedule.schedule, chromosome: bestChrom };
}

// =============================================
// RUN & VISUALIZE
// =============================================

runBtn.onclick = () => {
    if (jobsData.length === 0) return;
    const params = {
        popSize: parseInt($('popSize').value) || 100,
        generations: parseInt($('generations').value) || 200,
        mutRate: parseFloat($('mutRate').value) || 0.15,
        crossRate: parseFloat($('crossRate').value) || 0.8,
        tournSize: parseInt($('tournSize').value) || 3,
        elitism: parseInt($('elitism').value) || 2
    };

    // Convert jobsData to 0-indexed internal format
    const jobs = jobsData.map(j => ({ id: j.id, operations: j.operations.slice() }));

    runBtn.disabled = true;
    $('runBtnText').textContent = '⏳ Running...';
    $('progressWrap').style.display = 'flex';
    $('navStatus').textContent = 'Running GA...';
    $('navStatus').className = 'nav-status running';

    // Use setTimeout to allow UI to update
    setTimeout(() => {
        const t0 = performance.now();
        const result = runGA(jobs, params, (gen, total) => {
            const pct = Math.round((gen / total) * 100);
            $('progressFill').style.width = pct + '%';
            $('progressLabel').textContent = pct + '%';
        });
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

        $('progressFill').style.width = '100%';
        $('progressLabel').textContent = '100%';

        // Show results
        showResults(result, elapsed, jobs);

        runBtn.disabled = false;
        $('runBtnText').textContent = '🚀 Run Genetic Algorithm';
        $('navStatus').textContent = `Done — Makespan: ${result.bestMakespan}`;
        $('navStatus').className = 'nav-status done';
        setTimeout(() => { $('progressWrap').style.display = 'none'; }, 1500);
    }, 50);
};

function showResults(result, elapsed, jobs) {
    $('emptyState').style.display = 'none';
    $('resultsArea').style.display = 'block';

    const totalOps = jobs.reduce((s, j) => s + j.operations.length, 0);
    $('metricMakespan').textContent = result.bestMakespan;
    $('metricBestGen').textContent = result.bestGen;
    $('metricTime').textContent = elapsed + 's';
    $('metricOps').textContent = totalOps;

    renderGantt(result.schedule, result.bestMakespan, jobs);
    renderConvergence(result.history);
    renderScheduleTable(result.schedule);

    $('downloadScheduleBtn').onclick = () => downloadSchedule(result.schedule);
    $('resultsArea').scrollIntoView({ behavior: 'smooth' });
}

// ===== GANTT CHART =====
function renderGantt(schedule, makespan, jobs) {
    const container = $('ganttContainer');
    const legend = $('ganttLegend');
    const ruler = $('ganttRuler');
    container.innerHTML = '';
    legend.innerHTML = '';
    ruler.innerHTML = '';

    const machines = [...new Set(schedule.map(s => s.machine))].sort((a, b) => a - b);
    const jobIds = [...new Set(schedule.map(s => s.job))].sort((a, b) => a - b);

    // Legend
    jobIds.forEach((jid, i) => {
        const color = JOB_COLORS[i % JOB_COLORS.length];
        legend.innerHTML += `<span class="gl-item"><span class="gl-color" style="background:${color}"></span>Job ${jid}</span>`;
    });

    // Build rows
    machines.forEach(m => {
        const row = document.createElement('div');
        row.className = 'gantt-row';
        const label = document.createElement('div');
        label.className = 'gantt-label';
        label.textContent = 'M' + m;
        const track = document.createElement('div');
        track.className = 'gantt-track';
        track.style.minWidth = Math.max(600, makespan * 40) + 'px';

        const machOps = schedule.filter(s => s.machine === m).sort((a, b) => a.start - b.start);
        machOps.forEach((op, idx) => {
            const left = (op.start / makespan) * 100;
            const width = (op.duration / makespan) * 100;
            const ci = jobIds.indexOf(op.job);
            const color = JOB_COLORS[ci % JOB_COLORS.length];
            const bar = document.createElement('div');
            bar.className = 'gantt-bar';
            bar.style.left = left + '%';
            bar.style.width = width + '%';
            bar.style.background = color;
            bar.style.animationDelay = (idx * 0.08) + 's';
            bar.innerHTML = `J${op.job}·O${op.op}<span class="bar-tip">Job ${op.job} Op ${op.op}<br>M${op.machine} | ${op.start}→${op.end} (${op.duration})</span>`;
            track.appendChild(bar);
        });

        row.appendChild(label);
        row.appendChild(track);
        container.appendChild(row);
    });

    // Time ruler
    const step = makespan <= 20 ? 1 : makespan <= 100 ? 5 : Math.ceil(makespan / 20);
    ruler.style.paddingLeft = '44px';
    const rulerTrack = document.createElement('div');
    rulerTrack.style.cssText = 'display:flex;justify-content:space-between;min-width:' + Math.max(600, makespan * 40) + 'px';
    for (let t = 0; t <= makespan; t += step) {
        const s = document.createElement('span');
        s.textContent = t;
        rulerTrack.appendChild(s);
    }
    ruler.appendChild(rulerTrack);
}

// ===== CONVERGENCE CHART =====
function renderConvergence(history) {
    const canvas = $('convergenceCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 560;
    ctx.scale(2, 2);
    const W = canvas.offsetWidth, H = 280;
    ctx.clearRect(0, 0, W, H);

    const pad = { t: 25, r: 20, b: 35, l: 50 };
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
    const maxF = Math.max(...history), minF = Math.min(...history);
    const range = maxF - minF || 1;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
        const y = pad.t + (i / 5) * ch;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
        ctx.fillStyle = '#52525b'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'right';
        ctx.fillText((maxF - (i / 5) * range).toFixed(0), pad.l - 6, y + 4);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
    history.forEach((v, i) => {
        const x = pad.l + (i / (history.length - 1)) * cw;
        const y = pad.t + (1 - (v - minF) / range) * ch;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Glow
    ctx.globalAlpha = 0.08; ctx.lineWidth = 8; ctx.stroke(); ctx.globalAlpha = 1;

    // Fill under
    const lastX = pad.l + cw;
    ctx.lineTo(lastX, pad.t + ch); ctx.lineTo(pad.l, pad.t + ch); ctx.closePath();
    ctx.fillStyle = 'rgba(249,115,22,.06)'; ctx.fill();

    // Labels
    ctx.fillStyle = '#52525b'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    ctx.fillText('Generation', W / 2, H - 5);
    ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Makespan', 0, 0); ctx.restore();

    // Best point
    const bestVal = Math.min(...history);
    const bestIdx = history.lastIndexOf(bestVal);
    const bx = pad.l + (bestIdx / (history.length - 1)) * cw;
    const by = pad.t + (1 - (bestVal - minF) / range) * ch;
    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f97316'; ctx.fill();
    ctx.fillStyle = '#f4f4f5'; ctx.font = 'bold 10px JetBrains Mono'; ctx.textAlign = 'left';
    ctx.fillText('Best: ' + bestVal, bx + 8, by - 6);
}

// ===== SCHEDULE TABLE =====
function renderScheduleTable(schedule) {
    const body = $('scheduleBody');
    const sorted = [...schedule].sort((a, b) => a.machine - b.machine || a.start - b.start);
    const jobIds = [...new Set(schedule.map(s => s.job))].sort((a, b) => a - b);
    body.innerHTML = sorted.map(s => {
        const ci = jobIds.indexOf(s.job);
        const color = JOB_COLORS[ci % JOB_COLORS.length];
        return `<tr><td>M${s.machine}</td><td><span class="td-color" style="background:${color}"></span>Job ${s.job}</td><td>Op ${s.op}</td><td>${s.start}</td><td>${s.end}</td><td>${s.duration}</td></tr>`;
    }).join('');
}

// ===== DOWNLOAD =====
function downloadSchedule(schedule) {
    let csv = 'Machine,Job,Operation,Start,End,Duration\n';
    [...schedule].sort((a, b) => a.machine - b.machine || a.start - b.start).forEach(s => {
        csv += `M${s.machine},Job ${s.job},Op ${s.op},${s.start},${s.end},${s.duration}\n`;
    });
    downloadFile('optimized_schedule.csv', csv);
}
