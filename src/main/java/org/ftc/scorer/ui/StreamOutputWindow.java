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
    private Label matchNumberLabel;
    
    private StackPane root;
    
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
        HBox topBar = createTopBar();
        
        // Bottom bar with scores
        HBox scoreBar = createScoreBar();
        
        // Position elements
        VBox.setVgrow(topBar, Priority.NEVER);
        Region spacer = new Region();
        VBox.setVgrow(spacer, Priority.ALWAYS);
        
        overlay.getChildren().addAll(topBar, spacer, scoreBar);
        
        return overlay;
    }
    
    private HBox createTopBar() {
        HBox topBar = new HBox(20);
        topBar.setAlignment(Pos.CENTER);
        topBar.setPadding(new Insets(10, 20, 10, 20));
        topBar.setStyle("-fx-background-color: rgba(0, 0, 0, 0.7); -fx-background-radius: 10;");
        
        // Match number
        matchNumberLabel = new Label("Match: " + match.getMatchNumber());
        matchNumberLabel.setFont(Font.font("Arial", FontWeight.BOLD, 24));
        matchNumberLabel.setTextFill(Color.WHITE);
        
        // Timer
        timerLabel = new Label("2:30");
        timerLabel.setFont(Font.font("Arial", FontWeight.BOLD, 48));
        timerLabel.setTextFill(Color.WHITE);
        
        // Phase
        phaseLabel = new Label("AUTO");
        phaseLabel.setFont(Font.font("Arial", FontWeight.BOLD, 24));
        phaseLabel.setTextFill(Color.YELLOW);
        
        topBar.getChildren().addAll(matchNumberLabel, timerLabel, phaseLabel);
        
        return topBar;
    }
    
    private HBox createScoreBar() {
        HBox scoreBar = new HBox(40);
        scoreBar.setAlignment(Pos.CENTER);
        scoreBar.setPadding(new Insets(20));
        
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
        
        scoreBar.getChildren().addAll(redBox, vsLabel, blueBox);
        
        return scoreBar;
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
        redScoreLabel.setText(String.valueOf(match.getRedScore().calculateTotalScore()));
        blueScoreLabel.setText(String.valueOf(match.getBlueScore().calculateTotalScore()));
        timerLabel.setText(matchTimer.getTimeString());
        phaseLabel.setText(matchTimer.currentPhaseProperty().get());
        matchNumberLabel.setText("Match: " + match.getMatchNumber());
    }
    
    public void updateWebcamFrame(Image frame) {
        webcamView.setImage(frame);
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
