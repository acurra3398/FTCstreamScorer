// FTC DECODE Scoring Types

export enum MatchType {
  TRADITIONAL = 'traditional',  // 2 alliances (Red vs Blue), 2 robots per alliance
  SINGLE_ROBOT = 'single_robot' // Single robot demo mode
}

export enum MatchPhase {
  NOT_STARTED = 'not_started',
  AUTONOMOUS = 'autonomous',
  TELEOP = 'teleop',
  END_GAME = 'end_game',
  FINISHED = 'finished'
}

export enum ArtifactColor {
  NONE = 'none',
  GREEN = 'green',
  PURPLE = 'purple',
  YELLOW = 'yellow'
}

export enum RobotPosition {
  NONE = 'none',
  OBSERVATION_ZONE = 'observation_zone',
  LOW_RUNG = 'low_rung',
  HIGH_RUNG = 'high_rung'
}

export enum Alliance {
  RED = 'red',
  BLUE = 'blue'
}

// Motif types for DECODE game
export enum MotifType {
  ROW = 'row',           // 3 in a row horizontally
  COLUMN = 'column',     // 3 in a column vertically
  DIAGONAL = 'diagonal', // 3 in a diagonal
  ALL_GREEN = 'all_green',   // All green artifacts
  ALL_PURPLE = 'all_purple', // All purple artifacts
  MIXED = 'mixed'        // Strategic mix pattern
}

export interface Motif {
  type: MotifType;
  completed: boolean;
  points: number;
}

export interface RobotScore {
  // Autonomous
  autoSamplesInNet: number;           // Samples scored in net during auto
  autoSamplesInLowBasket: number;     // Samples in low basket during auto
  autoSamplesInHighBasket: number;    // Samples in high basket during auto
  autoSpecimensOnChamber: number;     // Specimens on chamber during auto
  autoRobotParked: boolean;           // Robot parked in observation zone
  autoRobotAscended: RobotPosition;   // Robot ascent level
  
  // TeleOp
  teleopSamplesInNet: number;
  teleopSamplesInLowBasket: number;
  teleopSamplesInHighBasket: number;
  teleopSpecimensOnChamber: number;
  
  // End Game
  endGameRobotAscended: RobotPosition;
  
  // Motifs (bonus patterns)
  motifs: Motif[];
  
  // Penalties
  minorPenalties: number;
  majorPenalties: number;
}

export interface AllianceScore {
  robot1: RobotScore;
  robot2: RobotScore;
}

export interface MatchData {
  matchNumber: string;
  matchType: MatchType;
  phase: MatchPhase;
  timeRemaining: number;
  redAlliance: AllianceScore;
  blueAlliance: AllianceScore;
  singleRobot?: RobotScore; // For single robot mode
  startTime?: number;
}

export function createEmptyRobotScore(): RobotScore {
  return {
    autoSamplesInNet: 0,
    autoSamplesInLowBasket: 0,
    autoSamplesInHighBasket: 0,
    autoSpecimensOnChamber: 0,
    autoRobotParked: false,
    autoRobotAscended: RobotPosition.NONE,
    teleopSamplesInNet: 0,
    teleopSamplesInLowBasket: 0,
    teleopSamplesInHighBasket: 0,
    teleopSpecimensOnChamber: 0,
    endGameRobotAscended: RobotPosition.NONE,
    motifs: [],
    minorPenalties: 0,
    majorPenalties: 0
  };
}

export function createEmptyAllianceScore(): AllianceScore {
  return {
    robot1: createEmptyRobotScore(),
    robot2: createEmptyRobotScore()
  };
}
