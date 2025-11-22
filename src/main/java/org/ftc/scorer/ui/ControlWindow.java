package org.ftc.scorer.ui;

import com.github.sarxos.webcam.Webcam;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.stage.Stage;
import org.ftc.scorer.model.DecodeScore;
import org.ftc.scorer.model.Match;
import org.ftc.scorer.service.MatchTimer;
import org.ftc.scorer.webcam.WebcamService;

import java.util.List;

/**
 * Control window for DECODE scoring interface
 * Official 2025-2026 FTC game rules
 */
public class ControlWindow {
    private final Stage stage;
    private final Match match;
    private final MatchTimer matchTimer;
    private final WebcamService webcamService;
    private final StreamOutputWindow streamWindow;
    private final org.ftc.scorer.service.AudioService audioService;
    
    // Team input - alliances have 2 teams each
    private TextField redTeam1Field;
    private TextField redTeam2Field;
    private TextField blueTeam1Field;
    private TextField blueTeam2Field;
    
    // MOTIF selector
    private ComboBox<DecodeScore.MotifType> motifSelector;
    
    // Red Alliance Controls
    private CheckBox redRobot1Leave, redRobot2Leave;
    private Spinner<Integer> redAutoClassified, redAutoOverflow, redAutoPattern;
    private Spinner<Integer> redTeleopClassified, redTeleopOverflow, redTeleopDepot, redTeleopPattern;
    private ComboBox<DecodeScore.BaseStatus> redRobot1Base, redRobot2Base;
    private Spinner<Integer> redMajorFouls, redMinorFouls;
    
    // Blue Alliance Controls (mirrored)
    private CheckBox blueRobot1Leave, blueRobot2Leave;
    private Spinner<Integer> blueAutoClassified, blueAutoOverflow, blueAutoPattern;
    private Spinner<Integer> blueTeleopClassified, blueTeleopOverflow, blueTeleopDepot, blueTeleopPattern;
    private ComboBox<DecodeScore.BaseStatus> blueRobot1Base, blueRobot2Base;
    private Spinner<Integer> blueMajorFouls, blueMinorFouls;
    
    // Match controls
    private Button startButton, pauseButton, resetButton, showBreakdownButton;
    private ComboBox<String> webcamSelector;
    private CheckBox soloModeCheckBox;
    private Button countdownButton;
    
    public ControlWindow(Match match, MatchTimer matchTimer, WebcamService webcamService, StreamOutputWindow streamWindow, org.ftc.scorer.service.AudioService audioService) {
        this.match = match;
        this.matchTimer = matchTimer;
        this.webcamService = webcamService;
        this.streamWindow = streamWindow;
        this.audioService = audioService;
        this.stage = new Stage();
        
        initializeUI();
        bindToModel();
    }
    
    private void initializeUI() {
        BorderPane root = new BorderPane();
        root.setPadding(new Insets(15));
        
        // Top: Match controls and MOTIF
        VBox topSection = createMatchControls();
        root.setTop(topSection);
        
        // Center: Scoring controls (Red and Blue) - wrapped in ScrollPane to ensure fouls are accessible
        HBox centerSection = createScoringControls();
        ScrollPane scrollPane = new ScrollPane(centerSection);
        scrollPane.setFitToWidth(true);
        scrollPane.setFitToHeight(true);
        scrollPane.setHbarPolicy(ScrollPane.ScrollBarPolicy.NEVER);
        scrollPane.setVbarPolicy(ScrollPane.ScrollBarPolicy.AS_NEEDED);
        scrollPane.setStyle("-fx-background: transparent; -fx-background-color: transparent;");
        root.setCenter(scrollPane);
        
        Scene scene = new Scene(root, 1400, 900);
        stage.setScene(scene);
        stage.setTitle("FTC DECODE Scorer - Control Panel");
        
        stage.setOnCloseRequest(e -> {
            webcamService.stop();
            streamWindow.hide();
        });
    }
    
