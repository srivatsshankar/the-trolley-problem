/**
 * MenuSystem - Manages 3D menu interface with icons and navigation
 * Implements requirements: 2.1, 2.2, 2.3, 2.4, 1.5
 */

import * as THREE from 'three';
import { SceneManager } from '../engine/SceneManager';

export enum MenuType {
    MAIN_MENU = 'main_menu',
    GAME_UI = 'game_ui',
    PAUSE_MENU = 'pause_menu',
    GAME_OVER = 'game_over',
    OPTIONS = 'options',
    HOW_TO_PLAY = 'how_to_play',
    ABOUT = 'about'
}

export interface MenuOption {
    id: string;
    label: string;
    position: THREE.Vector3;
    mesh: THREE.Mesh;
    originalScale: THREE.Vector3;
    isHovered: boolean;
    onClick: () => void;
}

export interface MenuSystemConfig {
    sceneManager: SceneManager;
    onStartGame: () => void;
    onShowOptions: () => void;
    onShowHowToPlay: () => void;
    onShowAbout: () => void;
}

export class MenuSystem {
    private sceneManager: SceneManager;
    private currentMenu: MenuType = MenuType.MAIN_MENU;
    private menuOptions: Map<MenuType, MenuOption[]> = new Map();
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private isInitialized: boolean = false;
    
    // Menu callbacks
    private onStartGame: () => void;
    private onShowOptions: () => void;
    private onShowHowToPlay: () => void;
    private onShowAbout: () => void;
    
    // Menu container groups
    private mainMenuGroup: THREE.Group;
    private currentMenuGroup: THREE.Group | null = null;
    
    constructor(config: MenuSystemConfig) {
        this.sceneManager = config.sceneManager;
        this.onStartGame = config.onStartGame;
        this.onShowOptions = config.onShowOptions;
        this.onShowHowToPlay = config.onShowHowToPlay;
        this.onShowAbout = config.onShowAbout;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.mainMenuGroup = new THREE.Group();
        
        this.log('MenuSystem created');
    }
    
