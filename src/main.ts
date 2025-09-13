/**
 * Main entry point for the Trolley Problem game
 * Now includes menu system before starting the game
 */

import * as THREE from 'three';
import { MenuManager } from './components/MenuManager';
import { TrackGenerator } from './systems/TrackGenerator';
import { CameraController } from './systems/CameraController';
import { TrolleyController } from './systems/TrolleyController';
import { DEFAULT_CONFIG } from './models/GameConfig';
import { GroundSystem } from './systems/GroundSystem';
import { createTrackStopper } from './models/TrackStopper';
import { InputManager } from './systems/InputManager';

console.log('Trolley Problem Game - Starting with menu system...');

// Get canvas element
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
    throw new Error('Game canvas not found');
}

// Canvas is always visible since we use Three.js for both menu and game
canvas.style.display = 'block';

// Menu system
let menuManager: MenuManager;

// Three.js variables (shared between menu and game)
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;

// Game variables
let trolleyController: TrolleyController;
let trackGenerator: TrackGenerator;
let cameraController: CameraController;
let frameCount = 0;
let gameStarted = false;
let menuMode = true;
let groundSystem: GroundSystem | null = null;
let inputManager: InputManager | null = null;

/**
 * Initialize Three.js scene, camera, and renderer (shared between menu and game)
 */
function initializeThreeJS(): void {
    console.log('Initializing Three.js...');
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Create isometric camera with increased frustum size for mobile visibility
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 35; // Increased from 20 for better mobile experience
        camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        
        // Position camera for isometric view - adjusted for larger frustum
        camera.position.set(20, 20, 20); // Increased from (15, 15, 15)
        camera.lookAt(0, 0, 0);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        console.log('Three.js initialized successfully!');
}

function initializeGame(): void {
    try {
        console.log('Initializing game objects...');
        
        // Three.js is already initialized, just add game objects
        
    // Create infinite tiling ground underneath tracks
    groundSystem = new GroundSystem(scene, { tileSize: 200, gridHalfExtent: 1, color: 0x90EE90 });
    groundSystem.initialize(new THREE.Vector3(0, 0, 0));
        
        // Initialize track generator with proper single-to-multiple track system
        trackGenerator = new TrackGenerator(scene, DEFAULT_CONFIG);
        trackGenerator.initialize();
        
        // Log initial track generation stats
        const stats = trackGenerator.getGenerationStats();
        console.log('Initial track generation:', stats);

    // Place a track stopper just after the start to indicate where rails begin
    // Trolley starts at z = 2, so put stopper slightly ahead at z = 4
    // Raise slightly on Y so the plank clears the ties visually
    const trackStopper = createTrackStopper(new THREE.Vector3(0, 0.1, -2));
    scene.add(trackStopper.getGroup());
        
        // Create trolley controller with enhanced trolley
        trolleyController = new TrolleyController(DEFAULT_CONFIG);
        trolleyController.createTrolley();
        const trolleyGroup = trolleyController.getTrolleyGroup();
        
        if (trolleyGroup) {
            scene.add(trolleyGroup);
            console.log('Enhanced trolley created successfully via TrolleyController!');
        } else {
            console.error('Failed to create trolley group');
        }
        
    // Set initial position ON the track (tracks start at z = 0)
    // Use x = 0 to align with the single centered track in initial segments
    // Small positive z ensures we're clearly on the first segment
    trolleyController.setPosition(new THREE.Vector3(0, 0, 2));
        
        // Initialize camera controller
        cameraController = new CameraController(camera, {
            followDistance: 15,  // Match original Z offset
            followHeight: 15,    // Match original Y offset
            followOffset: 15,    // Match original X offset
            smoothness: 0.05,    // Smoother following
            lookAtTarget: false, // Don't change rotation for isometric view
            minFollowDistance: 0.5
        });
        
        // Don't set camera target immediately - wait for trolley to start moving
        
        console.log('Trolley starting position:', trolleyController.position);
        console.log('Track split occurs at segment 3, which is Z position:', 3 * DEFAULT_CONFIG.tracks.segmentLength);
        
        console.log('Game initialized successfully!');

        // Initialize input manager (track buttons + queuing) and mount UI
        inputManager = new InputManager(
            scene,
            trolleyController,
            trackGenerator,
            DEFAULT_CONFIG
        );
        inputManager.mount();
        
        // Start game animation loop
        startGameAnimationLoop();
        
    } catch (error) {
        console.error('Game initialization failed:', error);
        showError(`Initialization failed: ${error}`);
    }
}

let animationId: number | null = null;

/**
 * Menu render loop - runs when in menu mode
 */
