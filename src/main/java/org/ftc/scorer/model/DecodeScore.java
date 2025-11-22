package org.ftc.scorer.model;

import java.util.ArrayList;
import java.util.List;

/**
 * DECODE game scoring model for FTC 2025-2026 season
 * Official rules: ARTIFACTS (Purple/Green), GOAL scoring, PATTERNS on RAMPS, BASE return
 */
public class DecodeScore {
    // MOTIF (randomized manually before match - one of 3 patterns: PPG, PGP, GPP)
    private MotifType motif = MotifType.PPG;
    
    // AUTO scoring (30 seconds)
    private boolean robot1Leave = false;  // 3 points - moved off LAUNCH LINE
    private boolean robot2Leave = false;  // 3 points - moved off LAUNCH LINE
    private int autoClassified = 0;       // 3 points each - ARTIFACTS scored in GOAL (CLASSIFIED)
    private int autoOverflow = 0;         // 1 point each - ARTIFACTS in OVERFLOW
    
    // AUTO PATTERN on RAMP (based on MOTIF)
    private int autoPatternMatches = 0;   // 2 points each - ARTIFACTS matching MOTIF on RAMP
    
    // TELEOP scoring (2 minutes)
    private int teleopClassified = 0;     // 3 points each - ARTIFACTS in CLASSIFIED
    private int teleopOverflow = 0;       // 1 point each - ARTIFACTS in OVERFLOW  
    private int teleopDepot = 0;          // 1 point each - ARTIFACTS in DEPOT
    
    // TELEOP PATTERN on RAMP (based on MOTIF)
    private int teleopPatternMatches = 0; // 2 points each - ARTIFACTS matching MOTIF
    
    // BASE (end game)
    private BaseStatus robot1Base = BaseStatus.NOT_IN_BASE;
    private BaseStatus robot2Base = BaseStatus.NOT_IN_BASE;
    
    // Penalties
    private int majorFouls = 0;
    private int minorFouls = 0;
    
    public DecodeScore() {
    }
    
    /**
     * Calculate total MATCH points based on current state
     */
    public int calculateTotalScore() {
        int total = 0;
        
        // AUTO - LEAVE (3 points each)
        if (robot1Leave) total += 3;
        if (robot2Leave) total += 3;
        
        // AUTO - ARTIFACTS
        total += autoClassified * 3;  // CLASSIFIED
        total += autoOverflow * 1;     // OVERFLOW
        
        // AUTO - PATTERN (matches MOTIF)
        total += autoPatternMatches * 2;
        
        // TELEOP - ARTIFACTS
        total += teleopClassified * 3;  // CLASSIFIED
        total += teleopOverflow * 1;    // OVERFLOW
        total += teleopDepot * 1;       // DEPOT
        
        // TELEOP - PATTERN (matches MOTIF)
        total += teleopPatternMatches * 2;
        
        // BASE return
        total += getBasePoints();
        
        return Math.max(0, total);
    }
    
    /**
     * Calculate BASE return points
     */
    public int getBasePoints() {
        int points = 0;
        
        boolean robot1Full = (robot1Base == BaseStatus.FULLY_IN_BASE);
        boolean robot2Full = (robot2Base == BaseStatus.FULLY_IN_BASE);
        boolean robot1Partial = (robot1Base == BaseStatus.PARTIALLY_IN_BASE);
        boolean robot2Partial = (robot2Base == BaseStatus.PARTIALLY_IN_BASE);
        
        // Partial BASE return (5 points each)
        if (robot1Partial) points += 5;
        if (robot2Partial) points += 5;
        
        // Full BASE return (10 points each)
        if (robot1Full) points += 10;
        if (robot2Full) points += 10;
        
        // Bonus: Both robots fully in BASE (10 points)
        if (robot1Full && robot2Full) points += 10;
        
        return points;
    }
    
    /**
     * Calculate combined LEAVE + BASE points for MOVEMENT RP
     */
    public int getMovementPoints() {
        int leavePoints = 0;
        if (robot1Leave) leavePoints += 3;
        if (robot2Leave) leavePoints += 3;
        return leavePoints + getBasePoints();
    }
    
