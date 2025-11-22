package org.ftc.scorer.model;

import java.util.ArrayList;
import java.util.List;

/**
 * DECODE game scoring model for FTC 2025-2026 season
 * Supports both Traditional Match (2v2) and Single Team Demo modes
 */
public class DecodeScore {
    // Auto scoring
    private int autoClassifiedArtifacts = 0;
    private int autoOverflowArtifacts = 0;
    private ArtifactType[] autoClassifierState = new ArtifactType[3]; // 3 classifier bins
    private RobotPosition robot1Auto = RobotPosition.NONE;
    private RobotPosition robot2Auto = RobotPosition.NONE;
    
    // TeleOp scoring
    private int teleopClassifiedArtifacts = 0;
    private int teleopOverflowArtifacts = 0;
    private int teleopDepotArtifacts = 0;
    private ArtifactType[] teleopClassifierState = new ArtifactType[3]; // 3 classifier bins
    private RobotPosition robot1Teleop = RobotPosition.NONE;
    private RobotPosition robot2Teleop = RobotPosition.NONE;
    
    // Penalties
    private int ownMajorFouls = 0;
    private int ownMinorFouls = 0;
    private int otherMajorFouls = 0;
    private int otherMinorFouls = 0;
    
    // Violations
    private List<String> violations = new ArrayList<>();
    
    public DecodeScore() {
        // Initialize classifier states to NONE
        for (int i = 0; i < 3; i++) {
            autoClassifierState[i] = ArtifactType.NONE;
            teleopClassifierState[i] = ArtifactType.NONE;
        }
    }
    
    /**
     * Calculate total score based on current state
     */
    public int calculateTotalScore() {
        int total = 0;
        
        // Auto scoring
        total += autoClassifiedArtifacts * 6; // 6 points per classified artifact in auto
        total += autoOverflowArtifacts * 2; // 2 points per overflow artifact in auto
        total += calculateClassifierStatePoints(autoClassifierState, true);
        total += getRobotPositionPoints(robot1Auto, true);
        total += getRobotPositionPoints(robot2Auto, true);
        
        // TeleOp scoring
        total += teleopClassifiedArtifacts * 3; // 3 points per classified artifact in teleop
        total += teleopOverflowArtifacts * 1; // 1 point per overflow artifact in teleop
        total += teleopDepotArtifacts * 2; // 2 points per depot artifact
        total += calculateClassifierStatePoints(teleopClassifierState, false);
        total += getRobotPositionPoints(robot1Teleop, false);
        total += getRobotPositionPoints(robot2Teleop, false);
        
        // Penalties (opponent fouls benefit this alliance)
        total += otherMajorFouls * 15; // Major fouls by opponent
        total += otherMinorFouls * 5; // Minor fouls by opponent
        
        // Own penalties (subtract from score)
        total -= ownMajorFouls * 15;
        total -= ownMinorFouls * 5;
        
        return Math.max(0, total); // Score cannot go negative
    }
    
    private int calculateClassifierStatePoints(ArtifactType[] state, boolean isAuto) {
        int points = 0;
        int multiplier = isAuto ? 2 : 1; // Auto gets double points
        
        // Check for correctly classified artifacts
        for (ArtifactType type : state) {
            if (type == ArtifactType.GREEN || type == ArtifactType.PURPLE) {
                points += 3 * multiplier;
            }
        }
        
        return points;
    }
    
    private int getRobotPositionPoints(RobotPosition position, boolean isAuto) {
        switch (position) {
            case BASE_LOW:
                return isAuto ? 3 : 2;
            case BASE_HIGH:
                return isAuto ? 6 : 4;
            case GATE:
                return isAuto ? 10 : 6;
            default:
                return 0;
        }
    }
    
    // Getters and setters
    public int getAutoClassifiedArtifacts() { return autoClassifiedArtifacts; }
    public void setAutoClassifiedArtifacts(int value) { this.autoClassifiedArtifacts = value; }
    
    public int getAutoOverflowArtifacts() { return autoOverflowArtifacts; }
    public void setAutoOverflowArtifacts(int value) { this.autoOverflowArtifacts = value; }
    
    public ArtifactType[] getAutoClassifierState() { return autoClassifierState; }
    public void setAutoClassifierState(ArtifactType[] state) { this.autoClassifierState = state; }
    
    public RobotPosition getRobot1Auto() { return robot1Auto; }
    public void setRobot1Auto(RobotPosition position) { this.robot1Auto = position; }
    
    public RobotPosition getRobot2Auto() { return robot2Auto; }
    public void setRobot2Auto(RobotPosition position) { this.robot2Auto = position; }
    
    public int getTeleopClassifiedArtifacts() { return teleopClassifiedArtifacts; }
    public void setTeleopClassifiedArtifacts(int value) { this.teleopClassifiedArtifacts = value; }
    
    public int getTeleopOverflowArtifacts() { return teleopOverflowArtifacts; }
    public void setTeleopOverflowArtifacts(int value) { this.teleopOverflowArtifacts = value; }
    
    public int getTeleopDepotArtifacts() { return teleopDepotArtifacts; }
    public void setTeleopDepotArtifacts(int value) { this.teleopDepotArtifacts = value; }
    
    public ArtifactType[] getTeleopClassifierState() { return teleopClassifierState; }
    public void setTeleopClassifierState(ArtifactType[] state) { this.teleopClassifierState = state; }
    
    public RobotPosition getRobot1Teleop() { return robot1Teleop; }
    public void setRobot1Teleop(RobotPosition position) { this.robot1Teleop = position; }
    
    public RobotPosition getRobot2Teleop() { return robot2Teleop; }
    public void setRobot2Teleop(RobotPosition position) { this.robot2Teleop = position; }
    
    public int getOwnMajorFouls() { return ownMajorFouls; }
    public void setOwnMajorFouls(int value) { this.ownMajorFouls = value; }
    
    public int getOwnMinorFouls() { return ownMinorFouls; }
    public void setOwnMinorFouls(int value) { this.ownMinorFouls = value; }
    
    public int getOtherMajorFouls() { return otherMajorFouls; }
    public void setOtherMajorFouls(int value) { this.otherMajorFouls = value; }
    
    public int getOtherMinorFouls() { return otherMinorFouls; }
    public void setOtherMinorFouls(int value) { this.otherMinorFouls = value; }
    
    public List<String> getViolations() { return violations; }
    public void setViolations(List<String> violations) { this.violations = violations; }
    
    public void reset() {
        autoClassifiedArtifacts = 0;
        autoOverflowArtifacts = 0;
        teleopClassifiedArtifacts = 0;
        teleopOverflowArtifacts = 0;
        teleopDepotArtifacts = 0;
        robot1Auto = RobotPosition.NONE;
        robot2Auto = RobotPosition.NONE;
        robot1Teleop = RobotPosition.NONE;
        robot2Teleop = RobotPosition.NONE;
        ownMajorFouls = 0;
        ownMinorFouls = 0;
        otherMajorFouls = 0;
        otherMinorFouls = 0;
        violations.clear();
        
        for (int i = 0; i < 3; i++) {
            autoClassifierState[i] = ArtifactType.NONE;
            teleopClassifierState[i] = ArtifactType.NONE;
        }
    }
    
    public enum ArtifactType {
        NONE,
        GREEN,
        PURPLE,
        WHITE
    }
    
    public enum RobotPosition {
        NONE,
        BASE_LOW,
        BASE_HIGH,
        GATE
    }
}
