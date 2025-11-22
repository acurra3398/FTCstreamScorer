package org.ftc.scorer.model;

/**
 * Represents a single FTC DECODE scoring session
 */
public class Match {
    private String redTeamNumber;
    private String blueTeamNumber;
    private DecodeScore redScore;
    private DecodeScore blueScore;
    private MatchState state;
    private MatchType matchType;
    private long startTime;
    
    public Match(String redTeamNumber, String blueTeamNumber) {
        this(redTeamNumber, blueTeamNumber, MatchType.TRADITIONAL_MATCH);
    }
    
    public Match(String redTeamNumber, String blueTeamNumber, MatchType matchType) {
        this.redTeamNumber = redTeamNumber;
        this.blueTeamNumber = blueTeamNumber;
        this.matchType = matchType;
        this.redScore = new DecodeScore();
        this.blueScore = new DecodeScore();
        this.state = MatchState.NOT_STARTED;
        this.startTime = 0;
    }
    
    public String getRedTeamNumber() {
        return redTeamNumber;
    }
    
    public void setRedTeamNumber(String redTeamNumber) {
        this.redTeamNumber = redTeamNumber;
    }
    
    public String getBlueTeamNumber() {
        return blueTeamNumber;
    }
    
    public void setBlueTeamNumber(String blueTeamNumber) {
        this.blueTeamNumber = blueTeamNumber;
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
        FINISHED
    }
    
    public enum MatchType {
        TRADITIONAL_MATCH,  // 2v2 alliance match (Red vs Blue)
        SINGLE_TEAM_DEMO    // Single team demonstration/practice mode
    }
}
