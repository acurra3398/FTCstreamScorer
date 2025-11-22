package org.ftc.scorer.ui;

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
import org.ftc.scorer.model.Match;
import org.ftc.scorer.service.MatchTimer;

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
    private Label teamNumbersLabel;
    
    // Breakdown labels for detailed scoring
    private Label redClassifiedLabel, redOverflowLabel, redMotifLabel, redLeaveLabel, redFoulLabel, redMotifDisplayLabel;
    private Label blueClassifiedLabel, blueOverflowLabel, blueMotifLabel, blueLeaveLabel, blueFoulLabel, blueMotifDisplayLabel;
    private Label redTeamLabel, blueTeamLabel;
    
    private StackPane root;
    private HBox topBar;
    private HBox scoreBar;
    private VBox breakdownOverlay;
    private boolean showingBreakdown = false;
    
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
        VBox overlay = new VBox(10);
        overlay.setAlignment(Pos.TOP_CENTER);
        overlay.setPadding(new Insets(20));
        
        // Top bar with match info and timer
        topBar = createTopBar();
        
        // Bottom bar with scores
        scoreBar = createScoreBar();
        
        // Position elements
        VBox.setVgrow(topBar, Priority.NEVER);
        Region spacer = new Region();
        VBox.setVgrow(spacer, Priority.ALWAYS);
        
        overlay.getChildren().addAll(topBar, spacer, scoreBar);
        
        return overlay;
    }
    
    private HBox createTopBar() {
        HBox bar = new HBox(20);
        bar.setAlignment(Pos.CENTER);
        bar.setPadding(new Insets(10, 20, 10, 20));
        bar.setStyle("-fx-background-color: rgba(0, 0, 0, 0.7); -fx-background-radius: 10;");
        
        // Team numbers
        String redTeam = match.getRedTeamNumber().isEmpty() ? "----" : match.getRedTeamNumber();
        String blueTeam = match.getBlueTeamNumber().isEmpty() ? "----" : match.getBlueTeamNumber();
        teamNumbersLabel = new Label("Red: " + redTeam + " vs Blue: " + blueTeam);
        teamNumbersLabel.setFont(Font.font("Arial", FontWeight.BOLD, 20));
        teamNumbersLabel.setTextFill(Color.WHITE);
        
        // Timer
        timerLabel = new Label("2:30");
        timerLabel.setFont(Font.font("Arial", FontWeight.BOLD, 48));
        timerLabel.setTextFill(Color.WHITE);
        
        // Phase
        phaseLabel = new Label("AUTO");
        phaseLabel.setFont(Font.font("Arial", FontWeight.BOLD, 24));
        phaseLabel.setTextFill(Color.YELLOW);
        
        bar.getChildren().addAll(teamNumbersLabel, timerLabel, phaseLabel);
        
        return bar;
    }
    
    private HBox createScoreBar() {
        HBox bar = new HBox(0); // No gap - split exactly in half
        bar.setAlignment(Pos.CENTER);
        bar.setPadding(new Insets(0));
        bar.setPrefHeight(150);
        
        // Red Alliance Section (left half)
        VBox redBox = createDetailedScoreBox("RED", Color.rgb(211, 47, 47), true);
        HBox.setHgrow(redBox, Priority.ALWAYS);
        
        // Blue Alliance Section (right half)
        VBox blueBox = createDetailedScoreBox("BLUE", Color.rgb(25, 118, 210), false);
        HBox.setHgrow(blueBox, Priority.ALWAYS);
        
        bar.getChildren().addAll(redBox, blueBox);
        
        return bar;
    }
    
    /**
     * Update the score bar layout based on match mode
     */
    public void updateScoreBarForMode() {
        // Rebuild score bar based on solo mode
        scoreBar.getChildren().clear();
        
        if (match.isSingleTeamMode()) {
            // Solo mode: grey bar spanning full width with only red team
            VBox soloBox = createDetailedScoreBox("SOLO MODE", Color.rgb(120, 120, 120), true);
            HBox.setHgrow(soloBox, Priority.ALWAYS);
            scoreBar.getChildren().add(soloBox);
        } else {
            // Traditional mode: split red/blue
            VBox redBox = createDetailedScoreBox("RED", Color.rgb(211, 47, 47), true);
            HBox.setHgrow(redBox, Priority.ALWAYS);
            
            VBox blueBox = createDetailedScoreBox("BLUE", Color.rgb(25, 118, 210), false);
            HBox.setHgrow(blueBox, Priority.ALWAYS);
            
            scoreBar.getChildren().addAll(redBox, blueBox);
        }
    }
    
    private VBox createDetailedScoreBox(String allianceName, Color bgColor, boolean isRed) {
        VBox box = new VBox(8);
        box.setAlignment(Pos.CENTER);
        box.setPadding(new Insets(12, 20, 12, 20));
        
        // Semi-transparent background
        String bgColorString = String.format("rgba(%d, %d, %d, 0.9)",
            (int)(bgColor.getRed() * 255),
            (int)(bgColor.getGreen() * 255),
            (int)(bgColor.getBlue() * 255));
        box.setStyle("-fx-background-color: " + bgColorString + ";");
        
        // Team number
        Label teamLabel = new Label("Team: ----");
        teamLabel.setFont(Font.font("Arial", FontWeight.BOLD, 16));
        teamLabel.setTextFill(Color.WHITE);
        
        // Alliance name and main score
        HBox headerBox = new HBox(10);
        headerBox.setAlignment(Pos.CENTER);
        
        Label nameLabel = new Label(allianceName);
        nameLabel.setFont(Font.font("Arial", FontWeight.BOLD, 24));
        nameLabel.setTextFill(Color.WHITE);
        
        Label scoreLabel = new Label("0");
        scoreLabel.setFont(Font.font("Arial", FontWeight.BOLD, 56));
        scoreLabel.setTextFill(Color.WHITE);
        
        if (isRed) {
            redScoreLabel = scoreLabel;
            redTeamLabel = teamLabel;
        } else {
            blueScoreLabel = scoreLabel;
            blueTeamLabel = teamLabel;
        }
        
        headerBox.getChildren().addAll(nameLabel, scoreLabel);
        
        // Detailed breakdown in 2 columns
        GridPane breakdownGrid = new GridPane();
        breakdownGrid.setHgap(20);
        breakdownGrid.setVgap(2);
        breakdownGrid.setAlignment(Pos.CENTER);
        
        int row = 0;
        
        // Left column
        // Classified
        Label classifiedIcon = new Label("🎯");
        classifiedIcon.setFont(Font.font(18));
        Label classifiedLabel = new Label("Classified: 0");
        classifiedLabel.setFont(Font.font("Arial", FontWeight.NORMAL, 13));
        classifiedLabel.setTextFill(Color.WHITE);
        breakdownGrid.add(classifiedIcon, 0, row);
        breakdownGrid.add(classifiedLabel, 1, row);
        
        // Overflow
        Label overflowIcon = new Label("📦");
        overflowIcon.setFont(Font.font(18));
        Label overflowLabel = new Label("Overflow: 0");
        overflowLabel.setFont(Font.font("Arial", FontWeight.NORMAL, 13));
        overflowLabel.setTextFill(Color.WHITE);
        breakdownGrid.add(overflowIcon, 2, row);
        breakdownGrid.add(overflowLabel, 3, row++);
        
        // Pattern/Motif
        Label motifIcon = new Label("🔷");
        motifIcon.setFont(Font.font(18));
        Label motifLabel = new Label("Pattern: 0");
        motifLabel.setFont(Font.font("Arial", FontWeight.NORMAL, 13));
        motifLabel.setTextFill(Color.WHITE);
        breakdownGrid.add(motifIcon, 0, row);
        breakdownGrid.add(motifLabel, 1, row);
        
        // Leave/Park
        Label leaveIcon = new Label("🚀");
        leaveIcon.setFont(Font.font(18));
        Label leaveLabel = new Label("Leave: 0");
        leaveLabel.setFont(Font.font("Arial", FontWeight.NORMAL, 13));
        leaveLabel.setTextFill(Color.WHITE);
        breakdownGrid.add(leaveIcon, 2, row);
        breakdownGrid.add(leaveLabel, 3, row++);
        
        // Current Motif
        Label motifDisplayIcon = new Label("🎨");
        motifDisplayIcon.setFont(Font.font(18));
        Label motifDisplayLabel = new Label("Motif: PPG");
        motifDisplayLabel.setFont(Font.font("Arial", FontWeight.NORMAL, 13));
        motifDisplayLabel.setTextFill(Color.YELLOW);
        breakdownGrid.add(motifDisplayIcon, 0, row);
        breakdownGrid.add(motifDisplayLabel, 1, row);
        
        // Fouls (opponent's fouls give points)
        Label foulIcon = new Label("⚠️");
        foulIcon.setFont(Font.font(18));
        Label foulLabel = new Label("Opp. Fouls: 0");
        foulLabel.setFont(Font.font("Arial", FontWeight.NORMAL, 13));
        foulLabel.setTextFill(Color.WHITE);
        breakdownGrid.add(foulIcon, 2, row);
        breakdownGrid.add(foulLabel, 3, row++);
        
        // Store labels for updates
        if (isRed) {
            redClassifiedLabel = classifiedLabel;
            redOverflowLabel = overflowLabel;
            redMotifLabel = motifLabel;
            redLeaveLabel = leaveLabel;
            redFoulLabel = foulLabel;
            redMotifDisplayLabel = motifDisplayLabel;
        } else {
            blueClassifiedLabel = classifiedLabel;
            blueOverflowLabel = overflowLabel;
            blueMotifLabel = motifLabel;
            blueLeaveLabel = leaveLabel;
            blueFoulLabel = foulLabel;
            blueMotifDisplayLabel = motifDisplayLabel;
        }
        
        box.getChildren().addAll(teamLabel, headerBox, breakdownGrid);
        
        return box;
    }
    
    private VBox createScoreBox(String allianceName, Color color) {
        VBox box = new VBox(5);
        box.setAlignment(Pos.CENTER);
        box.setMinWidth(200);
        box.setStyle("-fx-background-color: rgba(0, 0, 0, 0.8); " +
                     "-fx-background-radius: 10; " +
                     "-fx-padding: 15;");
        
        Label nameLabel = new Label(allianceName);
        nameLabel.setFont(Font.font("Arial", FontWeight.BOLD, 24));
        nameLabel.setTextFill(color);
        
        Label scoreLabel = new Label("0");
        scoreLabel.setFont(Font.font("Arial", FontWeight.BOLD, 72));
        scoreLabel.setTextFill(Color.WHITE);
        
        VBox content = new VBox(5);
        content.setAlignment(Pos.CENTER);
        content.getChildren().addAll(nameLabel, scoreLabel);
        
        box.getChildren().add(content);
        
        return box;
    }
    
    private void startScoreUpdater() {
        // Update UI every 100ms
        javafx.animation.Timeline timeline = new javafx.animation.Timeline(
            new javafx.animation.KeyFrame(javafx.util.Duration.millis(100), e -> updateScores())
        );
        timeline.setCycleCount(javafx.animation.Timeline.INDEFINITE);
        timeline.play();
    }
    
    private void updateScores() {
        // Use match methods which include opponent penalties
        redScoreLabel.setText(String.valueOf(match.getRedTotalScore()));
        blueScoreLabel.setText(String.valueOf(match.getBlueTotalScore()));
        timerLabel.setText(matchTimer.getTimeString());
        
        String phase = matchTimer.currentPhaseProperty().get();
        phaseLabel.setText(phase);
        
        // Change phase color based on state
        if (phase.equals("ENDGAME")) {
            phaseLabel.setTextFill(Color.ORANGE);
        } else if (phase.equals("FINISHED")) {
            phaseLabel.setTextFill(Color.RED);
        } else if (phase.equals("UNDER REVIEW")) {
            phaseLabel.setTextFill(Color.YELLOW);
        } else {
            phaseLabel.setTextFill(Color.LIGHTGREEN);
        }
        
        String redTeam = match.getRedTeamsDisplay();
        String blueTeam = match.getBlueTeamsDisplay();
        if (match.isSingleTeamMode()) {
            teamNumbersLabel.setText("Red Alliance: " + redTeam + " (Solo Mode)");
        } else {
            teamNumbersLabel.setText("Red: " + redTeam + " vs Blue: " + blueTeam);
        }
        
        // Update detailed breakdown
        updateDetailedBreakdown();
    }
    
    private void updateDetailedBreakdown() {
        // Current Motif
        String motifText = match.getRedScore().getMotif().name();
        
        // Red Alliance breakdown
        int redClassified = match.getRedScore().getAutoClassified() + match.getRedScore().getTeleopClassified();
        int redOverflow = match.getRedScore().getAutoOverflow() + match.getRedScore().getTeleopOverflow();
        int redPattern = match.getRedScore().getAutoPatternMatches() + match.getRedScore().getTeleopPatternMatches();
        int redLeave = (match.getRedScore().isRobot1Leave() ? 1 : 0) + (match.getRedScore().isRobot2Leave() ? 1 : 0);
        
        // Opponent fouls give points to this alliance
        int redFoulPoints = match.getBlueScore().getMajorFouls() * 15 + match.getBlueScore().getMinorFouls() * 5;
        
        redClassifiedLabel.setText("Classified: " + redClassified + " (" + (redClassified * 3) + " pts)");
        redOverflowLabel.setText("Overflow: " + redOverflow + " (" + redOverflow + " pts)");
        redMotifLabel.setText("Pattern: " + redPattern + " (" + (redPattern * 2) + " pts)");
        redLeaveLabel.setText("Leave: " + redLeave + " (" + (redLeave * 3) + " pts)");
        redFoulLabel.setText("Opp. Fouls: " + redFoulPoints + " pts");
        redMotifDisplayLabel.setText("Motif: " + motifText);
        
        String redTeam = match.getRedTeamsDisplay();
        redTeamLabel.setText(match.isSingleTeamMode() ? "Team: " + redTeam : "Teams: " + redTeam);
        
        // Blue Alliance breakdown
        int blueClassified = match.getBlueScore().getAutoClassified() + match.getBlueScore().getTeleopClassified();
        int blueOverflow = match.getBlueScore().getAutoOverflow() + match.getBlueScore().getTeleopOverflow();
        int bluePattern = match.getBlueScore().getAutoPatternMatches() + match.getBlueScore().getTeleopPatternMatches();
        int blueLeave = (match.getBlueScore().isRobot1Leave() ? 1 : 0) + (match.getBlueScore().isRobot2Leave() ? 1 : 0);
        
        // Opponent fouls give points to this alliance
        int blueFoulPoints = match.getRedScore().getMajorFouls() * 15 + match.getRedScore().getMinorFouls() * 5;
        
        blueClassifiedLabel.setText("Classified: " + blueClassified + " (" + (blueClassified * 3) + " pts)");
        blueOverflowLabel.setText("Overflow: " + blueOverflow + " (" + blueOverflow + " pts)");
        blueMotifLabel.setText("Pattern: " + bluePattern + " (" + (bluePattern * 2) + " pts)");
        blueLeaveLabel.setText("Leave: " + blueLeave + " (" + (blueLeave * 3) + " pts)");
        blueFoulLabel.setText("Opp. Fouls: " + blueFoulPoints + " pts");
        blueMotifDisplayLabel.setText("Motif: " + motifText);
        
        String blueTeam = match.getBlueTeamsDisplay();
        blueTeamLabel.setText("Teams: " + blueTeam);
    }
    
    public void updateWebcamFrame(Image frame) {
        webcamView.setImage(frame);
    }
    
    /**
     * Show splash screen overlay with countdown and team info
     * Uses DECODE background image
     */
    public void showSplashScreen(String countdown, String teamInfo, String matchType, String motif) {
        // Hide normal scoring elements
        topBar.setVisible(false);
        scoreBar.setVisible(false);
        
        // Create splash overlay with DECODE background
        StackPane splashOverlay = new StackPane();
        splashOverlay.setPrefSize(1280, 720);
        
        // Try to load DECODE background image
        try {
            String backgroundPath = getClass().getResource("/images/decode_bg.svg").toString();
            ImageView backgroundImage = new ImageView(new Image(backgroundPath));
            backgroundImage.setPreserveRatio(false);
            backgroundImage.setFitWidth(1280);
            backgroundImage.setFitHeight(720);
            splashOverlay.getChildren().add(backgroundImage);
        } catch (Exception e) {
            // Fallback to solid color if image not found
            splashOverlay.setStyle("-fx-background-color: #1A237E;");
        }
        
        // Dark overlay for text readability
        Region darkOverlay = new Region();
        darkOverlay.setPrefSize(1280, 720);
        darkOverlay.setStyle("-fx-background-color: rgba(0, 0, 0, 0.6);");
        splashOverlay.getChildren().add(darkOverlay);
        
        // Content on top
        VBox content = new VBox(30);
        content.setAlignment(Pos.CENTER);
        content.setPadding(new Insets(40));
        
        // DECODE logo/title at top
        Label titleLabel = new Label("FTC DECODE 2025-2026");
        titleLabel.setFont(Font.font("Arial", FontWeight.BOLD, 42));
        titleLabel.setTextFill(Color.WHITE);
        titleLabel.setStyle("-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.8), 10, 0, 0, 3);");
        content.getChildren().add(titleLabel);
        
        if (!countdown.isEmpty()) {
            Label countdownLabel = new Label(countdown);
            countdownLabel.setFont(Font.font("Arial", FontWeight.BOLD, 220));
            countdownLabel.setTextFill(Color.rgb(255, 235, 59)); // Bright yellow
            countdownLabel.setStyle("-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.9), 15, 0, 0, 5);");
            content.getChildren().add(countdownLabel);
        }
        
        if (!teamInfo.isEmpty()) {
            Label teamLabel = new Label(teamInfo);
            teamLabel.setFont(Font.font("Arial", FontWeight.BOLD, 52));
            teamLabel.setTextFill(Color.WHITE);
            teamLabel.setStyle("-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.8), 10, 0, 0, 3);");
            content.getChildren().add(teamLabel);
        }
        
        if (!matchType.isEmpty()) {
            Label typeLabel = new Label(matchType);
            typeLabel.setFont(Font.font("Arial", FontWeight.BOLD, 36));
            typeLabel.setTextFill(Color.rgb(100, 181, 246)); // Light blue
            typeLabel.setStyle("-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.8), 8, 0, 0, 2);");
            content.getChildren().add(typeLabel);
        }
        
        if (!motif.isEmpty()) {
            Label motifLabel = new Label(motif);
            motifLabel.setFont(Font.font("Arial", FontWeight.BOLD, 32));
            motifLabel.setTextFill(Color.rgb(255, 235, 59)); // Bright yellow
            motifLabel.setStyle("-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.8), 8, 0, 0, 2);");
            content.getChildren().add(motifLabel);
        }
        
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
