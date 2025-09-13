/**
 * Unit tests for TrackSelector component
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackSelector, DEFAULT_TRACK_SELECTOR_CONFIG } from '../components/TrackSelector';

// Mock DOM environment
const mockUIOverlay = document.createElement('div');
mockUIOverlay.id = 'ui-overlay';
document.body.appendChild(mockUIOverlay);

describe('TrackSelector', () => {
    let trackSelector: TrackSelector;
    
    beforeEach(() => {
        // Clear the UI overlay before each test
        mockUIOverlay.innerHTML = '';
        
        // Create new TrackSelector instance
        trackSelector = new TrackSelector(DEFAULT_TRACK_SELECTOR_CONFIG);
    });
    
    afterEach(() => {
        // Clean up after each test
        if (trackSelector) {
            trackSelector.dispose();
        }
    });
    
    test('should create TrackSelector with correct configuration', () => {
        expect(trackSelector).toBeDefined();
        // Default selection is track 3 per game requirements
        expect(trackSelector.getSelectedTrack()).toBe(3);
    });
    
    test('should create 5 track buttons', () => {
        trackSelector.mount();
        
        const buttons = document.querySelectorAll('[data-track]');
        expect(buttons.length).toBe(5);
        
        // Check that buttons have correct track numbers
        for (let i = 1; i <= 5; i++) {
            const button = document.querySelector(`[data-track="${i}"]`);
            expect(button).toBeDefined();
            expect(button?.textContent).toBe(i.toString());
        }
    });
    
    test('should mount to DOM correctly', () => {
        trackSelector.mount();
        
        const container = document.getElementById('track-selector');
        expect(container).toBeDefined();
        expect(container?.parentElement).toBe(mockUIOverlay);
    });
    
    test('should select track correctly', () => {
        trackSelector.mount();
        
        // Initially track 3 should be selected
        expect(trackSelector.getSelectedTrack()).toBe(3);
        
        // Select track 3
        trackSelector.selectTrack(3);
        expect(trackSelector.getSelectedTrack()).toBe(3);
        
        // Select track 5
        trackSelector.selectTrack(5);
        expect(trackSelector.getSelectedTrack()).toBe(5);
    });
    
    test('should handle invalid track selection', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        trackSelector.selectTrack(0); // Invalid
        expect(trackSelector.getSelectedTrack()).toBe(3); // Should remain unchanged
        
        trackSelector.selectTrack(6); // Invalid
        expect(trackSelector.getSelectedTrack()).toBe(3); // Should remain unchanged
        
        expect(consoleSpy).toHaveBeenCalledTimes(2);
        consoleSpy.mockRestore();
    });
    
    test('should trigger callback on track selection', () => {
        const callback = vi.fn();
        trackSelector.onTrackSelected(callback);
        trackSelector.mount();
        
        trackSelector.selectTrack(4);
        
        expect(callback).toHaveBeenCalledWith(4);
        expect(callback).toHaveBeenCalledTimes(1);
    });
    
    test('should handle button clicks', () => {
        trackSelector.mount();
        
        const button3 = document.querySelector('[data-track="3"]') as HTMLButtonElement;
        expect(button3).toBeDefined();
        
        // Simulate click
        button3.click();
        
        expect(trackSelector.getSelectedTrack()).toBe(3);
    });
    
    test('should enable and disable buttons', () => {
        trackSelector.mount();
        
        // Initially enabled
        const buttons = document.querySelectorAll('[data-track]') as NodeListOf<HTMLButtonElement>;
        buttons.forEach(button => {
            expect(button.disabled).toBe(false);
            expect(button.style.opacity).toBe('');
        });
        
        // Disable
        trackSelector.setEnabled(false);
        buttons.forEach(button => {
            expect(button.disabled).toBe(true);
            expect(button.style.opacity).toBe('0.5');
        });
        
        // Re-enable
        trackSelector.setEnabled(true);
        buttons.forEach(button => {
            expect(button.disabled).toBe(false);
            expect(button.style.opacity).toBe('1');
        });
    });
    
    test('should unmount from DOM correctly', () => {
        trackSelector.mount();
        
        let container = document.getElementById('track-selector');
        expect(container).toBeDefined();
        
        trackSelector.unmount();
        
        container = document.getElementById('track-selector');
        expect(container).toBeNull();
    });
    
    test('should dispose correctly', () => {
        trackSelector.mount();
        
        const container = document.getElementById('track-selector');
        expect(container).toBeDefined();
        
        trackSelector.dispose();
        
        // Should be removed from DOM
        const containerAfterDispose = document.getElementById('track-selector');
        expect(containerAfterDispose).toBeNull();
        
        // Should handle multiple dispose calls gracefully
        expect(() => trackSelector.dispose()).not.toThrow();
    });
    
    test('should apply correct styling to selected button', () => {
        trackSelector.mount();
        
        // Select track 2
        trackSelector.selectTrack(2);
        
        const selectedButton = document.querySelector('[data-track="2"]') as HTMLButtonElement;
        const unselectedButton = document.querySelector('[data-track="1"]') as HTMLButtonElement;
        
        // Selected button should appear pressed with aria-pressed=true and pressed transform
        expect(selectedButton.getAttribute('aria-pressed')).toBe('true');
        expect(selectedButton.style.transform).toBe('translateY(2px)');
        
        // Unselected button should not be pressed
        expect(unselectedButton.getAttribute('aria-pressed')).toBe('false');
        expect(unselectedButton.style.transform).toBe('translateY(0)');
    });
    
    test('should maintain only one selected button at a time', () => {
        trackSelector.mount();
        
        // Select track 4 and verify exclusivity
        trackSelector.selectTrack(4);
        
        for (let i = 1; i <= 5; i++) {
            const button = document.querySelector(`[data-track="${i}"]`) as HTMLButtonElement;
            const pressed = button.getAttribute('aria-pressed');
            if (i === 4) {
                expect(pressed).toBe('true');
                expect(button.style.transform).toBe('translateY(2px)');
            } else {
                expect(pressed).toBe('false');
                expect(button.style.transform).toBe('translateY(0)');
            }
        }
    });
});