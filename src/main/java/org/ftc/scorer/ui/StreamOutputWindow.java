package org.ftc.scorer.ui;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Label;
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
    
    private StackPane root;
    private HBox topBar;
    private HBox scoreBar;
    
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
        HBox bar = new HBox(40);
        bar.setAlignment(Pos.CENTER);
        bar.setPadding(new Insets(20));
        
        // Red Alliance Score
        VBox redBox = createScoreBox("RED", Color.RED);
        redScoreLabel = (Label) ((VBox) redBox.getChildren().get(0)).getChildren().get(1);
        
        // VS
        Label vsLabel = new Label("VS");
        vsLabel.setFont(Font.font("Arial", FontWeight.BOLD, 36));
        vsLabel.setTextFill(Color.WHITE);
        vsLabel.setStyle("-fx-background-color: rgba(0, 0, 0, 0.7); -fx-padding: 10;");
        
        // Blue Alliance Score
        VBox blueBox = createScoreBox("BLUE", Color.BLUE);
        blueScoreLabel = (Label) ((VBox) blueBox.getChildren().get(0)).getChildren().get(1);
        
        bar.getChildren().addAll(redBox, vsLabel, blueBox);
        
        return bar;
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
        phaseLabel.setText(matchTimer.currentPhaseProperty().get());
        
        String redTeam = match.getRedTeamNumber().isEmpty() ? "----" : match.getRedTeamNumber();
        String blueTeam = match.getBlueTeamNumber().isEmpty() ? "----" : match.getBlueTeamNumber();
        teamNumbersLabel.setText("Red: " + redTeam + " vs Blue: " + blueTeam);
    }
    
    public void updateWebcamFrame(Image frame) {
        webcamView.setImage(frame);
    }
    
    /**
     * Show splash screen overlay with countdown and team info
     */
    public void showSplashScreen(String countdown, String teamInfo, String matchType, String motif) {
        // Hide normal scoring elements
        topBar.setVisible(false);
        scoreBar.setVisible(false);
        
        // Create splash overlay
        VBox splashOverlay = new VBox(30);
        splashOverlay.setAlignment(Pos.CENTER);
        splashOverlay.setStyle("-fx-background-color: rgba(0, 0, 0, 0.85);");
        splashOverlay.setPrefSize(1280, 720);
        
        if (!countdown.isEmpty()) {
            Label countdownLabel = new Label(countdown);
            countdownLabel.setFont(Font.font("Arial", FontWeight.BOLD, 180));
            countdownLabel.setTextFill(Color.WHITE);
            splashOverlay.getChildren().add(countdownLabel);
        }
        
        if (!teamInfo.isEmpty()) {
            Label teamLabel = new Label(teamInfo);
            teamLabel.setFont(Font.font("Arial", FontWeight.BOLD, 48));
            teamLabel.setTextFill(Color.WHITE);
            splashOverlay.getChildren().add(teamLabel);
        }
        
        if (!matchType.isEmpty()) {
            Label typeLabel = new Label(matchType);
            typeLabel.setFont(Font.font("Arial", FontWeight.NORMAL, 32));
            typeLabel.setTextFill(Color.LIGHTBLUE);
            splashOverlay.getChildren().add(typeLabel);
        }
        
        if (!motif.isEmpty()) {
            Label motifLabel = new Label(motif);
            motifLabel.setFont(Font.font("Arial", FontWeight.BOLD, 28));
            motifLabel.setTextFill(Color.YELLOW);
            splashOverlay.getChildren().add(motifLabel);
        }
        
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
