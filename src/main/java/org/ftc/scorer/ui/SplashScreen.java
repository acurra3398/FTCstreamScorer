package org.ftc.scorer.ui;

import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;
import javafx.util.Duration;
import org.ftc.scorer.model.Match;

/**
 * Pre-match splash screen for displaying countdown and match info
 * Shown before match starts - teams can display team numbers, match type, and countdown
 */
public class SplashScreen {
    private final Stage stage;
    private final Match match;
    private final StreamOutputWindow streamWindow;
    
    private Label countdownLabel;
    private Label teamInfoLabel;
    private Label matchTypeLabel;
    private Label motifLabel;
    
    private TextField countdownSecondsField;
    private TextArea customMessageArea;
    private CheckBox showMotifCheck;
    
    private Timeline countdownTimer;
    private int remainingSeconds = 0;
    
    public SplashScreen(Match match, StreamOutputWindow streamWindow) {
        this.match = match;
        this.streamWindow = streamWindow;
        this.stage = new Stage();
        
        initializeUI();
    }
    
    private void initializeUI() {
        VBox root = new VBox(15);
        root.setPadding(new Insets(20));
        root.setAlignment(Pos.CENTER);
        root.setStyle("-fx-background-color: #1a1a1a;");
        
        Label title = new Label("Pre-Match Splash Screen");
        title.setFont(Font.font("Arial", FontWeight.BOLD, 24));
        title.setTextFill(Color.WHITE);
        
        // Control Panel
        VBox controlPanel = createControlPanel();
        
        // Preview Panel
        VBox previewPanel = createPreviewPanel();
        
        // Action Buttons
        HBox actionButtons = new HBox(10);
        actionButtons.setAlignment(Pos.CENTER);
        
        Button showSplashButton = new Button("Show Splash on Stream");
        showSplashButton.setStyle("-fx-font-size: 14; -fx-font-weight: bold; -fx-background-color: #4CAF50; -fx-text-fill: white;");
        showSplashButton.setOnAction(e -> showSplashOnStream());
        
        Button startCountdownButton = new Button("Start Countdown");
        startCountdownButton.setStyle("-fx-font-size: 14; -fx-background-color: #FF9800; -fx-text-fill: white;");
        startCountdownButton.setOnAction(e -> startCountdown());
        
        Button stopCountdownButton = new Button("Stop Countdown");
        stopCountdownButton.setOnAction(e -> stopCountdown());
        
        Button hideSplashButton = new Button("Hide Splash");
        hideSplashButton.setStyle("-fx-background-color: #f44336; -fx-text-fill: white;");
        hideSplashButton.setOnAction(e -> hideSplash());
        
        actionButtons.getChildren().addAll(showSplashButton, startCountdownButton, stopCountdownButton, hideSplashButton);
        
        root.getChildren().addAll(title, controlPanel, new Separator(), previewPanel, actionButtons);
        
        Scene scene = new Scene(root, 800, 700);
        stage.setScene(scene);
        stage.setTitle("FTC DECODE - Splash Screen Control");
    }
    
    private VBox createControlPanel() {
        VBox panel = new VBox(10);
        panel.setPadding(new Insets(15));
        panel.setStyle("-fx-background-color: #2a2a2a; -fx-background-radius: 5;");
        
        Label controlTitle = new Label("Splash Screen Configuration");
        controlTitle.setFont(Font.font("Arial", FontWeight.BOLD, 16));
        controlTitle.setTextFill(Color.WHITE);
        
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        
        int row = 0;
        
        // Countdown seconds
        Label countdownLabel = new Label("Countdown (seconds):");
        countdownLabel.setTextFill(Color.WHITE);
        countdownSecondsField = new TextField("10");
        countdownSecondsField.setPrefWidth(100);
        grid.add(countdownLabel, 0, row);
        grid.add(countdownSecondsField, 1, row++);
        
        // Show MOTIF
        showMotifCheck = new CheckBox("Show MOTIF on splash");
        showMotifCheck.setTextFill(Color.WHITE);
        showMotifCheck.setSelected(true);
        grid.add(showMotifCheck, 0, row++, 2, 1);
        
        // Custom message
        Label messageLabel = new Label("Custom Message:");
        messageLabel.setTextFill(Color.WHITE);
        customMessageArea = new TextArea();
        customMessageArea.setPrefRowCount(3);
        customMessageArea.setPromptText("Enter custom message (e.g., 'Next up: Semifinals', 'Solo demonstration', etc.)");
        grid.add(messageLabel, 0, row);
        grid.add(customMessageArea, 1, row++);
        
        panel.getChildren().addAll(controlTitle, grid);
        return panel;
    }
    
