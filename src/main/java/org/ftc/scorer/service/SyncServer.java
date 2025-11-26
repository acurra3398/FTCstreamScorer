package org.ftc.scorer.service;

import javafx.application.Platform;
import org.ftc.scorer.model.Match;

import java.io.*;
import java.net.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Server for wireless score synchronization
 * Runs on the main computer and accepts connections from remote scoring devices.
 * 
 * Usage:
 * 1. Start the server on the main computer (default port 5555)
 * 2. Note the IP address shown in the control panel
 * 3. On remote devices, connect using the IP:port
 * 4. Remote devices can be assigned to score red or blue alliance
 * 
 * Protocol:
 * - Messages are JSON strings terminated by newline
 * - Server broadcasts full score state to all clients
 * - Clients send score updates for their assigned alliance
 */
public class SyncServer {
    private static final int DEFAULT_PORT = 5555;
    
    private final Match match;
    private ServerSocket serverSocket;
    private final List<ClientHandler> clients = new CopyOnWriteArrayList<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private volatile boolean running = false;
    private int port;
    private Runnable onScoreUpdate;
    
    public SyncServer(Match match) {
        this.match = match;
        this.port = DEFAULT_PORT;
    }
    
    /**
     * Start the sync server
     * @param port the port to listen on
     * @return true if server started successfully
     */
    public boolean start(int port) {
        this.port = port;
        try {
            serverSocket = new ServerSocket(port);
            running = true;
            
            executor.submit(() -> {
                while (running) {
                    try {
                        Socket clientSocket = serverSocket.accept();
                        ClientHandler handler = new ClientHandler(clientSocket);
                        clients.add(handler);
                        executor.submit(handler);
                        System.out.println("Client connected from: " + clientSocket.getInetAddress());
                    } catch (IOException e) {
                        if (running) {
                            System.err.println("Error accepting client: " + e.getMessage());
                        }
                    }
                }
            });
            
            System.out.println("Sync server started on port " + port);
            return true;
        } catch (IOException e) {
            System.err.println("Failed to start sync server on port " + port + ": " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Start with default port
     */
    public boolean start() {
        return start(DEFAULT_PORT);
    }
    
    /**
     * Stop the server
     */
    public void stop() {
        running = false;
        for (ClientHandler client : clients) {
            client.close();
        }
        clients.clear();
        try {
            if (serverSocket != null) {
                serverSocket.close();
            }
        } catch (IOException e) {
            // Ignore
        }
        executor.shutdownNow();
        System.out.println("Sync server stopped");
    }
    
    /**
     * Broadcast current score state to all connected clients
     */
    public void broadcastScores() {
        String message = buildScoreMessage();
        for (ClientHandler client : clients) {
            client.send(message);
        }
    }
    
    /**
     * Set callback for when scores are updated by a client
     */
    public void setOnScoreUpdate(Runnable callback) {
        this.onScoreUpdate = callback;
    }
    
    /**
     * Get the server's IP address(es) for display
     */
    public String getServerAddress() {
        try {
            StringBuilder sb = new StringBuilder();
            java.util.Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (ni.isLoopback() || !ni.isUp()) continue;
                
                java.util.Enumeration<InetAddress> addresses = ni.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr instanceof Inet4Address) {
                        if (sb.length() > 0) sb.append(", ");
                        sb.append(addr.getHostAddress()).append(":").append(port);
                    }
                }
            }
            return sb.length() > 0 ? sb.toString() : "localhost:" + port;
        } catch (SocketException e) {
            return "localhost:" + port;
        }
    }
    
    /**
     * Get number of connected clients
     */
    public int getClientCount() {
        return clients.size();
    }
    
    /**
     * Check if server is running
     */
    public boolean isRunning() {
        return running;
    }
    
