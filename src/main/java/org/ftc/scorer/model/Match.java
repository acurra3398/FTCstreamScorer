package org.ftc.scorer.model;

/**
 * Represents a single FTC DECODE scoring session
 * In traditional matches, alliances have 2 teams each (4 teams total)
 * In solo mode, only one team plays
 */
public class Match {
    // Red Alliance (2 teams)
    private String redTeam1Number;
    private String redTeam2Number;
    
    // Blue Alliance (2 teams)
    private String blueTeam1Number;
    private String blueTeam2Number;
    
    private DecodeScore redScore;
    private DecodeScore blueScore;
    private MatchState state;
    private MatchType matchType;
    private long startTime;
    
    public Match(String redTeam1, String blueTeam1) {
        this(redTeam1, "", blueTeam1, "", MatchType.TRADITIONAL_MATCH);
    }
    
    public Match(String redTeam1, String redTeam2, String blueTeam1, String blueTeam2, MatchType matchType) {
        this.redTeam1Number = redTeam1;
        this.redTeam2Number = redTeam2;
        this.blueTeam1Number = blueTeam1;
        this.blueTeam2Number = blueTeam2;
        this.matchType = matchType;
        this.redScore = new DecodeScore();
        this.blueScore = new DecodeScore();
        this.state = MatchState.NOT_STARTED;
        this.startTime = 0;
    }
    
    // Red Alliance Team 1
    public String getRedTeam1Number() {
        return redTeam1Number;
    }
    
    public void setRedTeam1Number(String redTeam1Number) {
        this.redTeam1Number = redTeam1Number;
    }
    
    // Red Alliance Team 2
    public String getRedTeam2Number() {
        return redTeam2Number;
    }
    
    public void setRedTeam2Number(String redTeam2Number) {
        this.redTeam2Number = redTeam2Number;
    }
    
    // Blue Alliance Team 1
    public String getBlueTeam1Number() {
        return blueTeam1Number;
    }
    
    public void setBlueTeam1Number(String blueTeam1Number) {
        this.blueTeam1Number = blueTeam1Number;
    }
    
    // Blue Alliance Team 2
    public String getBlueTeam2Number() {
        return blueTeam2Number;
    }
    
    public void setBlueTeam2Number(String blueTeam2Number) {
        this.blueTeam2Number = blueTeam2Number;
    }
    
    // Legacy methods for compatibility (deprecated)
    @Deprecated
    public String getRedTeamNumber() {
        return getRedTeamsDisplay();
    }
    
    @Deprecated
    public void setRedTeamNumber(String redTeamNumber) {
        this.redTeam1Number = redTeamNumber;
    }
    
    @Deprecated
    public String getBlueTeamNumber() {
        return getBlueTeamsDisplay();
    }
    
    @Deprecated
    public void setBlueTeamNumber(String blueTeamNumber) {
        this.blueTeam1Number = blueTeamNumber;
    }
    
    /**
     * Get formatted display of red alliance teams
     */
    public String getRedTeamsDisplay() {
        if (isSingleTeamMode()) {
            return redTeam1Number.isEmpty() ? "----" : redTeam1Number;
        }
        String team1 = redTeam1Number.isEmpty() ? "----" : redTeam1Number;
        String team2 = redTeam2Number.isEmpty() ? "----" : redTeam2Number;
        return team1 + " + " + team2;
    }
    
    /**
     * Get formatted display of blue alliance teams
     */
    public String getBlueTeamsDisplay() {
        if (isSingleTeamMode()) {
            return "N/A";
        }
        String team1 = blueTeam1Number.isEmpty() ? "----" : blueTeam1Number;
        String team2 = blueTeam2Number.isEmpty() ? "----" : blueTeam2Number;
        return team1 + " + " + team2;
    }
    
    public DecodeScore getRedScore() {
        return redScore;
    }
    
    public DecodeScore getBlueScore() {
        return blueScore;
    }
    
    public MatchState getState() {
        return state;
    }
    
    public void setState(MatchState state) {
        this.state = state;
    }
    
    public long getStartTime() {
        return startTime;
    }
    
    public void setStartTime(long startTime) {
        this.startTime = startTime;
    }
    
    public MatchType getMatchType() {
        return matchType;
    }
    
    public void setMatchType(MatchType matchType) {
        this.matchType = matchType;
    }
    
    public boolean isSingleTeamMode() {
        return matchType == MatchType.SINGLE_TEAM_DEMO;
    }
    
    /**
     * Randomize MOTIF at match start (OBELISK randomization)
     */
    public void randomizeMotif() {
        DecodeScore.MotifType randomMotif = DecodeScore.MotifType.randomize();
        redScore.setMotif(randomMotif);
        blueScore.setMotif(randomMotif);
    }
    
    /**
     * Calculate Red alliance total score including opponent penalties
     */
    public int getRedTotalScore() {
        int score = redScore.calculateTotalScore();
        // Add opponent's penalties to Red's score
        score += blueScore.getMajorFouls() * 15;  // Major fouls = 15 pts to opponent
        score += blueScore.getMinorFouls() * 5;   // Minor fouls = 5 pts to opponent
        return Math.max(0, score);
    }
    
    /**
     * Calculate Blue alliance total score including opponent penalties
     */
    public int getBlueTotalScore() {
        int score = blueScore.calculateTotalScore();
        // Add opponent's penalties to Blue's score
        score += redScore.getMajorFouls() * 15;  // Major fouls = 15 pts to opponent
        score += redScore.getMinorFouls() * 5;   // Minor fouls = 5 pts to opponent
        return Math.max(0, score);
    }
    
    public void reset() {
        redScore.reset();
        blueScore.reset();
        state = MatchState.NOT_STARTED;
        startTime = 0;
    }
    
    public enum MatchState {
        NOT_STARTED,
        AUTONOMOUS,
        TRANSITION,  // 8-second period between AUTO and TELEOP (drivers pick up controllers)
        TELEOP,
        END_GAME,
        FINISHED,
        UNDER_REVIEW  // After match ends, awaiting breakdown display
    }
    
    public enum MatchType {
        TRADITIONAL_MATCH,  // 2v2 alliance match (Red vs Blue)
        SINGLE_TEAM_DEMO    // Single team demonstration/practice mode
    }
}