    /**
     * Get total CLASSIFIED artifacts for GOAL RP
     */
    public int getTotalClassified() {
        return autoClassified + teleopClassified;
    }
    
    /**
     * Calculate PATTERN points for PATTERN RP
     */
    public int getPatternPoints() {
        return (autoPatternMatches + teleopPatternMatches) * 2;
    }
    
    // Getters and setters
    public MotifType getMotif() { return motif; }
    public void setMotif(MotifType motif) { this.motif = motif; }
    
    public boolean isRobot1Leave() { return robot1Leave; }
    public void setRobot1Leave(boolean leave) { this.robot1Leave = leave; }
    
    public boolean isRobot2Leave() { return robot2Leave; }
    public void setRobot2Leave(boolean leave) { this.robot2Leave = leave; }
    
    public int getAutoClassified() { return autoClassified; }
    public void setAutoClassified(int value) { this.autoClassified = Math.max(0, value); }
    
    public int getAutoOverflow() { return autoOverflow; }
    public void setAutoOverflow(int value) { this.autoOverflow = Math.max(0, value); }
    
    public int getAutoPatternMatches() { return autoPatternMatches; }
    public void setAutoPatternMatches(int value) { this.autoPatternMatches = Math.max(0, value); }
    
    public int getTeleopClassified() { return teleopClassified; }
    public void setTeleopClassified(int value) { this.teleopClassified = Math.max(0, value); }
    
    public int getTeleopOverflow() { return teleopOverflow; }
    public void setTeleopOverflow(int value) { this.teleopOverflow = Math.max(0, value); }
    
    public int getTeleopDepot() { return teleopDepot; }
    public void setTeleopDepot(int value) { this.teleopDepot = Math.max(0, value); }
    
    public int getTeleopPatternMatches() { return teleopPatternMatches; }
    public void setTeleopPatternMatches(int value) { this.teleopPatternMatches = Math.max(0, value); }
    
    public BaseStatus getRobot1Base() { return robot1Base; }
    public void setRobot1Base(BaseStatus status) { this.robot1Base = status; }
    
    public BaseStatus getRobot2Base() { return robot2Base; }
    public void setRobot2Base(BaseStatus status) { this.robot2Base = status; }
    
    public int getMajorFouls() { return majorFouls; }
    public void setMajorFouls(int value) { this.majorFouls = Math.max(0, value); }
    
    public int getMinorFouls() { return minorFouls; }
    public void setMinorFouls(int value) { this.minorFouls = Math.max(0, value); }
    
    public void reset() {
        motif = MotifType.PPG;  // Will be randomized at match start
        robot1Leave = false;
        robot2Leave = false;
        autoClassified = 0;
        autoOverflow = 0;
        autoPatternMatches = 0;
        teleopClassified = 0;
        teleopOverflow = 0;
        teleopDepot = 0;
        teleopPatternMatches = 0;
        robot1Base = BaseStatus.NOT_IN_BASE;
        robot2Base = BaseStatus.NOT_IN_BASE;
        majorFouls = 0;
        minorFouls = 0;
    }
    
    /**
     * MOTIF types shown by OBELISK (randomized at match start)
     * Purple = P, Green = G
     */
    public enum MotifType {
        PPG("PPG (Purple-Purple-Green)"),
        PGP("PGP (Purple-Green-Purple)"),
        GPP("GPP (Green-Purple-Purple)");
        
        private final String displayName;
        
        MotifType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
        
        /**
         * Randomize MOTIF (simulates OBELISK randomization)
         */
        public static MotifType randomize() {
            MotifType[] values = values();
            int index = (int) (Math.random() * values.length);
            return values[index];
        }
    }
    
    /**
     * BASE return status
     */
    public enum BaseStatus {
        NOT_IN_BASE("Not in BASE"),
        PARTIALLY_IN_BASE("Partially in BASE"),
        FULLY_IN_BASE("Fully in BASE");
        
        private final String displayName;
        
        BaseStatus(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
}
