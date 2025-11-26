package org.ftc.scorer.service;

import javafx.application.Platform;
import org.ftc.scorer.model.DecodeScore;
import org.ftc.scorer.model.Match;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.concurrent.*;

/**
 * Cloud-based score synchronization - Easy setup with just event name + password!
 * 
 * HOW IT WORKS:
 * 1. Host creates an event with a name and password
 * 2. Scorers join using the same event name and password  
 * 3. All devices sync automatically through the cloud
 * 4. Works on any network - no WiFi configuration needed!
 * 
 * SETUP FOR SELF-HOSTING (optional):
 * If you want to host your own backend, see the supabase-setup folder.
 * Otherwise, the app uses the default hosted backend.
 */
public class CloudSyncService {
    
    // Default hosted backend - users can self-host if desired
    // To self-host: Create a Supabase project and update these values
    private static final String DEFAULT_SUPABASE_URL = "https://your-project.supabase.co";
    private static final String DEFAULT_SUPABASE_KEY = "your-anon-key";
    
    private final Match match;
    private final HttpClient httpClient;
    private final ScheduledExecutorService scheduler;
    
    private String supabaseUrl;
    private String supabaseKey;
    
    private String eventName;
    private String eventPasswordHash;
    private String deviceRole; // "HOST", "RED_SCORER", "BLUE_SCORER"
    private String deviceId;
    
    private volatile boolean connected = false;
    private volatile boolean syncing = false;
    private ScheduledFuture<?> syncTask;
    
    private Runnable onScoreUpdate;
    private Runnable onConnectionChange;
    private Runnable onDeviceListUpdate;
    
    // Connected devices tracking (for host)
    private volatile int connectedDevices = 0;
    private volatile String lastSyncTime = "";
    
    // Sync interval in milliseconds
    private static final int SYNC_INTERVAL_MS = 500;
    
