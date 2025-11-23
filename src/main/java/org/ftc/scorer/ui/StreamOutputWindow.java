package org.ftc.scorer.ui;

import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.control.Separator;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;
import javafx.util.Duration;
import org.ftc.scorer.model.Match;
import org.ftc.scorer.service.MatchTimer;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Stream output window with webcam feed and scoring overlay
 * This window is designed to be captured by OBS or other streaming software
 */
public class StreamOutputWindow {
    private final Stage stage;
    private final Match match;
    private final MatchTimer matchTimer;
    
    private ImageView webcamView;
    private Label redScoreLabel;
    private Label blueScoreLabel;
    private Label timerLabel;
    private Label phaseLabel;
    
    // Breakdown labels for detailed scoring
    private Label redClassifiedLabel, redOverflowLabel, redMotifLabel, redLeaveLabel, redBaseLabel, redFoulLabel;
    private Label blueClassifiedLabel, blueOverflowLabel, blueMotifLabel, blueLeaveLabel, blueBaseLabel, blueFoulLabel;
    private Label redTeamLabel, blueTeamLabel;
    
    // Helper class to return box and label together
    private static class LabeledBox {
        final VBox box;
        final Label label;
        LabeledBox(VBox box, Label label) {
            this.box = box;
            this.label = label;
        }
    }
    
    // Helper class for stacked boxes with two labels
    private static class StackedLabeledBox {
        final VBox box;
        final Label topLabel;
        final Label bottomLabel;
        StackedLabeledBox(VBox box, Label topLabel, Label bottomLabel) {
            this.box = box;
            this.topLabel = topLabel;
            this.bottomLabel = bottomLabel;
        }
    }
    
    private StackPane root;
    private HBox topBar;
    private HBox scoreBar;
    private VBox breakdownOverlay;
    private boolean showingBreakdown = false;
    private Label motifLabel;
    private boolean motifHighlighted = false;
    
    public StreamOutputWindow(Match match, MatchTimer matchTimer) {
        this.match = match;
        this.matchTimer = matchTimer;
        this.stage = new Stage();
        
        initializeUI();
    }
    
    private void initializeUI() {
        root = new StackPane();
        root.setStyle("-fx-background-color: black;");
        
        // Webcam feed as background
        webcamView = new ImageView();
        webcamView.setPreserveRatio(true);
        webcamView.fitWidthProperty().bind(root.widthProperty());
        webcamView.fitHeightProperty().bind(root.heightProperty());
        
        // Overlay container
        VBox overlay = createOverlay();
        
        root.getChildren().addAll(webcamView, overlay);
        
        Scene scene = new Scene(root, 1280, 720);
        stage.setScene(scene);
        stage.setTitle("FTC Stream Output");
        
        // Update scores periodically
        startScoreUpdater();
    }
    
    private VBox createOverlay() {
        VBox overlay = new VBox(0);
        overlay.setAlignment(Pos.BOTTOM_CENTER);
        overlay.setPadding(new Insets(0));
        
        // Spacer to push everything to bottom
        Region spacer = new Region();
        VBox.setVgrow(spacer, Priority.ALWAYS);
        
        // Bottom bar with all info (docked)
        scoreBar = createBottomBar();
        
        // Keep topBar reference for backwards compatibility (will be hidden)
        topBar = new HBox();
        topBar.setVisible(false);
        
        overlay.getChildren().addAll(spacer, scoreBar);
        
        return overlay;
    }
    
    /**
     * Create the new bottom bar with all info - docked at the bottom
     * Layout: [Red scores] [Center time/phase/motif box] [Blue scores]
     */
    private HBox createBottomBar() {
        HBox bar = new HBox(0);
        bar.setAlignment(Pos.CENTER);
        bar.setPadding(new Insets(0));
        bar.setStyle("-fx-background-color: rgb(0, 0, 0);"); // Solid black, non-transparent
        bar.setPrefHeight(120);
        
        // Left section: Red Alliance scores (from center outward)
        HBox redSection = createRedScoreSection();
        
        // Center: White box with timer, phase, and motif
        VBox centerBox = createCenterInfoBox();
        
        // Right section: Blue Alliance scores (from center outward)
        HBox blueSection = createBlueScoreSection();
        
        bar.getChildren().addAll(redSection, centerBox, blueSection);
        
        return bar;
    }
    
