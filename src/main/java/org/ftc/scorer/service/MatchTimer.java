package org.ftc.scorer.service;

import org.ftc.scorer.model.Match;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.beans.property.IntegerProperty;
import javafx.beans.property.SimpleIntegerProperty;
import javafx.beans.property.StringProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.util.Duration;

/**
 * Manages match timing and state transitions
 * FTC DECODE match timing:
 * - 30 seconds autonomous
 * - 8 seconds transition (drivers pick up controllers)
 * - 2 minute (120 seconds) teleop
 * - Last 20 seconds is end game
 * Total: 2:38 (158 seconds)
 */
public class MatchTimer {
    private static final int AUTO_DURATION = 30;
    private static final int TRANSITION_DURATION = 8; // 8 second transition period
    private static final int TELEOP_DURATION = 120;
    private static final int ENDGAME_START = 110; // End game starts at 110 seconds (20 sec before end)
    
    private final Match match;
    private final AudioService audioService;
    private Timeline timeline;
    
    private final IntegerProperty secondsRemaining = new SimpleIntegerProperty(AUTO_DURATION);
    private final StringProperty currentPhase = new SimpleStringProperty("AUTO");
    private int totalSeconds = 0;
    
    public MatchTimer(Match match, AudioService audioService) {
        this.match = match;
        this.audioService = audioService;
    }
    
    public void startMatch() {
        if (timeline != null) {
            timeline.stop();
        }
        
        // MOTIF should be manually randomized before match start (more realistic)
        
        match.setState(Match.MatchState.AUTONOMOUS);
        match.setStartTime(System.currentTimeMillis());
        totalSeconds = 0;
        secondsRemaining.set(AUTO_DURATION);
        currentPhase.set("AUTO");
        
        // Play countdown at start
        audioService.playCountdown();
        
        timeline = new Timeline(new KeyFrame(Duration.seconds(1), event -> tick()));
        timeline.setCycleCount(Timeline.INDEFINITE);
        timeline.play();
    }
    
    private void tick() {
        totalSeconds++;
        
        if (match.getState() == Match.MatchState.AUTONOMOUS) {
            int remaining = AUTO_DURATION - totalSeconds;
            secondsRemaining.set(remaining);
            
            // End of AUTO - transition to TRANSITION period
            if (remaining <= 0) {
                match.setState(Match.MatchState.TRANSITION);
                currentPhase.set("TRANSITION");
                secondsRemaining.set(TRANSITION_DURATION);
                totalSeconds = 0; // Reset for transition
                audioService.playEndAuto(); // Sound plays at START of 8-second transition
            }
        } else if (match.getState() == Match.MatchState.TRANSITION) {
            // 8-second transition period (drivers pick up controllers)
            int remaining = TRANSITION_DURATION - totalSeconds;
            secondsRemaining.set(remaining);
            
            // End of TRANSITION - start TELEOP
            if (remaining <= 0) {
                match.setState(Match.MatchState.TELEOP);
                currentPhase.set("TELEOP");
                secondsRemaining.set(TELEOP_DURATION);
                totalSeconds = 0; // Reset for teleop
                audioService.playCountdown(); // Start of TeleOp sound
            }
        } else if (match.getState() == Match.MatchState.TELEOP || match.getState() == Match.MatchState.END_GAME) {
            int remaining = TELEOP_DURATION - totalSeconds;
            secondsRemaining.set(remaining);
            
            // Start of End Game at 20 seconds remaining (110 seconds elapsed)
            if (totalSeconds == ENDGAME_START && match.getState() != Match.MatchState.END_GAME) {
                match.setState(Match.MatchState.END_GAME);
                currentPhase.set("ENDGAME");
                audioService.playCharge(); // Start of End Game sound
            }
            
            // Match ends
            if (remaining <= 0) {
                match.setState(Match.MatchState.FINISHED);
                currentPhase.set("FINISHED");
                secondsRemaining.set(0);
                audioService.playEndMatch(); // End of game sound
                
                // Results sound will be played manually when breakdown button is pressed
                
                stopMatch();
            }
        }
    }
    
    public void stopMatch() {
        if (timeline != null) {
            timeline.stop();
        }
    }
    
    public void pauseMatch() {
        if (timeline != null) {
            timeline.pause();
        }
    }
    
    public void resumeMatch() {
        if (timeline != null) {
            timeline.play();
        }
    }
    
    public void resetMatch() {
        if (timeline != null) {
            timeline.stop();
        }
        match.reset();
        totalSeconds = 0;
        secondsRemaining.set(AUTO_DURATION);
        currentPhase.set("AUTO");
    }
    
    public IntegerProperty secondsRemainingProperty() {
        return secondsRemaining;
    }
    
    public StringProperty currentPhaseProperty() {
        return currentPhase;
    }
    
    public String getTimeString() {
        int seconds = secondsRemaining.get();
        int minutes = seconds / 60;
        int secs = seconds % 60;
        return String.format("%d:%02d", minutes, secs);
    }
}