    public CloudSyncService(Match match) {
        this.match = match;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "CloudSync");
            t.setDaemon(true);
            return t;
        });
        
        // Generate unique device ID
        this.deviceId = generateDeviceId();
        
        // Use default backend
        this.supabaseUrl = DEFAULT_SUPABASE_URL;
        this.supabaseKey = DEFAULT_SUPABASE_KEY;
    }
    
    /**
     * Configure custom Supabase backend (for self-hosting)
     */
    public void setCustomBackend(String url, String key) {
        this.supabaseUrl = url.trim();
        this.supabaseKey = key.trim();
    }
    
    /**
     * Check if backend is configured and reachable
     */
    public boolean isBackendConfigured() {
        return supabaseUrl != null && !supabaseUrl.isEmpty() 
            && !supabaseUrl.equals("https://your-project.supabase.co")
            && supabaseKey != null && !supabaseKey.isEmpty()
            && !supabaseKey.equals("your-anon-key");
    }
    
    /**
     * Generate a unique device ID for this installation
     */
    private String generateDeviceId() {
        try {
            String seed = System.getProperty("user.name") + 
                         System.getProperty("os.name") + 
                         System.currentTimeMillis();
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(seed.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash).substring(0, 12);
        } catch (Exception e) {
            return "device-" + System.currentTimeMillis();
        }
    }
    
    /**
     * Hash a password for secure storage
     */
    private String hashPassword(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(password.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            return password; // Fallback to plain text if hashing fails
        }
    }
    
    /**
     * CREATE A NEW EVENT (Host only)
     * 
     * @param eventName The name of the event (e.g., "Scrimmage 2024")
     * @param password The password for the event
     * @return CompletableFuture with success message or error
     */
    public CompletableFuture<String> createEvent(String eventName, String password) {
        if (!isBackendConfigured()) {
            return CompletableFuture.completedFuture(
                "Cloud sync not configured. Please set up Supabase backend.\n" +
                "See README for instructions or use local WiFi sync instead."
            );
        }
        
        if (eventName == null || eventName.trim().isEmpty()) {
            return CompletableFuture.completedFuture("Please enter an event name");
        }
        if (password == null || password.length() < 4) {
            return CompletableFuture.completedFuture("Password must be at least 4 characters");
        }
        
        this.eventName = eventName.trim().toUpperCase().replaceAll("[^A-Z0-9]", "_");
        this.eventPasswordHash = hashPassword(password);
        this.deviceRole = "HOST";
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Check if event already exists
                if (eventExists(this.eventName)) {
                    return "Event '" + eventName + "' already exists.\nUse 'Join Event' to connect, or choose a different name.";
                }
                
                // Create the event
                boolean success = insertEventData();
                if (success) {
                    connected = true;
                    startPolling();
                    notifyConnectionChange();
                    return "✓ Event created successfully!\n\n" +
                           "Share this with your scorers:\n" +
                           "Event: " + this.eventName + "\n" +
                           "Password: (the one you entered)\n\n" +
                           "Waiting for scorers to connect...";
                } else {
                    return "Failed to create event. Please try again.";
                }
            } catch (Exception e) {
                System.err.println("Failed to create event: " + e.getMessage());
                e.printStackTrace();
                return "Error: " + e.getMessage();
            }
        });
    }
    
    /**
     * JOIN AN EXISTING EVENT (Scorer)
     * 
     * @param eventName The event name to join
     * @param password The event password
     * @param role "RED" or "BLUE" - which alliance to score
     * @return CompletableFuture with success message or error
     */
    public CompletableFuture<String> joinEvent(String eventName, String password, String role) {
        if (!isBackendConfigured()) {
            return CompletableFuture.completedFuture(
                "Cloud sync not configured. Please set up Supabase backend.\n" +
                "See README for instructions or use local WiFi sync instead."
            );
        }
        
        if (eventName == null || eventName.trim().isEmpty()) {
            return CompletableFuture.completedFuture("Please enter the event name");
        }
        if (password == null || password.isEmpty()) {
            return CompletableFuture.completedFuture("Please enter the password");
        }
        
        this.eventName = eventName.trim().toUpperCase().replaceAll("[^A-Z0-9]", "_");
        this.eventPasswordHash = hashPassword(password);
        this.deviceRole = role + "_SCORER";
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Verify event exists and password matches
                String verification = verifyEventAccess(this.eventName, this.eventPasswordHash);
                if (verification != null) {
                    return verification; // Error message
                }
                
                // Register this device as a scorer
                registerDevice();
                
                connected = true;
                startPolling();
                notifyConnectionChange();
                
                return "✓ Connected to event!\n\n" +
                       "You are scoring for: " + role + " Alliance\n" +
                       "Your changes will sync automatically.";
                       
            } catch (Exception e) {
                System.err.println("Failed to join event: " + e.getMessage());
                e.printStackTrace();
                return "Error: " + e.getMessage();
            }
        });
    }
    
    /**
     * Check if an event already exists
     */
    private boolean eventExists(String eventName) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/events?event_name=eq." + eventName + "&select=event_name"))
                .header("apikey", supabaseKey)
                .header("Authorization", "Bearer " + supabaseKey)
                .header("Accept", "application/json")
                .GET()
                .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.statusCode() == 200 && response.body().length() > 2;
    }
    
    /**
     * Verify event exists and password is correct
     */
    private String verifyEventAccess(String eventName, String passwordHash) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/events?event_name=eq." + eventName + "&select=password_hash"))
                .header("apikey", supabaseKey)
                .header("Authorization", "Bearer " + supabaseKey)
                .header("Accept", "application/json")
                .GET()
                .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() != 200) {
            return "Failed to connect to server";
        }
        
        String body = response.body();
        if (body.equals("[]")) {
            return "Event not found. Check the event name and try again.";
        }
        
        // Check password
        if (!body.contains("\"password_hash\":\"" + passwordHash + "\"")) {
            return "Incorrect password. Please try again.";
        }
        
        return null; // Success
    }
    
    /**
     * Insert new event data
     */
    private boolean insertEventData() throws Exception {
        String json = buildEventJson();
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/events"))
                .header("apikey", supabaseKey)
                .header("Authorization", "Bearer " + supabaseKey)
                .header("Content-Type", "application/json")
                .header("Prefer", "return=minimal")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.statusCode() >= 200 && response.statusCode() < 300;
    }
    
    /**
     * Register this device as connected
     */
    private void registerDevice() throws Exception {
        String json = "{" +
                "\"event_name\":\"" + eventName + "\"," +
                "\"device_id\":\"" + deviceId + "\"," +
                "\"device_role\":\"" + deviceRole + "\"," +
                "\"last_seen\":\"" + java.time.Instant.now().toString() + "\"" +
                "}";
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/connected_devices"))
                .header("apikey", supabaseKey)
                .header("Authorization", "Bearer " + supabaseKey)
                .header("Content-Type", "application/json")
                .header("Prefer", "resolution=merge-duplicates")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }
    
    /**
     * Update device heartbeat
     */
    private void updateHeartbeat() throws Exception {
        String json = "{\"last_seen\":\"" + java.time.Instant.now().toString() + "\"}";
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/connected_devices?event_name=eq." + eventName + "&device_id=eq." + deviceId))
                .header("apikey", supabaseKey)
                .header("Authorization", "Bearer " + supabaseKey)
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(json))
                .build();
        
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }
    
    /**
     * Disconnect from the event
     */
    public void disconnect() {
        connected = false;
        syncing = false;
        
        if (syncTask != null) {
            syncTask.cancel(true);
            syncTask = null;
        }
        
        // Remove device from connected list
        if (eventName != null && deviceId != null) {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(supabaseUrl + "/rest/v1/connected_devices?event_name=eq." + eventName + "&device_id=eq." + deviceId))
                        .header("apikey", supabaseKey)
                        .header("Authorization", "Bearer " + supabaseKey)
                        .DELETE()
                        .build();
                
                httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString());
            } catch (Exception ignored) {}
        }
        
        eventName = null;
        eventPasswordHash = null;
        deviceRole = null;
        
        notifyConnectionChange();
    }
    
    /**
     * Send current score update to cloud
     */
    public void sendScoreUpdate() {
        if (!connected || eventName == null) {
            return;
        }
        
        CompletableFuture.runAsync(() -> {
            try {
                upsertScoreData();
            } catch (Exception e) {
                System.err.println("Failed to send score update: " + e.getMessage());
            }
        });
    }
    
    /**
     * Start polling for updates
     */
    private void startPolling() {
        if (syncTask != null) {
            syncTask.cancel(true);
        }
        
        syncTask = scheduler.scheduleAtFixedRate(() -> {
            if (!connected) return;
            
            try {
                syncing = true;
                
                // Update heartbeat
                updateHeartbeat();
                
                // Push our scores
                upsertScoreData();
                
                // Fetch latest state
                fetchScoreData();
                
                // If host, count connected devices
                if ("HOST".equals(deviceRole)) {
                    countConnectedDevices();
                }
                
                lastSyncTime = java.time.LocalTime.now().toString().substring(0, 8);
                
            } catch (Exception e) {
                System.err.println("Sync error: " + e.getMessage());
            } finally {
                syncing = false;
            }
        }, 0, SYNC_INTERVAL_MS, TimeUnit.MILLISECONDS);
    }
    
    /**
     * Build event JSON for creation
     */
    private String buildEventJson() {
        StringBuilder json = new StringBuilder();
        json.append("{");
        json.append("\"event_name\":\"").append(eventName).append("\",");
        json.append("\"password_hash\":\"").append(eventPasswordHash).append("\",");
        json.append("\"host_device_id\":\"").append(deviceId).append("\",");
        json.append("\"created_at\":\"").append(java.time.Instant.now().toString()).append("\",");
        
        // Initial score data
        json.append("\"motif\":\"").append(match.getRedScore().getMotif().name()).append("\",");
        json.append("\"match_state\":\"").append(match.getState().name()).append("\",");
        
        // Team info
        json.append("\"red_team1\":\"").append(escapeJson(match.getRedTeam1Number())).append("\",");
        json.append("\"red_team2\":\"").append(escapeJson(match.getRedTeam2Number())).append("\",");
        json.append("\"blue_team1\":\"").append(escapeJson(match.getBlueTeam1Number())).append("\",");
        json.append("\"blue_team2\":\"").append(escapeJson(match.getBlueTeam2Number())).append("\",");
        
        // Red scores
        appendScoreFields(json, "red_", match.getRedScore());
        
        // Blue scores
        appendScoreFields(json, "blue_", match.getBlueScore());
        
        // Remove trailing comma
        if (json.charAt(json.length() - 1) == ',') {
            json.setLength(json.length() - 1);
        }
        json.append("}");
        
        return json.toString();
    }
    
    /**
     * Update score data in cloud
     */
    private void upsertScoreData() throws Exception {
        StringBuilder json = new StringBuilder();
        json.append("{");
        
        // Always update motif and match state
        json.append("\"motif\":\"").append(match.getRedScore().getMotif().name()).append("\",");
        json.append("\"match_state\":\"").append(match.getState().name()).append("\",");
        
        // Update based on role
        if ("HOST".equals(deviceRole)) {
            // Host updates everything
            json.append("\"red_team1\":\"").append(escapeJson(match.getRedTeam1Number())).append("\",");
            json.append("\"red_team2\":\"").append(escapeJson(match.getRedTeam2Number())).append("\",");
            json.append("\"blue_team1\":\"").append(escapeJson(match.getBlueTeam1Number())).append("\",");
            json.append("\"blue_team2\":\"").append(escapeJson(match.getBlueTeam2Number())).append("\",");
            appendScoreFields(json, "red_", match.getRedScore());
            appendScoreFields(json, "blue_", match.getBlueScore());
        } else if ("RED_SCORER".equals(deviceRole)) {
            appendScoreFields(json, "red_", match.getRedScore());
        } else if ("BLUE_SCORER".equals(deviceRole)) {
            appendScoreFields(json, "blue_", match.getBlueScore());
        }
        
        // Remove trailing comma
        if (json.charAt(json.length() - 1) == ',') {
            json.setLength(json.length() - 1);
        }
        json.append("}");
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/events?event_name=eq." + eventName))
                .header("apikey", supabaseKey)
                .header("Authorization", "Bearer " + supabaseKey)
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(json.toString()))
                .build();
        
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }
    
    /**
     * Fetch score data from cloud
     */
    private void fetchScoreData() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/events?event_name=eq." + eventName + "&select=*"))
                .header("apikey", supabaseKey)
                .header("Authorization", "Bearer " + supabaseKey)
                .header("Accept", "application/json")
                .GET()
                .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() == 200 && response.body().length() > 2) {
            applyScoreData(response.body());
        }
    }
    
    /**
     * Count connected devices (host only)
     */
    private void countConnectedDevices() throws Exception {
        // Count devices that have been seen in the last 30 seconds
        String cutoff = java.time.Instant.now().minusSeconds(30).toString();
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/connected_devices?event_name=eq." + eventName + 
                               "&last_seen=gte." + cutoff + "&select=device_role"))
                .header("apikey", supabaseKey)
                .header("Authorization", "Bearer " + supabaseKey)
                .header("Accept", "application/json")
                .GET()
                .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() == 200) {
            // Count occurrences of device_role
            String body = response.body();
            int count = 0;
            int idx = 0;
            while ((idx = body.indexOf("\"device_role\"", idx)) != -1) {
                count++;
                idx++;
            }
            
            if (count != connectedDevices) {
                connectedDevices = count;
                if (onDeviceListUpdate != null) {
                    Platform.runLater(onDeviceListUpdate);
                }
            }
        }
    }
    
    private void appendScoreFields(StringBuilder json, String prefix, DecodeScore score) {
        json.append("\"").append(prefix).append("auto_classified\":").append(score.getAutoClassified()).append(",");
        json.append("\"").append(prefix).append("auto_overflow\":").append(score.getAutoOverflow()).append(",");
        json.append("\"").append(prefix).append("auto_pattern\":").append(score.getAutoPatternMatches()).append(",");
        json.append("\"").append(prefix).append("teleop_classified\":").append(score.getTeleopClassified()).append(",");
        json.append("\"").append(prefix).append("teleop_overflow\":").append(score.getTeleopOverflow()).append(",");
        json.append("\"").append(prefix).append("teleop_depot\":").append(score.getTeleopDepot()).append(",");
        json.append("\"").append(prefix).append("teleop_pattern\":").append(score.getTeleopPatternMatches()).append(",");
        json.append("\"").append(prefix).append("robot1_leave\":").append(score.isRobot1Leave()).append(",");
        json.append("\"").append(prefix).append("robot2_leave\":").append(score.isRobot2Leave()).append(",");
        json.append("\"").append(prefix).append("robot1_base\":\"").append(score.getRobot1Base().name()).append("\",");
        json.append("\"").append(prefix).append("robot2_base\":\"").append(score.getRobot2Base().name()).append("\",");
        json.append("\"").append(prefix).append("major_fouls\":").append(score.getMajorFouls()).append(",");
        json.append("\"").append(prefix).append("minor_fouls\":").append(score.getMinorFouls()).append(",");
    }
    
    /**
     * Apply fetched score data to local model
     */
    private void applyScoreData(String jsonArray) {
        try {
            String json = jsonArray.substring(1, jsonArray.length() - 1);
            if (json.isEmpty()) return;
            
            // Only apply scores we don't control
            if (!"RED_SCORER".equals(deviceRole)) {
                applyAllianceScore(match.getRedScore(), json, "red_");
            }
            if (!"BLUE_SCORER".equals(deviceRole)) {
                applyAllianceScore(match.getBlueScore(), json, "blue_");
            }
            
            // Update motif
            String motif = parseStringField(json, "motif");
            if (motif != null && !motif.isEmpty()) {
                try {
                    DecodeScore.MotifType motifType = DecodeScore.MotifType.valueOf(motif);
                    match.getRedScore().setMotif(motifType);
                    match.getBlueScore().setMotif(motifType);
                } catch (IllegalArgumentException ignored) {}
            }
            
            // Notify UI
            if (onScoreUpdate != null) {
                Platform.runLater(onScoreUpdate);
            }
            
        } catch (Exception e) {
            System.err.println("Error parsing score data: " + e.getMessage());
        }
    }
    
    private void applyAllianceScore(DecodeScore score, String json, String prefix) {
        score.setAutoClassified(parseIntField(json, prefix + "auto_classified"));
        score.setAutoOverflow(parseIntField(json, prefix + "auto_overflow"));
        score.setAutoPatternMatches(parseIntField(json, prefix + "auto_pattern"));
        score.setTeleopClassified(parseIntField(json, prefix + "teleop_classified"));
        score.setTeleopOverflow(parseIntField(json, prefix + "teleop_overflow"));
        score.setTeleopDepot(parseIntField(json, prefix + "teleop_depot"));
        score.setTeleopPatternMatches(parseIntField(json, prefix + "teleop_pattern"));
        score.setRobot1Leave(parseBoolField(json, prefix + "robot1_leave"));
        score.setRobot2Leave(parseBoolField(json, prefix + "robot2_leave"));
        score.setMajorFouls(parseIntField(json, prefix + "major_fouls"));
        score.setMinorFouls(parseIntField(json, prefix + "minor_fouls"));
        
        String base1 = parseStringField(json, prefix + "robot1_base");
        String base2 = parseStringField(json, prefix + "robot2_base");
        if (base1 != null) {
            try { score.setRobot1Base(DecodeScore.BaseStatus.valueOf(base1)); } 
            catch (IllegalArgumentException ignored) {}
        }
        if (base2 != null) {
            try { score.setRobot2Base(DecodeScore.BaseStatus.valueOf(base2)); } 
            catch (IllegalArgumentException ignored) {}
        }
    }
    
    // JSON parsing helpers
    private int parseIntField(String json, String field) {
        try {
            String pattern = "\"" + field + "\":";
            int start = json.indexOf(pattern);
            if (start < 0) return 0;
            start += pattern.length();
            int end = start;
            while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '-')) {
                end++;
            }
            return Integer.parseInt(json.substring(start, end));
        } catch (Exception e) {
            return 0;
        }
    }
    
    private boolean parseBoolField(String json, String field) {
        return json.contains("\"" + field + "\":true");
    }
    
    private String parseStringField(String json, String field) {
        try {
            String pattern = "\"" + field + "\":\"";
            int start = json.indexOf(pattern);
            if (start < 0) return null;
            start += pattern.length();
            int end = json.indexOf("\"", start);
            if (end < 0) return null;
            return json.substring(start, end);
        } catch (Exception e) {
            return null;
        }
    }
    
    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
    
    // Getters and setters
    
    public void setOnScoreUpdate(Runnable callback) {
        this.onScoreUpdate = callback;
    }
    
    public void setOnConnectionChange(Runnable callback) {
        this.onConnectionChange = callback;
    }
    
    public void setOnDeviceListUpdate(Runnable callback) {
        this.onDeviceListUpdate = callback;
    }
    
    private void notifyConnectionChange() {
        if (onConnectionChange != null) {
            Platform.runLater(onConnectionChange);
        }
    }
    
    public boolean isConnected() {
        return connected;
    }
    
    public boolean isSyncing() {
        return syncing;
    }
    
    public String getEventName() {
        return eventName;
    }
    
    public String getDeviceRole() {
        return deviceRole;
    }
    
    public int getConnectedDevices() {
        return connectedDevices;
    }
    
    public String getLastSyncTime() {
        return lastSyncTime;
    }
    
    public boolean isHost() {
        return "HOST".equals(deviceRole);
    }
    
    /**
     * Test connection to the backend
     */
    public CompletableFuture<String> testConnection() {
        if (!isBackendConfigured()) {
            return CompletableFuture.completedFuture(
                "Cloud sync requires a Supabase backend.\n\n" +
                "To set up:\n" +
                "1. Create a free project at supabase.com\n" +
                "2. Run the SQL setup script (see supabase-setup/)\n" +
                "3. Update the backend URL and key in the code\n\n" +
                "Or use local WiFi sync for now."
            );
        }
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(supabaseUrl + "/rest/v1/events?select=event_name&limit=1"))
                        .header("apikey", supabaseKey)
                        .header("Authorization", "Bearer " + supabaseKey)
                        .GET()
                        .timeout(Duration.ofSeconds(10))
                        .build();
                
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                
                if (response.statusCode() == 200) {
                    return "✓ Backend connected successfully!";
                } else if (response.statusCode() == 401) {
                    return "✗ Invalid API key";
                } else {
                    return "✗ Error: " + response.statusCode();
                }
            } catch (Exception e) {
                return "✗ Connection failed: " + e.getMessage();
            }
        });
    }
    
    /**
     * Shutdown the service
     */
    public void shutdown() {
        disconnect();
        scheduler.shutdownNow();
    }
}

