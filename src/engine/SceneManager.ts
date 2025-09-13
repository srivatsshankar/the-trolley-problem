/**
 * SceneManager - Manages Three.js scene, camera, renderer, and lighting
 * Implements requirements: 1.4, 1.5, 2.1
 */

import * as THREE from 'three';

export interface SceneManagerConfig {
    canvas: HTMLCanvasElement;
    enableShadows: boolean;
    antialias: boolean;
    backgroundColor: number;
    cameraDistance: number;
    cameraHeight: number;
}

export class SceneManager {
    public scene!: THREE.Scene;
    public camera!: THREE.OrthographicCamera;
    public renderer!: THREE.WebGLRenderer;
    
    private config: SceneManagerConfig;
    private ambientLight!: THREE.AmbientLight;
    private directionalLight!: THREE.DirectionalLight;
    private isInitialized: boolean = false;
    
    constructor(config: SceneManagerConfig) {
        this.config = config;
        this.log('SceneManager created');
    }
    
    /**
     * Initialize the Three.js scene, camera, renderer, and lighting
     */
    public initialize(): void {
        try {
            this.log('Initializing SceneManager...');
            
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupLighting();
            this.setupEventHandlers();
            
            this.isInitialized = true;
            this.log('SceneManager initialized successfully');
            
        } catch (error) {
            console.error('SceneManager initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Set up the Three.js scene
     */
    private setupScene(): void {
        this.scene = new THREE.Scene();
        
        // Set bright, vivid background color for cartoonish feel
        this.scene.background = new THREE.Color(this.config.backgroundColor);
        
        // Enable fog for depth perception in isometric view
        this.scene.fog = new THREE.Fog(this.config.backgroundColor, 50, 200);
        
        this.log('Scene created with background color: 0x' + this.config.backgroundColor.toString(16));
    }
    
    /**
     * Set up isometric camera with proper positioning and perspective
     */
    private setupCamera(): void {
        // Calculate camera bounds for isometric view
        const aspect = window.innerWidth / window.innerHeight;
        // Increased frustum size for better mobile visibility (from 20 to 35)
        // This allows players to see more of the track system and game objects
        const frustumSize = 35;
        
        // Create orthographic camera for true isometric view
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,  // left
            frustumSize * aspect / 2,   // right
            frustumSize / 2,            // top
            frustumSize / -2,           // bottom
            0.1,                        // near
            1000                        // far
        );
        
        // Position camera for isometric view (45-degree angles)
        // This creates the classic isometric perspective
        this.camera.position.set(
            this.config.cameraDistance,
            this.config.cameraHeight,
            this.config.cameraDistance
        );
        
        // Look at the center of the scene
        this.camera.lookAt(0, 0, 0);
        
        this.log(`Isometric camera positioned at (${this.camera.position.x}, ${this.camera.position.y}, ${this.camera.position.z})`);
    }
    
    /**
     * Configure WebGL renderer with bright, vivid color settings
     */
    private setupRenderer(): void {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.config.canvas,
            antialias: this.config.antialias,
            alpha: false,
            powerPreference: 'high-performance'
        });
        
        // Set size to match canvas
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Configure for bright, vivid colors
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2; // Slightly brighter
        
        // Enable shadows if configured
        if (this.config.enableShadows) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        // Clear color (should match scene background)
        this.renderer.setClearColor(this.config.backgroundColor, 1.0);
        
        this.log('WebGL renderer configured with vivid color settings');
    }
    
    /**
     * Implement basic lighting system with ambient and directional lights
     */
    private setupLighting(): void {
        // Ambient light for overall scene illumination
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);
        
        // Directional light for shadows and depth
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        
        // Position directional light for isometric lighting
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.target.position.set(0, 0, 0);
        
        // Configure shadows
        if (this.config.enableShadows) {
            this.directionalLight.castShadow = true;
            this.directionalLight.shadow.mapSize.width = 2048;
            this.directionalLight.shadow.mapSize.height = 2048;
            
            // Set shadow camera bounds
            const shadowDistance = 50;
            this.directionalLight.shadow.camera.left = -shadowDistance;
            this.directionalLight.shadow.camera.right = shadowDistance;
            this.directionalLight.shadow.camera.top = shadowDistance;
            this.directionalLight.shadow.camera.bottom = -shadowDistance;
            this.directionalLight.shadow.camera.near = 0.1;
            this.directionalLight.shadow.camera.far = 100;
            
            // Softer shadows
            this.directionalLight.shadow.bias = -0.0001;
        }
        
        this.scene.add(this.directionalLight);
        this.scene.add(this.directionalLight.target);
        
        this.log('Lighting system configured with ambient and directional lights');
    }
    
    /**
     * Set up event handlers for window resize
     */
    private setupEventHandlers(): void {
        window.addEventListener('resize', () => this.handleResize());
    }
    
    /**
     * Handle window resize events
     */
    private handleResize(): void {
        if (!this.isInitialized) return;
        
        const aspect = window.innerWidth / window.innerHeight;
        // Use the same increased frustum size for consistency with camera setup
        const frustumSize = 35;
        
        // Update camera
        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();
        
        // Update renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.log(`Resized to ${window.innerWidth}x${window.innerHeight}`);
    }
    
    /**
     * Add object to scene
     */
    public addToScene(object: THREE.Object3D): void {
        this.scene.add(object);
    }
    
    /**
     * Remove object from scene
     */
    public removeFromScene(object: THREE.Object3D): void {
        this.scene.remove(object);
    }
    
    /**
     * Render the scene
     */
    public render(): void {
        if (!this.isInitialized) return;
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Update lighting (can be called each frame if needed)
     */
    public updateLighting(): void {
        // Could implement dynamic lighting changes here
        // For now, lighting is static
    }
    
    /**
     * Get camera for external use (e.g., raycasting)
     */
    public getCamera(): THREE.OrthographicCamera {
        return this.camera;
    }
    
    /**
     * Get renderer for external use
     */
    public getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }
    
    /**
     * Get scene for external use
     */
    public getScene(): THREE.Scene {
        return this.scene;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.log('Disposing SceneManager...');
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Dispose of renderer
        this.renderer.dispose();
        
        // Clear scene
        while (this.scene.children.length > 0) {
            const child = this.scene.children[0];
            this.scene.remove(child);
            
            // Dispose of geometries and materials if they exist
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
        }
        
        this.isInitialized = false;
        this.log('SceneManager disposed');
    }
    
    /**
     * Logging utility
     */
    private log(message: string): void {
        console.log(`[SceneManager] ${message}`);
    }
}

/**
 * Default configuration for SceneManager
 */
export const DEFAULT_SCENE_CONFIG: Omit<SceneManagerConfig, 'canvas'> = {
    enableShadows: true,
    antialias: true,
    backgroundColor: 0x87CEEB, // Sky blue for bright, vivid feel
    cameraDistance: 20, // Increased from 15 to work better with larger frustum
    cameraHeight: 20    // Increased from 15 to maintain good perspective
};