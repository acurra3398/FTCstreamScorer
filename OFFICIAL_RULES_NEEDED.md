# Official FTC DECODE Rules Needed

## Current Status
⚠️ **The current scoring implementation may not match the official FTC DECODE 2025-2026 game rules.**

## What We Need
To implement accurate scoring, we need to verify the official game elements from the FTC Game Manual Part 2.

## Questions to Answer

1. **What is the actual name of the 2025-2026 FTC game?**
   - Is it actually called "DECODE"?
   - Or is this a placeholder/working name?

2. **What are the scoring elements?**
   - What objects do robots manipulate? (Samples? Specimens? Something else?)
   - What are the scoring zones? (Baskets? Chambers? Nets?)
   - Are there different colors/types?

3. **What are the scoring zones and structures?**
   - Where can robots score?
   - What are the point values?

4. **What is parking/positioning called?**
   - Observation Zone? Base? Something else?
   - Low Rung / High Rung? Or different names?

5. **Are there motifs?**
   - What patterns qualify as motifs?
   - What are the point values?

6. **Match structure:**
   - Is it 30s Auto + 120s TeleOp? (2:30 total)
   - When does "End Game" start?

## Where to Find Official Rules

The official FTC Game Manuals are typically found at:
- [FIRST Tech Challenge Game Manuals](https://www.firstinspires.org/resource-library/ftc/game-and-season-info)
- Game Manual Part 1: General game rules
- Game Manual Part 2: Game-specific rules (DECODE or actual game name)

## Current Implementation (Possibly Incorrect)

Based on the existing code, the current implementation assumes:
- Game elements: "Artifacts" (Green, Purple, White)
- Scoring areas: Classifier (3 bins), Overflow, Depot
- Robot positions: Base Low, Base High, Gate
- Standard match: 30s Auto, 120s TeleOp

**This needs to be verified against the official rulebook!**

## Action Items

- [ ] Obtain official FTC DECODE Game Manual
- [ ] Document actual game elements and scoring
- [ ] Update scoring calculator
- [ ] Update UI to match official terminology
- [ ] Verify point values
- [ ] Implement motif scoring correctly
- [ ] Add official game graphics/assets

## Contributors

If you have access to the official FTC DECODE rules, please:
1. Share the correct game element names
2. Provide point values for each scoring action
3. Describe motif patterns and bonuses
4. Confirm match timing and phases

This will help us build an accurate scoring system that matches official FTC gameplay!
