package org.ftc.scorer.service;

import javafx.scene.media.Media;
import javafx.scene.media.MediaPlayer;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

/**
 * Service for playing audio effects during matches
 */
public class AudioService {
    private final Map<String, Media> audioCache = new HashMap<>();
    private MediaPlayer currentPlayer;
    private final List<MediaPlayer> activePlayers = new CopyOnWriteArrayList<>();
    
    public AudioService() {
        // Preload all audio files
        loadAudio("countdown", "/audio/countdown.wav");
        loadAudio("matchstart", "/audio/startmatch.mp3");
        loadAudio("endauto", "/audio/endauto.wav");
        loadAudio("transition", "/audio/transition.mp3");
        loadAudio("endgame", "/audio/endgame_start.mp3");
        loadAudio("matchend", "/audio/endmatch.mp3");
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
    
    private void playAudio(String key, Runnable onFinished) {
        Media media = audioCache.get(key);
        if (media != null) {
            MediaPlayer player = new MediaPlayer(media);
            activePlayers.add(player);
            player.setOnEndOfMedia(() -> {
                if (onFinished != null) {
                    onFinished.run();
                }
                player.dispose();
                activePlayers.remove(player);
            });
            player.play();
            currentPlayer = player;
        } else if (onFinished != null) {
            // If audio not found, still call callback
            onFinished.run();
        }
    }
    
    /**
     * AT START: Play countdown → matchstart, WAIT for both to finish
     */
    public void playStartSequence(Runnable onFinished) {
        // Play countdown first, then matchstart
        playAudio("countdown", () -> {
            playAudio("matchstart", onFinished);
        });
    }
    
    /**
     * AT 0:30 (endauto): Play endauto, WAIT for sound to finish
     */
    public void playEndAuto(Runnable onFinished) {
        playAudio("endauto", onFinished);
    }
    
    /**
     * TRANSITION: Play transition, DO NOT WAIT (no callback)
     */
    public void playTransition() {
        playAudio("transition", null);
    }
    
    /**
     * WHEN teleop has 0:20 remaining: Play endgame, DO NOT WAIT
     */
    public void playEndgame() {
        playAudio("endgame", null);
    }
    
    /**
     * AT END_MATCH: Play matchend, WAIT for it to finish
     */
    public void playMatchEnd(Runnable onFinished) {
        playAudio("matchend", onFinished);
    }
    
    public void playResults() {
        // Play results sound after a short delay
        new Thread(() -> {
            try {
                Thread.sleep(2000);
                playAudio("results", null);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
    }
    
    public void stopAll() {
        for (MediaPlayer player : activePlayers) {
            player.stop();
            player.dispose();
        }
        activePlayers.clear();
    }
}
