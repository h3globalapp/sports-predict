// 🔧 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let currentTopMatches = [];

//////////////////////////////////////////////////////
// 🚀 MAIN
//////////////////////////////////////////////////////
async function processPDF() {
  const file = document.getElementById("pdfInput").files[0];
  if (!file) return alert("Upload PDF first");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let matches = [];
  let currentLeague = "Unknown League";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const rows = groupByRows(content.items);

    rows.forEach(row => {
      const line = row.map(item => item.str).join(" ").trim();

      const league = detectLeague(line);
      if (league) {
        currentLeague = league;
        return;
      }

      const match = parseMatchLine(line);

      if (match) {
        const score = generateScore(match);
        if (score > 1) {
          matches.push({
            name: match,
            league: currentLeague,
            score
          });
        }
      }
    });
  }

  if (matches.length === 0) {
    document.getElementById("results").innerHTML =
      "<p>No strong matches found.</p>";
    return;
  }

  currentTopMatches = rankMatches(matches);
  displayInitialResults(currentTopMatches);
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

  return Object.values(rows).map(row =>
    row.sort((a, b) => a.transform[4] - b.transform[4])
  );
}

//////////////////////////////////////////////////////
// 🏷️ DETECT LEAGUE
//////////////////////////////////////////////////////
function detectLeague(line) {
  if (line.includes(":") && line.toLowerCase().includes("standings")) {
    return line.replace("Standings", "").trim();
  }
  return null;
}

//////////////////////////////////////////////////////
// 🎯 PARSE MATCH
//////////////////////////////////////////////////////
function parseMatchLine(line) {
  line = line.replace(/\d{1,2}:\d{2}/g, "").trim();

  if (line.length < 8) return null;
  if (/^\d+$/.test(line)) return null;

  const parts = line.split(/\s{2,}/);

  if (parts.length === 2) {
    return `${parts[0].trim()} vs ${parts[1].trim()}`;
  }

  const words = line.split(" ").filter(w => w.length > 2);

  if (words.length >= 4 && words.length <= 10) {
    const mid = Math.floor(words.length / 2);
    return `${words.slice(0, mid).join(" ")} vs ${words.slice(mid).join(" ")}`;
  }

  return null;
}

//////////////////////////////////////////////////////
// 🧠 SCORING
//////////////////////////////////////////////////////
function generateScore(match) {
  let score = 0;

  const [teamA, teamB] = match.split("vs").map(t => t.trim());
  const nameA = teamA.toLowerCase();
  const nameB = teamB.toLowerCase();

  const bad = ["u19","u20","u21","women","reserve","youth"];
  if (bad.some(k => nameA.includes(k) || nameB.includes(k))) return -10;

  const diff = Math.abs(teamA.length - teamB.length);
  if (diff <= 3) score += 4;
  else if (diff <= 6) score += 2;
  else score -= 3;

  const big = ["real madrid","barcelona","man city","psg","bayern"];
  if (big.some(t => nameA.includes(t) || nameB.includes(t))) score -= 4;

  score += Math.random();

  return score;
}

//////////////////////////////////////////////////////
// 📊 RANK
//////////////////////////////////////////////////////
function rankMatches(matches) {
  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

//////////////////////////////////////////////////////
// 🖥 INITIAL DISPLAY
//////////////////////////////////////////////////////
function displayInitialResults(matches) {
  const container = document.getElementById("results");

  container.innerHTML = "<h2>Top 5 Picks (Enter Odds)</h2>";

  matches.forEach((m, i) => {
    container.innerHTML += `
      <div class="match">
        <strong>#${i + 1}</strong><br>
        ${m.name}<br>
        <small>${m.league}</small><br><br>

        Home Odds: <input type="number" step="0.01" id="home-${i}"><br>
        Away Odds: <input type="number" step="0.01" id="away-${i}">
      </div>
    `;
  });

  container.innerHTML += `<button onclick="refineWithOdds()">Refine Picks</button>`;
}

//////////////////////////////////////////////////////
// 🔥 REFINE WITH ODDS
//////////////////////////////////////////////////////
function refineWithOdds() {
  let refined = currentTopMatches.map((m, i) => {
    const home = parseFloat(document.getElementById(`home-${i}`).value);
    const away = parseFloat(document.getElementById(`away-${i}`).value);

    let newScore = m.score;

    if (!isNaN(home) && !isNaN(away)) {
      const diff = Math.abs(home - away);

      if (diff <= 0.3) newScore += 4;
      else if (diff <= 0.6) newScore += 2;
      else newScore -= 3;

      if (home < 1.5 || away < 1.5) newScore -= 4;
    }

    return { ...m, score: newScore, result: null };
  });

  refined.sort((a, b) => b.score - a.score);

  saveResults(refined);
  displayFinalResults(refined);
}

//////////////////////////////////////////////////////
// 💾 SAVE PICKS
//////////////////////////////////////////////////////
function saveResults(matches) {
  const today = new Date().toLocaleDateString();
  const history = JSON.parse(localStorage.getItem("ht_history")) || [];

  history.push({
    date: today,
    picks: matches
  });

  localStorage.setItem("ht_history", JSON.stringify(history));
}

//////////////////////////////////////////////////////
// 🏁 FINAL DISPLAY WITH RESULT BUTTONS
//////////////////////////////////////////////////////
function displayFinalResults(matches) {
  const container = document.getElementById("results");

  container.innerHTML = `
    <h2>Final HT Draw Picks</h2>
    <button onclick="viewHistory()">View History</button>
    <button onclick="calculateAccuracy()">Show Accuracy</button>
  `;

  matches.forEach((m, i) => {
    container.innerHTML += `
      <div class="match">
        <strong>#${i + 1}</strong><br>
        ${m.name}<br>
        <small>${m.league}</small><br><br>

        <button onclick="setResult(${i}, 'win')">✅ Win</button>
        <button onclick="setResult(${i}, 'loss')">❌ Loss</button>
      </div>
    `;
  });
}

//////////////////////////////////////////////////////
// 🎯 SET RESULT
//////////////////////////////////////////////////////
function setResult(index, result) {
  const history = JSON.parse(localStorage.getItem("ht_history"));
  const lastDay = history[history.length - 1];

  lastDay.picks[index].result = result;

  localStorage.setItem("ht_history", JSON.stringify(history));
  alert("Saved!");
}

//////////////////////////////////////////////////////
// 📊 CALCULATE ACCURACY
//////////////////////////////////////////////////////
function calculateAccuracy() {
  const history = JSON.parse(localStorage.getItem("ht_history")) || [];

  let total = 0;
  let wins = 0;

  history.forEach(day => {
    day.picks.forEach(p => {
      if (p.result) {
        total++;
        if (p.result === "win") wins++;
      }
    });
  });

  const accuracy = total ? ((wins / total) * 100).toFixed(1) : 0;

  alert(`Accuracy: ${accuracy}% (${wins}/${total})`);
}

//////////////////////////////////////////////////////
// 📜 VIEW HISTORY
//////////////////////////////////////////////////////
function viewHistory() {
  const container = document.getElementById("results");
  const history = JSON.parse(localStorage.getItem("ht_history")) || [];

  container.innerHTML = "<h2>History</h2>";

  history.forEach(day => {
    container.innerHTML += `<h3>${day.date}</h3>`;

    day.picks.forEach(p => {
      container.innerHTML += `
        <div class="match">
          ${p.name}<br>
          <small>${p.league}</small><br>
          <small>Result: ${p.result || "Pending"}</small>
        </div>
      `;
    });
  });
}
