package org.ftc.scorer.service;

import javafx.scene.media.Media;
import javafx.scene.media.MediaPlayer;
import javafx.scene.media.MediaView;
import java.net.URL;

/**
 * Service for playing winner celebration videos
 * Videos should be placed in src/main/resources/videos/
 * - red_winner.mp4 for red alliance victory
 * - blue_winner.mp4 for blue alliance victory
 */
public class VideoService {
    private MediaPlayer currentPlayer;
    private MediaView mediaView;
    
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
     * @param redWins true if red alliance won, false if blue alliance won
     * @param onFinished callback when video finishes or if video not found
     */
    public void playWinnerVideo(boolean redWins, Runnable onFinished) {
        String videoPath = redWins ? "/videos/red_winner.mp4" : "/videos/blue_winner.mp4";
        playVideo(videoPath, onFinished);
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
     * Check if a winner video exists
     * @param redWins true to check for red winner video, false for blue
     * @return true if the video file exists
     */
    public boolean hasWinnerVideo(boolean redWins) {
        String videoPath = redWins ? "/videos/red_winner.mp4" : "/videos/blue_winner.mp4";
        return getClass().getResource(videoPath) != null;
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
