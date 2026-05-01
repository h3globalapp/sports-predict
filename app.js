// 🔧 Fix PDF.js worker (REQUIRED)
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// 🚀 MAIN FUNCTION
async function processPDF() {
  const file = document.getElementById("pdfInput").files[0];
  if (!file) {
    alert("Upload PDF first");
    return;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let matches = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const rows = groupByRows(content.items);

    rows.forEach(row => {
      const line = row.map(item => item.str).join(" ").trim();

      // 🔍 DEBUG (see what lines look like)
      console.log("LINE:", line);

      const match = parseMatchLine(line);

      if (match) {
        matches.push({
          name: match,
          score: generateScore(match)
        });
      }
    });
  }

  console.log("Extracted Matches:", matches);

  if (matches.length === 0) {
    document.getElementById("results").innerHTML =
      "<p>No matches detected. Try another PDF.</p>";
    return;
  }

  const ranked = rankMatches(matches);
  displayResults(ranked);
}

//////////////////////////////////////////////////////
// 🧠 GROUP TEXT INTO ROWS (Y + X SORT FIX)
//////////////////////////////////////////////////////
function groupByRows(items) {
  const rows = {};

  items.forEach(item => {
    const y = Math.round(item.transform[5]);

    if (!rows[y]) rows[y] = [];
    rows[y].push(item);
  });

  // Sort each row left → right
  return Object.values(rows).map(row =>
    row.sort((a, b) => a.transform[4] - b.transform[4])
  );
}

//////////////////////////////////////////////////////
// 🎯 PARSE MATCH FROM LINE (FLASHSCORE FIX)
//////////////////////////////////////////////////////
function parseMatchLine(line) {
  // Remove time (e.g., 18:00)
  line = line.replace(/\d{1,2}:\d{2}/g, "").trim();

  // Ignore useless lines
  if (line.length < 8) return null;
  if (/^\d+$/.test(line)) return null;

  // Try split by large spacing (common in Flashscore)
  const parts = line.split(/\s{2,}/);

  if (parts.length === 2) {
    const teamA = parts[0].trim();
    const teamB = parts[1].trim();

    if (teamA.length > 2 && teamB.length > 2) {
      return `${teamA} vs ${teamB}`;
    }
  }

  // Fallback: split by words
  const words = line.split(" ").filter(w => w.length > 2);

  if (words.length >= 4 && words.length <= 10) {
    const mid = Math.floor(words.length / 2);

    const teamA = words.slice(0, mid).join(" ");
    const teamB = words.slice(mid).join(" ");

    return `${teamA} vs ${teamB}`;
  }

  return null;
}

//////////////////////////////////////////////////////
// 📊 HT DRAW SCORING SYSTEM (BASIC FOR NOW)
//////////////////////////////////////////////////////
function generateScore(match) {
  let score = 0;

  const parts = match.split("vs");

  if (parts.length === 2) {
    const lenA = parts[0].trim().length;
    const lenB = parts[1].trim().length;

    // Balanced teams (important for HT draw)
    if (Math.abs(lenA - lenB) < 5) {
      score += 2;
    }
  }

  // Slight randomness (real-world uncertainty)
  score += Math.random();

  return score;
}

//////////////////////////////////////////////////////
// 📈 RANK TOP 5
//////////////////////////////////////////////////////
function rankMatches(matches) {
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

//////////////////////////////////////////////////////
// 🖥 DISPLAY RESULTS
//////////////////////////////////////////////////////
function displayResults(matches) {
  const container = document.getElementById("results");
  container.innerHTML = "<h2>Top 5 HT Draw Picks</h2>";

  matches.forEach((m, i) => {
    container.innerHTML += `
      <div class="match">
        <strong>#${i + 1}</strong> ${m.name}<br>
        🎯 Score: ${m.score.toFixed(2)}
      </div>
    `;
  });
}
