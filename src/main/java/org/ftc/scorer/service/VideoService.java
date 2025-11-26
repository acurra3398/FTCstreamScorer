package org.ftc.scorer.service;

import javafx.scene.media.Media;
import javafx.scene.media.MediaPlayer;
import javafx.scene.media.MediaView;
import java.net.URL;

/**
 * Service for playing winner celebration videos
 * Videos should be placed in src/main/resources/videos/
 * Supports WebM and MP4 formats:
 * - red_winner.webm or red_winner.mp4 for red alliance victory
 * - blue_winner.webm or blue_winner.mp4 for blue alliance victory
 * - tie.webm or tie.mp4 for tie matches
 */
public class VideoService {
    private MediaPlayer currentPlayer;
    private MediaView mediaView;
    
    // Supported video formats in order of preference
    private static final String[] VIDEO_EXTENSIONS = {".webm", ".mp4"};
    
    public VideoService() {
        mediaView = new MediaView();
        mediaView.setPreserveRatio(true);
    }
    
    /**
     * Get the MediaView for displaying videos
     */
    public MediaView getMediaView() {
        return mediaView;
    }
    
    /**
     * Play the winner video based on which alliance won
     * Tries WebM first, then MP4 as fallback
     * @param redWins true if red alliance won, false if blue alliance won
     * @param onFinished callback when video finishes or if video not found
     */
    public void playWinnerVideo(boolean redWins, Runnable onFinished) {
        String baseName = redWins ? "/videos/red_winner" : "/videos/blue_winner";
        String videoPath = findVideoPath(baseName);
        if (videoPath != null) {
            playVideo(videoPath, onFinished);
        } else {
            System.out.println("No winner video found for " + baseName + " - Showing results directly");
            if (onFinished != null) {
                onFinished.run();
            }
        }
    }
    
    /**
     * Play the tie video when scores are equal
     * Tries WebM first, then MP4 as fallback
     * @param onFinished callback when video finishes or if video not found
     */
    public void playTieVideo(Runnable onFinished) {
        String baseName = "/videos/tie";
        String videoPath = findVideoPath(baseName);
        if (videoPath != null) {
            playVideo(videoPath, onFinished);
        } else {
            System.out.println("No tie video found - Showing results directly");
            if (onFinished != null) {
                onFinished.run();
            }
        }
    }
    
    /**
     * Find the video path by trying supported extensions
     * @param basePath base path without extension (e.g., "/videos/red_winner")
     * @return full path with extension if found, null otherwise
     */
    private String findVideoPath(String basePath) {
        for (String ext : VIDEO_EXTENSIONS) {
            String path = basePath + ext;
            if (getClass().getResource(path) != null) {
                return path;
            }
        }
        return null;
    }
    
    /**
     * Play a video from resources
     * @param resourcePath path to video in resources
     * @param onFinished callback when video finishes
     */
    private void playVideo(String resourcePath, Runnable onFinished) {
        try {
            URL resource = getClass().getResource(resourcePath);
            if (resource != null) {
                Media media = new Media(resource.toString());
                currentPlayer = new MediaPlayer(media);
                mediaView.setMediaPlayer(currentPlayer);
                
                currentPlayer.setOnEndOfMedia(() -> {
                    stop();
                    if (onFinished != null) {
                        onFinished.run();
                    }
                });
                
                currentPlayer.setOnError(() -> {
                    System.err.println("Error playing video: " + currentPlayer.getError());
                    stop();
                    if (onFinished != null) {
                        onFinished.run();
                    }
                });
                
                currentPlayer.play();
            } else {
                System.out.println("Video file not found: " + resourcePath + " - Showing results directly");
                if (onFinished != null) {
                    onFinished.run();
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to play video: " + resourcePath);
            e.printStackTrace();
            if (onFinished != null) {
                onFinished.run();
            }
        }
    }
    
    /**
     * Check if a winner video exists (in any supported format)
     * @param redWins true to check for red winner video, false for blue
     * @return true if the video file exists
     */
    public boolean hasWinnerVideo(boolean redWins) {
        String baseName = redWins ? "/videos/red_winner" : "/videos/blue_winner";
        return findVideoPath(baseName) != null;
    }
    
    /**
     * Check if a tie video exists (in any supported format)
     * @return true if the tie video file exists
     */
    public boolean hasTieVideo() {
        return findVideoPath("/videos/tie") != null;
    }
    
    /**
     * Stop any currently playing video
     */
    public void stop() {
        if (currentPlayer != null) {
            currentPlayer.stop();
            currentPlayer.dispose();
            currentPlayer = null;
        }
        mediaView.setMediaPlayer(null);
    }
    
    /**
     * Check if a video is currently playing
     */
    public boolean isPlaying() {
        return currentPlayer != null && 
               currentPlayer.getStatus() == MediaPlayer.Status.PLAYING;
    }
}