function menuRenderLoop(): void {
    if (!menuMode) {
        return; // Stop menu rendering when game starts
    }
    
    animationId = requestAnimationFrame(menuRenderLoop);
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

/**
 * Game animation loop - runs when in game mode
 */
function gameAnimationLoop(): void {
    if (!gameStarted || menuMode) {
        return; // Stop animation if game is not started or in menu mode
    }
    
    animationId = requestAnimationFrame(gameAnimationLoop);
    
    frameCount++;
    
    // Update trolley controller
    if (trolleyController) {
        // Update trolley (handles movement, animations, etc.)
        trolleyController.update(0.016);
        
        const trolleyPosition = trolleyController.position;
        const trolleyGroup = trolleyController.getTrolleyGroup();
        
        // Enable camera following once trolley starts moving
        if (cameraController && !cameraController.isFollowing() && trolleyPosition.z > -24 && trolleyGroup) {
            cameraController.setTarget(trolleyGroup);
            console.log('Camera following enabled - enhanced trolley started moving');
        }
        
        // Update track generation based on trolley position
        if (trackGenerator) {
            trackGenerator.updateGeneration(trolleyPosition);
        }
        
    // No hard reset: allow TrackGenerator to stream segments endlessly
    }
    
    // Update camera to follow trolley
    if (cameraController) {
        cameraController.update(0.016); // Assuming ~60fps
    }

    // Update input manager (handles button-to-queue and previews)
    if (inputManager) {
        inputManager.update(0.016);
    }
    
    // Log status every 60 frames
    if (frameCount % 60 === 0) {
        const trolleyZ = trolleyController ? trolleyController.position.z.toFixed(1) : 'N/A';
        const trolleySpeed = trolleyController ? trolleyController.speed.toFixed(1) : 'N/A';
        const isFollowing = cameraController && cameraController.isFollowing() ? 'Yes' : 'No';
        const stats = trackGenerator ? trackGenerator.getGenerationStats() : null;
        console.log(`Game running - Trolley Z: ${trolleyZ}, Speed: ${trolleySpeed}, Camera Following: ${isFollowing}`, stats);
    }
    
    if (renderer && scene && camera) {
        // Keep ground tiles centered under the trolley (or camera if trolley missing)
        if (groundSystem) {
            const target = trolleyController ? trolleyController.position : camera.position;
            groundSystem.update(target);
        }
        renderer.render(scene, camera);
    }
}

function startMenuRenderLoop(): void {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    menuMode = true;
    menuRenderLoop();
}

function startGameAnimationLoop(): void {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    menuMode = false;
    gameAnimationLoop();
}



function showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-family: Arial, sans-serif;
        text-align: center;
        z-index: 1000;
        max-width: 400px;
    `;
    errorDiv.innerHTML = `
        <h2>Game Error</h2>
        <p>${message}</p>
        <button onclick="location.reload()" style="
            margin-top: 10px;
            padding: 8px 16px;
            background: #fff;
            color: #000;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        ">Retry</button>
    `;
    document.body.appendChild(errorDiv);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (camera && renderer) {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 35; // Updated to match the increased camera frustum
        camera.left = frustumSize * aspect / -2;
        camera.right = frustumSize * aspect / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Handle keyboard input
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (gameStarted && menuManager) {
            // Return to main menu
            console.log('Returning to main menu...');
            gameStarted = false;
            
            // Reset camera to original position
            if (cameraController) {
                cameraController.resetCamera();
            }
            
            menuManager.showMainMenu();
            startMenuRenderLoop();
        }
    }
});

/**
 * Start the menu system
 */
function startMenuSystem(): void {
    try {
        console.log('Initializing menu system...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initializeMenuSystem();
            });
        } else {
            initializeMenuSystem();
        }
        
    } catch (error) {
        console.error('Menu system initialization failed:', error);
        showError(`Menu initialization failed: ${error}`);
    }
}

function initializeMenuSystem(): void {
    console.log('DOM ready, initializing Three.js for menu...');
    
    // Initialize Three.js scene for menu
    initializeThreeJS();
    
    // Create menu manager with Three.js context
    menuManager = new MenuManager();
    menuManager.setThreeJSContext(scene, camera, renderer);
    
    // Set up callback for when game should start
    menuManager.onStartGameCallback(() => {
        console.log('Starting game from menu...');
        startGame();
    });
    
    // Initialize and show main menu
    menuManager.initialize();
    
    // Start menu render loop
    startMenuRenderLoop();
    
    console.log('Menu system initialized successfully!');
}

/**
 * Start the actual game (called from menu)
 */
function startGame(): void {
    if (gameStarted) {
        console.log('Game already started, ignoring...');
        return;
    }
    
    gameStarted = true;
    console.log('Starting game...');
    
    // Initialize the game objects
    initializeGame();
}

// Start with the menu system
startMenuSystem();