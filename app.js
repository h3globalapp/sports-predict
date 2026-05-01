// 🔧 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const historyKey = "ht_history";

//////////////////////////////////////////////////////
// 🚀 MAIN
//////////////////////////////////////////////////////
async function processPDF() {
  const file = document.getElementById("pdfInput").files[0];
  if (!file) return alert("Upload PDF first");

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let lines = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const rows = groupByRows(content.items);

    rows.forEach(r => {
      const line = r.map(i => i.str).join(" ").trim();
      if (line) lines.push(line);
    });
  }

  const matches = lines
    .map(parseLineWithOdds)
    .filter(Boolean);

  if (matches.length === 0) {
    document.getElementById("results").innerHTML =
      "<p>No matches with odds found.</p>";
    return;
  }

  const scored = matches.map(m => ({
    ...m,
    score: scoreMatch(m)
  }));

  const top3 = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  saveToday(top3);
  display(top3);
}

//////////////////////////////////////////////////////
// 🧠 GROUP ROWS
//////////////////////////////////////////////////////
function groupByRows(items) {
  const rows = {};
  items.forEach(item => {
    const y = Math.round(item.transform[5]);
    if (!rows[y]) rows[y] = [];
    rows[y].push(item);
  });

  return Object.values(rows).map(r =>
    r.sort((a, b) => a.transform[4] - b.transform[4])
  );
}

//////////////////////////////////////////////////////
// 🎯 PARSE LINE (NEW FORMAT)
//////////////////////////////////////////////////////
function parseLineWithOdds(line) {
  // Must contain odds
  if (!line.includes("[") || !line.includes("|")) return null;

  // Extract odds
  const oddsMatch = line.match(/\[\s*(\d+\.\d+)\s*\|\s*(\d+\.\d+)\s*\|\s*(\d+\.\d+)\s*\]/);
  if (!oddsMatch) return null;

  const homeOdds = parseFloat(oddsMatch[1]);
  const drawOdds = parseFloat(oddsMatch[2]);
  const awayOdds = parseFloat(oddsMatch[3]);

  // Remove odds part
  let cleanLine = line.replace(/\[.*?\]/, "").trim();

  // Remove time (21:00)
  cleanLine = cleanLine.replace(/^\d{1,2}:\d{2}\s*/, "");

  // Remove score placeholder
  cleanLine = cleanLine.replace("-:-", "").trim();

  // Extract teams
  const match = cleanLine.match(/(.+?)\s-\s(.+)/);
  if (!match) return null;

  const teamA = sanitize(match[1]);
  const teamB = sanitize(match[2]);

  if (!isValidTeam(teamA) || !isValidTeam(teamB)) return null;

  return {
    name: `${teamA} vs ${teamB}`,
    homeOdds,
    drawOdds,
    awayOdds
  };
}

//////////////////////////////////////////////////////
// 🧼 CLEAN TEAM
//////////////////////////////////////////////////////
function sanitize(name) {
  return name.replace(/[^\w\s]/g, "").trim();
}

//////////////////////////////////////////////////////
// 🧠 TEAM VALIDATION
//////////////////////////////////////////////////////
function isValidTeam(name) {
  const bad = [
    "standings","table","group","promo",
    "gamble","therapy","live"
  ];

  const lower = name.toLowerCase();

  if (bad.some(w => lower.includes(w))) return false;
  if (name.length < 3) return false;

  return true;
}

//////////////////////////////////////////////////////
// 🧠 SCORING + LEARNING
//////////////////////////////////////////////////////
function scoreMatch(m) {
  let score = 0;

  const diff = Math.abs(m.homeOdds - m.awayOdds);

  // Balanced teams
  if (diff <= 0.3) score += 5;
  else if (diff <= 0.6) score += 3;
  else score -= 3;

  // Draw odds sweet spot
  if (m.drawOdds >= 2.5 && m.drawOdds <= 3.5) score += 4;
  else score -= 2;

  // Heavy favorite
  if (m.homeOdds < 1.5 || m.awayOdds < 1.5) score -= 5;

  // Learning boost
  score += learningBoost(m);

  return score;
}

//////////////////////////////////////////////////////
// 🧠 LEARNING SYSTEM
//////////////////////////////////////////////////////
function learningBoost(m) {
  const history = JSON.parse(localStorage.getItem(historyKey)) || [];

  let bonus = 0;
  let count = 0;

  history.forEach(day => {
    day.picks.forEach(p => {
      if (!p.result) return;

      const similar =
        Math.abs(p.homeOdds - m.homeOdds) < 0.3 &&
        Math.abs(p.awayOdds - m.awayOdds) < 0.3;

      if (similar) {
        count++;
        if (p.result === "win") bonus += 1;
        else bonus -= 1;
      }
    });
  });

  return count >= 3 ? bonus : 0;
}

//////////////////////////////////////////////////////
// 💾 SAVE
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
// 🖥 DISPLAY
//////////////////////////////////////////////////////
function display(picks) {
  const el = document.getElementById("results");

  el.innerHTML = `
    <h2>Top 3 HT Draw Picks (Learning)</h2>
    <button onclick="showAccuracy()">Accuracy</button>
  `;

  picks.forEach((p, i) => {
    el.innerHTML += `
      <div class="match">
        <strong>#${i + 1}</strong><br>
        ${p.name}<br>
        Odds: ${p.homeOdds} | ${p.drawOdds} | ${p.awayOdds}<br><br>

        <button onclick="setResult(${i}, 'win')">✅ Win</button>
        <button onclick="setResult(${i}, 'loss')">❌ Loss</button>
      </div>
    `;
  });
}

//////////////////////////////////////////////////////
// 🎯 RESULT
//////////////////////////////////////////////////////
function setResult(i, result) {
  const history = JSON.parse(localStorage.getItem(historyKey));
  const last = history[history.length - 1];

  last.picks[i].result = result;

  localStorage.setItem(historyKey, JSON.stringify(history));
  alert("Saved");
}

//////////////////////////////////////////////////////
// 📊 ACCURACY
//////////////////////////////////////////////////////
function showAccuracy() {
  const history = JSON.parse(localStorage.getItem(historyKey)) || [];

  let total = 0, win = 0;

  history.forEach(d => {
    d.picks.forEach(p => {
      if (p.result) {
        total++;
        if (p.result === "win") win++;
      }
    });
  });

  const acc = total ? ((win / total) * 100).toFixed(1) : 0;

  alert(`Accuracy: ${acc}% (${win}/${total})`);
}
