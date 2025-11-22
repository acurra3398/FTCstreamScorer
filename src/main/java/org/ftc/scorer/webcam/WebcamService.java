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
 */
public class WebcamService {
    private Webcam webcam;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private Thread captureThread;
    private WebcamFrameListener listener;
    
    public interface WebcamFrameListener {
        void onFrame(Image frame);
    }
    
    public void setFrameListener(WebcamFrameListener listener) {
        this.listener = listener;
    }
    
    public List<Webcam> getAvailableWebcams() {
        return Webcam.getWebcams();
    }
    
    public void start(Webcam selectedWebcam) {
        if (running.get()) {
            stop();
        }
        
        this.webcam = selectedWebcam;
        if (webcam != null) {
            // Set resolution to 720p
            Dimension resolution = WebcamResolution.VGA.getSize();
            webcam.setViewSize(resolution);
            webcam.open();
            
            running.set(true);
            captureThread = new Thread(this::captureLoop);
            captureThread.setDaemon(true);
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
        while (running.get() && webcam != null && webcam.isOpen()) {
            try {
                BufferedImage bufferedImage = webcam.getImage();
                if (bufferedImage != null && listener != null) {
                    WritableImage fxImage = SwingFXUtils.toFXImage(bufferedImage, null);
                    Platform.runLater(() -> listener.onFrame(fxImage));
                }
                
                // Limit to ~30 FPS
                Thread.sleep(33);
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
}