    /**
     * Create center white box with time, phase, and motif
     */
    private VBox createCenterInfoBox() {
        VBox box = new VBox(5);
        box.setAlignment(Pos.CENTER);
        box.setPadding(new Insets(10, 20, 10, 20));
        box.setStyle("-fx-background-color: white; -fx-border-color: #333; -fx-border-width: 2;");
        box.setMinWidth(180);
        
        // Timer
        timerLabel = new Label("2:30");
        timerLabel.setFont(Font.font("Arial", FontWeight.BOLD, 36));
        timerLabel.setTextFill(Color.BLACK);
        
        // Phase
        phaseLabel = new Label("AUTO");
        phaseLabel.setFont(Font.font("Arial", FontWeight.BOLD, 18));
        phaseLabel.setTextFill(Color.rgb(50, 50, 50));
        
        // Motif
        motifLabel = new Label("PPG");
        motifLabel.setFont(Font.font("Arial", FontWeight.BOLD, 16));
        motifLabel.setTextFill(Color.rgb(100, 100, 100));
        
        box.getChildren().addAll(timerLabel, phaseLabel, motifLabel);
        
        return box;
    }
    
    /**
     * Create Red Alliance score section - from center outward
     * Layout: [Team] [Fouls] [Pattern] [Leave+Base Stacked] [Classified+Overflow Stacked] [Total Score]
     */
    private HBox createRedScoreSection() {
        HBox section = new HBox(8);
        section.setAlignment(Pos.CENTER_RIGHT);
        section.setPadding(new Insets(10));
        HBox.setHgrow(section, Priority.ALWAYS);
        // Add colored background for red alliance section (solid color, no opacity)
        section.setStyle("-fx-background-color: rgb(211, 47, 47);");
        
        Color redColor = Color.rgb(211, 47, 47);
        
        // Team info (leftmost) - using text label for team name
        VBox teamBox = new VBox(2);
        teamBox.setAlignment(Pos.CENTER);
        teamBox.setPadding(new Insets(8, 10, 8, 10));
        teamBox.setStyle("-fx-background-color: white; -fx-border-color: " + toRgbString(redColor) + "; -fx-border-width: 2;");
        teamBox.setMinWidth(80);
        teamBox.setMaxWidth(80);
        
        Label redLabel = new Label("RED");
        redLabel.setFont(Font.font("Arial", FontWeight.BOLD, 12));
        redLabel.setTextFill(redColor);

        redTeamLabel = new Label("----");
        redTeamLabel.setFont(Font.font("Arial", FontWeight.BOLD, 14));
        redTeamLabel.setTextFill(Color.BLACK);
// ADD:
        redTeamLabel.setWrapText(true);

        teamBox.getChildren().addAll(redLabel, redTeamLabel);
        
        // Fouls (opponent's fouls give us points)
        LabeledBox foulsBox = createInfoBox("foul_icon", "0", redColor, 70);
        redFoulLabel = foulsBox.label;
        
        // Pattern points
        LabeledBox patternBox = createInfoBox("pattern_icon", "0", redColor, 60);
        redMotifLabel = patternBox.label;
        
        // Leave + Base (stacked)
        StackedLabeledBox leaveBaseBox = createStackedInfoBox("leave_icon", "0", "base_icon", "0", redColor, 70);
        redLeaveLabel = leaveBaseBox.topLabel;
        redBaseLabel = leaveBaseBox.bottomLabel;
        
        // Classified + Overflow (stacked)
        StackedLabeledBox classifiedOverflowBox = createStackedInfoBox("classified_icon", "0", "overflow_icon", "0", redColor, 70);
        redClassifiedLabel = classifiedOverflowBox.topLabel;
        redOverflowLabel = classifiedOverflowBox.bottomLabel;
        
        // Total score (rightmost, closest to center)
        LabeledBox totalBox = createTotalScoreBox("0", redColor);
        redScoreLabel = totalBox.label;
        
        section.getChildren().addAll(teamBox, foulsBox.box, patternBox.box, leaveBaseBox.box, classifiedOverflowBox.box, totalBox.box);
        
        return section;
    }
    