    private String buildScoreMessage() {
        // Build JSON-like message with current scores
        StringBuilder sb = new StringBuilder();
        sb.append("{\"type\":\"SCORE_UPDATE\",");
        sb.append("\"redScore\":").append(match.getRedTotalScore()).append(",");
        sb.append("\"blueScore\":").append(match.getBlueTotalScore()).append(",");
        
        // Red score details
        sb.append("\"red\":{");
        sb.append("\"autoClassified\":").append(match.getRedScore().getAutoClassified()).append(",");
        sb.append("\"autoOverflow\":").append(match.getRedScore().getAutoOverflow()).append(",");
        sb.append("\"autoPatternMatches\":").append(match.getRedScore().getAutoPatternMatches()).append(",");
        sb.append("\"teleopClassified\":").append(match.getRedScore().getTeleopClassified()).append(",");
        sb.append("\"teleopOverflow\":").append(match.getRedScore().getTeleopOverflow()).append(",");
        sb.append("\"teleopDepot\":").append(match.getRedScore().getTeleopDepot()).append(",");
        sb.append("\"teleopPatternMatches\":").append(match.getRedScore().getTeleopPatternMatches()).append(",");
        sb.append("\"robot1Leave\":").append(match.getRedScore().isRobot1Leave()).append(",");
        sb.append("\"robot2Leave\":").append(match.getRedScore().isRobot2Leave()).append(",");
        sb.append("\"robot1Base\":\"").append(match.getRedScore().getRobot1Base().name()).append("\",");
        sb.append("\"robot2Base\":\"").append(match.getRedScore().getRobot2Base().name()).append("\",");
        sb.append("\"majorFouls\":").append(match.getRedScore().getMajorFouls()).append(",");
        sb.append("\"minorFouls\":").append(match.getRedScore().getMinorFouls());
        sb.append("},");
        
        // Blue score details
        sb.append("\"blue\":{");
        sb.append("\"autoClassified\":").append(match.getBlueScore().getAutoClassified()).append(",");
        sb.append("\"autoOverflow\":").append(match.getBlueScore().getAutoOverflow()).append(",");
        sb.append("\"autoPatternMatches\":").append(match.getBlueScore().getAutoPatternMatches()).append(",");
        sb.append("\"teleopClassified\":").append(match.getBlueScore().getTeleopClassified()).append(",");
        sb.append("\"teleopOverflow\":").append(match.getBlueScore().getTeleopOverflow()).append(",");
        sb.append("\"teleopDepot\":").append(match.getBlueScore().getTeleopDepot()).append(",");
        sb.append("\"teleopPatternMatches\":").append(match.getBlueScore().getTeleopPatternMatches()).append(",");
        sb.append("\"robot1Leave\":").append(match.getBlueScore().isRobot1Leave()).append(",");
        sb.append("\"robot2Leave\":").append(match.getBlueScore().isRobot2Leave()).append(",");
        sb.append("\"robot1Base\":\"").append(match.getBlueScore().getRobot1Base().name()).append("\",");
        sb.append("\"robot2Base\":\"").append(match.getBlueScore().getRobot2Base().name()).append("\",");
        sb.append("\"majorFouls\":").append(match.getBlueScore().getMajorFouls()).append(",");
        sb.append("\"minorFouls\":").append(match.getBlueScore().getMinorFouls());
        sb.append("}}");
        
        return sb.toString();
    }
    
