/**
 * UIManager - Manages in-game UI elements including score display, pause button, and game over screen
 * Implements requirements: 11.1, 11.2, 9.4, 8.1, 8.2, 8.3
 */

import * as THREE from 'three';
import { SceneManager } from '../engine/SceneManager';
import { GameState } from '../models/GameState';

export interface UIElement {
    id: string;
    mesh: THREE.Mesh;
    position: THREE.Vector3;
    isVisible: boolean;
}

export interface UIManagerConfig {
    sceneManager: SceneManager;
    gameState: GameState;
    onPauseGame: () => void;
    onResumeGame: () => void;
    onRestartGame: () => void;
    onReturnToMenu: () => void;
}

export class UIManager {
    private sceneManager: SceneManager;
    private gameState: GameState;
    private isInitialized: boolean = false;
    
    // UI callbacks
    private onPauseGame: () => void;
    private onResumeGame: () => void;
    private onRestartGame: () => void;
    private onReturnToMenu: () => void;
    
    // UI element groups
    private gameUIGroup: THREE.Group;
    private pauseUIGroup: THREE.Group;
    private gameOverUIGroup: THREE.Group;
    
    // UI elements
    private scoreDisplay: UIElement | null = null;
    private statisticsDisplay: UIElement | null = null;
    private pauseButton: UIElement | null = null;
    // private _gameOverScreen: UIElement | null = null;
    
    // Interaction
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    
    constructor(config: UIManagerConfig) {
        this.sceneManager = config.sceneManager;
        this.gameState = config.gameState;
        this.onPauseGame = config.onPauseGame;
        this.onResumeGame = config.onResumeGame;
        this.onRestartGame = config.onRestartGame;
        this.onReturnToMenu = config.onReturnToMenu;
        
        this.gameUIGroup = new THREE.Group();
        this.pauseUIGroup = new THREE.Group();
        this.gameOverUIGroup = new THREE.Group();
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.log('UIManager created');
    }
    
