/**
 * ObjectPool - Generic object pooling system for performance optimization
 * Implements requirements: 10.1, 10.2, 10.3
 */

// THREE import removed as it's unused

export interface Poolable {
  reset(): void;
  dispose(): void;
  isDisposed(): boolean;
}

export interface PoolableFactory<T extends Poolable> {
  create(): T;
}

/**
 * Generic object pool for reusing objects to reduce garbage collection
 */
export class ObjectPool<T extends Poolable> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: PoolableFactory<T>;
  private maxSize: number;
  private name: string;
  
  // Statistics
  private stats = {
    created: 0,
    reused: 0,
    disposed: 0,
    maxInUse: 0
  };

  constructor(factory: PoolableFactory<T>, maxSize: number = 100, name: string = 'ObjectPool') {
    this.factory = factory;
    this.maxSize = maxSize;
    this.name = name;
  }

  /**
   * Get an object from the pool (reuse existing or create new)
   */
  public acquire(): T {
    let obj: T;
    
    if (this.available.length > 0) {
      obj = this.available.pop()!;
      obj.reset();
      this.stats.reused++;
    } else {
      obj = this.factory.create();
      this.stats.created++;
    }
    
    this.inUse.add(obj);
    this.stats.maxInUse = Math.max(this.stats.maxInUse, this.inUse.size);
    
    return obj;
  }

  /**
   * Return an object to the pool for reuse
   */
  public release(obj: T): void {
    if (!this.inUse.has(obj)) {
      console.warn(`[${this.name}] Attempting to release object not in use`);
      return;
    }
    
    this.inUse.delete(obj);
    
    // Only keep objects if we haven't exceeded max size
    if (this.available.length < this.maxSize && !obj.isDisposed()) {
      this.available.push(obj);
    } else {
      obj.dispose();
      this.stats.disposed++;
    }
  }

  /**
   * Pre-populate the pool with objects
   */
  public prewarm(count: number): void {
    const toCreate = Math.min(count, this.maxSize - this.available.length);
    
    for (let i = 0; i < toCreate; i++) {
      const obj = this.factory.create();
      this.available.push(obj);
      this.stats.created++;
    }
    
    console.log(`[${this.name}] Prewarmed with ${toCreate} objects`);
  }

  /**
   * Clear all objects from the pool
   */
  public clear(): void {
    // Dispose available objects
    this.available.forEach(obj => {
      obj.dispose();
      this.stats.disposed++;
    });
    this.available.length = 0;
    
    // Dispose in-use objects
    this.inUse.forEach(obj => {
      obj.dispose();
      this.stats.disposed++;
    });
    this.inUse.clear();
    
    console.log(`[${this.name}] Cleared all objects`);
  }

  /**
   * Get pool statistics
   */
  public getStats(): {
    available: number;
    inUse: number;
    created: number;
    reused: number;
    disposed: number;
    maxInUse: number;
    efficiency: number;
  } {
    const total = this.stats.created + this.stats.reused;
    const efficiency = total > 0 ? (this.stats.reused / total) * 100 : 0;
    
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      created: this.stats.created,
      reused: this.stats.reused,
      disposed: this.stats.disposed,
      maxInUse: this.stats.maxInUse,
      efficiency: Math.round(efficiency * 100) / 100
    };
  }

  /**
   * Get pool name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Resize the pool maximum size
   */
  public resize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    
    // If new size is smaller, dispose excess objects
    while (this.available.length > this.maxSize) {
      const obj = this.available.pop()!;
      obj.dispose();
      this.stats.disposed++;
    }
  }
}

/**
 * Pool manager to coordinate multiple object pools
 */
export class PoolManager {
  private pools: Map<string, ObjectPool<any>> = new Map();
  private updateInterval: number = 5000; // 5 seconds
  private lastUpdate: number = 0;

  /**
   * Register a pool with the manager
   */
  public registerPool<T extends Poolable>(name: string, pool: ObjectPool<T>): void {
    this.pools.set(name, pool);
    console.log(`[PoolManager] Registered pool: ${name}`);
  }

  /**
   * Get a pool by name
   */
  public getPool<T extends Poolable>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name);
  }

  /**
   * Update all pools (call periodically)
   */
  public update(currentTime: number): void {
    if (currentTime - this.lastUpdate > this.updateInterval) {
      this.logPoolStats();
      this.lastUpdate = currentTime;
    }
  }

  /**
   * Log statistics for all pools
   */
  public logPoolStats(): void {
    console.log('[PoolManager] Pool Statistics:');
    
    this.pools.forEach((pool, name) => {
      const stats = pool.getStats();
      console.log(`  ${name}: Available=${stats.available}, InUse=${stats.inUse}, Efficiency=${stats.efficiency}%`);
    });
  }

  /**
   * Get combined statistics for all pools
   */
  public getAllStats(): Record<string, any> {
    const allStats: Record<string, any> = {};
    
    this.pools.forEach((pool, name) => {
      allStats[name] = pool.getStats();
    });
    
    return allStats;
  }

  /**
   * Clear all pools
   */
  public clearAll(): void {
    this.pools.forEach(pool => pool.clear());
    console.log('[PoolManager] Cleared all pools');
  }

  /**
   * Dispose of all pools
   */
  public dispose(): void {
    this.clearAll();
    this.pools.clear();
    console.log('[PoolManager] Disposed all pools');
  }
}

/**
 * Global pool manager instance
 */
export const globalPoolManager = new PoolManager();