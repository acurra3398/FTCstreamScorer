package org.ftc.scorer.webcam;

import com.github.sarxos.webcam.Webcam;
import com.github.sarxos.webcam.WebcamResolution;
import javafx.application.Platform;
import javafx.embed.swing.SwingFXUtils;
import javafx.scene.image.Image;
import javafx.scene.image.WritableImage;

import java.awt.Dimension;
import java.awt.image.BufferedImage;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Service for capturing webcam video feed
 * Supports configurable resolution and refresh rate for optimal streaming quality
 */
public class WebcamService {
    private Webcam webcam;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private Thread captureThread;
    private WebcamFrameListener listener;
    
    // Default to 1080p resolution for high quality streaming
    private Dimension targetResolution = WebcamResolution.FHD.getSize(); // 1920x1080
    
    // Default to 60 FPS for smooth video
    private int targetFps = 60;
    
    public interface WebcamFrameListener {
        void onFrame(Image frame);
    }
    
    public void setFrameListener(WebcamFrameListener listener) {
        this.listener = listener;
    }
    
    public List<Webcam> getAvailableWebcams() {
        return Webcam.getWebcams();
    }
    
    /**
     * Set the target resolution for webcam capture
     * @param resolution the desired resolution (e.g., WebcamResolution.FHD for 1080p)
     */
    public void setResolution(WebcamResolution resolution) {
        this.targetResolution = resolution.getSize();
    }
    
    /**
     * Set the target resolution for webcam capture using custom dimensions
     * @param width the desired width in pixels
     * @param height the desired height in pixels
     */
    public void setResolution(int width, int height) {
        this.targetResolution = new Dimension(width, height);
    }
    
    /**
     * Set the target frames per second for webcam capture
     * @param fps the desired FPS (e.g., 30 or 60)
     */
    public void setTargetFps(int fps) {
        this.targetFps = Math.max(1, Math.min(120, fps)); // Clamp between 1-120 FPS
    }
    
    /**
     * Get supported resolutions for a specific webcam
     * @param webcam the webcam to check
     * @return array of supported dimensions
     */
    public Dimension[] getSupportedResolutions(Webcam webcam) {
        if (webcam != null) {
            return webcam.getViewSizes();
        }
        return new Dimension[0];
    }
    
    /**
     * Find the best matching resolution that the webcam supports
     * Falls back to next best option if target resolution is not supported
     * @param webcam the webcam to check
     * @param target the target resolution
     * @return the best matching supported resolution
     */
    private Dimension findBestResolution(Webcam webcam, Dimension target) {
        Dimension[] supported = webcam.getViewSizes();
        if (supported == null || supported.length == 0) {
            return target; // Hope for the best
        }
        
        // First, try to find exact match
        for (Dimension d : supported) {
            if (d.equals(target)) {
                return d;
            }
        }
        
        // Find the largest resolution that doesn't exceed target
        Dimension best = supported[0];
        int targetPixels = target.width * target.height;
        
        for (Dimension d : supported) {
            int pixels = d.width * d.height;
            int bestPixels = best.width * best.height;
            
            // Prefer resolution closest to target without exceeding it
            if (pixels <= targetPixels && pixels > bestPixels) {
                best = d;
            } else if (bestPixels > targetPixels && pixels < bestPixels) {
                // If current best exceeds target, prefer smaller
                best = d;
            }
        }
        
        // If all resolutions are smaller than target, use the largest available
        if (best.width * best.height < targetPixels) {
            for (Dimension d : supported) {
                if (d.width * d.height > best.width * best.height) {
                    best = d;
                }
            }
        }
        
        return best;
    }
    
    public void start(Webcam selectedWebcam) {
        if (running.get()) {
            stop();
        }
        
        this.webcam = selectedWebcam;
        if (webcam != null) {
            // Find best supported resolution matching target
            Dimension resolution = findBestResolution(webcam, targetResolution);
            System.out.println("Webcam resolution: " + resolution.width + "x" + resolution.height + 
                             " (target: " + targetResolution.width + "x" + targetResolution.height + ")");
            
            webcam.setViewSize(resolution);
            webcam.open();
            
            running.set(true);
            captureThread = new Thread(this::captureLoop);
            captureThread.setDaemon(true);
            captureThread.setPriority(Thread.MAX_PRIORITY); // High priority for smooth capture
            captureThread.start();
        }
    }
    
    public void start() {
        Webcam defaultWebcam = Webcam.getDefault();
        if (defaultWebcam != null) {
            start(defaultWebcam);
        }
    }
    
    private void captureLoop() {
        // Calculate frame delay based on target FPS
        long frameDelayMs = 1000 / targetFps;
        long lastFrameTime = System.currentTimeMillis();
        
        // Minimum sleep time to prevent busy-waiting (at least 5ms)
        final long MIN_SLEEP_MS = 5;
        
        // Reuse WritableImage for better performance
        WritableImage fxImage = null;
        
        while (running.get() && webcam != null && webcam.isOpen()) {
            try {
                long currentTime = System.currentTimeMillis();
                long elapsed = currentTime - lastFrameTime;
                
                // Only capture if enough time has passed for target FPS
                if (elapsed >= frameDelayMs) {
                    BufferedImage bufferedImage = webcam.getImage();
                    if (bufferedImage != null && listener != null) {
                        // Reuse or create WritableImage for better performance
                        final WritableImage frame = SwingFXUtils.toFXImage(bufferedImage, fxImage);
                        fxImage = frame;
                        
                        Platform.runLater(() -> listener.onFrame(frame));
                    }
                    lastFrameTime = currentTime;
                }
                
                // Calculate remaining time until next frame, with minimum sleep to prevent busy-waiting
                long timeUntilNextFrame = frameDelayMs - (System.currentTimeMillis() - lastFrameTime);
                long sleepTime = Math.max(MIN_SLEEP_MS, timeUntilNextFrame);
                Thread.sleep(sleepTime);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
    
    public void stop() {
        running.set(false);
        if (captureThread != null) {
            try {
                captureThread.join(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        if (webcam != null && webcam.isOpen()) {
            webcam.close();
        }
    }
    
    public boolean isRunning() {
        return running.get();
    }
    
    /**
     * Get the current target resolution
     * @return the target resolution dimension
     */
    public Dimension getTargetResolution() {
        return targetResolution;
    }
    
    /**
     * Get the current target FPS
     * @return the target frames per second
     */
    public int getTargetFps() {
        return targetFps;
    }
}
