# Trolley Problem Game

A 3D browser-based trolley problem game built with Three.js that challenges players to navigate a trolley through multiple tracks while avoiding hitting people and obstacles.

If you would just like to play the game you can find it at [itch.io](https://deuteriumexoplanet.itch.io/trolley-problem)

## Project Structure

```
├── src/
│   ├── components/     # Reusable UI components and game objects
│   ├── systems/        # Game systems (collision, input, etc.)
│   ├── models/         # Data models and interfaces
│   ├── utils/          # Utility functions and helpers
│   └── main.ts         # Main entry point
├── index.html          # HTML entry point with canvas
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite build configuration
└── vitest.config.ts    # Testing configuration
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

   This will:
   - Copy `src/assets` (or `assets` if present) into `dist/assets`
   - Create a dated zip archive of the `dist` contents in `builds/` named like `YYYY-MM-DD trolley-problem.zip`, with `index.html` at the root of the archive

4. Run tests:
   ```bash
   npm test
   ```

## Development

The game uses:
- **Three.js** for 3D rendering
- **TypeScript** for type safety
- **Vite** for fast development and building
- **Vitest** for testing

## Features

- **Main Menu System**: Start Ride, Options, and Instructions menus
- Cross-platform 3D game with isometric camera view
- Bright, vivid colors for cartoonish aesthetic
- Progressive difficulty with speed increases
- Moral decision-making gameplay mechanics
- Performance optimized with object pooling and culling
- **Enhanced Collision Effects**: Bounce-back effect when hitting barriers, improved crash animations with realistic fall physics and intensified fire effects

## Controls

- **Menu Navigation**: Click buttons to navigate between menus
- **Start Game**: Click "Start Ride" to begin playing
- **Return to Menu**: Press `Escape` during gameplay to return to main menu
- **Options**: Adjust sound effects, music, and difficulty settings
- **Instructions**: Learn how to play and understand the moral dilemma