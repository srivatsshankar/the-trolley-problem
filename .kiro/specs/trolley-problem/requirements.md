# Requirements Document

## Introduction

The "Trolley Problem" is a cross-platform 3D video game built with Three.js that challenges players to navigate a trolley through multiple tracks while avoiding hitting people and obstacles. The game features an isometric camera view with bright, vivid colors for a cartoonish aesthetic. Players must make split-second decisions to switch between 5 tracks across progressively generated segments, balancing the moral dilemma of minimizing casualties while avoiding barriers that end the game.

## Requirements

### Requirement 1: Game Setup and Platform

**User Story:** As a player, I want to play the game on multiple platforms, so that I can enjoy it on my preferred device.

#### Acceptance Criteria

1. WHEN the game is built THEN the system SHALL use Three.js for 3D rendering
2. WHEN the game is deployed THEN the system SHALL be cross-platform compatible
3. WHEN the game loads THEN the system SHALL display all visual elements within the game canvas
4. WHEN the game starts THEN the system SHALL use an isometric camera view
5. WHEN the game renders THEN the system SHALL use bright and vivid colors for a cartoonish feel

### Requirement 2: Main Menu System

**User Story:** As a player, I want to access different game options from a main menu, so that I can start playing, learn how to play, or adjust settings.

#### Acceptance Criteria

1. WHEN the game loads THEN the system SHALL display a main menu with 3D icons
2. WHEN the main menu is displayed THEN the system SHALL show four options: "start ride", "options", "how to play", and "about"
3. WHEN a player clicks "start ride" THEN the system SHALL begin the game
4. WHEN a player clicks any menu option THEN the system SHALL respond with the appropriate action

### Requirement 3: Track System and Layout

**User Story:** As a player, I want to navigate between multiple tracks, so that I can avoid obstacles and people.

#### Acceptance Criteria

1. WHEN the game begins THEN the trolley SHALL start on a single track
2. WHEN the trolley progresses THEN the single track SHALL separate into 5 tracks
3. WHEN the tracks separate THEN the 5 tracks SHALL extend indefinitely
4. WHEN tracks are generated THEN they SHALL be divided into segments
5. WHEN segments are created THEN they SHALL divide tracks horizontally while tracks move vertically

### Requirement 4: Player Control System

**User Story:** As a player, I want to control which track my trolley moves to, so that I can avoid obstacles and minimize casualties.

#### Acceptance Criteria

1. WHEN the game is active THEN the system SHALL display 5 buttons at the bottom of the screen
2. WHEN a player clicks a button THEN that button SHALL remain selected until another button is clicked
3. WHEN a button is selected THEN the system SHALL queue the corresponding track number (1-5)
4. WHEN entering a segment THEN the system SHALL check which button is pressed
5. WHEN the button check occurs THEN the trolley SHALL move along a curved path to the selected track

### Requirement 5: Visual Feedback System

**User Story:** As a player, I want visual cues about my track selection, so that I can anticipate where my trolley will go.

#### Acceptance Criteria

1. WHEN a track is selected THEN the curved path SHALL appear translucent before the segment
2. WHEN the button check occurs THEN the curved path SHALL become opaque
3. WHEN animations play THEN they SHALL be smooth
4. WHEN the trolley changes tracks THEN it SHALL move gently between tracks

### Requirement 6: Obstacle and People Generation

**User Story:** As a player, I want varied challenges in each segment, so that the game remains engaging and unpredictable.

#### Acceptance Criteria

1. WHEN a segment is generated THEN one track SHALL have a barrier (trolley or rock)
2. WHEN barriers are placed THEN the barrier type SHALL be randomly chosen
3. WHEN people are placed THEN the other 4 tracks SHALL have between 1 and 5 people
4. WHEN people are distributed THEN one track SHALL have exactly one person
5. WHEN the trolley speed reaches 5x base speed THEN barriers SHALL appear on 2-4 tracks randomly per segment

### Requirement 7: Game Progression and Difficulty

**User Story:** As a player, I want the game to become progressively more challenging, so that I remain engaged over time.

#### Acceptance Criteria

1. WHEN the trolley crosses a segment THEN its speed SHALL increase by 3%
2. WHEN the trolley moves THEN it SHALL move continuously on the tracks
3. WHEN tracks and landscape are needed THEN they SHALL be progressively generated
4. WHEN the trolley reaches 5x base speed THEN the difficulty SHALL increase with more barriers

### Requirement 8: Game State Management

**User Story:** As a player, I want the game to track my performance, so that I can see my progress and score.

#### Acceptance Criteria

1. WHEN the game runs THEN the system SHALL track the current score
2. WHEN the game runs THEN the system SHALL track total people hit
3. WHEN the game runs THEN the system SHALL track total people avoided
4. WHEN the game runs THEN the system SHALL track whether the trolley hit a barrier
5. WHEN the game runs THEN the system SHALL track the current track position

### Requirement 9: Scoring System

**User Story:** As a player, I want my performance to be scored fairly, so that I can measure my success.

#### Acceptance Criteria

1. WHEN calculating score THEN the system SHALL add people not hit in each segment
2. WHEN calculating score THEN the system SHALL subtract people hit in each segment
3. WHEN the trolley hits a barrier THEN the game SHALL end
4. WHEN the game ends THEN the final score SHALL be displayed

### Requirement 10: Performance Optimization

**User Story:** As a player, I want the game to run smoothly, so that I can enjoy uninterrupted gameplay.

#### Acceptance Criteria

1. WHEN rendering the game THEN the system SHALL only display necessary elements on screen
2. WHEN managing visuals THEN the system SHALL avoid overloading computer processing
3. WHEN generating content THEN the system SHALL manage memory efficiently

### Requirement 11: Game Controls

**User Story:** As a player, I want to pause the game when needed, so that I can take breaks without losing progress.

#### Acceptance Criteria

1. WHEN the game is running THEN the system SHALL provide a pause button
2. WHEN the pause button is clicked THEN the game SHALL stop temporarily
3. WHEN the game is paused THEN the player SHALL be able to resume gameplay