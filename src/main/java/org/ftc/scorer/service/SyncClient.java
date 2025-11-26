package org.ftc.scorer.service;

import javafx.application.Platform;
import org.ftc.scorer.model.DecodeScore;
import org.ftc.scorer.model.Match;

import java.io.*;
import java.net.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Client for wireless score synchronization
 * Connects to a SyncServer running on the main computer.
 * 
 * Usage:
 * 1. Get the server IP:port from the main computer's control panel
 * 2. Call connect(host, port) to establish connection
 * 3. Call setAlliance("RED" or "BLUE") to assign this device to an alliance
 * 4. Score updates will automatically sync with the server
 */
public class SyncClient {
    private final Match match;
    private Socket socket;
    private PrintWriter out;
    private BufferedReader in;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile boolean connected = false;
    private String assignedAlliance = null;
    private Runnable onScoreUpdate;
    private Runnable onConnectionChange;
    
    public SyncClient(Match match) {
        this.match = match;
    }
    
    /**
     * Connect to the sync server
     * @param host server IP address
     * @param port server port
     * @return true if connection successful
     */
    public boolean connect(String host, int port) {
        try {
            socket = new Socket(host, port);
            out = new PrintWriter(socket.getOutputStream(), true);
            in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            connected = true;
            
            // Start listening for messages
            executor.submit(this::listenForMessages);
            
            System.out.println("Connected to sync server at " + host + ":" + port);
            
            if (onConnectionChange != null) {
                Platform.runLater(onConnectionChange);
            }
            
            return true;
        } catch (IOException e) {
            System.err.println("Failed to connect to sync server: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Disconnect from the server
     */
    public void disconnect() {
        connected = false;
        try {
            if (in != null) in.close();
            if (out != null) out.close();
            if (socket != null) socket.close();
        } catch (IOException e) {
            // Ignore
        }
        executor.shutdownNow();
        
        if (onConnectionChange != null) {
            Platform.runLater(onConnectionChange);
        }
        
        System.out.println("Disconnected from sync server");
    }
    
    /**
     * Set which alliance this client is scoring for
     * @param alliance "RED" or "BLUE"
     */
    public void setAlliance(String alliance) {
        this.assignedAlliance = alliance;
        if (connected) {
            send("{\"type\":\"ASSIGN\",\"alliance\":\"" + alliance + "\"}");
        }
    }
    
    /**
     * Get the assigned alliance
     */
    public String getAlliance() {
        return assignedAlliance;
    }
    
    /**
     * Send current score update to server
     * Only sends scores for the assigned alliance
     */
    public void sendScoreUpdate() {
        if (!connected || assignedAlliance == null) {
            return;
        }
        
        DecodeScore score = "RED".equals(assignedAlliance) ? 
            match.getRedScore() : match.getBlueScore();
        
        StringBuilder sb = new StringBuilder();
        sb.append("{\"type\":\"SCORE_UPDATE\",");
        sb.append("\"alliance\":\"").append(assignedAlliance).append("\",");
        sb.append("\"autoClassified\":").append(score.getAutoClassified()).append(",");
        sb.append("\"autoOverflow\":").append(score.getAutoOverflow()).append(",");
        sb.append("\"autoPatternMatches\":").append(score.getAutoPatternMatches()).append(",");
        sb.append("\"teleopClassified\":").append(score.getTeleopClassified()).append(",");
        sb.append("\"teleopOverflow\":").append(score.getTeleopOverflow()).append(",");
        sb.append("\"teleopDepot\":").append(score.getTeleopDepot()).append(",");
        sb.append("\"teleopPatternMatches\":").append(score.getTeleopPatternMatches()).append(",");
        sb.append("\"robot1Leave\":").append(score.isRobot1Leave()).append(",");
        sb.append("\"robot2Leave\":").append(score.isRobot2Leave()).append(",");
        sb.append("\"robot1Base\":\"").append(score.getRobot1Base().name()).append("\",");
        sb.append("\"robot2Base\":\"").append(score.getRobot2Base().name()).append("\",");
        sb.append("\"majorFouls\":").append(score.getMajorFouls()).append(",");
        sb.append("\"minorFouls\":").append(score.getMinorFouls());
        sb.append("}");
        
        send(sb.toString());
    }
    
    /**
     * Set callback for when scores are updated from server
     */
    public void setOnScoreUpdate(Runnable callback) {
        this.onScoreUpdate = callback;
    }
    
    /**
     * Set callback for connection state changes
     */
    public void setOnConnectionChange(Runnable callback) {
        this.onConnectionChange = callback;
    }
    
    /**
     * Check if connected
     */
    public boolean isConnected() {
        return connected;
    }
    
    private void send(String message) {
        if (connected && out != null) {
            out.println(message);
        }
    }
    
    private void listenForMessages() {
        try {
            String line;
            while (connected && (line = in.readLine()) != null) {
                processMessage(line);
            }
        } catch (IOException e) {
            if (connected) {
                System.err.println("Connection lost: " + e.getMessage());
            }
        } finally {
            connected = false;
            if (onConnectionChange != null) {
                Platform.runLater(onConnectionChange);
            }
        }
    }
    
    private void processMessage(String message) {
        if (message.contains("\"type\":\"SCORE_UPDATE\"")) {
            // Update local match state from server
            try {
                // Parse red scores
                String redSection = JsonParser.extractSection(message, "\"red\":{", "}");
                if (redSection != null) {
                    applyScoreData(match.getRedScore(), redSection);
                }
                
                // Parse blue scores
                String blueSection = JsonParser.extractSection(message, "\"blue\":{", "}");
                if (blueSection != null) {
                    applyScoreData(match.getBlueScore(), blueSection);
                }
                
                if (onScoreUpdate != null) {
                    Platform.runLater(onScoreUpdate);
                }
            } catch (Exception e) {
                System.err.println("Error parsing score update: " + e.getMessage());
            }
        }
    }
    
    private void applyScoreData(DecodeScore score, String data) {
        score.setAutoClassified(JsonParser.parseIntField(data, "autoClassified"));
        score.setAutoOverflow(JsonParser.parseIntField(data, "autoOverflow"));
        score.setAutoPatternMatches(JsonParser.parseIntField(data, "autoPatternMatches"));
        score.setTeleopClassified(JsonParser.parseIntField(data, "teleopClassified"));
        score.setTeleopOverflow(JsonParser.parseIntField(data, "teleopOverflow"));
        score.setTeleopDepot(JsonParser.parseIntField(data, "teleopDepot"));
        score.setTeleopPatternMatches(JsonParser.parseIntField(data, "teleopPatternMatches"));
        score.setRobot1Leave(JsonParser.parseBoolField(data, "robot1Leave"));
        score.setRobot2Leave(JsonParser.parseBoolField(data, "robot2Leave"));
        score.setMajorFouls(JsonParser.parseIntField(data, "majorFouls"));
        score.setMinorFouls(JsonParser.parseIntField(data, "minorFouls"));
        
        String base1 = JsonParser.parseStringField(data, "robot1Base");
        String base2 = JsonParser.parseStringField(data, "robot2Base");
        if (base1 != null) {
            try {
                score.setRobot1Base(DecodeScore.BaseStatus.valueOf(base1));
            } catch (IllegalArgumentException e) {
                // Ignore invalid enum
            }
        }
        if (base2 != null) {
            try {
                score.setRobot2Base(DecodeScore.BaseStatus.valueOf(base2));
            } catch (IllegalArgumentException e) {
                // Ignore invalid enum
            }
        }
    }
}