    /**
     * Create Blue Alliance score section - from center outward
     * Layout: [Total Score] [Classified+Overflow Stacked] [Leave+Base Stacked] [Pattern] [Fouls] [Team]
     */
    private HBox createBlueScoreSection() {
        HBox section = new HBox(8);
        section.setAlignment(Pos.CENTER_LEFT);
        section.setPadding(new Insets(10));
        HBox.setHgrow(section, Priority.ALWAYS);
        // Add colored background for blue alliance section (solid color, no opacity)
        section.setStyle("-fx-background-color: rgb(25, 118, 210);");
        
        Color blueColor = Color.rgb(25, 118, 210);
        
        // Total score (leftmost, closest to center)
        LabeledBox totalBox = createTotalScoreBox("0", blueColor);
        blueScoreLabel = totalBox.label;
        
        // Classified + Overflow (stacked)
        StackedLabeledBox classifiedOverflowBox = createStackedInfoBox("classified_icon", "0", "overflow_icon", "0", blueColor, 70);
        blueClassifiedLabel = classifiedOverflowBox.topLabel;
        blueOverflowLabel = classifiedOverflowBox.bottomLabel;
        
        // Leave + Base (stacked)
        StackedLabeledBox leaveBaseBox = createStackedInfoBox("leave_icon", "0", "base_icon", "0", blueColor, 70);
        blueLeaveLabel = leaveBaseBox.topLabel;
        blueBaseLabel = leaveBaseBox.bottomLabel;
        
        // Pattern points
        LabeledBox patternBox = createInfoBox("pattern_icon", "0", blueColor, 60);
        blueMotifLabel = patternBox.label;
        
        // Fouls (opponent's fouls give us points)
        LabeledBox foulsBox = createInfoBox("foul_icon", "0", blueColor, 70);
        blueFoulLabel = foulsBox.label;
        
        // Team info (rightmost) - using text label for team name
        VBox teamBox = new VBox(2);
        teamBox.setAlignment(Pos.CENTER);
        teamBox.setPadding(new Insets(8, 10, 8, 10));
        teamBox.setStyle("-fx-background-color: white; -fx-border-color: " + toRgbString(blueColor) + "; -fx-border-width: 2;");
        teamBox.setMinWidth(80);
        teamBox.setMaxWidth(80);
        
        Label blueLabel = new Label("BLUE");
        blueLabel.setFont(Font.font("Arial", FontWeight.BOLD, 12));
        blueLabel.setTextFill(blueColor);

        blueTeamLabel = new Label("----");
        blueTeamLabel.setFont(Font.font("Arial", FontWeight.BOLD, 14));
        blueTeamLabel.setTextFill(Color.BLACK);
// ADD:
        blueTeamLabel.setWrapText(true);
        
        teamBox.getChildren().addAll(blueLabel, blueTeamLabel);
        
        section.getChildren().addAll(totalBox.box, classifiedOverflowBox.box, leaveBaseBox.box, patternBox.box, foulsBox.box, teamBox);
        
        return section;
    }
    
    /**
     * Create emoji label for icon
     */
    private Label createEmojiLabel(String iconName, int size) {
        String emoji = EmojiConfig.getEmoji(iconName);
        Label label = new Label(emoji);
        label.setFont(Font.font("Arial", size));
        return label;
    }
    
    /**
     * Create a small white info box with emoji icon and value
     * Returns a LabeledBox with both the box and the label for easy access
     */
    private LabeledBox createInfoBox(String iconName, String value, Color color, int width) {
        VBox box = new VBox(2);
        box.setAlignment(Pos.CENTER);
        box.setPadding(new Insets(8, 10, 8, 10));
        box.setStyle("-fx-background-color: white; -fx-border-color: " + toRgbString(color) + "; -fx-border-width: 2;");
        box.setMinWidth(width);
        box.setMaxWidth(width);
        
        VBox content = new VBox(2);
        content.setAlignment(Pos.CENTER);
        
        // Use emoji icon
        Label icon = createEmojiLabel(iconName, 24);
        
        Label valueText = new Label(value);
        valueText.setFont(Font.font("Arial", FontWeight.BOLD, 16));
        valueText.setTextFill(Color.BLACK);
        
        content.getChildren().addAll(icon, valueText);
        box.getChildren().add(content);
        
        return new LabeledBox(box, valueText);
    }
    
