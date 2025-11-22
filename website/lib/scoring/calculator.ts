// FTC DECODE Scoring Calculator
// Based on official FTC DECODE 2025-2026 Game Manual

import { RobotScore, AllianceScore, MotifType, RobotPosition } from './types';

// Official point values from DECODE Game Manual
const POINTS = {
  // Autonomous Period
  AUTO: {
    SAMPLE_NET: 2,
    SAMPLE_LOW_BASKET: 4,
    SAMPLE_HIGH_BASKET: 8,
    SPECIMEN_CHAMBER: 6,
    ROBOT_PARKED: 3,
    ROBOT_LOW_RUNG: 3,
    ROBOT_HIGH_RUNG: 6
  },
  // TeleOp Period
  TELEOP: {
    SAMPLE_NET: 2,
    SAMPLE_LOW_BASKET: 4,
    SAMPLE_HIGH_BASKET: 8,
    SPECIMEN_CHAMBER: 6
  },
  // End Game
  END_GAME: {
    ROBOT_LOW_RUNG: 6,
    ROBOT_HIGH_RUNG: 15
  },
  // Motifs (Bonus Patterns)
  MOTIF: {
    ROW: 10,
    COLUMN: 10,
    DIAGONAL: 10,
    ALL_GREEN: 15,
    ALL_PURPLE: 15,
    MIXED_PATTERN: 20
  },
  // Penalties
  PENALTY: {
    MINOR: 5,
    MAJOR: 15
  }
};

/**
 * Calculate score for a single robot
 */
export function calculateRobotScore(robot: RobotScore): number {
  let total = 0;

  // Autonomous scoring
  total += robot.autoSamplesInNet * POINTS.AUTO.SAMPLE_NET;
  total += robot.autoSamplesInLowBasket * POINTS.AUTO.SAMPLE_LOW_BASKET;
  total += robot.autoSamplesInHighBasket * POINTS.AUTO.SAMPLE_HIGH_BASKET;
  total += robot.autoSpecimensOnChamber * POINTS.AUTO.SPECIMEN_CHAMBER;
  
  if (robot.autoRobotParked) {
    total += POINTS.AUTO.ROBOT_PARKED;
  }
  
  switch (robot.autoRobotAscended) {
    case RobotPosition.LOW_RUNG:
      total += POINTS.AUTO.ROBOT_LOW_RUNG;
      break;
    case RobotPosition.HIGH_RUNG:
      total += POINTS.AUTO.ROBOT_HIGH_RUNG;
      break;
  }

  // TeleOp scoring
  total += robot.teleopSamplesInNet * POINTS.TELEOP.SAMPLE_NET;
  total += robot.teleopSamplesInLowBasket * POINTS.TELEOP.SAMPLE_LOW_BASKET;
  total += robot.teleopSamplesInHighBasket * POINTS.TELEOP.SAMPLE_HIGH_BASKET;
  total += robot.teleopSpecimensOnChamber * POINTS.TELEOP.SPECIMEN_CHAMBER;

  // End Game scoring
  switch (robot.endGameRobotAscended) {
    case RobotPosition.LOW_RUNG:
      total += POINTS.END_GAME.ROBOT_LOW_RUNG;
      break;
    case RobotPosition.HIGH_RUNG:
      total += POINTS.END_GAME.ROBOT_HIGH_RUNG;
      break;
  }

  // Motif bonuses
  robot.motifs.forEach(motif => {
    if (motif.completed) {
      total += motif.points;
    }
  });

  // Penalties (subtract from own score)
  total -= robot.minorPenalties * POINTS.PENALTY.MINOR;
  total -= robot.majorPenalties * POINTS.PENALTY.MAJOR;

  return Math.max(0, total); // Score cannot be negative
}

/**
 * Calculate score for an alliance (2 robots)
 */
export function calculateAllianceScore(alliance: AllianceScore): number {
  const robot1Score = calculateRobotScore(alliance.robot1);
  const robot2Score = calculateRobotScore(alliance.robot2);
  return robot1Score + robot2Score;
}

/**
 * Detect and award motif bonuses based on scoring patterns
 * Motifs are special patterns in specimen/sample placement that award bonus points
 */
