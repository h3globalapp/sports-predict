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

      if (
        match &&
        isValidMatch(match) &&
        isAllowedLeague(currentLeague)
      ) {
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
      "<p>No Bet9ja-supported matches found.</p>";
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
// 🎯 MATCH PARSER
//////////////////////////////////////////////////////
function parseMatchLine(line) {
  line = line.replace(/\d{1,2}:\d{2}/g, "").trim();

  if (/\d+\s*[:\-]\s*\d+/.test(line)) return null;
  if (line.length < 10) return null;

  let match = line.match(/(.+?)\s+(vs|-)\s+(.+)/i);

  if (match) {
    const teamA = cleanTeam(match[1]);
    const teamB = cleanTeam(match[3]);

    if (isRealTeam(teamA) && isRealTeam(teamB)) {
      return `${teamA} vs ${teamB}`;
    }
  }

  const parts = line.split(/\s{2,}/);

  if (parts.length === 2) {
    const teamA = cleanTeam(parts[0]);
    const teamB = cleanTeam(parts[1]);

    if (isRealTeam(teamA) && isRealTeam(teamB)) {
      return `${teamA} vs ${teamB}`;
    }
  }

  return null;
}

//////////////////////////////////////////////////////
// 🧼 CLEAN TEAM
//////////////////////////////////////////////////////
function cleanTeam(name) {
  return name.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

//////////////////////////////////////////////////////
// 🧠 TEAM VALIDATION
//////////////////////////////////////////////////////
function isRealTeam(name) {
  const lower = name.toLowerCase();

  const banned = [
    "standings","table","group","round",
    "play off","relegation",
    "gamble","therapy","responsibly",
    "promo","live","virtual"
  ];

  if (banned.some(w => lower.includes(w))) return false;
  if (name.length < 3 || name.length > 40) return false;
  if (/^\d+$/.test(name)) return false;

  return true;
}

//////////////////////////////////////////////////////
// ✅ VALID MATCH
//////////////////////////////////////////////////////
function isValidMatch(match) {
  const [a, b] = match.split("vs").map(t => t.trim());
  return a && b && a !== b;
}

//////////////////////////////////////////////////////
// 🔥 BET9JA LEAGUE FILTER
//////////////////////////////////////////////////////
function isAllowedLeague(league) {
  if (!league) return false;

  const allowed = [
    "england","spain","italy","germany","france",
    "netherlands","portugal","belgium","turkey",
    "brazil","argentina","sweden","norway","denmark",
    "international"
  ];

  const lower = league.toLowerCase();

  return allowed.some(a => lower.includes(a));
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
// 🖥 DISPLAY (same as before)
//////////////////////////////////////////////////////
function displayInitialResults(matches) {
  const container = document.getElementById("results");

  container.innerHTML = "<h2>Top 5 Bet9ja Picks</h2>";

  matches.forEach((m, i) => {
    container.innerHTML += `
      <div class="match">
        <strong>#${i + 1}</strong><br>
        ${m.name}<br>
        <small>${m.league}</small><br>
      </div>
    `;
  });
}
