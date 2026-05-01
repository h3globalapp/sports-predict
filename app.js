pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const historyKey = "ht_history";

//////////////////////////////////////////////////////
// INSTALL BUTTON
//////////////////////////////////////////////////////
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installBtn").style.display = "block";
});

document.getElementById("installBtn").addEventListener("click", async () => {
  deferredPrompt.prompt();
  deferredPrompt = null;
});

//////////////////////////////////////////////////////
// SERVICE WORKER
//////////////////////////////////////////////////////
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

//////////////////////////////////////////////////////
// MAIN
//////////////////////////////////////////////////////
async function processPDF() {
  const file = document.getElementById("pdfInput").files[0];
  if (!file) return alert("Upload PDF");

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let lines = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    content.items.forEach(item => {
      if (item.str.trim()) lines.push(item.str.trim());
    });
  }

  const joined = lines.join(" ");

  const matches = extractMatches(joined);

  const scored = matches.map(m => {
    const score = scoreMatch(m);
    const confidence = calculateConfidence(score);
    return { ...m, score, confidence };
  });

  const filtered = scored.filter(m => m.confidence >= 60);

  const top3 = filtered.sort((a, b) => b.score - a.score).slice(0, 3);

  saveToday(top3);
  display(top3);
}

//////////////////////////////////////////////////////
// PARSE MATCHES
//////////////////////////////////////////////////////
function extractMatches(text) {
  const regex = /(\d{1,2}:\d{2})\s(.+?)\s-\s(.+?)\s-\:-\s\[\s*(\d+\.\d+)\s\|\s(\d+\.\d+)\s\|\s(\d+\.\d+)\s\]/g;

  let matches = [];
  let m;

  while ((m = regex.exec(text)) !== null) {
    matches.push({
      name: `${m[2]} vs ${m[3]}`,
      homeOdds: parseFloat(m[4]),
      drawOdds: parseFloat(m[5]),
      awayOdds: parseFloat(m[6])
    });
  }

  return matches;
}

//////////////////////////////////////////////////////
// SCORING
//////////////////////////////////////////////////////
function scoreMatch(m) {
  let score = 0;

  const diff = Math.abs(m.homeOdds - m.awayOdds);

  if (diff <= 0.3) score += 5;
  else if (diff <= 0.6) score += 3;
  else score -= 3;

  if (m.drawOdds >= 2.5 && m.drawOdds <= 3.5) score += 4;
  else score -= 2;

  if (m.homeOdds < 1.5 || m.awayOdds < 1.5) score -= 5;

  score += learningBoost(m);

  return score;
}

//////////////////////////////////////////////////////
// CONFIDENCE
//////////////////////////////////////////////////////
function calculateConfidence(score) {
  let min = -5, max = 10;
  let normalized = (score - min) / (max - min);
  return Math.max(50, Math.min(90, 50 + normalized * 40));
}

//////////////////////////////////////////////////////
// LEARNING
//////////////////////////////////////////////////////
function learningBoost(m) {
  const history = JSON.parse(localStorage.getItem(historyKey)) || [];
  let bonus = 0, count = 0;

  history.forEach(day => {
    day.picks.forEach(p => {
      if (!p.result) return;

      const similar =
        Math.abs(p.homeOdds - m.homeOdds) < 0.3 &&
        Math.abs(p.awayOdds - m.awayOdds) < 0.3;

      if (similar) {
        count++;
        bonus += p.result === "win" ? 1 : -1;
      }
    });
  });

  return count >= 3 ? bonus : 0;
}

//////////////////////////////////////////////////////
// SAVE
//////////////////////////////////////////////////////
function saveToday(picks) {
  const history = JSON.parse(localStorage.getItem(historyKey)) || [];

  history.push({
    date: new Date().toLocaleDateString(),
    picks: picks.map(p => ({ ...p, result: null }))
  });

  localStorage.setItem(historyKey, JSON.stringify(history));
}

//////////////////////////////////////////////////////
// ODDS INSIGHT
//////////////////////////////////////////////////////
function getInsight() {
  const history = JSON.parse(localStorage.getItem(historyKey)) || [];

  let zones = {};

  history.forEach(d => {
    d.picks.forEach(p => {
      if (!p.result) return;

      const z = Math.round(p.drawOdds * 10) / 10;

      if (!zones[z]) zones[z] = { win: 0, total: 0 };

      zones[z].total++;
      if (p.result === "win") zones[z].win++;
    });
  });

  let best = null, worst = null;

  Object.keys(zones).forEach(z => {
    const rate = zones[z].win / zones[z].total;

    if (!best || rate > best.rate) best = { z, rate };
    if (!worst || rate < worst.rate) worst = { z, rate };
  });

  return { best, worst };
}

//////////////////////////////////////////////////////
// DISPLAY
//////////////////////////////////////////////////////
function display(picks) {
  const el = document.getElementById("results");
  const insight = getInsight();

  el.innerHTML = "<h2>Top 3 Picks</h2>";

  if (insight.best) {
    el.innerHTML += `
      <p>🔥 Best Zone: ${insight.best.z}</p>
      <p>⚠️ Worst Zone: ${insight.worst.z}</p>
    `;
  }

  picks.forEach((p, i) => {
    el.innerHTML += `
      <div class="match">
        <b>#${i + 1}</b><br>
        ${p.name}<br>
        Odds: ${p.homeOdds} | ${p.drawOdds} | ${p.awayOdds}<br>
        Confidence: ${p.confidence.toFixed(0)}%<br><br>

        <button onclick="setResult(${i}, 'win')">Win</button>
        <button onclick="setResult(${i}, 'loss')">Loss</button>
      </div>
    `;
  });
}

//////////////////////////////////////////////////////
// RESULT TRACK
//////////////////////////////////////////////////////
function setResult(i, result) {
  const history = JSON.parse(localStorage.getItem(historyKey));
  const last = history[history.length - 1];

  last.picks[i].result = result;

  localStorage.setItem(historyKey, JSON.stringify(history));
  alert("Saved");
}
