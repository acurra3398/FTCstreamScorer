package org.ftc.scorer;

import javafx.application.Application;
import javafx.stage.Stage;
import org.ftc.scorer.model.Match;
import org.ftc.scorer.service.AudioService;
import org.ftc.scorer.service.MatchTimer;
import org.ftc.scorer.ui.ControlWindow;
import org.ftc.scorer.ui.StreamOutputWindow;
import org.ftc.scorer.webcam.WebcamService;

/**
 * Main JavaFX application for FTC Stream Scorer
 * Local-only scoring system with dual-window output
 */
public class ScorerApplication extends Application {
    
    @Override
    public void start(Stage primaryStage) {
        // Create model - start with empty team numbers
        Match match = new Match("", "");
        
        // Create services
        AudioService audioService = new AudioService();
        MatchTimer matchTimer = new MatchTimer(match, audioService);
        WebcamService webcamService = new WebcamService();
        
        // Create windows
        StreamOutputWindow streamWindow = new StreamOutputWindow(match, matchTimer);
        ControlWindow controlWindow = new ControlWindow(match, matchTimer, webcamService, streamWindow, audioService);
        
        // Connect webcam to stream window
        webcamService.setFrameListener(streamWindow::updateWebcamFrame);
        
        // Start webcam if available
        if (!webcamService.getAvailableWebcams().isEmpty()) {
            webcamService.start();
        }
        
        // Show control window
        controlWindow.show();
        
        // Optionally show stream window
        streamWindow.show();
    }
    
    @Override
    public void stop() {
        System.out.println("Application closing...");
    }
    
    public static void main(String[] args) {
        launch(args);
    }
}
