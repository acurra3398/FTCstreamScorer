package org.ftc.scorer.service;

/**
 * Simple JSON parsing utilities for sync protocol messages.
 * This is a lightweight parser for the sync protocol - no external dependencies needed.
 * 
 * Note: This parser is designed for the specific JSON structure used in score syncing.
 * It handles basic integer, boolean, and string fields but is not a full JSON parser.
 */
public final class JsonParser {
    
    private JsonParser() {
        // Utility class - no instantiation
    }
    
    /**
     * Parse an integer field from a JSON string.
     * Handles positive and negative numbers.
     * 
     * @param json the JSON string to parse
     * @param field the field name to find
     * @return the parsed integer value, or 0 if not found or invalid
     */
    public static int parseIntField(String json, String field) {
        String pattern = "\"" + field + "\":";
        int start = json.indexOf(pattern);
        if (start < 0) return 0;
        start += pattern.length();
        
        // Skip whitespace
        while (start < json.length() && Character.isWhitespace(json.charAt(start))) {
            start++;
        }
        
        if (start >= json.length()) return 0;
        
        // Check for negative sign at start
        boolean negative = false;
        if (json.charAt(start) == '-') {
            negative = true;
            start++;
        }
        
        // Parse digits
        int end = start;
        while (end < json.length() && Character.isDigit(json.charAt(end))) {
            end++;
        }
        
        if (end == start) return 0; // No digits found
        
        try {
            int value = Integer.parseInt(json.substring(start, end));
            return negative ? -value : value;
        } catch (NumberFormatException e) {
            return 0;
        }
    }
    
    /**
     * Parse a boolean field from a JSON string.
     * Returns true only if the value is exactly "true" followed by a non-alphanumeric character.
     * 
     * @param json the JSON string to parse
     * @param field the field name to find
     * @return the parsed boolean value, or false if not found or invalid
     */
    public static boolean parseBoolField(String json, String field) {
        String pattern = "\"" + field + "\":";
        int start = json.indexOf(pattern);
        if (start < 0) return false;
        start += pattern.length();
        
        // Skip whitespace
        while (start < json.length() && Character.isWhitespace(json.charAt(start))) {
            start++;
        }
        
        // Check for "true" followed by proper delimiter
        if (start + 4 <= json.length()) {
            String value = json.substring(start, start + 4);
            if ("true".equals(value)) {
                // Make sure it's not followed by alphanumeric (e.g., "true123")
                if (start + 4 >= json.length() || !Character.isLetterOrDigit(json.charAt(start + 4))) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Parse a string field from a JSON string.
     * Returns the value between quotes after the field name.
     * 
     * @param json the JSON string to parse
     * @param field the field name to find
     * @return the parsed string value, or null if not found
     */
    public static String parseStringField(String json, String field) {
        String pattern = "\"" + field + "\":\"";
        int start = json.indexOf(pattern);
        if (start < 0) return null;
        start += pattern.length();
        int end = json.indexOf("\"", start);
        if (end < 0) return null;
        return json.substring(start, end);
    }
    
    /**
     * Extract a section of JSON between markers.
     * 
     * @param json the JSON string to parse
     * @param startMarker the starting marker (e.g., "\"red\":{")
     * @param endMarker the ending marker (e.g., "}")
     * @return the extracted section including the endMarker, or null if not found
     */
    public static String extractSection(String json, String startMarker, String endMarker) {
        int start = json.indexOf(startMarker);
        if (start < 0) return null;
        start += startMarker.length() - 1; // Include the opening brace
        int end = json.indexOf(endMarker, start) + 1;
        if (end <= start) return null;
        return json.substring(start, end);
    }
}