    /**
     * Initialize the UI manager and create UI elements
     */
    public initialize(): void {
        try {
            this.log('Initializing UIManager...');
            
            this.setupEventHandlers();
            this.createGameUI();
            this.createPauseUI();
            this.createGameOverUI();
            
            this.isInitialized = true;
            this.log('UIManager initialized successfully');
            
        } catch (error) {
            console.error('UIManager initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Create in-game UI elements
     */
    private createGameUI(): void {
        // Create score display
        this.scoreDisplay = this.createScoreDisplay();
        this.gameUIGroup.add(this.scoreDisplay.mesh);
        
        // Create statistics display
        this.statisticsDisplay = this.createStatisticsDisplay();
        this.gameUIGroup.add(this.statisticsDisplay.mesh);
        
        // Create pause button
        this.pauseButton = this.createPauseButton();
        this.gameUIGroup.add(this.pauseButton.mesh);
        
        this.log('Game UI elements created');
    }
    
    /**
     * Create score display UI element
     */
    private createScoreDisplay(): UIElement {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 300;
        canvas.height = 80;
        
        // Create background
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create border
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 2;
        context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        // Add initial text
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('Score: 0', canvas.width / 2, canvas.height / 2);
        
        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        
        // Create geometry and mesh
        const geometry = new THREE.PlaneGeometry(6, 1.6);
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position in top-left corner
        mesh.position.set(-7, 8, 1);
        
        return {
            id: 'score_display',
            mesh,
            position: mesh.position.clone(),
            isVisible: true
        };
    }
    
    /**
     * Create statistics display UI element
     */
    private createStatisticsDisplay(): UIElement {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 300;
        canvas.height = 120;
        
        // Create background
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create border
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 2;
        context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        // Add initial text
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 16px Arial';
        context.textAlign = 'left';
        context.textBaseline = 'top';
        context.fillText('People Hit: 0', 10, 15);
        context.fillText('People Avoided: 0', 10, 40);
        context.fillText('Segment: 1', 10, 65);
        context.fillText('Speed: 1.0x', 10, 90);
        
        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        
        // Create geometry and mesh
        const geometry = new THREE.PlaneGeometry(6, 2.4);
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position in top-left corner, below score
        mesh.position.set(-7, 5.5, 1);
        
        return {
            id: 'statistics_display',
            mesh,
            position: mesh.position.clone(),
            isVisible: true
        };
    }
    
    /**
     * Create pause button UI element
     */
    private createPauseButton(): UIElement {
        // Create button geometry
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 0.2);
        const material = new THREE.MeshLambertMaterial({
            color: 0xFF4444, // Red color
            transparent: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Add pause symbol texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 64;
        canvas.height = 64;
        
        // Draw pause symbol (two vertical bars)
        context.fillStyle = '#FFFFFF';
        context.fillRect(18, 12, 8, 40);
        context.fillRect(38, 12, 8, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        
        const textGeometry = new THREE.PlaneGeometry(1.4, 1.4);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.z = 0.11;
        
        mesh.add(textMesh);
        
        // Position in top-right corner
        mesh.position.set(8, 8, 1);
        
        // Enable shadows and interaction
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { uiElementId: 'pause_button', clickable: true };
        
        return {
            id: 'pause_button',
            mesh,
            position: mesh.position.clone(),
            isVisible: true
        };
    }
    
    /**
     * Create pause UI elements
     */
    private createPauseUI(): void {
        // Create semi-transparent overlay
        const overlayGeometry = new THREE.PlaneGeometry(20, 15);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7
        });
        const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        overlay.position.set(0, 0, 0.5);
        this.pauseUIGroup.add(overlay);
        
        // Create pause menu buttons
        const resumeButton = this.createMenuButton('Resume', new THREE.Vector3(-2, 1, 1), () => this.onResumeGame());
        const menuButton = this.createMenuButton('Main Menu', new THREE.Vector3(2, 1, 1), () => this.onReturnToMenu());
        
        this.pauseUIGroup.add(resumeButton);
        this.pauseUIGroup.add(menuButton);
        
        // Create pause title
        const pauseTitle = this.createTextDisplay('PAUSED', new THREE.Vector3(0, 3, 1), 48, '#FFFFFF');
        this.pauseUIGroup.add(pauseTitle);
        
        this.log('Pause UI created');
    }
    
    /**
     * Create game over UI elements
     */
    private createGameOverUI(): void {
        // Create semi-transparent overlay
        const overlayGeometry = new THREE.PlaneGeometry(20, 15);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8
        });
        const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        overlay.position.set(0, 0, 0.5);
        this.gameOverUIGroup.add(overlay);
        
        // Create game over title
        const gameOverTitle = this.createTextDisplay('GAME OVER', new THREE.Vector3(0, 4, 1), 48, '#FF4444');
        this.gameOverUIGroup.add(gameOverTitle);
        
        // Create final score display (will be updated when shown)
        const finalScoreDisplay = this.createTextDisplay('Final Score: 0', new THREE.Vector3(0, 2, 1), 32, '#FFFFFF');
        finalScoreDisplay.userData = { uiElementId: 'final_score' };
        this.gameOverUIGroup.add(finalScoreDisplay);
        
        // Create statistics summary (will be updated when shown)
        const statsDisplay = this.createTextDisplay('', new THREE.Vector3(0, 0, 1), 20, '#CCCCCC');
        statsDisplay.userData = { uiElementId: 'final_stats' };
        this.gameOverUIGroup.add(statsDisplay);
        
        // Create action buttons
        const restartButton = this.createMenuButton('Restart', new THREE.Vector3(-2, -2, 1), () => this.onRestartGame());
        const menuButton = this.createMenuButton('Main Menu', new THREE.Vector3(2, -2, 1), () => this.onReturnToMenu());
        
        this.gameOverUIGroup.add(restartButton);
        this.gameOverUIGroup.add(menuButton);
        
        this.log('Game Over UI created');
    }
    
    /**
     * Create a menu button
     */
    private createMenuButton(text: string, position: THREE.Vector3, onClick: () => void): THREE.Mesh {
        // Create button geometry
        const geometry = new THREE.BoxGeometry(3, 1, 0.2);
        const material = new THREE.MeshLambertMaterial({
            color: 0x4444FF, // Blue color
            transparent: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        
        // Add text label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000000';
        context.font = 'bold 20px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        
        const textGeometry = new THREE.PlaneGeometry(2.8, 0.8);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.z = 0.11;
        
        mesh.add(textMesh);
        
        // Enable interaction
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { clickable: true, onClick };
        
        return mesh;
    }
    
    /**
     * Create a text display element
     */
    private createTextDisplay(text: string, position: THREE.Vector3, fontSize: number, color: string): THREE.Mesh {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 512;
        canvas.height = 128;
        
        context.fillStyle = color;
        context.font = `bold ${fontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        
        const geometry = new THREE.PlaneGeometry(8, 2);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        
        return mesh;
    }
    
    /**
     * Set up event handlers for UI interaction
     */
    private setupEventHandlers(): void {
        const canvas = this.sceneManager.getRenderer().domElement;
        canvas.addEventListener('click', (event) => this.handleUIClick(event));
    }
    
    /**
     * Handle UI click events
     */
    private handleUIClick(event: MouseEvent): void {
        if (!this.isInitialized) return;
        
        const canvas = this.sceneManager.getRenderer().domElement;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate mouse position
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.getCamera());
        
        // Check for intersections with clickable UI elements
        const clickableObjects: THREE.Mesh[] = [];
        
        // Add currently visible UI elements
        if (this.pauseButton && this.pauseButton.isVisible) {
            clickableObjects.push(this.pauseButton.mesh);
        }
        
        // Add pause menu buttons if visible
        this.pauseUIGroup.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.clickable) {
                clickableObjects.push(child);
            }
        });
        
        // Add game over menu buttons if visible
        this.gameOverUIGroup.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.clickable) {
                clickableObjects.push(child);
            }
        });
        
        const intersects = this.raycaster.intersectObjects(clickableObjects);
        
        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object as THREE.Mesh;
            
            if (intersectedMesh.userData.uiElementId === 'pause_button') {
                this.log('Pause button clicked');
                this.onPauseGame();
            } else if (intersectedMesh.userData.onClick) {
                this.log('UI button clicked');
                intersectedMesh.userData.onClick();
            }
        }
    }
    
    /**
     * Show game UI
     */
    public showGameUI(): void {
        this.hideAllUI();
        this.sceneManager.addToScene(this.gameUIGroup);
        this.log('Game UI displayed');
    }
    
    /**
     * Show pause UI
     */
    public showPauseUI(): void {
        this.sceneManager.addToScene(this.pauseUIGroup);
        this.log('Pause UI displayed');
    }
    
    /**
     * Hide pause UI
     */
    public hidePauseUI(): void {
        this.sceneManager.removeFromScene(this.pauseUIGroup);
        this.log('Pause UI hidden');
    }
    
    /**
     * Show game over screen with final score
     */
    public showGameOverScreen(): void {
        this.hideAllUI();
        
        // Update final score and statistics
        this.updateGameOverScreen();
        
        this.sceneManager.addToScene(this.gameOverUIGroup);
        this.log('Game Over screen displayed');
    }
    
    /**
     * Update game over screen with current game state
     */
    private updateGameOverScreen(): void {
        // Update final score
        const finalScoreElement = this.gameOverUIGroup.getObjectByName('final_score') as THREE.Mesh;
        if (finalScoreElement) {
            this.updateTextDisplay(finalScoreElement, `Final Score: ${this.gameState.score}`, '#FFFFFF');
        }
        
        // Update final statistics
        const finalStatsElement = this.gameOverUIGroup.getObjectByName('final_stats') as THREE.Mesh;
        if (finalStatsElement) {
            const statsText = `People Hit: ${this.gameState.peopleHit} | People Avoided: ${this.gameState.peopleAvoided} | Segments: ${this.gameState.currentSegment}`;
            this.updateTextDisplay(finalStatsElement, statsText, '#CCCCCC');
        }
    }
    
    /**
     * Hide all UI elements
     */
    public hideAllUI(): void {
        this.sceneManager.removeFromScene(this.gameUIGroup);
        this.sceneManager.removeFromScene(this.pauseUIGroup);
        this.sceneManager.removeFromScene(this.gameOverUIGroup);
    }
    
    /**
     * Update score display
     */
    public updateScoreDisplay(): void {
        if (this.scoreDisplay) {
            this.updateTextDisplay(this.scoreDisplay.mesh, `Score: ${this.gameState.score}`, '#FFFFFF');
        }
    }
    
    /**
     * Update statistics display
     */
    public updateStatisticsDisplay(): void {
        if (this.statisticsDisplay) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.width = 300;
            canvas.height = 120;
            
            // Create background
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Create border
            context.strokeStyle = '#FFFFFF';
            context.lineWidth = 2;
            context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
            
            // Add updated text
            context.fillStyle = '#FFFFFF';
            context.font = 'bold 16px Arial';
            context.textAlign = 'left';
            context.textBaseline = 'top';
            context.fillText(`People Hit: ${this.gameState.peopleHit}`, 10, 15);
            context.fillText(`People Avoided: ${this.gameState.peopleAvoided}`, 10, 40);
            context.fillText(`Segment: ${this.gameState.currentSegment}`, 10, 65);
            context.fillText(`Speed: ${(this.gameState.currentSegment * 0.03 + 1).toFixed(1)}x`, 10, 90);
            
            // Update texture
            const texture = new THREE.CanvasTexture(canvas);
            (this.statisticsDisplay.mesh.material as THREE.MeshBasicMaterial).map = texture;
            texture.needsUpdate = true;
        }
    }
    
    /**
     * Update text display element
     */
    private updateTextDisplay(mesh: THREE.Mesh, text: string, color: string): void {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 512;
        canvas.height = 128;
        
        context.fillStyle = color;
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        (mesh.material as THREE.MeshBasicMaterial).map = texture;
        texture.needsUpdate = true;
    }
    
    /**
     * Update UI elements (called each frame)
     */
    public update(_deltaTime: number): void {
        // Update displays if game is running
        if (this.gameState && !this.gameState.isGameOver && !this.gameState.isPaused) {
            this.updateScoreDisplay();
            this.updateStatisticsDisplay();
        }
    }
    
    /**
     * Clean up UI manager resources
     */
    public dispose(): void {
        this.log('Disposing UIManager...');
        
        // Remove event listeners
        const canvas = this.sceneManager.getRenderer().domElement;
        canvas.removeEventListener('click', this.handleUIClick);
        
        // Hide all UI
        this.hideAllUI();
        
        // Dispose of geometries and materials
        const disposeGroup = (group: THREE.Group) => {
            group.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        };
        
        disposeGroup(this.gameUIGroup);
        disposeGroup(this.pauseUIGroup);
        disposeGroup(this.gameOverUIGroup);
        
        this.isInitialized = false;
        this.log('UIManager disposed');
    }
    
    /**
     * Logging utility
     */
    private log(message: string): void {
        console.log(`[UIManager] ${message}`);
    }
}