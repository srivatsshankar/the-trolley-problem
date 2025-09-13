# Technology Stack

## Core Technologies
- **Three.js** (v0.158.0): 3D rendering and scene management
- **TypeScript** (v5.2.2): Type-safe development with strict configuration
- **Vite** (v4.5.0): Fast development server and build tool
- **Vitest** (v1.0.0): Unit testing framework

## Build System
- **Development**: `npm run dev` - Starts Vite dev server on port 3000
- **Production Build**: `npm run build` - TypeScript compilation + Vite build
- **Testing**: `npm test` (run once) or `npm run test:watch` (watch mode)
- **Preview**: `npm run preview` - Preview production build locally

## TypeScript Configuration
- **Target**: ES2020 with DOM libraries
- **Module System**: ESNext with bundler resolution
- **Strict Mode**: Enabled with unused locals/parameters checking
- **Path Mapping**: `@/*` aliases for clean imports from src/

## Development Standards
- **Code Style**: Strict TypeScript with comprehensive JSDoc comments
- **Architecture**: Component-based with clear separation of concerns
- **Performance**: Object pooling, culling, and 60fps target
- **Browser Support**: Modern browsers with WebGL support

## Key Dependencies
- `@types/three`: TypeScript definitions for Three.js
- `jsdom`: DOM simulation for testing
- Canvas-based font rendering for 3D text effects