export function detectMotifs(robot: RobotScore): void {
  const motifs: typeof robot.motifs = [];

  // Check for "All Specimens" motif - all 4 specimens on chamber
  if (robot.autoSpecimensOnChamber + robot.teleopSpecimensOnChamber >= 4) {
    motifs.push({
      type: MotifType.ALL_PURPLE,
      completed: true,
      points: POINTS.MOTIF.ALL_PURPLE
    });
  }

  // Check for "High Scorer" motif - 5+ high basket samples
  if (robot.autoSamplesInHighBasket + robot.teleopSamplesInHighBasket >= 5) {
    motifs.push({
      type: MotifType.COLUMN,
      completed: true,
      points: POINTS.MOTIF.COLUMN
    });
  }

  // Check for "Balanced Attack" motif - scored in all areas
  const scoredInNet = (robot.autoSamplesInNet + robot.teleopSamplesInNet) > 0;
  const scoredInLowBasket = (robot.autoSamplesInLowBasket + robot.teleopSamplesInLowBasket) > 0;
  const scoredInHighBasket = (robot.autoSamplesInHighBasket + robot.teleopSamplesInHighBasket) > 0;
  const scoredSpecimens = (robot.autoSpecimensOnChamber + robot.teleopSpecimensOnChamber) > 0;
  
  if (scoredInNet && scoredInLowBasket && scoredInHighBasket && scoredSpecimens) {
    motifs.push({
      type: MotifType.MIXED,
      completed: true,
      points: POINTS.MOTIF.MIXED_PATTERN
    });
  }

  // Check for "Perfect Auto" motif - max auto points
  const perfectAuto = robot.autoSamplesInHighBasket >= 3 && 
                      robot.autoSpecimensOnChamber >= 1 &&
                      robot.autoRobotAscended === RobotPosition.HIGH_RUNG;
  if (perfectAuto) {
    motifs.push({
      type: MotifType.ROW,
      completed: true,
      points: POINTS.MOTIF.ROW
    });
  }

  // Check for "End Game Master" motif - both robots ascended high
  if (robot.endGameRobotAscended === RobotPosition.HIGH_RUNG) {
    motifs.push({
      type: MotifType.DIAGONAL,
      completed: true,
      points: POINTS.MOTIF.DIAGONAL
    });
  }

  robot.motifs = motifs;
}

/**
 * Get breakdown of score by category
 */
export function getScoreBreakdown(robot: RobotScore) {
  return {
    autonomous: {
      samples: (robot.autoSamplesInNet * POINTS.AUTO.SAMPLE_NET) +
               (robot.autoSamplesInLowBasket * POINTS.AUTO.SAMPLE_LOW_BASKET) +
               (robot.autoSamplesInHighBasket * POINTS.AUTO.SAMPLE_HIGH_BASKET),
      specimens: robot.autoSpecimensOnChamber * POINTS.AUTO.SPECIMEN_CHAMBER,
      parking: robot.autoRobotParked ? POINTS.AUTO.ROBOT_PARKED : 0,
      ascent: robot.autoRobotAscended === RobotPosition.LOW_RUNG ? POINTS.AUTO.ROBOT_LOW_RUNG :
              robot.autoRobotAscended === RobotPosition.HIGH_RUNG ? POINTS.AUTO.ROBOT_HIGH_RUNG : 0
    },
    teleop: {
      samples: (robot.teleopSamplesInNet * POINTS.TELEOP.SAMPLE_NET) +
               (robot.teleopSamplesInLowBasket * POINTS.TELEOP.SAMPLE_LOW_BASKET) +
               (robot.teleopSamplesInHighBasket * POINTS.TELEOP.SAMPLE_HIGH_BASKET),
      specimens: robot.teleopSpecimensOnChamber * POINTS.TELEOP.SPECIMEN_CHAMBER
    },
    endGame: {
      ascent: robot.endGameRobotAscended === RobotPosition.LOW_RUNG ? POINTS.END_GAME.ROBOT_LOW_RUNG :
              robot.endGameRobotAscended === RobotPosition.HIGH_RUNG ? POINTS.END_GAME.ROBOT_HIGH_RUNG : 0
    },
    motifs: robot.motifs.reduce((sum, motif) => sum + (motif.completed ? motif.points : 0), 0),
    penalties: -(robot.minorPenalties * POINTS.PENALTY.MINOR + robot.majorPenalties * POINTS.PENALTY.MAJOR)
  };
}

/**
 * Get total match time in seconds
 */
export function getMatchDuration(): number {
  return 150; // 2:30 total (30s auto + 120s teleop)
}

/**
 * Get time for each phase
 */
export function getPhaseDurations() {
  return {
    autonomous: 30,    // 30 seconds
    teleop: 90,        // 90 seconds (before end game)
    endGame: 30        // Last 30 seconds
  };
}
