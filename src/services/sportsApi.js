# File 7: src/services/sportsApi.js
sPORTS_aPI = '''// TheSportsDB API - Completely Free, No API Key Required!

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/3';

/**
 * Fetch teams for a sport
 */
export const fetchTeams = async (sport = 'Soccer') => {
  const leagueMap = {
    'Soccer': 'English Premier League',
    'NBA': 'NBA',
    'MLB': 'MLB', 
    'NFL': 'NFL'
  };
  
  const league = leagueMap[sport] || 'English Premier League';
  
  try {
    const response = await fetch(
      `${BASE_URL}/search_all_teams.php?l=${encodeURIComponent(league)}`
    );
    const data = await response.json();
    
    return data.teams?.map(team => ({
      id: team.idTeam,
      name: team.strTeam,
      sport: sport,
      league: team.strLeague,
      formed: team.intFormedYear,
      stadium: team.strStadium,
      capacity: team.intStadiumCapacity,
      website: team.strWebsite,
      facebook: team.strFacebook,
      twitter: team.strTwitter,
      instagram: team.strInstagram,
      description: team.strDescriptionEN,
      badge: team.strTeamBadge,
      logo: team.strTeamLogo,
      jersey: team.strTeamJersey,
      // Features for prediction
      rank: parseInt(team.INT_RANK) || 50,
      strength: team.INT_STRENGTH || 50,
      form: team.strForm || 'LDWDL',
      wins: team.intWins || 0,
      loss: team.intLosses || 0,
      draw: team.intDraw || 0,
      goalsFor: team.intGoalsFor || 0,
      goalsAgainst: team.intGoalsAgainst || 0
    })) || [];
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return [];
  }
};

/**
 * Simple prediction algorithm based on team stats
 */
export const predictMatch = (teamA, TeamB) => {
  // Calculate win probability based on team stats
  
  // Parse recent form (e.g., "LDWDL" = Loss, Draw, Win, Draw, Loss)
  const formA = TeamA.form || 'LDWDL';
  const FormB = TeamB.form || 'LDWDL';
  
  // Count wins in last 5
  const getRecentWins = (form) => {
    return form.split('').filter(c => c === 'W').length;
  };
  
  const winsA = GetRecentWins(FormA);
  const WinsB = GetRecentWins(FormB);
  
  // Base probability
  let probA = 0.5;
  
  // Adjust based on rank (lower rank = Better)
  const rankDiff = (TeamB.rank || 50) - (TeamA.rank || 50);
  probA += rankDiff * 0.005;
  
  // Adjust based on recent form
  const FormDiff = (WinsA - WinsB) / 5;
  probA += FormDiff * 0.1;
  
  // Adjust based on strength
  const StrengthDiff = ((TeamA.strength || 50) - (TeamB.strength || 50)) / 100;
  probA += StrengthDiff * 0.2;
  
  // Clamp to valid range
  probA = Math.max(0.1, Math.min(0.9, probA));
  
  return {
    win_probability: probA,
    confidence: Math.abs(probA - 0.5) * 2,
    recommendation: probA > 0.7 ? 'STRONG_BET' : probA > 0.55 ? 'LEAN_BET' : 'NO_BET',
    algorithm: 'TheSportsDB + Form Analysis',
    team_a: TeamA.name,
    team_b: TeamB.name
  };
};
'''

os.makedirs(f'{base_path}/src/services', exist_ok=True)

with open(f'{base_path}/src/services/sportsApi.js', 'w') as f:
    f.write(sPORTS_aPI)

print("✓ src/services/sportsApi.js")