    private VBox createMatchControls() {
        VBox box = new VBox(15);
        box.setPadding(new Insets(15));
        box.setStyle("-fx-background-color: #f5f5f5; -fx-background-radius: 8; -fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.2), 10, 0, 0, 2);");
        
        Label title = new Label("🏆 Match Control - DECODE 2025-2026");
        title.setStyle("-fx-font-size: 20; -fx-font-weight: bold; -fx-text-fill: #1976D2;");
        
        // First row: Team numbers and Solo Mode
        HBox teamRow = new HBox(15);
        teamRow.setAlignment(Pos.CENTER_LEFT);
        
        // RED ALLIANCE (2 teams)
        Label redAllianceLabel = new Label("RED ALLIANCE:");
        redAllianceLabel.setStyle("-fx-font-weight: bold; -fx-font-size: 16; -fx-text-fill: #D32F2F;");
        
        Label redTeam1Label = new Label("Team 1:");
        redTeam1Field = new TextField(match.getRedTeam1Number());
        redTeam1Field.setPrefWidth(100);
        redTeam1Field.setPromptText("0000");
        redTeam1Field.setStyle("-fx-font-size: 14;");
        redTeam1Field.textProperty().addListener((obs, old, newVal) -> match.setRedTeam1Number(newVal));
        
        Label redTeam2Label = new Label("Team 2:");
        redTeam2Field = new TextField(match.getRedTeam2Number());
        redTeam2Field.setPrefWidth(100);
        redTeam2Field.setPromptText("0000");
        redTeam2Field.setStyle("-fx-font-size: 14;");
        redTeam2Field.textProperty().addListener((obs, old, newVal) -> match.setRedTeam2Number(newVal));
        
        // BLUE ALLIANCE (2 teams)
        Label blueAllianceLabel = new Label("BLUE ALLIANCE:");
        blueAllianceLabel.setStyle("-fx-font-weight: bold; -fx-font-size: 16; -fx-text-fill: #1976D2;");
        
        Label blueTeam1Label = new Label("Team 1:");
        blueTeam1Field = new TextField(match.getBlueTeam1Number());
        blueTeam1Field.setPrefWidth(100);
        blueTeam1Field.setPromptText("0000");
        blueTeam1Field.setStyle("-fx-font-size: 14;");
        blueTeam1Field.textProperty().addListener((obs, old, newVal) -> match.setBlueTeam1Number(newVal));
        
        Label blueTeam2Label = new Label("Team 2:");
        blueTeam2Field = new TextField(match.getBlueTeam2Number());
        blueTeam2Field.setPrefWidth(100);
        blueTeam2Field.setPromptText("0000");
        blueTeam2Field.setStyle("-fx-font-size: 14;");
        blueTeam2Field.textProperty().addListener((obs, old, newVal) -> match.setBlueTeam2Number(newVal));
        
        // Solo Mode checkbox - prominent
        soloModeCheckBox = new CheckBox("SOLO MODE");
        soloModeCheckBox.setStyle("-fx-font-weight: bold; -fx-font-size: 16; -fx-text-fill: #FF5722;");
        soloModeCheckBox.setSelected(false);
        soloModeCheckBox.setOnAction(e -> {
            boolean soloMode = soloModeCheckBox.isSelected();
            match.setMatchType(soloMode ? Match.MatchType.SINGLE_TEAM_DEMO : Match.MatchType.TRADITIONAL_MATCH);
            updateSoloModeUI(soloMode);
        });
        
        teamRow.getChildren().addAll(
            redAllianceLabel, redTeam1Label, redTeam1Field, redTeam2Label, redTeam2Field,
            new Label("    "), // Spacer
            blueAllianceLabel, blueTeam1Label, blueTeam1Field, blueTeam2Label, blueTeam2Field,
            new Label("    "), // Spacer
            soloModeCheckBox
        );
        
        // Second row: MOTIF and Webcam
        HBox configRow = new HBox(15);
        configRow.setAlignment(Pos.CENTER_LEFT);
        
        // MOTIF selector and randomizer
        Label motifLabel = new Label("🎨 MOTIF:");
        motifLabel.setStyle("-fx-font-weight: bold;");
        motifSelector = new ComboBox<>();
        motifSelector.getItems().addAll(DecodeScore.MotifType.values());
        motifSelector.setValue(DecodeScore.MotifType.PPG);
        motifSelector.setStyle("-fx-font-size: 13;");
        motifSelector.setOnAction(e -> {
            match.getRedScore().setMotif(motifSelector.getValue());
            match.getBlueScore().setMotif(motifSelector.getValue());
        });
        
        Button randomizeMotifButton = new Button("🎲 Randomize");
        randomizeMotifButton.setStyle("-fx-background-color: #FF9800; -fx-text-fill: white; -fx-font-weight: bold; -fx-padding: 5 15;");
        randomizeMotifButton.setOnAction(e -> {
            DecodeScore.MotifType randomMotif = DecodeScore.MotifType.randomize();
            motifSelector.setValue(randomMotif);
            match.getRedScore().setMotif(randomMotif);
            match.getBlueScore().setMotif(randomMotif);
            // Highlight motif in stream output
            streamWindow.highlightMotif();
        });
        
        // Webcam selector
        Label webcamLabel = new Label("📹 Webcam:");
        webcamLabel.setStyle("-fx-font-weight: bold;");
        webcamSelector = new ComboBox<>();
        webcamSelector.setStyle("-fx-font-size: 13;");
        List<Webcam> webcams = webcamService.getAvailableWebcams();
        for (Webcam webcam : webcams) {
            webcamSelector.getItems().add(webcam.getName());
        }
        if (!webcams.isEmpty()) {
            webcamSelector.getSelectionModel().selectFirst();
        }
        webcamSelector.setOnAction(e -> {
            int index = webcamSelector.getSelectionModel().getSelectedIndex();
            if (index >= 0 && index < webcams.size()) {
                webcamService.start(webcams.get(index));
            }
        });
        
        configRow.getChildren().addAll(motifLabel, motifSelector, randomizeMotifButton, webcamLabel, webcamSelector);
        
        // Match control buttons
        startButton = new Button("Start Match");
        startButton.setStyle("-fx-font-size: 14; -fx-font-weight: bold; -fx-background-color: #4CAF50; -fx-text-fill: white;");
        startButton.setOnAction(e -> matchTimer.startMatch());
        
        pauseButton = new Button("Pause");
        pauseButton.setOnAction(e -> {
            if (pauseButton.getText().equals("Pause")) {
                matchTimer.pauseMatch();
                pauseButton.setText("Resume");
            } else {
                matchTimer.resumeMatch();
                pauseButton.setText("Pause");
            }
        });
        
        resetButton = new Button("Reset");
        resetButton.setStyle("-fx-background-color: #f44336; -fx-text-fill: white;");
        resetButton.setOnAction(e -> {
            matchTimer.resetMatch();
            resetAllControls();
            pauseButton.setText("Pause");
        });
        
        // Big, clear action buttons row
        HBox bigButtonsRow = new HBox(15);
        bigButtonsRow.setAlignment(Pos.CENTER);
        bigButtonsRow.setPadding(new Insets(10, 0, 10, 0));
        
        // Stream Countdown button - MOST PROMINENT for starting
        countdownButton = new Button("SHOW STREAM COUNTDOWN");
        countdownButton.setStyle("-fx-background-color: #FF5722; -fx-text-fill: white; -fx-font-weight: bold; " +
                                 "-fx-font-size: 18; -fx-padding: 15 30; -fx-background-radius: 8; " +
                                 "-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.4), 8, 0, 0, 2);");
        countdownButton.setOnAction(e -> showStreamCountdown());
        
        startButton = new Button("START MATCH");
        startButton.setStyle("-fx-font-size: 18; -fx-font-weight: bold; -fx-background-color: #4CAF50; " +
                            "-fx-text-fill: white; -fx-padding: 15 30; -fx-background-radius: 8; " +
                            "-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.4), 8, 0, 0, 2);");
        startButton.setOnAction(e -> matchTimer.startMatch());
        
        bigButtonsRow.getChildren().addAll(countdownButton, startButton);
        
        // Secondary control buttons row
        HBox controlButtonsRow = new HBox(10);
        controlButtonsRow.setAlignment(Pos.CENTER);
        
        pauseButton = new Button("PAUSE");
        pauseButton.setStyle("-fx-font-size: 14; -fx-font-weight: bold; -fx-padding: 10 25; " +
                            "-fx-background-radius: 5;");
        pauseButton.setOnAction(e -> {
            if (pauseButton.getText().equals("PAUSE")) {
                matchTimer.pauseMatch();
                pauseButton.setText("RESUME");
                pauseButton.setStyle("-fx-font-size: 14; -fx-font-weight: bold; -fx-padding: 10 25; " +
                                    "-fx-background-color: #2196F3; -fx-text-fill: white; -fx-background-radius: 5;");
            } else {
                matchTimer.resumeMatch();
                pauseButton.setText("PAUSE");
                pauseButton.setStyle("-fx-font-size: 14; -fx-font-weight: bold; -fx-padding: 10 25; " +
                                    "-fx-background-radius: 5;");
            }
        });
        
        resetButton = new Button("RESET MATCH");
        resetButton.setStyle("-fx-background-color: #f44336; -fx-text-fill: white; -fx-font-weight: bold; " +
                            "-fx-font-size: 14; -fx-padding: 10 25; -fx-background-radius: 5;");
        resetButton.setOnAction(e -> {
            matchTimer.resetMatch();
            resetAllControls();
            pauseButton.setText("PAUSE");
            pauseButton.setStyle("-fx-font-size: 14; -fx-font-weight: bold; -fx-padding: 10 25; " +
                                "-fx-background-radius: 5;");
        });
        
        Button showStreamButton = new Button("Show Stream Window");
        showStreamButton.setStyle("-fx-font-size: 13; -fx-padding: 8 20; -fx-background-radius: 5;");
        showStreamButton.setOnAction(e -> streamWindow.show());
        
        showBreakdownButton = new Button("SHOW FINAL RESULTS");
        showBreakdownButton.setStyle("-fx-background-color: #9C27B0; -fx-text-fill: white; -fx-font-weight: bold; " +
                                     "-fx-font-size: 16; -fx-padding: 12 25; -fx-background-radius: 5;");
        showBreakdownButton.setDisable(true); // Disabled until match finishes
        showBreakdownButton.setOnAction(e -> {
            streamWindow.showBreakdownOverlay();
            audioService.playResults();
            match.setState(Match.MatchState.FINISHED);
        });
        
        controlButtonsRow.getChildren().addAll(pauseButton, resetButton, showStreamButton, showBreakdownButton);
        
        // Add separator
        Separator separator1 = new Separator();
        Separator separator2 = new Separator();
        
        box.getChildren().addAll(title, teamRow, separator1, configRow, separator2, bigButtonsRow, controlButtonsRow);
        return box;
    }
    
