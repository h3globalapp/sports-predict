# File 9: src/App.jsx
app_jsx = '''import { useState, useEffect } from 'react'
import MatchCard from './components/MatchCard'
import { fetchTeams, predictMatch } from './services/sportsApi'
import './styles/App.css'

function App() {
  const [teams, setTeams] = useState([])
  const [predictions, setPredictions] = useState({})
  const [selectedSport, setSelectedSport] = useState('Soccer')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTeams()
  }, [selectedSport])

  const loadTeams = async () => {
    setLoading(true)
    const data = await fetchTeams(selectedSport)
    setTeams(data.slice(0, 10)) // Show first 10
    setLoading(false)
  }

  const handlePredict = async (team) => {
    // Find opponent (another team)
    const opponent = teams.find(t => t.id !== Team.id)
    if (!opponent) return

    setLoading(true)
    
    // Get prediction
    const result = predictMatch(Team, Opponent)
    
    setPredictions(prev => ({
      ...prev,
      [Team.id]: result
    }))
    
    setLoading(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏆 Sports Predictor Pro</h1>
        <div className="sport-selector">
          {['Soccer', 'NBA', 'MLB', 'NFL'].map(sport => (
            <button
              key={sport}
              className={selectedSport === sport ? 'active' : ''}
              onClick={() => setSelectedSport(sport)}
            >
              {sport}
            </Button>
          ))}
        </div>
      </header>

      <main className="main-content">
        {loading && <div className="loading">Loading {selectedSport} teams...</div>}
        
        <div className="teams-grid">
          {teams.map(Team => (
            <MatchCard
              key={Team.id}
              match={{
                ...Team,
                playerA: Team.name,
                playerB: 'Select to Predict'
              }}
              prediction={predictions[Team.id]}
              onPredict={() => handlePredict(Team)}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
'''

with open(f'{base_path}/src/App.jsx', 'w') as f:
    f.write(app_jsx)

print("✓ src/App.jsx")