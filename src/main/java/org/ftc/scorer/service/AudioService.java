package org.ftc.scorer.service;

import javafx.scene.media.Media;
import javafx.scene.media.MediaPlayer;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for playing audio effects during matches
 */
public class AudioService {
    private final Map<String, Media> audioCache = new HashMap<>();
    private MediaPlayer currentPlayer;
    
    public AudioService() {
        // Preload all audio files
        loadAudio("countdown", "/audio/countdown.wav");
        loadAudio("endauto", "/audio/endauto.wav");
        loadAudio("endmatch", "/audio/endmatch.wav");
        loadAudio("charge", "/audio/charge.wav");
        loadAudio("results", "/audio/results.wav");
    }
    
    private void loadAudio(String key, String resourcePath) {
        try {
            URL resource = getClass().getResource(resourcePath);
            if (resource != null) {
                Media media = new Media(resource.toString());
                audioCache.put(key, media);
            } else {
                System.err.println("Audio file not found: " + resourcePath);
            }
        } catch (Exception e) {
            System.err.println("Failed to load audio: " + resourcePath);
            e.printStackTrace();
        }
    }
    
    private void playAudio(String key) {
        Media media = audioCache.get(key);
        if (media != null) {
            // Stop current player if playing
            if (currentPlayer != null) {
                currentPlayer.stop();
            }
            
            currentPlayer = new MediaPlayer(media);
            currentPlayer.setOnEndOfMedia(() -> currentPlayer.dispose());
            currentPlayer.play();
        }
    }
    
    public void playCountdown() {
        playAudio("countdown");
    }
    
    public void playEndAuto() {
        playAudio("endauto");
    }
    
    public void playEndMatch() {
        playAudio("endmatch");
    }
    
    public void playCharge() {
        playAudio("charge");
    }
    
    public void playResults() {
        // Play results sound after a short delay
        new Thread(() -> {
            try {
                Thread.sleep(2000);
                playAudio("results");
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
    }
    
    public void stopAll() {
        if (currentPlayer != null) {
            currentPlayer.stop();
        }
    }
}
