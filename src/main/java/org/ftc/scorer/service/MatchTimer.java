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
    private static final int ENDGAME_START = 100; // End game starts at 100 seconds into teleop (20 sec remaining until end)
    
    private final Match match;
    private final AudioService audioService;
    private Timeline timeline;
    
    private final IntegerProperty secondsRemaining = new SimpleIntegerProperty(AUTO_DURATION);
    private final StringProperty currentPhase = new SimpleStringProperty("AUTO");
    private final StringProperty countdownDisplay = new SimpleStringProperty(""); // For 3-2-1 countdown
    private int totalSeconds = 0;
    private boolean inCountdown = false;
    private boolean waitingForSoundToEnd = false;
    
    public MatchTimer(Match match, AudioService audioService) {
        this.match = match;
        this.audioService = audioService;
    }
    
    public void startMatch() {
        if (timeline != null) {
            timeline.stop();
        }
        
        // MOTIF should be manually randomized before match start (more realistic)
        
        match.setState(Match.MatchState.NOT_STARTED);
        match.setStartTime(System.currentTimeMillis());
        totalSeconds = -3; // Start at -3 for 3-2-1 countdown
        secondsRemaining.set(3);
        currentPhase.set("COUNTDOWN");
        countdownDisplay.set("3");
        inCountdown = true;
        
        // Play countdown at start
        audioService.playStartMatch();
        
        timeline = new Timeline(new KeyFrame(Duration.seconds(1), event -> tick()));
        timeline.setCycleCount(Timeline.INDEFINITE);
        timeline.play();
    }
    
    private void tick() {
        // Don't advance time if waiting for sound to end
        if (waitingForSoundToEnd) {
            return;
        }
        
        totalSeconds++;
        
        // Initial countdown before AUTO (3-2-1)
        if (match.getState() == Match.MatchState.NOT_STARTED && totalSeconds <= 0) {
            int countdown = -totalSeconds;
            if (countdown > 0) {
                countdownDisplay.set(String.valueOf(countdown));
                secondsRemaining.set(countdown);
            } else if (countdown == 0) {
                // Countdown finished, start AUTO
                match.setState(Match.MatchState.AUTONOMOUS);
                currentPhase.set("AUTO");
                secondsRemaining.set(AUTO_DURATION);
                totalSeconds = 0;
                inCountdown = false;
                countdownDisplay.set("");
            }
        } else if (match.getState() == Match.MatchState.AUTONOMOUS) {
            int remaining = AUTO_DURATION - totalSeconds;
            secondsRemaining.set(remaining);
            
            // Show countdown in last 3 seconds before transition
            if (remaining <= 3 && remaining > 0) {
                countdownDisplay.set(String.valueOf(remaining));
                inCountdown = true;
            }
            
            // End of AUTO - wait for sound to finish before transitioning
            if (remaining <= 0 && !waitingForSoundToEnd) {
                waitingForSoundToEnd = true;
                inCountdown = false;
                countdownDisplay.set("");
                
                // Play endauto sound and transition when it finishes
                audioService.playTransition(() -> {
                    match.setState(Match.MatchState.TRANSITION);
                    currentPhase.set("TRANSITION");
                    secondsRemaining.set(TRANSITION_DURATION);
                    totalSeconds = 0; // Reset for transition
                    waitingForSoundToEnd = false;
                });
            }
        } else if (match.getState() == Match.MatchState.TRANSITION) {
            // 8-second transition period (drivers pick up controllers)
            int remaining = TRANSITION_DURATION - totalSeconds;
            secondsRemaining.set(remaining);
            
            // Show countdown in last 3 seconds before teleop
            if (remaining <= 3 && remaining > 0) {
                countdownDisplay.set(String.valueOf(remaining));
                inCountdown = true;
            }
            
            // End of TRANSITION - wait for sound to finish before starting TELEOP
            if (remaining <= 0 && !waitingForSoundToEnd) {
                waitingForSoundToEnd = true;
                inCountdown = false;
                countdownDisplay.set("");
                
                // Play countdown sound and transition when it finishes
                audioService.playCountdown(() -> {
                    match.setState(Match.MatchState.TELEOP);
                    currentPhase.set("TELEOP");
                    secondsRemaining.set(TELEOP_DURATION);
                    totalSeconds = 0; // Reset for teleop
                    waitingForSoundToEnd = false;
                });
            }
        } else if (match.getState() == Match.MatchState.TELEOP || match.getState() == Match.MatchState.END_GAME) {
            int remaining = TELEOP_DURATION - totalSeconds;
            secondsRemaining.set(remaining);
            
            // Start of End Game at 20 seconds remaining (100 seconds elapsed)
            if (totalSeconds == ENDGAME_START && match.getState() != Match.MatchState.END_GAME) {
                match.setState(Match.MatchState.END_GAME);
                currentPhase.set("ENDGAME");
                audioService.playCharge(); // Start of End Game sound
            }
            
            // Show countdown in last 3 seconds
            if (remaining <= 3 && remaining > 0) {
                countdownDisplay.set(String.valueOf(remaining));
                inCountdown = true;
            } else if (remaining > 3) {
                countdownDisplay.set("");
                inCountdown = false;
            }
            
            // Match ends - wait for sound to finish before transitioning
            if (remaining <= 0 && !waitingForSoundToEnd) {
                waitingForSoundToEnd = true;
                match.setState(Match.MatchState.FINISHED);
                currentPhase.set("FINISHED");
                secondsRemaining.set(0);
                countdownDisplay.set("");
                inCountdown = false;
                
                // Play end match sound and transition to UNDER REVIEW when sound finishes
                audioService.playEndMatch(() -> {
                    match.setState(Match.MatchState.UNDER_REVIEW);
                    currentPhase.set("UNDER REVIEW");
                    waitingForSoundToEnd = false;
                });
                
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
        countdownDisplay.set("");
        inCountdown = false;
        waitingForSoundToEnd = false;
    }
    
    public IntegerProperty secondsRemainingProperty() {
        return secondsRemaining;
    }
    
    public StringProperty currentPhaseProperty() {
        return currentPhase;
    }
    
    public StringProperty countdownDisplayProperty() {
        return countdownDisplay;
    }
    
    public boolean isInCountdown() {
        return inCountdown;
    }
    
    public String getTimeString() {
        int seconds = secondsRemaining.get();
        int minutes = seconds / 60;
        int secs = seconds % 60;
        return String.format("%d:%02d", minutes, secs);
    }
}
