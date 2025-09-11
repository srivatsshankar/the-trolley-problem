/**
 * Unit tests for ObjectPool system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ObjectPool, PoolManager, globalPoolManager, Poolable, PoolableFactory } from '../systems/ObjectPool';

// Mock poolable object for testing
class MockPoolableObject implements Poolable {
  public isResetCalled = false;
  public isDisposeCalled = false;
  public disposed = false;

  reset(): void {
    this.isResetCalled = true;
  }

  dispose(): void {
    this.isDisposeCalled = true;
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

// Mock factory for testing
class MockPoolableFactory implements PoolableFactory<MockPoolableObject> {
  public createCallCount = 0;

  create(): MockPoolableObject {
    this.createCallCount++;
    return new MockPoolableObject();
  }
}

describe('ObjectPool', () => {
  let factory: MockPoolableFactory;
  let pool: ObjectPool<MockPoolableObject>;

  beforeEach(() => {
    factory = new MockPoolableFactory();
    pool = new ObjectPool(factory, 10, 'TestPool');
  });

  describe('acquire', () => {
    it('should create new object when pool is empty', () => {
      const obj = pool.acquire();
      
      expect(obj).toBeInstanceOf(MockPoolableObject);
      expect(factory.createCallCount).toBe(1);
      expect(obj.isResetCalled).toBe(false); // New objects don't need reset
    });

    it('should reuse object from pool when available', () => {
      // First acquire and release
      const obj1 = pool.acquire();
      pool.release(obj1);
      
      // Second acquire should reuse
      const obj2 = pool.acquire();
      
      expect(obj2).toBe(obj1);
      expect(obj2.isResetCalled).toBe(true);
      expect(factory.createCallCount).toBe(1); // Only one object created
    });

    it('should track objects in use', () => {
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      
      const stats = pool.getStats();
      expect(stats.inUse).toBe(2);
      expect(stats.created).toBe(2);
    });
  });

  describe('release', () => {
    it('should return object to available pool', () => {
      const obj = pool.acquire();
      pool.release(obj);
      
      const stats = pool.getStats();
      expect(stats.available).toBe(1);
      expect(stats.inUse).toBe(0);
    });

    it('should dispose object if pool is at max size', () => {
      // Fill pool to max size by prewarming
      pool.prewarm(10);
      
      // Acquire all objects
      const objects: MockPoolableObject[] = [];
      for (let i = 0; i < 10; i++) {
        objects.push(pool.acquire());
      }
      
      // Create one more object (this will exceed pool capacity when released)
      const extraObj = pool.acquire(); // This creates new since pool is empty
      
      // Release all original objects first (fills pool to max)
      objects.forEach(obj => pool.release(obj));
      
      // Now release the extra object - this should be disposed
      pool.release(extraObj);
      
      const stats = pool.getStats();
      expect(stats.available).toBe(10); // Max size
      expect(stats.disposed).toBe(1); // One object was disposed
    });

    it('should warn when releasing object not in use', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const obj = new MockPoolableObject();
      
      pool.release(obj);
      
      expect(consoleSpy).toHaveBeenCalledWith('[TestPool] Attempting to release object not in use');
      consoleSpy.mockRestore();
    });
  });

  describe('prewarm', () => {
    it('should create specified number of objects', () => {
      pool.prewarm(5);
      
      const stats = pool.getStats();
      expect(stats.available).toBe(5);
      expect(stats.created).toBe(5);
      expect(factory.createCallCount).toBe(5);
    });

    it('should not exceed max pool size', () => {
      pool.prewarm(15); // More than max size of 10
      
      const stats = pool.getStats();
      expect(stats.available).toBe(10); // Limited to max size
    });
  });

  describe('clear', () => {
    it('should dispose all objects', () => {
      // Create some objects
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      pool.release(obj1);
      
      pool.clear();
      
      const stats = pool.getStats();
      expect(stats.available).toBe(0);
      expect(stats.inUse).toBe(0);
      expect(obj1.isDisposeCalled).toBe(true);
      expect(obj2.isDisposeCalled).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      pool.prewarm(3);
      const obj1 = pool.acquire(); // Reuses from prewarmed
      const obj2 = pool.acquire(); // Reuses from prewarmed
      pool.release(obj1);
      
      const stats = pool.getStats();
      expect(stats.available).toBe(2); // 1 prewarmed + 1 released
      expect(stats.inUse).toBe(1); // obj2 still in use
      expect(stats.created).toBe(3); // 3 prewarmed
      expect(stats.reused).toBe(2); // obj1 and obj2 were reused
    });

    it('should calculate efficiency correctly', () => {
      pool.prewarm(2);
      const obj1 = pool.acquire(); // Reuse (prewarmed)
      const obj2 = pool.acquire(); // Reuse (prewarmed)
      const obj3 = pool.acquire(); // Create new
      const obj4 = pool.acquire(); // Create new
      const obj5 = pool.acquire(); // Create new
      const obj6 = pool.acquire(); // Create new
      const obj7 = pool.acquire(); // Create new
      const obj8 = pool.acquire(); // Create new
      const obj9 = pool.acquire(); // Create new
      
      const stats = pool.getStats();
      // 2 reused out of 11 total = 2/11 * 100 = 18.18%
      expect(stats.efficiency).toBe(18.18);
    });
  });

  describe('resize', () => {
    it('should update max size', () => {
      pool.prewarm(5);
      pool.resize(3);
      
      const stats = pool.getStats();
      expect(stats.available).toBe(3); // Reduced to new max size
    });

    it('should dispose excess objects when reducing size', () => {
      pool.prewarm(5);
      const objects = Array.from({ length: 5 }, () => pool.acquire());
      objects.forEach(obj => pool.release(obj));
      
      pool.resize(3);
      
      const stats = pool.getStats();
      expect(stats.available).toBe(3);
      expect(stats.disposed).toBe(2); // 2 objects disposed
    });
  });
});

describe('PoolManager', () => {
  let poolManager: PoolManager;
  let pool1: ObjectPool<MockPoolableObject>;
  let pool2: ObjectPool<MockPoolableObject>;

  beforeEach(() => {
    poolManager = new PoolManager();
    pool1 = new ObjectPool(new MockPoolableFactory(), 5, 'Pool1');
    pool2 = new ObjectPool(new MockPoolableFactory(), 5, 'Pool2');
  });

  describe('registerPool', () => {
    it('should register pool with name', () => {
      poolManager.registerPool('test1', pool1);
      
      const retrievedPool = poolManager.getPool('test1');
      expect(retrievedPool).toBe(pool1);
    });
  });

  describe('getPool', () => {
    it('should return undefined for unregistered pool', () => {
      const pool = poolManager.getPool('nonexistent');
      expect(pool).toBeUndefined();
    });
  });

  describe('getAllStats', () => {
    it('should return stats for all registered pools', () => {
      poolManager.registerPool('pool1', pool1);
      poolManager.registerPool('pool2', pool2);
      
      pool1.prewarm(2);
      pool2.prewarm(3);
      
      const allStats = poolManager.getAllStats();
      expect(allStats.pool1.available).toBe(2);
      expect(allStats.pool2.available).toBe(3);
    });
  });

  describe('clearAll', () => {
    it('should clear all registered pools', () => {
      poolManager.registerPool('pool1', pool1);
      poolManager.registerPool('pool2', pool2);
      
      pool1.prewarm(2);
      pool2.prewarm(3);
      
      poolManager.clearAll();
      
      expect(pool1.getStats().available).toBe(0);
      expect(pool2.getStats().available).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should dispose all pools and clear registry', () => {
      poolManager.registerPool('pool1', pool1);
      poolManager.registerPool('pool2', pool2);
      
      poolManager.dispose();
      
      expect(poolManager.getPool('pool1')).toBeUndefined();
      expect(poolManager.getPool('pool2')).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should log stats at specified intervals', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      poolManager.registerPool('pool1', pool1);
      
      // First update should log (first time)
      poolManager.update(0);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockClear();
      
      // Second update within interval should not log
      poolManager.update(1000);
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Update after interval should log
      poolManager.update(6000);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});

describe('globalPoolManager', () => {
  it('should be a singleton instance', () => {
    expect(globalPoolManager).toBeInstanceOf(PoolManager);
  });

  it('should persist across imports', () => {
    const pool = new ObjectPool(new MockPoolableFactory(), 5, 'GlobalTest');
    globalPoolManager.registerPool('globalTest', pool);
    
    const retrievedPool = globalPoolManager.getPool('globalTest');
    expect(retrievedPool).toBe(pool);
  });
});