    /**
     * Create a stacked info box with two categories (emoji icons)
     * Returns a StackedLabeledBox with the box and both labels for easy access
     */
    private StackedLabeledBox createStackedInfoBox(String iconName1, String value1, String iconName2, String value2, Color color, int width) {
        VBox box = new VBox(0);
        box.setAlignment(Pos.CENTER);
        box.setStyle("-fx-border-color: " + toRgbString(color) + "; -fx-border-width: 2;");
        box.setMinWidth(width);
        box.setMaxWidth(width);
        
        // Top section
        VBox topSection = new VBox(2);
        topSection.setAlignment(Pos.CENTER);
        topSection.setPadding(new Insets(6, 8, 6, 8));
        topSection.setStyle("-fx-background-color: white;");
        
        Label topIcon = createEmojiLabel(iconName1, 20);
        
        Label topValue = new Label(value1);
        topValue.setFont(Font.font("Arial", FontWeight.BOLD, 14));
        topValue.setTextFill(Color.BLACK);
        
        topSection.getChildren().addAll(topIcon, topValue);
        
        // Separator line
        Region separator = new Region();
        separator.setPrefHeight(1);
        separator.setStyle("-fx-background-color: " + toRgbString(color) + ";");
        
        // Bottom section
        VBox bottomSection = new VBox(2);
        bottomSection.setAlignment(Pos.CENTER);
        bottomSection.setPadding(new Insets(6, 8, 6, 8));
        bottomSection.setStyle("-fx-background-color: white;");
        
        Label bottomIcon = createEmojiLabel(iconName2, 20);
        
        Label bottomValue = new Label(value2);
        bottomValue.setFont(Font.font("Arial", FontWeight.BOLD, 14));
        bottomValue.setTextFill(Color.BLACK);
        
        bottomSection.getChildren().addAll(bottomIcon, bottomValue);
        
        box.getChildren().addAll(topSection, separator, bottomSection);
        
        return new StackedLabeledBox(box, topValue, bottomValue);
    }
    
    /**
     * Create total score box (larger)
     * Returns a LabeledBox with both the box and the label for easy access
     */
    private LabeledBox createTotalScoreBox(String value, Color color) {
        VBox box = new VBox(2);
        box.setAlignment(Pos.CENTER);
        box.setPadding(new Insets(8, 15, 8, 15));
        box.setStyle("-fx-background-color: " + toRgbString(color) + "; -fx-border-color: white; -fx-border-width: 3;");
        box.setMinWidth(90);
        
        VBox content = new VBox(2);
        content.setAlignment(Pos.CENTER);
        
        Label valueText = new Label(value);
        valueText.setFont(Font.font("Arial", FontWeight.BOLD, 42));
        valueText.setTextFill(Color.WHITE);
        
        content.getChildren().add(valueText);
        box.getChildren().add(content);
        
        return new LabeledBox(box, valueText);
    }
    
    /**
     * Update the score bar layout based on match mode
     * IMPORTANT: This method recreates sections, so label references must be re-established
     */
    public void updateScoreBarForMode() {
        // Rebuild score bar for solo mode
        scoreBar.getChildren().clear();
        
        if (match.isSingleTeamMode()) {
            // Solo mode: only show red section and center
            HBox redSection = createRedScoreSection();
            VBox centerBox = createCenterInfoBox();
            
            // Create grey placeholder for blue - reset blue label references to null
            blueClassifiedLabel = null;
            blueOverflowLabel = null;
            blueMotifLabel = null;
            blueLeaveLabel = null;
            blueBaseLabel = null;
            blueFoulLabel = null;
            blueTeamLabel = null;
            
            HBox blueSection = new HBox();
            blueSection.setAlignment(Pos.CENTER);
            blueSection.setPadding(new Insets(10));
            HBox.setHgrow(blueSection, Priority.ALWAYS);
            Label soloLabel = new Label("SOLO MODE");
            soloLabel.setFont(Font.font("Arial", FontWeight.BOLD, 18));
            soloLabel.setTextFill(Color.rgb(150, 150, 150));
            blueSection.getChildren().add(soloLabel);
            
            scoreBar.getChildren().addAll(redSection, centerBox, blueSection);
        } else {
            // Traditional mode: red, center, blue
            // Note: createRedScoreSection() and createBlueScoreSection() already update the label references
            HBox redSection = createRedScoreSection();
            VBox centerBox = createCenterInfoBox();
            HBox blueSection = createBlueScoreSection();
            
            scoreBar.getChildren().addAll(redSection, centerBox, blueSection);
        }
    }
    

    
    private void startScoreUpdater() {
        // Update UI every 100ms
        Timeline timeline = new Timeline(
            new KeyFrame(Duration.millis(100), e -> updateScores())
        );
        timeline.setCycleCount(Timeline.INDEFINITE);
        timeline.play();
    }
    
