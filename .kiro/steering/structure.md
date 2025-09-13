# Project Structure

## Source Organization (`src/`)

### Core Entry Points
- `main.ts`: Application entry point with menu system initialization
- `GameController.ts`: Main game controller integrating all systems

### Architecture Layers
- `components/`: Reusable UI components and 3D game objects
  - Menu system components (Menu3D, MenuManager)
  - Game object components
- `engine/`: Core game engine systems
  - GameEngine, SceneManager
- `systems/`: Game logic systems (collision, input, etc.)
- `models/`: Data models, interfaces, and type definitions
- `utils/`: Utility functions and helpers
- `assets/`: Static assets (fonts, textures, models)

### Testing Structure
- `tests/`: Unit tests mirroring src structure
- Test files use `.test.ts` extension
- Vitest configuration for DOM simulation

## Code Organization Patterns

### Import Conventions
- Use path aliases: `@/components/*`, `@/systems/*`, etc.
- Three.js imports: `import * as THREE from 'three'`
- Relative imports for same-directory files

### Class Structure
- Comprehensive JSDoc comments for all public methods
- Clear constructor parameter interfaces
- Dispose/cleanup methods for resource management
- Performance tracking and logging utilities

### Game Architecture
- Component-based design with clear interfaces
- Separation between menu and gameplay systems
- Shared Three.js context (scene, camera, renderer)
- Event-driven communication between systems

## File Naming
- PascalCase for classes and components
- camelCase for utilities and functions
- Descriptive names reflecting functionality