    /**
     * Initialize the menu system and create 3D menu icons
     */
    public initialize(): void {
        try {
            this.log('Initializing MenuSystem...');
            
            this.setupEventHandlers();
            this.createMainMenu();
            this.showMainMenu();
            
            this.isInitialized = true;
            this.log('MenuSystem initialized successfully');
            
        } catch (error) {
            console.error('MenuSystem initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Create the main menu with 3D icons
     */
    private createMainMenu(): void {
        const mainMenuOptions: Omit<MenuOption, 'mesh' | 'originalScale' | 'isHovered'>[] = [
            {
                id: 'start_ride',
                label: 'Start Ride',
                position: new THREE.Vector3(-6, 2, 0),
                onClick: () => this.handleStartRide()
            },
            {
                id: 'options',
                label: 'Options',
                position: new THREE.Vector3(-2, 2, 0),
                onClick: () => this.handleOptions()
            },
            {
                id: 'how_to_play',
                label: 'How to Play',
                position: new THREE.Vector3(2, 2, 0),
                onClick: () => this.handleHowToPlay()
            },
            {
                id: 'about',
                label: 'About',
                position: new THREE.Vector3(6, 2, 0),
                onClick: () => this.handleAbout()
            }
        ];
        
        const menuOptions: MenuOption[] = [];
        
        for (const option of mainMenuOptions) {
            const mesh = this.create3DIcon(option.id, option.label);
            mesh.position.copy(option.position);
            
            const menuOption: MenuOption = {
                ...option,
                mesh,
                originalScale: mesh.scale.clone(),
                isHovered: false
            };
            
            menuOptions.push(menuOption);
            this.mainMenuGroup.add(mesh);
        }
        
        this.menuOptions.set(MenuType.MAIN_MENU, menuOptions);
        this.log('Main menu created with 4 3D icons');
    }
    
    /**
     * Create a 3D icon for a menu option
     */
    private create3DIcon(id: string, label: string): THREE.Mesh {
        // Create base geometry - rounded box for cartoonish feel
        const geometry = new THREE.BoxGeometry(2.5, 1.5, 0.3);
        
        // Create bright, vivid material based on option type
        const material = this.createIconMaterial(id);
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Add text label
        this.addTextLabel(mesh, label);
        
        // Enable shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Store reference for interaction
        mesh.userData = { menuOptionId: id };
        
        return mesh;
    }
    
    /**
     * Create material for menu icon based on type
     */
    private createIconMaterial(id: string): THREE.MeshLambertMaterial {
        let color: number;
        
        switch (id) {
            case 'start_ride':
                color = 0x00FF00; // Bright green
                break;
            case 'options':
                color = 0x0080FF; // Bright blue
                break;
            case 'how_to_play':
                color = 0xFFFF00; // Bright yellow
                break;
            case 'about':
                color = 0xFF8000; // Bright orange
                break;
            default:
                color = 0xFF00FF; // Bright magenta
        }
        
        return new THREE.MeshLambertMaterial({
            color: color,
            transparent: false
        });
    }
    
    /**
     * Add text label to menu icon
     */
    private addTextLabel(mesh: THREE.Mesh, label: string): void {
        // Create canvas for text texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 128;
        
        // Style the text
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000000';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Draw text
        context.fillText(label, canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create text plane
        const textGeometry = new THREE.PlaneGeometry(2.4, 1.2);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.z = 0.16; // Slightly in front of the icon
        
        mesh.add(textMesh);
    }
    
    /**
     * Set up event handlers for mouse interaction
     */
    private setupEventHandlers(): void {
        const canvas = this.sceneManager.getRenderer().domElement;
        
        canvas.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        canvas.addEventListener('click', (event) => this.handleClick(event));
        canvas.addEventListener('mouseenter', () => this.handleMouseEnter());
        canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    }
    
    /**
     * Handle mouse move events for hover effects
     */
    private handleMouseMove(event: MouseEvent): void {
        if (!this.isInitialized || !this.currentMenuGroup) return;
        
        const canvas = this.sceneManager.getRenderer().domElement;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.getCamera());
        
        // Check for intersections with menu options
        const currentOptions = this.menuOptions.get(this.currentMenu);
        if (!currentOptions) return;
        
        const meshes = currentOptions.map(option => option.mesh);
        const intersects = this.raycaster.intersectObjects(meshes);
        
        // Reset all hover states
        for (const option of currentOptions) {
            if (option.isHovered) {
                option.isHovered = false;
                this.animateIconScale(option.mesh, option.originalScale, 200);
            }
        }
        
        // Set hover state for intersected object
        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object as THREE.Mesh;
            const option = currentOptions.find(opt => opt.mesh === intersectedMesh);
            
            if (option && !option.isHovered) {
                option.isHovered = true;
                const hoverScale = option.originalScale.clone().multiplyScalar(1.1);
                this.animateIconScale(option.mesh, hoverScale, 200);
                
                // Change cursor
                canvas.style.cursor = 'pointer';
            }
        } else {
            canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Handle click events for menu selection
     */
    private handleClick(event: MouseEvent): void {
        if (!this.isInitialized || !this.currentMenuGroup) return;
        
        const canvas = this.sceneManager.getRenderer().domElement;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate mouse position
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.getCamera());
        
        // Check for intersections
        const currentOptions = this.menuOptions.get(this.currentMenu);
        if (!currentOptions) return;
        
        const meshes = currentOptions.map(option => option.mesh);
        const intersects = this.raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object as THREE.Mesh;
            const option = currentOptions.find(opt => opt.mesh === intersectedMesh);
            
            if (option) {
                this.log(`Menu option clicked: ${option.id}`);
                
                // Animate click feedback
                const clickScale = option.originalScale.clone().multiplyScalar(0.9);
                this.animateIconScale(option.mesh, clickScale, 100, () => {
                    this.animateIconScale(option.mesh, option.originalScale, 100);
                });
                
                // Execute callback
                option.onClick();
            }
        }
    }
    
    /**
     * Handle mouse enter canvas
     */
    private handleMouseEnter(): void {
        // Could add entrance animations here
    }
    
    /**
     * Handle mouse leave canvas
     */
    private handleMouseLeave(): void {
        const canvas = this.sceneManager.getRenderer().domElement;
        canvas.style.cursor = 'default';
        
        // Reset all hover states
        const currentOptions = this.menuOptions.get(this.currentMenu);
        if (currentOptions) {
            for (const option of currentOptions) {
                if (option.isHovered) {
                    option.isHovered = false;
                    this.animateIconScale(option.mesh, option.originalScale, 200);
                }
            }
        }
    }
    
    /**
     * Animate icon scale with smooth transition
     */
    private animateIconScale(
        mesh: THREE.Mesh, 
        targetScale: THREE.Vector3, 
        duration: number, 
        onComplete?: () => void
    ): void {
        const startScale = mesh.scale.clone();
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            mesh.scale.lerpVectors(startScale, targetScale, easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (onComplete) {
                onComplete();
            }
        };
        
        animate();
    }
    
    /**
     * Show main menu
     */
    public showMainMenu(): void {
        this.hideCurrentMenu();
        this.currentMenu = MenuType.MAIN_MENU;
        this.currentMenuGroup = this.mainMenuGroup;
        this.sceneManager.addToScene(this.mainMenuGroup);
        this.log('Main menu displayed');
    }
    
    /**
     * Hide current menu
     */
    private hideCurrentMenu(): void {
        if (this.currentMenuGroup) {
            this.sceneManager.removeFromScene(this.currentMenuGroup);
            this.currentMenuGroup = null;
        }
    }
    
    /**
     * Handle start ride button click
     */
    private handleStartRide(): void {
        this.log('Start Ride selected');
        this.hideCurrentMenu();
        this.currentMenu = MenuType.GAME_UI;
        this.onStartGame();
    }
    
    /**
     * Handle options button click
     */
    private handleOptions(): void {
        this.log('Options selected');
        this.onShowOptions();
    }
    
    /**
     * Handle how to play button click
     */
    private handleHowToPlay(): void {
        this.log('How to Play selected');
        this.onShowHowToPlay();
    }
    
    /**
     * Handle about button click
     */
    private handleAbout(): void {
        this.log('About selected');
        this.onShowAbout();
    }
    
    /**
     * Get current menu type
     */
    public getCurrentMenu(): MenuType {
        return this.currentMenu;
    }
    
    /**
     * Check if menu system is initialized
     */
    public isMenuInitialized(): boolean {
        return this.isInitialized;
    }
    
    /**
     * Update menu system (called each frame)
     */
    public update(_deltaTime: number): void {
        // Could add menu animations or updates here
        // For now, menu is static except for interactions
    }
    
    /**
     * Clean up menu system resources
     */
    public dispose(): void {
        this.log('Disposing MenuSystem...');
        
        // Remove event listeners
        const canvas = this.sceneManager.getRenderer().domElement;
        canvas.removeEventListener('mousemove', this.handleMouseMove);
        canvas.removeEventListener('click', this.handleClick);
        canvas.removeEventListener('mouseenter', this.handleMouseEnter);
        canvas.removeEventListener('mouseleave', this.handleMouseLeave);
        
        // Clean up menu groups
        this.hideCurrentMenu();
        
        // Dispose of geometries and materials
        for (const [_menuType, options] of this.menuOptions) {
            for (const option of options) {
                if (option.mesh.geometry) option.mesh.geometry.dispose();
                if (option.mesh.material) {
                    if (Array.isArray(option.mesh.material)) {
                        option.mesh.material.forEach(material => material.dispose());
                    } else {
                        option.mesh.material.dispose();
                    }
                }
            }
        }
        
        this.menuOptions.clear();
        this.isInitialized = false;
        this.log('MenuSystem disposed');
    }
    
    /**
     * Logging utility
     */
    private log(message: string): void {
        console.log(`[MenuSystem] ${message}`);
    }
}