    private void updateScores() {
        // Use match methods which include opponent penalties
        redScoreLabel.setText(String.valueOf(match.getRedTotalScore()));
        blueScoreLabel.setText(String.valueOf(match.getBlueTotalScore()));
        
        // Normal time display - no countdown overlay
        timerLabel.setText(matchTimer.getTimeString());
        
        String phase = matchTimer.currentPhaseProperty().get();
        
        // Show phase - handle COUNTDOWN as NOT_STARTED
        if (phase.equals("COUNTDOWN")) {
            phaseLabel.setText("READY");
            phaseLabel.setTextFill(Color.rgb(100, 100, 100));
        } else {
            phaseLabel.setText(phase);
            
            // Change phase color in center box - darker colors for white background
            if (phase.equals("ENDGAME")) {
                phaseLabel.setTextFill(Color.rgb(200, 100, 0)); // Dark orange
            } else if (phase.equals("FINISHED")) {
                phaseLabel.setTextFill(Color.rgb(200, 0, 0)); // Dark red
            } else if (phase.equals("UNDER REVIEW")) {
                phaseLabel.setTextFill(Color.rgb(150, 120, 0)); // Dark yellow
            } else {
                phaseLabel.setTextFill(Color.rgb(0, 120, 0)); // Dark green
            }
        }
        
        // Update motif display in center box
        String motifText = match.getRedScore().getMotif().name();
        motifLabel.setText(motifText);
        
        // Note: teamNumbersLabel is deprecated and hidden - team numbers are now shown in the bottom bar
        
        // Update detailed breakdown
        updateDetailedBreakdown();
    }
    private String formatTeamsForStack(String display) {
        if (display == null || display.isBlank()) {
            return "----";
        }
        // Split on '+', stack each trimmed part on its own line
        return Arrays.stream(display.split("\\+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.joining("\n"));
    }
    private void updateDetailedBreakdown() {
        // Red Alliance breakdown
        int redClassified = match.getRedScore().getAutoClassified() + match.getRedScore().getTeleopClassified();
        int redOverflow = match.getRedScore().getAutoOverflow() + match.getRedScore().getTeleopOverflow();
        int redPattern = match.getRedScore().getAutoPatternMatches() + match.getRedScore().getTeleopPatternMatches();
        int redLeave = (match.getRedScore().isRobot1Leave() ? 1 : 0) + (match.getRedScore().isRobot2Leave() ? 1 : 0);
        
        // Get base points from score model
        int redBasePts = match.getRedScore().getBasePoints();
        
        // Opponent fouls give points to this alliance (5 pts minor, 15 pts major)
        int redFoulPts = match.getBlueScore().getMinorFouls() * 5 + match.getBlueScore().getMajorFouls() * 15;
        
        // Calculate points for each category
        int redClassifiedPts = redClassified * 3;
        int redOverflowPts = redOverflow;
        int redPatternPts = redPattern * 2;
        int redLeavePts = redLeave * 3;
        
        // Update red labels if they exist
        if (redClassifiedLabel != null) redClassifiedLabel.setText(String.valueOf(redClassifiedPts));
        if (redOverflowLabel != null) redOverflowLabel.setText(String.valueOf(redOverflowPts));
        if (redMotifLabel != null) redMotifLabel.setText(String.valueOf(redPatternPts));
        if (redLeaveLabel != null) redLeaveLabel.setText(String.valueOf(redLeavePts));
        if (redBaseLabel != null) redBaseLabel.setText(String.valueOf(redBasePts));
        if (redFoulLabel != null) redFoulLabel.setText(String.valueOf(redFoulPts));

        if (redTeamLabel != null) {
            redTeamLabel.setText(formatTeamsForStack(match.getRedTeamsDisplay()));
        }
        
        // Blue Alliance breakdown
        int blueClassified = match.getBlueScore().getAutoClassified() + match.getBlueScore().getTeleopClassified();
        int blueOverflow = match.getBlueScore().getAutoOverflow() + match.getBlueScore().getTeleopOverflow();
        int bluePattern = match.getBlueScore().getAutoPatternMatches() + match.getBlueScore().getTeleopPatternMatches();
        int blueLeave = (match.getBlueScore().isRobot1Leave() ? 1 : 0) + (match.getBlueScore().isRobot2Leave() ? 1 : 0);
        
        // Get base points from score model
        int blueBasePts = match.getBlueScore().getBasePoints();
        
        // Opponent fouls give points to this alliance (5 pts minor, 15 pts major)
        int blueFoulPts = match.getRedScore().getMinorFouls() * 5 + match.getRedScore().getMajorFouls() * 15;
        
        // Calculate points for each category
        int blueClassifiedPts = blueClassified * 3;
        int blueOverflowPts = blueOverflow;
        int bluePatternPts = bluePattern * 2;
        int blueLeavePts = blueLeave * 3;
        
        // Update blue labels if they exist (may be null in solo mode)
        if (blueClassifiedLabel != null) blueClassifiedLabel.setText(String.valueOf(blueClassifiedPts));
        if (blueOverflowLabel != null) blueOverflowLabel.setText(String.valueOf(blueOverflowPts));
        if (blueMotifLabel != null) blueMotifLabel.setText(String.valueOf(bluePatternPts));
        if (blueLeaveLabel != null) blueLeaveLabel.setText(String.valueOf(blueLeavePts));
        if (blueBaseLabel != null) blueBaseLabel.setText(String.valueOf(blueBasePts));
        if (blueFoulLabel != null) blueFoulLabel.setText(String.valueOf(blueFoulPts));

        if (blueTeamLabel != null) {
            blueTeamLabel.setText(formatTeamsForStack(match.getBlueTeamsDisplay()));
        }
    }
    
    public void updateWebcamFrame(Image frame) {
        webcamView.setImage(frame);
    }
    
    /**
     * Highlight motif in yellow for 10 seconds when randomized
     */
    public void highlightMotif() {
        if (motifHighlighted) {
            return; // Already highlighting
        }
        
        motifHighlighted = true;
        
        // Set yellow background
        motifLabel.setStyle("-fx-background-color: yellow; -fx-padding: 5;");
        motifLabel.setTextFill(Color.BLACK);
        
        // Remove highlight after 10 seconds
        Timeline timeline = new Timeline(
            new KeyFrame(
                Duration.seconds(10),
                e -> {
                    motifLabel.setStyle("");
                    motifLabel.setTextFill(Color.rgb(100, 100, 100));
                    motifHighlighted = false;
                }
            )
        );
        timeline.play();
    }
    
    /**
     * Show splash screen overlay with countdown
     * Simplified for stream countdown mode - no fading, just DECODE background and countdown
     */
    public void showSplashScreen(String countdown, String teamInfo, String matchType, String motif) {
        // Hide normal scoring elements
        topBar.setVisible(false);
        scoreBar.setVisible(false);
        
        // Remove existing splash if any
        if (root.getChildren().size() > 2) {
            root.getChildren().remove(root.getChildren().size() - 1);
        }
        
        // Create splash overlay with DECODE background
        StackPane splashOverlay = new StackPane();
        splashOverlay.setPrefSize(1280, 720);
        
        // Try to load DECODE background image
        try {
            java.net.URL resource = getClass().getResource("/images/decode_bg.svg");
            if (resource != null) {
                String backgroundPath = resource.toString();
                ImageView backgroundImage = new ImageView(new Image(backgroundPath));
                backgroundImage.setPreserveRatio(false);
                backgroundImage.setFitWidth(1280);
                backgroundImage.setFitHeight(720);
                splashOverlay.getChildren().add(backgroundImage);
            } else {
                // Fallback to solid color if image not found
                splashOverlay.setStyle("-fx-background-color: #1A237E;");
            }
        } catch (Exception e) {
            // Fallback to solid color if image loading fails
            splashOverlay.setStyle("-fx-background-color: #1A237E;");
        }
        
        // Dark overlay for text readability
        Region darkOverlay = new Region();
        darkOverlay.setPrefSize(1280, 720);
        darkOverlay.setStyle("-fx-background-color: rgba(0, 0, 0, 0.5);");
        splashOverlay.getChildren().add(darkOverlay);
        
        // Content on top - simplified
        VBox content = new VBox(40);
        content.setAlignment(Pos.CENTER);
        content.setPadding(new Insets(40));
        
        // "Stream starts in:" header
        Label headerLabel = new Label("Stream starts in:");
        headerLabel.setFont(Font.font("Arial", FontWeight.BOLD, 48));
        headerLabel.setTextFill(Color.WHITE);
        headerLabel.setStyle("-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.8), 10, 0, 0, 3);");
        
        // Countdown
        Label countdownLabel = new Label(countdown);
        countdownLabel.setFont(Font.font("Arial", FontWeight.BOLD, 240));
        countdownLabel.setTextFill(Color.rgb(255, 235, 59)); // Bright yellow
        countdownLabel.setStyle("-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.9), 15, 0, 0, 5);");
        
        content.getChildren().addAll(headerLabel, countdownLabel);
        
        splashOverlay.getChildren().add(content);
        
        // Add splash to root (on top of webcam)
        root.getChildren().add(splashOverlay);
    }
    
    /**
     * Hide splash screen and show normal scoring
     */
    public void hideSplashScreen() {
        // Remove splash overlay
        if (root.getChildren().size() > 1) {
            root.getChildren().remove(root.getChildren().size() - 1);
        }
        
        // Show normal elements
        topBar.setVisible(true);
        scoreBar.setVisible(true);
    }
    
    /**
     * Show detailed breakdown overlay for final results
     */
    public void showBreakdownOverlay() {
        if (showingBreakdown) {
            return; // Already showing
        }
        
        showingBreakdown = true;
        
        // Create breakdown overlay
        VBox overlay = new VBox(30);
        overlay.setAlignment(Pos.CENTER);
        overlay.setStyle("-fx-background-color: rgba(0, 0, 0, 0.95);");
        overlay.setPadding(new Insets(40));
        
        // Title
        Label titleLabel = new Label("FINAL SCORE BREAKDOWN");
        titleLabel.setFont(Font.font("Arial", FontWeight.BOLD, 48));
        titleLabel.setTextFill(Color.WHITE);
        
        // Match info
        String motif = match.getRedScore().getMotif().getDisplayName();
        Label motifLabel = new Label("MOTIF: " + motif);
        motifLabel.setFont(Font.font("Arial", FontWeight.BOLD, 24));
        motifLabel.setTextFill(Color.YELLOW);
        
        // Scores side by side
        HBox scoresBox = new HBox(60);
        scoresBox.setAlignment(Pos.CENTER);
        
        VBox redBreakdown = createFullBreakdownBox("RED ALLIANCE", match.getRedScore(), 
                                                     match.getBlueScore(), match.getRedTeamNumber(),
                                                     match.getRedTotalScore(), Color.rgb(211, 47, 47));
        VBox blueBreakdown = createFullBreakdownBox("BLUE ALLIANCE", match.getBlueScore(),
                                                      match.getRedScore(), match.getBlueTeamNumber(),
                                                      match.getBlueTotalScore(), Color.rgb(25, 118, 210));
        
        scoresBox.getChildren().addAll(redBreakdown, blueBreakdown);
        
        // Winner
        Label winnerLabel = new Label();
        winnerLabel.setFont(Font.font("Arial", FontWeight.BOLD, 36));
        int redTotal = match.getRedTotalScore();
        int blueTotal = match.getBlueTotalScore();
        if (redTotal > blueTotal) {
            winnerLabel.setText("🏆 RED ALLIANCE WINS! 🏆");
            winnerLabel.setTextFill(Color.rgb(255, 100, 100));
        } else if (blueTotal > redTotal) {
            winnerLabel.setText("🏆 BLUE ALLIANCE WINS! 🏆");
            winnerLabel.setTextFill(Color.rgb(100, 150, 255));
        } else {
            winnerLabel.setText("🤝 TIE MATCH! 🤝");
            winnerLabel.setTextFill(Color.WHITE);
        }
        
        overlay.getChildren().addAll(titleLabel, motifLabel, scoresBox, winnerLabel);
        
        breakdownOverlay = overlay;
        root.getChildren().add(overlay);
    }
    
    /**
     * Hide the breakdown overlay
     */
    public void hideBreakdownOverlay() {
        if (showingBreakdown && breakdownOverlay != null) {
            root.getChildren().remove(breakdownOverlay);
            breakdownOverlay = null;
            showingBreakdown = false;
        }
    }
    
    private VBox createFullBreakdownBox(String title, org.ftc.scorer.model.DecodeScore score,
                                         org.ftc.scorer.model.DecodeScore opponentScore,
                                         String teamNumber, int totalScore, Color color) {
        VBox box = new VBox(10);
        box.setAlignment(Pos.CENTER_LEFT);
        box.setPadding(new Insets(20));
        box.setStyle("-fx-background-color: rgba(0, 0, 0, 0.5); -fx-border-color: " + 
                     toRgbString(color) + "; -fx-border-width: 3; -fx-border-radius: 10; -fx-background-radius: 10;");
        box.setMinWidth(400);
        
        Label titleLabel = new Label(title);
        titleLabel.setFont(Font.font("Arial", FontWeight.BOLD, 28));
        titleLabel.setTextFill(color);
        
        String team = teamNumber.isEmpty() ? "----" : teamNumber;
        Label teamLabel = new Label("Team: " + team);
        teamLabel.setFont(Font.font("Arial", FontWeight.BOLD, 20));
        teamLabel.setTextFill(Color.WHITE);
        
        // Autonomous
        Label autoHeader = new Label("AUTONOMOUS:");
        autoHeader.setFont(Font.font("Arial", FontWeight.BOLD, 18));
        autoHeader.setTextFill(Color.LIGHTBLUE);
        
        String leaveText = "";
        if (score.isRobot1Leave()) leaveText += "Robot 1 ";
        if (score.isRobot2Leave()) leaveText += "Robot 2 ";
        if (leaveText.isEmpty()) leaveText = "None";
        
        VBox autoBox = new VBox(3);
        autoBox.getChildren().addAll(
            createBreakdownLine("Leave: " + leaveText, 
                               (score.isRobot1Leave() ? 3 : 0) + (score.isRobot2Leave() ? 3 : 0)),
            createBreakdownLine("Classified: " + score.getAutoClassified(), score.getAutoClassified() * 3),
            createBreakdownLine("Overflow: " + score.getAutoOverflow(), score.getAutoOverflow()),
            createBreakdownLine("Pattern: " + score.getAutoPatternMatches(), score.getAutoPatternMatches() * 2)
        );
        
        // TeleOp
        Label teleopHeader = new Label("TELEOP:");
        teleopHeader.setFont(Font.font("Arial", FontWeight.BOLD, 18));
        teleopHeader.setTextFill(Color.LIGHTGREEN);
        
        VBox teleopBox = new VBox(3);
        teleopBox.getChildren().addAll(
            createBreakdownLine("Classified: " + score.getTeleopClassified(), score.getTeleopClassified() * 3),
            createBreakdownLine("Overflow: " + score.getTeleopOverflow(), score.getTeleopOverflow()),
            createBreakdownLine("Depot: " + score.getTeleopDepot(), score.getTeleopDepot()),
            createBreakdownLine("Pattern: " + score.getTeleopPatternMatches(), score.getTeleopPatternMatches() * 2)
        );
        
        // Base Return
        Label baseHeader = new Label("BASE RETURN:");
        baseHeader.setFont(Font.font("Arial", FontWeight.BOLD, 18));
        baseHeader.setTextFill(Color.ORANGE);
        
        VBox baseBox = new VBox(3);
        baseBox.getChildren().addAll(
            createBreakdownLine("Robot 1: " + score.getRobot1Base().getDisplayName(), 0),
            createBreakdownLine("Robot 2: " + score.getRobot2Base().getDisplayName(), 0),
            createBreakdownLine("Movement Points", score.getMovementPoints())
        );
        
        // Penalties
        int foulPoints = opponentScore.getMajorFouls() * 15 + opponentScore.getMinorFouls() * 5;
        Label penaltyHeader = new Label("PENALTIES (from opponent):");
        penaltyHeader.setFont(Font.font("Arial", FontWeight.BOLD, 18));
        penaltyHeader.setTextFill(Color.YELLOW);
        
        VBox penaltyBox = new VBox(3);
        penaltyBox.getChildren().addAll(
            createBreakdownLine("Major Fouls: " + opponentScore.getMajorFouls(), opponentScore.getMajorFouls() * 15),
            createBreakdownLine("Minor Fouls: " + opponentScore.getMinorFouls(), opponentScore.getMinorFouls() * 5)
        );
        
        // Total
        Label totalLabel = new Label("TOTAL: " + totalScore + " points");
        totalLabel.setFont(Font.font("Arial", FontWeight.BOLD, 32));
        totalLabel.setTextFill(Color.WHITE);
        
        box.getChildren().addAll(titleLabel, teamLabel, new Separator(),
                                  autoHeader, autoBox, new Separator(),
                                  teleopHeader, teleopBox, new Separator(),
                                  baseHeader, baseBox, new Separator(),
                                  penaltyHeader, penaltyBox, new Separator(),
                                  totalLabel);
        
        return box;
    }
    
    private HBox createBreakdownLine(String label, int points) {
        HBox line = new HBox(10);
        line.setAlignment(Pos.CENTER_LEFT);
        
        Label labelText = new Label(label);
        labelText.setFont(Font.font("Arial", FontWeight.NORMAL, 14));
        labelText.setTextFill(Color.WHITE);
        
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        
        Label pointsText = new Label(points + " pts");
        pointsText.setFont(Font.font("Arial", FontWeight.BOLD, 14));
        pointsText.setTextFill(Color.LIGHTGRAY);
        
        line.getChildren().addAll(labelText, spacer, pointsText);
        return line;
    }
    
    private String toRgbString(Color color) {
        return String.format("rgb(%d, %d, %d)",
            (int)(color.getRed() * 255),
            (int)(color.getGreen() * 255),
            (int)(color.getBlue() * 255));
    }
    
    public void show() {
        stage.show();
    }
    
    public void hide() {
        stage.hide();
    }
    
    public Stage getStage() {
        return stage;
    }
}
