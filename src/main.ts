/**
 * Main entry point for the Trolley Problem game
 * Now includes menu system before starting the game
 */

import * as THREE from 'three';
import { MenuManager } from './components/MenuManager';

console.log('Trolley Problem Game - Starting with menu system...');

// Get canvas element
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
    throw new Error('Game canvas not found');
}

// Hide canvas initially - menu will show first
canvas.style.display = 'none';

// Menu system
let menuManager: MenuManager;

// Simple game variables
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let trolley: THREE.Mesh;
let tracks: THREE.Mesh[] = [];
let trolleySpeed = 2;
let frameCount = 0;
let gameStarted = false;

function initializeGame(): void {
    try {
        console.log('Initializing game scene...');
        
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Create isometric camera
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 20;
        camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        
        // Position camera for isometric view
        camera.position.set(15, 15, 15);
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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        
        // Create tracks
        const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        for (let i = 0; i < 5; i++) {
            const trackGeometry = new THREE.BoxGeometry(1.5, 0.1, 20);
            const track = new THREE.Mesh(trackGeometry, trackMaterial);
            track.position.set((i - 2) * 2, 0.05, 0);
            track.castShadow = true;
            scene.add(track);
            tracks.push(track);
        }
        
        // Create trolley
        const trolleyGeometry = new THREE.BoxGeometry(1, 0.5, 2);
        const trolleyMaterial = new THREE.MeshLambertMaterial({ color: 0xFF6B6B });
        trolley = new THREE.Mesh(trolleyGeometry, trolleyMaterial);
        trolley.position.set(0, 0.5, -5);
        trolley.castShadow = true;
        scene.add(trolley);
        
        console.log('Game initialized successfully!');
        
        // Start animation loop only after game is initialized
        startAnimationLoop();
        
    } catch (error) {
        console.error('Game initialization failed:', error);
        showError(`Initialization failed: ${error}`);
    }
}

let animationId: number | null = null;

function animate(): void {
    if (!gameStarted) {
        return; // Stop animation if game is not started
    }
    
    animationId = requestAnimationFrame(animate);
    
    frameCount++;
    
    // Move trolley forward
    if (trolley) {
        trolley.position.z += trolleySpeed * 0.016; // Assuming ~60fps
        
        // Reset trolley position when it goes too far
        if (trolley.position.z > 15) {
            trolley.position.z = -15;
        }
    }
    
    // Log status every 60 frames
    if (frameCount % 60 === 0) {
        const trolleyZ = trolley ? trolley.position.z.toFixed(1) : 'N/A';
        console.log(`Game running - Trolley Z: ${trolleyZ}`);
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function startAnimationLoop(): void {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    animate();
}

function stopAnimationLoop(): void {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
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
        const frustumSize = 20;
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
            stopAnimationLoop();
            gameStarted = false;
            canvas.style.display = 'none';
            menuManager.showMainMenu();
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
    console.log('DOM ready, creating menu manager...');
    
    // Create menu manager
    menuManager = new MenuManager();
    
    // Set up callback for when game should start
    menuManager.onStartGameCallback(() => {
        console.log('Starting game from menu...');
        startGame();
    });
    
    // Initialize and show main menu
    menuManager.initialize();
    
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
    console.log('Initializing game...');
    
    // Hide the canvas initially to prevent flash
    canvas.style.display = 'block';
    
    // Initialize the game
    initializeGame();
}

// Start with the menu system
startMenuSystem();