    private void applyScoreUpdate(String message, String alliance) {
        // Parse and apply score update from client
        // This is a simplified parser - in production you'd use a JSON library
        try {
            if (message.startsWith("{") && message.contains("\"type\":\"SCORE_UPDATE\"")) {
                org.ftc.scorer.model.DecodeScore score = 
                    "RED".equals(alliance) ? match.getRedScore() : match.getBlueScore();
                
                // Parse fields
                score.setAutoClassified(parseIntField(message, "autoClassified"));
                score.setAutoOverflow(parseIntField(message, "autoOverflow"));
                score.setAutoPatternMatches(parseIntField(message, "autoPatternMatches"));
                score.setTeleopClassified(parseIntField(message, "teleopClassified"));
                score.setTeleopOverflow(parseIntField(message, "teleopOverflow"));
                score.setTeleopDepot(parseIntField(message, "teleopDepot"));
                score.setTeleopPatternMatches(parseIntField(message, "teleopPatternMatches"));
                score.setRobot1Leave(parseBoolField(message, "robot1Leave"));
                score.setRobot2Leave(parseBoolField(message, "robot2Leave"));
                score.setMajorFouls(parseIntField(message, "majorFouls"));
                score.setMinorFouls(parseIntField(message, "minorFouls"));
                
                String base1 = parseStringField(message, "robot1Base");
                String base2 = parseStringField(message, "robot2Base");
                if (base1 != null) {
                    score.setRobot1Base(org.ftc.scorer.model.DecodeScore.BaseStatus.valueOf(base1));
                }
                if (base2 != null) {
                    score.setRobot2Base(org.ftc.scorer.model.DecodeScore.BaseStatus.valueOf(base2));
                }
                
                // Notify UI to update
                if (onScoreUpdate != null) {
                    Platform.runLater(onScoreUpdate);
                }
                
                // Broadcast to all clients
                broadcastScores();
            }
        } catch (Exception e) {
            System.err.println("Error parsing score update: " + e.getMessage());
        }
    }
    
    private int parseIntField(String json, String field) {
        String pattern = "\"" + field + "\":";
        int start = json.indexOf(pattern);
        if (start < 0) return 0;
        start += pattern.length();
        int end = start;
        while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '-')) {
            end++;
        }
        try {
            return Integer.parseInt(json.substring(start, end));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
    
    private boolean parseBoolField(String json, String field) {
        String pattern = "\"" + field + "\":";
        int start = json.indexOf(pattern);
        if (start < 0) return false;
        start += pattern.length();
        return json.substring(start).startsWith("true");
    }
    
    private String parseStringField(String json, String field) {
        String pattern = "\"" + field + "\":\"";
        int start = json.indexOf(pattern);
        if (start < 0) return null;
        start += pattern.length();
        int end = json.indexOf("\"", start);
        if (end < 0) return null;
        return json.substring(start, end);
    }
    
    /**
     * Handler for each connected client
     */
    private class ClientHandler implements Runnable {
        private final Socket socket;
        private PrintWriter out;
        private BufferedReader in;
        private String assignedAlliance = null; // "RED" or "BLUE"
        private volatile boolean connected = true;
        
        ClientHandler(Socket socket) {
            this.socket = socket;
            try {
                out = new PrintWriter(socket.getOutputStream(), true);
                in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            } catch (IOException e) {
                connected = false;
            }
        }
        
        @Override
        public void run() {
            try {
                // Send current state on connect
                send(buildScoreMessage());
                
                String line;
                while (connected && (line = in.readLine()) != null) {
                    processMessage(line);
                }
            } catch (IOException e) {
                // Client disconnected
            } finally {
                close();
                clients.remove(this);
                System.out.println("Client disconnected");
            }
        }
        
        private void processMessage(String message) {
            if (message.contains("\"type\":\"ASSIGN\"")) {
                // Client requesting alliance assignment
                assignedAlliance = parseStringField(message, "alliance");
                System.out.println("Client assigned to " + assignedAlliance + " alliance");
            } else if (message.contains("\"type\":\"SCORE_UPDATE\"") && assignedAlliance != null) {
                // Client sending score update for their alliance
                applyScoreUpdate(message, assignedAlliance);
            }
        }
        
        void send(String message) {
            if (connected && out != null) {
                out.println(message);
            }
        }
        
        void close() {
            connected = false;
            try {
                if (in != null) in.close();
                if (out != null) out.close();
                if (socket != null) socket.close();
            } catch (IOException e) {
                // Ignore
            }
        }
    }
}
