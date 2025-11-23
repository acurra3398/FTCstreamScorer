package org.ftc.scorer.ui;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration class for emoji icons used in the stream output
 * Allows easy customization of visual elements without changing core logic
 */
public class EmojiConfig {
    // Icon emojis for scoring elements
    public static final String CLASSIFIED_ICON = "📦";
    public static final String OVERFLOW_ICON = "💧";
    public static final String LEAVE_ICON = "🚀";
    public static final String BASE_ICON = "🏠";
    public static final String PATTERN_ICON = "🎨";
    public static final String FOUL_ICON = "⚠️";
    
    // Additional UI emojis
    public static final String TROPHY_ICON = "🏆";
    public static final String TIMER_ICON = "⏱️";
    public static final String TEAM_ICON = "👥";
    
    private static final Map<String, String> EMOJI_MAP = new HashMap<>();
    
    static {
        EMOJI_MAP.put("classified_icon", CLASSIFIED_ICON);
        EMOJI_MAP.put("overflow_icon", OVERFLOW_ICON);
        EMOJI_MAP.put("leave_icon", LEAVE_ICON);
        EMOJI_MAP.put("base_icon", BASE_ICON);
        EMOJI_MAP.put("pattern_icon", PATTERN_ICON);
        EMOJI_MAP.put("foul_icon", FOUL_ICON);
        EMOJI_MAP.put("trophy_icon", TROPHY_ICON);
        EMOJI_MAP.put("timer_icon", TIMER_ICON);
        EMOJI_MAP.put("team_icon", TEAM_ICON);
    }
    
    /**
     * Get emoji for a given icon name
     * @param iconName The name of the icon (e.g., "classified_icon", "overflow_icon")
     * @return The emoji string for that icon
     */
    public static String getEmoji(String iconName) {
        return EMOJI_MAP.getOrDefault(iconName, "❓"); // Unknown icon
    }
}
