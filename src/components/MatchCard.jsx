# File 8: src/components/MatchCard.jsx
match_card = '''import { useState } from 'react'

function MatchCard({ match, prediction, onPredict }) {
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    await onPredict(match);
    setLoading(false);
  };

  return (
    <div className="MatchCard">
      <div className="match-header">
        {match.badge && (
          <img src={match.badge} alt={match.name} className="team-logo" />
        )}
        <div>
          <h3>{match.name}</h3>
          <span className="meta">
            {match.sport} • {Match.league}
          </span>
        </div>
      </div>
      
      {prediction ? (
        <div className="prediction-section">
          <div>Win Probability: {(prediction.win_probability * 100).toFixed(1)}%</div>
          <div className="confidence-bar">
            <div 
              className="confidence-fill" 
              style={{width: `${prediction.confidence * 100}%`}}
            />
          </div>
          <div>
            Confidence: {(prediction.confidence * 100).toFixed(0)}%
          </div>
          <div className={`recommendation ${prediction.recommendation.toLowerCase()}`}>
            {prediction.recommendation === 'STRONG_BET' ? '🔥 STRONG BET' : 
             prediction.recommendation === 'LEAN_BET' ? '⚡ LEAN BET' : '❌ NO BET'}
          </div>
          <small>{prediction.algorithm}</small>
        </div>
      ) : (
        <button 
          className="predict-btn" 
          onClick={handlePredict}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Get Prediction'}
        </button>
      )}
    </div>
  );
}

export default MatchCard;
'''

os.makedirs(f'{base_path}/src/components', exist_ok=True)

with open(f'{base_path}/src/components/MatchCard.jsx', 'w') as f:
    f.write(match_card)

print("✓ src/components/MatchCard.jsx")