    private VBox createPreviewPanel() {
        VBox panel = new VBox(20);
        panel.setPadding(new Insets(30));
        panel.setAlignment(Pos.CENTER);
        panel.setStyle("-fx-background-color: linear-gradient(to bottom, #0d47a1, #1565c0); -fx-background-radius: 10;");
        panel.setPrefHeight(300);
        
        Label previewTitle = new Label("PREVIEW");
        previewTitle.setFont(Font.font("Arial", FontWeight.BOLD, 14));
        previewTitle.setTextFill(Color.LIGHTGRAY);
        
        // Countdown
        countdownLabel = new Label("");
        countdownLabel.setFont(Font.font("Arial", FontWeight.BOLD, 120));
        countdownLabel.setTextFill(Color.WHITE);
        
        // Team info
        teamInfoLabel = new Label("");
        teamInfoLabel.setFont(Font.font("Arial", FontWeight.BOLD, 32));
        teamInfoLabel.setTextFill(Color.WHITE);
        
        // Match type
        matchTypeLabel = new Label("");
        matchTypeLabel.setFont(Font.font("Arial", FontWeight.NORMAL, 24));
        matchTypeLabel.setTextFill(Color.LIGHTBLUE);
        
        // MOTIF
        motifLabel = new Label("");
        motifLabel.setFont(Font.font("Arial", FontWeight.BOLD, 20));
        motifLabel.setTextFill(Color.YELLOW);
        
        updatePreview();
        
        panel.getChildren().addAll(previewTitle, countdownLabel, teamInfoLabel, matchTypeLabel, motifLabel);
        return panel;
    }
    
    private void updatePreview() {
        // Team info
        String redTeam = match.getRedTeamNumber().isEmpty() ? "----" : match.getRedTeamNumber();
        String blueTeam = match.getBlueTeamNumber().isEmpty() ? "----" : match.getBlueTeamNumber();
        
        if (match.isSingleTeamMode()) {
            teamInfoLabel.setText("Team " + (redTeam.isEmpty() ? "----" : redTeam));
            matchTypeLabel.setText("Solo Demonstration");
        } else {
            teamInfoLabel.setText("Red " + redTeam + " vs Blue " + blueTeam);
            matchTypeLabel.setText("Match Competition");
        }
        
        // Custom message
        String customMessage = customMessageArea.getText().trim();
        if (!customMessage.isEmpty()) {
            matchTypeLabel.setText(customMessage);
        }
        
        // MOTIF
        if (showMotifCheck.isSelected()) {
            motifLabel.setText("MOTIF: " + match.getRedScore().getMotif().getDisplayName());
        } else {
            motifLabel.setText("");
        }
        
        // Countdown (if running)
        if (remainingSeconds > 0) {
            countdownLabel.setText(String.valueOf(remainingSeconds));
        } else {
            countdownLabel.setText("");
        }
    }
    
    private void startCountdown() {
        try {
            remainingSeconds = Integer.parseInt(countdownSecondsField.getText());
            
            if (countdownTimer != null) {
                countdownTimer.stop();
            }
            
            countdownTimer = new Timeline(new KeyFrame(Duration.seconds(1), e -> {
                remainingSeconds--;
                updatePreview();
                
                if (remainingSeconds <= 0) {
                    countdownTimer.stop();
                    countdownLabel.setText("START!");
                    
                    // Auto-hide splash after 2 seconds when countdown finishes
                    Timeline hideDelay = new Timeline(new KeyFrame(Duration.seconds(2), event -> {
                        hideSplash();
                    }));
                    hideDelay.play();
                }
            }));
            
            countdownTimer.setCycleCount(Timeline.INDEFINITE);
            updatePreview();
            countdownTimer.play();
            
        } catch (NumberFormatException e) {
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Invalid Input");
            alert.setHeaderText("Invalid countdown value");
            alert.setContentText("Please enter a valid number of seconds.");
            alert.showAndWait();
        }
    }
    
    private void stopCountdown() {
        if (countdownTimer != null) {
            countdownTimer.stop();
        }
        remainingSeconds = 0;
        updatePreview();
    }
    
    private void showSplashOnStream() {
        updatePreview();
        streamWindow.showSplashScreen(
            countdownLabel.getText(),
            teamInfoLabel.getText(),
            matchTypeLabel.getText(),
            motifLabel.getText()
        );
    }
    
    private void hideSplash() {
        if (countdownTimer != null) {
            countdownTimer.stop();
        }
        remainingSeconds = 0;
        streamWindow.hideSplashScreen();
    }
    
    public void show() {
        updatePreview();
        stage.show();
    }
    
    public void hide() {
        if (countdownTimer != null) {
            countdownTimer.stop();
        }
        stage.hide();
    }
}
