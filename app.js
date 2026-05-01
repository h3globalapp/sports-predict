// 🔧 Fix PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

async function processPDF() {
  const file = document.getElementById('pdfInput').files[0];
  if (!file) return alert("Upload PDF first");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let matches = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const rows = groupByRows(content.items);

    rows.forEach(row => {
      const line = row.map(item => item.str).join(" ").trim();

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

// 🧠 GROUP ITEMS INTO ROWS (CRITICAL FIX)
function groupByRows(items) {
  const rows = {};

  items.forEach(item => {
    const y = Math.round(item.transform[5]);

    if (!rows[y]) rows[y] = [];
    rows[y].push(item);
  });

  return Object.values(rows);
}

// 🎯 PARSE MATCH FROM LINE
function parseMatchLine(line) {
  line = line.replace(/\d{1,2}:\d{2}/g, "").trim();

  if (line.length < 10) return null;
  if (/^\d+$/.test(line)) return null;

  const words = line.split(" ").filter(w => w.length > 2);

  if (words.length >= 4 && words.length <= 10) {
    const mid = Math.floor(words.length / 2);

    const teamA = words.slice(0, mid).join(" ");
    const teamB = words.slice(mid).join(" ");

    return `${teamA} vs ${teamB}`;
  }

  return null;
}

// 📊 SIMPLE HT DRAW SCORING
function generateScore(match) {
  let score = 0;

  // Balanced teams (length similarity)
  const parts = match.split("vs");
  if (parts.length === 2) {
    if (Math.abs(parts[0].length - parts[1].length) < 5) {
      score += 2;
    }
  }

  // Slight randomness (simulate variability)
  score += Math.random();

  return score;
}

// 📈 RANK TOP 5
function rankMatches(matches) {
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// 🖥 DISPLAY RESULTS
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