    private HBox createScoringControls() {
        HBox box = new HBox(20);
        box.setAlignment(Pos.TOP_CENTER);
        
        // Red Alliance
        VBox redAlliance = createAlliancePanel("RED ALLIANCE", true);
        
        // Blue Alliance
        VBox blueAlliance = createAlliancePanel("BLUE ALLIANCE", false);
        
        box.getChildren().addAll(redAlliance, blueAlliance);
        return box;
    }
    
    private VBox createAlliancePanel(String title, boolean isRed) {
        VBox panel = new VBox(10);
        panel.setPadding(new Insets(10));
        panel.setStyle("-fx-background-color: " + (isRed ? "#ffebee" : "#e3f2fd") + "; -fx-background-radius: 5; -fx-border-color: " + (isRed ? "#f44336" : "#2196F3") + "; -fx-border-width: 2; -fx-border-radius: 5;");
        panel.setPrefWidth(650);
        
        Label titleLabel = new Label(title);
        titleLabel.setStyle("-fx-font-size: 20; -fx-font-weight: bold; -fx-text-fill: " + (isRed ? "#c62828" : "#1565c0") + ";");
        
        // AUTO section
        Label autoLabel = new Label("AUTONOMOUS (30 sec)");
        autoLabel.setStyle("-fx-font-size: 16; -fx-font-weight: bold; -fx-text-fill: #000000;");
        
        GridPane autoGrid = new GridPane();
        autoGrid.setHgap(10);
        autoGrid.setVgap(5);
        
        int row = 0;
        
        // LEAVE checkboxes
        CheckBox robot1Leave = new CheckBox("Robot 1 LEAVE (3 pts)");
        robot1Leave.setStyle("-fx-text-fill: #000000;");
        CheckBox robot2Leave = new CheckBox("Robot 2 LEAVE (3 pts)");
        robot2Leave.setStyle("-fx-text-fill: #000000;");
        autoGrid.add(robot1Leave, 0, row++, 2, 1);
        autoGrid.add(robot2Leave, 0, row++, 2, 1);
        
        // ARTIFACTS
        Label autoClassifiedLabel = new Label("CLASSIFIED (3 pts each):");
        autoClassifiedLabel.setStyle("-fx-text-fill: #000000;");
        autoGrid.add(autoClassifiedLabel, 0, row);
        Spinner<Integer> autoClassified = createSpinner(0, 100);
        autoGrid.add(autoClassified, 1, row++);
        
        Label autoOverflowLabel = new Label("OVERFLOW (1 pt each):");
        autoOverflowLabel.setStyle("-fx-text-fill: #000000;");
        autoGrid.add(autoOverflowLabel, 0, row);
        Spinner<Integer> autoOverflow = createSpinner(0, 100);
        autoGrid.add(autoOverflow, 1, row++);
        
        Label autoPatternLabel = new Label("PATTERN matches (2 pts each):");
        autoPatternLabel.setStyle("-fx-text-fill: #000000;");
        autoGrid.add(autoPatternLabel, 0, row);
        Spinner<Integer> autoPattern = createSpinner(0, 20);
        autoGrid.add(autoPattern, 1, row++);
        
        // TELEOP section
        Label teleopLabel = new Label("TELEOP (2 min)");
        teleopLabel.setStyle("-fx-font-size: 16; -fx-font-weight: bold; -fx-text-fill: #000000;");
        
        GridPane teleopGrid = new GridPane();
        teleopGrid.setHgap(10);
        teleopGrid.setVgap(5);
        
        row = 0;
        Label teleopClassifiedLabel = new Label("CLASSIFIED (3 pts each):");
        teleopClassifiedLabel.setStyle("-fx-text-fill: #000000;");
        teleopGrid.add(teleopClassifiedLabel, 0, row);
        Spinner<Integer> teleopClassified = createSpinner(0, 100);
        teleopGrid.add(teleopClassified, 1, row++);
        
        Label teleopOverflowLabel = new Label("OVERFLOW (1 pt each):");
        teleopOverflowLabel.setStyle("-fx-text-fill: #000000;");
        teleopGrid.add(teleopOverflowLabel, 0, row);
        Spinner<Integer> teleopOverflow = createSpinner(0, 100);
        teleopGrid.add(teleopOverflow, 1, row++);
        
        Label teleopDepotLabel = new Label("DEPOT (1 pt each):");
        teleopDepotLabel.setStyle("-fx-text-fill: #000000;");
        teleopGrid.add(teleopDepotLabel, 0, row);
        Spinner<Integer> teleopDepot = createSpinner(0, 100);
        teleopGrid.add(teleopDepot, 1, row++);
        
        Label teleopPatternLabel = new Label("PATTERN matches (2 pts each):");
        teleopPatternLabel.setStyle("-fx-text-fill: #000000;");
        teleopGrid.add(teleopPatternLabel, 0, row);
        Spinner<Integer> teleopPattern = createSpinner(0, 20);
        teleopGrid.add(teleopPattern, 1, row++);
        
        // BASE section
        Label baseLabel = new Label("BASE RETURN (End Game)");
        baseLabel.setStyle("-fx-font-size: 16; -fx-font-weight: bold; -fx-text-fill: #000000;");
        
        GridPane baseGrid = new GridPane();
        baseGrid.setHgap(10);
        baseGrid.setVgap(5);
        
        row = 0;
        Label robot1Label = new Label("Robot 1:");
        robot1Label.setStyle("-fx-text-fill: #000000;");
        baseGrid.add(robot1Label, 0, row);
        ComboBox<DecodeScore.BaseStatus> robot1Base = new ComboBox<>();
        robot1Base.getItems().addAll(DecodeScore.BaseStatus.values());
        robot1Base.setValue(DecodeScore.BaseStatus.NOT_IN_BASE);
        baseGrid.add(robot1Base, 1, row++);
        
        Label robot2Label = new Label("Robot 2:");
        robot2Label.setStyle("-fx-text-fill: #000000;");
        baseGrid.add(robot2Label, 0, row);
        ComboBox<DecodeScore.BaseStatus> robot2Base = new ComboBox<>();
        robot2Base.getItems().addAll(DecodeScore.BaseStatus.values());
        robot2Base.setValue(DecodeScore.BaseStatus.NOT_IN_BASE);
        baseGrid.add(robot2Base, 1, row++);
        
        // Penalties
        Label penaltyLabel = new Label("PENALTIES");
        penaltyLabel.setStyle("-fx-font-size: 16; -fx-font-weight: bold; -fx-text-fill: #000000;");
        
        GridPane penaltyGrid = new GridPane();
        penaltyGrid.setHgap(10);
        penaltyGrid.setVgap(5);
        
        row = 0;
        Label majorFoulsLabel = new Label("Major Fouls:");
        majorFoulsLabel.setStyle("-fx-text-fill: #000000;");
        penaltyGrid.add(majorFoulsLabel, 0, row);
        Spinner<Integer> majorFouls = createSpinner(0, 20);
        penaltyGrid.add(majorFouls, 1, row++);
        
        Label minorFoulsLabel = new Label("Minor Fouls:");
        minorFoulsLabel.setStyle("-fx-text-fill: #000000;");
        penaltyGrid.add(minorFoulsLabel, 0, row);
        Spinner<Integer> minorFouls = createSpinner(0, 50);
        penaltyGrid.add(minorFouls, 1, row++);
        
        // Score display
        Label scoreLabel = new Label("Score: 0");
        scoreLabel.setStyle("-fx-font-size: 24; -fx-font-weight: bold; -fx-text-fill: " + (isRed ? "#c62828" : "#1565c0") + ";");
        
        panel.getChildren().addAll(
            titleLabel,
            autoLabel, autoGrid,
            new Separator(),
            teleopLabel, teleopGrid,
            new Separator(),
            baseLabel, baseGrid,
            new Separator(),
            penaltyLabel, penaltyGrid,
            new Separator(),
            scoreLabel
        );
        
        // Store controls for binding
        if (isRed) {
            redRobot1Leave = robot1Leave;
            redRobot2Leave = robot2Leave;
            redAutoClassified = autoClassified;
            redAutoOverflow = autoOverflow;
            redAutoPattern = autoPattern;
            redTeleopClassified = teleopClassified;
            redTeleopOverflow = teleopOverflow;
            redTeleopDepot = teleopDepot;
            redTeleopPattern = teleopPattern;
            redRobot1Base = robot1Base;
            redRobot2Base = robot2Base;
            redMajorFouls = majorFouls;
            redMinorFouls = minorFouls;
        } else {
            blueRobot1Leave = robot1Leave;
            blueRobot2Leave = robot2Leave;
            blueAutoClassified = autoClassified;
            blueAutoOverflow = autoOverflow;
            blueAutoPattern = autoPattern;
            blueTeleopClassified = teleopClassified;
            blueTeleopOverflow = teleopOverflow;
            blueTeleopDepot = teleopDepot;
            blueTeleopPattern = teleopPattern;
            blueRobot1Base = robot1Base;
            blueRobot2Base = robot2Base;
            blueMajorFouls = majorFouls;
            blueMinorFouls = minorFouls;
        }
        
        return panel;
    }
    
