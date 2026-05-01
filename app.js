// 🔧 Fix PDF.js worker error
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

async function processPDF() {
  const file = document.getElementById('pdfInput').files[0];
  if (!file) return alert("Upload PDF first");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(" ") + "\n";
  }

  const matches = extractMatches(fullText);
  const ranked = rankMatches(matches);

  displayResults(ranked);
}

// 🔍 Extract matches from text
function extractMatches(text) {
  const lines = text.split("\n");

  let matches = [];

  lines.forEach(line => {
    if (line.includes(" vs ") || line.includes(" - ")) {
      let clean = line.trim();

      // Basic cleanup
      clean = clean.replace(/\d{1,2}:\d{2}/g, "").trim();

      matches.push({
        name: clean,
        score: generateScore(clean)
      });
    }
  });

  return matches;
}

// 🧠 HT DRAW SCORING SYSTEM
function generateScore(matchName) {
  let score = 0;

  // Heuristics (simulate your strategy)

  // Low scoring league keywords
  const lowLeagues = ["U19", "Women", "Reserve", "2", "B"];

  if (!lowLeagues.some(l => matchName.includes(l))) {
    score += 2;
  }

  // Balanced teams (same length names = rough balance trick)
  const parts = matchName.split("vs");
  if (parts.length === 2) {
    if (Math.abs(parts[0].length - parts[1].length) < 5) {
      score += 2;
    }
  }

  // Random slight variation (simulate unpredictability)
  score += Math.random();

  return score;
}

// 📊 Rank matches
function rankMatches(matches) {
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// 🖥 Display results
function displayResults(matches) {
  const container = document.getElementById("results");
  container.innerHTML = "<h2>Top 5 HT Draw Picks</h2>";

  matches.forEach((m, i) => {
    container.innerHTML += `
      <div class="match rank${i+1}">
        <strong>#${i+1}</strong> ${m.name}<br>
        🎯 HT Draw Probability Score: ${m.score.toFixed(2)}
      </div>
    `;
  });
}

// 🔄 Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