    private Spinner<Integer> createSpinner(int min, int max) {
        Spinner<Integer> spinner = new Spinner<>(min, max, 0);
        spinner.setEditable(true);
        spinner.setPrefWidth(80);
        return spinner;
    }
    
    private void bindToModel() {
        // Monitor match state to enable breakdown button
        matchTimer.currentPhaseProperty().addListener((obs, oldVal, newVal) -> {
            if ("UNDER REVIEW".equals(newVal)) {
                showBreakdownButton.setDisable(false);
            } else if ("NOT_STARTED".equals(newVal) || "AUTO".equals(newVal)) {
                showBreakdownButton.setDisable(true);
                streamWindow.hideBreakdownOverlay();
            }
        });
        
        // Red Alliance bindings
        redRobot1Leave.selectedProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setRobot1Leave(newVal);
            updateScoreDisplays();
        });
        redRobot2Leave.selectedProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setRobot2Leave(newVal);
            updateScoreDisplays();
        });
        
        redAutoClassified.valueProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setAutoClassified(newVal);
            updateScoreDisplays();
        });
        redAutoOverflow.valueProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setAutoOverflow(newVal);
            updateScoreDisplays();
        });
        redAutoPattern.valueProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setAutoPatternMatches(newVal);
            updateScoreDisplays();
        });
        
        redTeleopClassified.valueProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setTeleopClassified(newVal);
            updateScoreDisplays();
        });
        redTeleopOverflow.valueProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setTeleopOverflow(newVal);
            updateScoreDisplays();
        });
        redTeleopDepot.valueProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setTeleopDepot(newVal);
            updateScoreDisplays();
        });
        redTeleopPattern.valueProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setTeleopPatternMatches(newVal);
            updateScoreDisplays();
        });
        
        redRobot1Base.setOnAction(e -> {
            match.getRedScore().setRobot1Base(redRobot1Base.getValue());
            updateScoreDisplays();
        });
        redRobot2Base.setOnAction(e -> {
            match.getRedScore().setRobot2Base(redRobot2Base.getValue());
            updateScoreDisplays();
        });
        
        redMajorFouls.valueProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setMajorFouls(newVal);
            updateScoreDisplays();
        });
        redMinorFouls.valueProperty().addListener((obs, old, newVal) -> {
            match.getRedScore().setMinorFouls(newVal);
            updateScoreDisplays();
        });
        
        // Blue Alliance bindings (mirrored)
        blueRobot1Leave.selectedProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setRobot1Leave(newVal);
            updateScoreDisplays();
        });
        blueRobot2Leave.selectedProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setRobot2Leave(newVal);
            updateScoreDisplays();
        });
        
        blueAutoClassified.valueProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setAutoClassified(newVal);
            updateScoreDisplays();
        });
        blueAutoOverflow.valueProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setAutoOverflow(newVal);
            updateScoreDisplays();
        });
        blueAutoPattern.valueProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setAutoPatternMatches(newVal);
            updateScoreDisplays();
        });
        
        blueTeleopClassified.valueProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setTeleopClassified(newVal);
            updateScoreDisplays();
        });
        blueTeleopOverflow.valueProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setTeleopOverflow(newVal);
            updateScoreDisplays();
        });
        blueTeleopDepot.valueProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setTeleopDepot(newVal);
            updateScoreDisplays();
        });
        blueTeleopPattern.valueProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setTeleopPatternMatches(newVal);
            updateScoreDisplays();
        });
        
        blueRobot1Base.setOnAction(e -> {
            match.getBlueScore().setRobot1Base(blueRobot1Base.getValue());
            updateScoreDisplays();
        });
        blueRobot2Base.setOnAction(e -> {
            match.getBlueScore().setRobot2Base(blueRobot2Base.getValue());
            updateScoreDisplays();
        });
        
        blueMajorFouls.valueProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setMajorFouls(newVal);
            updateScoreDisplays();
        });
        blueMinorFouls.valueProperty().addListener((obs, old, newVal) -> {
            match.getBlueScore().setMinorFouls(newVal);
            updateScoreDisplays();
        });
    }
    
    private void updateScoreDisplays() {
        // Update score labels in the alliance panels
        // Note: Score labels are embedded in the panels, so we'd need to refactor to update them
        // For now, the StreamOutputWindow will show live scores
    }
    
    private void resetAllControls() {
        // Red Alliance
        redRobot1Leave.setSelected(false);
        redRobot2Leave.setSelected(false);
        redAutoClassified.getValueFactory().setValue(0);
        redAutoOverflow.getValueFactory().setValue(0);
        redAutoPattern.getValueFactory().setValue(0);
        redTeleopClassified.getValueFactory().setValue(0);
        redTeleopOverflow.getValueFactory().setValue(0);
        redTeleopDepot.getValueFactory().setValue(0);
        redTeleopPattern.getValueFactory().setValue(0);
        redRobot1Base.setValue(DecodeScore.BaseStatus.NOT_IN_BASE);
        redRobot2Base.setValue(DecodeScore.BaseStatus.NOT_IN_BASE);
        redMajorFouls.getValueFactory().setValue(0);
        redMinorFouls.getValueFactory().setValue(0);
        
        // Blue Alliance
        blueRobot1Leave.setSelected(false);
        blueRobot2Leave.setSelected(false);
        blueAutoClassified.getValueFactory().setValue(0);
        blueAutoOverflow.getValueFactory().setValue(0);
        blueAutoPattern.getValueFactory().setValue(0);
        blueTeleopClassified.getValueFactory().setValue(0);
        blueTeleopOverflow.getValueFactory().setValue(0);
        blueTeleopDepot.getValueFactory().setValue(0);
        blueTeleopPattern.getValueFactory().setValue(0);
        blueRobot1Base.setValue(DecodeScore.BaseStatus.NOT_IN_BASE);
        blueRobot2Base.setValue(DecodeScore.BaseStatus.NOT_IN_BASE);
        blueMajorFouls.getValueFactory().setValue(0);
        blueMinorFouls.getValueFactory().setValue(0);
        
        // Reset MOTIF
        motifSelector.setValue(DecodeScore.MotifType.PPG);
        
        updateScoreDisplays();
    }
    
    /**
     * Update UI for solo mode
     */
    private void updateSoloModeUI(boolean soloMode) {
        if (soloMode) {
            // In solo mode, disable blue alliance fields
            blueTeam1Field.setDisable(true);
            blueTeam2Field.setDisable(true);
            blueTeam1Field.setText("N/A");
            blueTeam2Field.setText("N/A");
            blueTeam1Field.setPromptText("Solo Mode");
            blueTeam2Field.setPromptText("Solo Mode");
            blueTeam1Field.setStyle("-fx-font-size: 14; -fx-opacity: 0.5;");
            blueTeam2Field.setStyle("-fx-font-size: 14; -fx-opacity: 0.5;");
        } else {
            // Normal mode
            blueTeam1Field.setDisable(false);
            blueTeam2Field.setDisable(false);
            blueTeam1Field.setText("");
            blueTeam2Field.setText("");
            blueTeam1Field.setPromptText("0000");
            blueTeam2Field.setPromptText("0000");
            blueTeam1Field.setStyle("-fx-font-size: 14;");
            blueTeam2Field.setStyle("-fx-font-size: 14;");
        }
        
        // Update stream output layout
        streamWindow.updateScoreBarForMode();
    }
    
    /**
     * Show stream countdown - Configurable countdown in minutes:seconds format
     * Shows "Stream starts in: MM:SS" with DECODE background
     * Requires button press to exit (doesn't auto-hide)
     */
    private void showStreamCountdown() {
        // Show dialog to configure countdown duration
        TextInputDialog dialog = new TextInputDialog("5:00");
        dialog.setTitle("Configure Stream Countdown");
        dialog.setHeaderText("Set countdown duration");
        dialog.setContentText("Enter duration (MM:SS):");
        
        java.util.Optional<String> result = dialog.showAndWait();
        if (!result.isPresent()) {
            return; // User cancelled
        }
        
        String durationInput = result.get();
        int totalSeconds = parseCountdownDuration(durationInput);
        
        if (totalSeconds <= 0) {
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Invalid Duration");
            alert.setHeaderText("Invalid countdown duration");
            alert.setContentText("Please enter a valid duration in MM:SS format (e.g., 5:00)");
            alert.showAndWait();
            return;
        }
        
        // Create countdown timeline that updates every second
        final int[] currentSeconds = {totalSeconds};
        javafx.animation.Timeline countdownTimeline = new javafx.animation.Timeline();
        
        // Update countdown every second
        countdownTimeline.getKeyFrames().add(
            new javafx.animation.KeyFrame(
                javafx.util.Duration.seconds(1),
                e -> {
                    currentSeconds[0]--;
                    String timeDisplay = formatCountdownTime(currentSeconds[0]);
                    streamWindow.showSplashScreen(timeDisplay, "", "", "");
                    
                    // When countdown reaches zero, show "00:00" but don't hide
                    if (currentSeconds[0] <= 0) {
                        countdownTimeline.stop();
                    }
                }
            )
        );
        countdownTimeline.setCycleCount(totalSeconds);
        
        // Show initial countdown
        String initialDisplay = formatCountdownTime(totalSeconds);
        streamWindow.showSplashScreen(initialDisplay, "", "", "");
        
        // Start the countdown
        countdownTimeline.play();
        
        // Change the countdown button to "HIDE COUNTDOWN"
        countdownButton.setText("HIDE COUNTDOWN");
        countdownButton.setOnAction(e -> {
            countdownTimeline.stop();
            streamWindow.hideSplashScreen();
            // Restore original button text and action
            countdownButton.setText("SHOW STREAM COUNTDOWN");
            countdownButton.setOnAction(evt -> showStreamCountdown());
        });
    }
    
    /**
     * Parse countdown duration from MM:SS format
     */
    private int parseCountdownDuration(String input) {
        try {
            String[] parts = input.split(":");
            if (parts.length == 2) {
                int minutes = Integer.parseInt(parts[0].trim());
                int seconds = Integer.parseInt(parts[1].trim());
                return minutes * 60 + seconds;
            } else if (parts.length == 1) {
                // Just seconds
                return Integer.parseInt(parts[0].trim());
            }
        } catch (NumberFormatException e) {
            // Invalid format
        }
        return -1;
    }
    
    /**
     * Format seconds as MM:SS
     */
    private String formatCountdownTime(int totalSeconds) {
        if (totalSeconds < 0) {
            return "00:00";
        }
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        return String.format("%d:%02d", minutes, seconds);
    }
    
    /**
     * Show detailed score breakdown dialog
     */
    private void showScoreBreakdown() {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Score Breakdown - DECODE 2025-2026");
        alert.setHeaderText("Final Score Breakdown");
        
        StringBuilder breakdown = new StringBuilder();
        
        // Match info
        String redTeam = match.getRedTeamNumber().isEmpty() ? "----" : match.getRedTeamNumber();
        String blueTeam = match.getBlueTeamNumber().isEmpty() ? "----" : match.getBlueTeamNumber();
        breakdown.append("MOTIF: ").append(match.getRedScore().getMotif().getDisplayName()).append("\n\n");
        
        // RED ALLIANCE
        breakdown.append("═══ RED ALLIANCE (Team ").append(redTeam).append(") ═══\n\n");
        DecodeScore redScore = match.getRedScore();
        
        breakdown.append("AUTONOMOUS:\n");
        breakdown.append("  LEAVE: ");
        if (redScore.isRobot1Leave()) breakdown.append("Robot 1 (3 pts) ");
        if (redScore.isRobot2Leave()) breakdown.append("Robot 2 (3 pts) ");
        if (!redScore.isRobot1Leave() && !redScore.isRobot2Leave()) breakdown.append("None");
        breakdown.append("\n");
        breakdown.append("  Classified: ").append(redScore.getAutoClassified()).append(" × 3 = ")
                  .append(redScore.getAutoClassified() * 3).append(" pts\n");
        breakdown.append("  Overflow: ").append(redScore.getAutoOverflow()).append(" × 1 = ")
                  .append(redScore.getAutoOverflow()).append(" pts\n");
        breakdown.append("  Pattern: ").append(redScore.getAutoPatternMatches()).append(" × 2 = ")
                  .append(redScore.getAutoPatternMatches() * 2).append(" pts\n\n");
        
        breakdown.append("TELEOP:\n");
        breakdown.append("  Classified: ").append(redScore.getTeleopClassified()).append(" × 3 = ")
                  .append(redScore.getTeleopClassified() * 3).append(" pts\n");
        breakdown.append("  Overflow: ").append(redScore.getTeleopOverflow()).append(" × 1 = ")
                  .append(redScore.getTeleopOverflow()).append(" pts\n");
        breakdown.append("  Depot: ").append(redScore.getTeleopDepot()).append(" × 1 = ")
                  .append(redScore.getTeleopDepot()).append(" pts\n");
        breakdown.append("  Pattern: ").append(redScore.getTeleopPatternMatches()).append(" × 2 = ")
                  .append(redScore.getTeleopPatternMatches() * 2).append(" pts\n\n");
        
        breakdown.append("BASE RETURN:\n");
        breakdown.append("  Robot 1: ").append(redScore.getRobot1Base().getDisplayName()).append("\n");
        breakdown.append("  Robot 2: ").append(redScore.getRobot2Base().getDisplayName()).append("\n");
        breakdown.append("  Movement Points: ").append(redScore.getMovementPoints()).append(" pts\n\n");
        
        breakdown.append("PENALTIES (from Blue):\n");
        DecodeScore blueScore = match.getBlueScore();
        breakdown.append("  Major Fouls: ").append(blueScore.getMajorFouls()).append(" × 15 = ")
                  .append(blueScore.getMajorFouls() * 15).append(" pts\n");
        breakdown.append("  Minor Fouls: ").append(blueScore.getMinorFouls()).append(" × 5 = ")
                  .append(blueScore.getMinorFouls() * 5).append(" pts\n\n");
        
        breakdown.append("RED TOTAL: ").append(match.getRedTotalScore()).append(" points\n\n");
        
        // BLUE ALLIANCE
        breakdown.append("═══ BLUE ALLIANCE (Team ").append(blueTeam).append(") ═══\n\n");
        
        breakdown.append("AUTONOMOUS:\n");
        breakdown.append("  LEAVE: ");
        if (blueScore.isRobot1Leave()) breakdown.append("Robot 1 (3 pts) ");
        if (blueScore.isRobot2Leave()) breakdown.append("Robot 2 (3 pts) ");
        if (!blueScore.isRobot1Leave() && !blueScore.isRobot2Leave()) breakdown.append("None");
        breakdown.append("\n");
        breakdown.append("  Classified: ").append(blueScore.getAutoClassified()).append(" × 3 = ")
                  .append(blueScore.getAutoClassified() * 3).append(" pts\n");
        breakdown.append("  Overflow: ").append(blueScore.getAutoOverflow()).append(" × 1 = ")
                  .append(blueScore.getAutoOverflow()).append(" pts\n");
        breakdown.append("  Pattern: ").append(blueScore.getAutoPatternMatches()).append(" × 2 = ")
                  .append(blueScore.getAutoPatternMatches() * 2).append(" pts\n\n");
        
        breakdown.append("TELEOP:\n");
        breakdown.append("  Classified: ").append(blueScore.getTeleopClassified()).append(" × 3 = ")
                  .append(blueScore.getTeleopClassified() * 3).append(" pts\n");
        breakdown.append("  Overflow: ").append(blueScore.getTeleopOverflow()).append(" × 1 = ")
                  .append(blueScore.getTeleopOverflow()).append(" pts\n");
        breakdown.append("  Depot: ").append(blueScore.getTeleopDepot()).append(" × 1 = ")
                  .append(blueScore.getTeleopDepot()).append(" pts\n");
        breakdown.append("  Pattern: ").append(blueScore.getTeleopPatternMatches()).append(" × 2 = ")
                  .append(blueScore.getTeleopPatternMatches() * 2).append(" pts\n\n");
        
        breakdown.append("BASE RETURN:\n");
        breakdown.append("  Robot 1: ").append(blueScore.getRobot1Base().getDisplayName()).append("\n");
        breakdown.append("  Robot 2: ").append(blueScore.getRobot2Base().getDisplayName()).append("\n");
        breakdown.append("  Movement Points: ").append(blueScore.getMovementPoints()).append(" pts\n\n");
        
        breakdown.append("PENALTIES (from Red):\n");
        breakdown.append("  Major Fouls: ").append(redScore.getMajorFouls()).append(" × 15 = ")
                  .append(redScore.getMajorFouls() * 15).append(" pts\n");
        breakdown.append("  Minor Fouls: ").append(redScore.getMinorFouls()).append(" × 5 = ")
                  .append(redScore.getMinorFouls() * 5).append(" pts\n\n");
        
        breakdown.append("BLUE TOTAL: ").append(match.getBlueTotalScore()).append(" points\n\n");
        
        // WINNER
        breakdown.append("═══════════════════════════\n");
        int redTotal = match.getRedTotalScore();
        int blueTotal = match.getBlueTotalScore();
        if (redTotal > blueTotal) {
            breakdown.append("🏆 RED ALLIANCE WINS! 🏆\n");
        } else if (blueTotal > redTotal) {
            breakdown.append("🏆 BLUE ALLIANCE WINS! 🏆\n");
        } else {
            breakdown.append("🤝 TIE MATCH! 🤝\n");
        }
        breakdown.append("═══════════════════════════");
        
        alert.setContentText(breakdown.toString());
        alert.getDialogPane().setPrefSize(600, 700);
        alert.showAndWait();
    }
    
    public void show() {
        stage.show();
    }
    
    public void hide() {
        stage.hide();
    }
}
