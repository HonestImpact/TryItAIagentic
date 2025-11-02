/**
 * Request Classifier Test Suite
 *
 * Validates the RequestClassifier service correctly identifies:
 * - SIMPLE_CONVERSATION: Quick responses (<2s)
 * - SIMPLE_TOOL: Fast tool generation (5-15s)
 * - COMPLEX_WORK: Async candidate (30-90s)
 * - DEEP_WORK: Extensive research/building (2-5min)
 */

import { describe, it, expect } from 'vitest';
import { RequestClassifier, RequestTier } from '../request-classifier.service';

describe('RequestClassifier', () => {
  const classifier = new RequestClassifier();

  describe('SIMPLE_CONVERSATION classification', () => {
    it('should classify greetings as simple conversation', () => {
      const testCases = [
        'Hi there!',
        'Hello',
        'Good morning',
        'Hey Noah',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.SIMPLE_CONVERSATION);
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.estimatedDuration).toBeLessThanOrEqual(2);
      }
    });

    it('should classify simple questions as conversation', () => {
      const testCases = [
        'What is React?',
        'How do I use useState?',
        'Explain closures to me',
        'Tell me about TypeScript',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.SIMPLE_CONVERSATION);
        expect(result.confidence).toBeGreaterThan(0.8);
      }
    });

    it('should classify gratitude as conversation', () => {
      const testCases = [
        'Thanks!',
        'Thank you so much',
        'I appreciate your help',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.SIMPLE_CONVERSATION);
        expect(result.confidence).toBeGreaterThan(0.8);
      }
    });

    it('should classify short requests as conversation', () => {
      const result = classifier.classify('Got it');
      expect(result.tier).toBe(RequestTier.SIMPLE_CONVERSATION);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('SIMPLE_TOOL classification', () => {
    it('should classify simple calculators as simple tool', () => {
      const testCases = [
        'Build a calculator',
        'Create a simple calculator tool',
        'Make a basic calculator',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.SIMPLE_TOOL);
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.estimatedDuration).toBeLessThanOrEqual(15);
      }
    });

    it('should classify timers and counters as simple tool', () => {
      const testCases = [
        'Create a timer',
        'Build a counter app',
        'Make a stopwatch',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.SIMPLE_TOOL);
        expect(result.confidence).toBeGreaterThan(0.8);
      }
    });

    it('should classify color pickers and generators as simple tool', () => {
      const testCases = [
        'Make a color picker',
        'Create a random number generator',
        'Build a random color generator',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.SIMPLE_TOOL);
        expect(result.confidence).toBeGreaterThan(0.8);
      }
    });
  });

  describe('COMPLEX_WORK classification', () => {
    it('should classify dashboard requests as complex work', () => {
      const testCases = [
        'Build a dashboard',
        'Create an analytics dashboard',
        'Make a monitoring dashboard',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.COMPLEX_WORK);
        expect(result.estimatedDuration).toBeGreaterThanOrEqual(30);
        expect(result.estimatedDuration).toBeLessThanOrEqual(90);
      }
    });

    it('should classify chart/visualization requests as complex work', () => {
      const testCases = [
        'Create a data visualization',
        'Build a chart component',
        'Make an interactive graph',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.COMPLEX_WORK);
      }
    });

    it('should classify API integration as complex work', () => {
      const testCases = [
        'Integrate with the GitHub API',
        'Fetch data from a REST API',
        'Build a database-backed application',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.COMPLEX_WORK);
      }
    });

    it('should classify authentication as complex work', () => {
      const result = classifier.classify('Add user authentication');
      expect(result.tier).toBe(RequestTier.COMPLEX_WORK);
    });
  });

  describe('DEEP_WORK classification', () => {
    it('should classify research requests as deep work', () => {
      const testCases = [
        'Research the best authentication patterns',
        'Do comprehensive analysis of state management',
        'Research latest React trends',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.DEEP_WORK);
        expect(result.estimatedDuration).toBeGreaterThanOrEqual(120);
      }
    });

    it('should classify architectural work as deep work', () => {
      const testCases = [
        'Design the system architecture',
        'Create a comprehensive architecture plan',
        'Analyze the codebase structure',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.DEEP_WORK);
      }
    });

    it('should classify full implementations as deep work', () => {
      const testCases = [
        'Build a full implementation of a social network',
        'Create a comprehensive e-commerce system',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.DEEP_WORK);
      }
    });

    it('should classify comparison/evaluation as deep work', () => {
      const testCases = [
        'Compare React vs Vue for my project',
        'Evaluate different database approaches',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.tier).toBe(RequestTier.DEEP_WORK);
      }
    });
  });

  describe('Complexity indicators', () => {
    it('should increase complexity for "multiple" keyword', () => {
      const simple = classifier.classify('Create a form');
      const complex = classifier.classify('Create multiple complex forms');

      // "multiple complex" should push toward higher tier
      expect(complex.tier).not.toBe(RequestTier.SIMPLE_TOOL);
    });

    it('should decrease complexity for "simple" keyword', () => {
      const result = classifier.classify('Create a simple dashboard');

      // "simple" should temper the complexity of "dashboard"
      // Though dashboard is inherently complex, "simple" should lower estimate
      expect(result.estimatedDuration).toBeLessThan(90);
    });

    it('should increase complexity for long requests', () => {
      const shortRequest = 'Build a form';
      const longRequest = 'I need you to build a comprehensive form system with validation, error handling, multi-step workflows, conditional logic, file uploads, real-time validation, and integration with a backend API that stores form submissions in a database with full CRUD operations.';

      const shortResult = classifier.classify(shortRequest);
      const longResult = classifier.classify(longRequest);

      // Long request should have higher estimated duration
      expect(longResult.estimatedDuration).toBeGreaterThan(shortResult.estimatedDuration);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string gracefully', () => {
      const result = classifier.classify('');
      expect(result.tier).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should handle very short input', () => {
      const result = classifier.classify('Hi');
      expect(result.tier).toBe(RequestTier.SIMPLE_CONVERSATION);
    });

    it('should classify vague conversational requests as conversation', () => {
      const result = classifier.classify('Do something interesting');
      // Even vague requests that sound conversational should be classified as conversation
      expect(result.tier).toBe(RequestTier.SIMPLE_CONVERSATION);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should provide reasoning for all classifications', () => {
      const testCases = [
        'Hello',
        'Build a calculator',
        'Create a dashboard',
        'Research authentication patterns',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.reasoning).toBeDefined();
        expect(result.reasoning.length).toBeGreaterThan(0);
      }
    });
  });

  describe('isAsyncCandidate', () => {
    it('should return true for COMPLEX_WORK', () => {
      const result = classifier.isAsyncCandidate(RequestTier.COMPLEX_WORK);
      expect(result).toBe(true);
    });

    it('should return true for DEEP_WORK', () => {
      const result = classifier.isAsyncCandidate(RequestTier.DEEP_WORK);
      expect(result).toBe(true);
    });

    it('should return false for SIMPLE_CONVERSATION', () => {
      const result = classifier.isAsyncCandidate(RequestTier.SIMPLE_CONVERSATION);
      expect(result).toBe(false);
    });

    it('should return false for SIMPLE_TOOL', () => {
      const result = classifier.isAsyncCandidate(RequestTier.SIMPLE_TOOL);
      expect(result).toBe(false);
    });
  });

  describe('Classification result structure', () => {
    it('should return all required fields', () => {
      const result = classifier.classify('Hello');

      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('estimatedDuration');
    });

    it('should have confidence between 0 and 1', () => {
      const testCases = [
        'Hello',
        'Build a calculator',
        'Create a dashboard',
        'Research patterns',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should have positive estimated duration', () => {
      const testCases = [
        'Hello',
        'Build a calculator',
        'Create a dashboard',
        'Research patterns',
      ];

      for (const request of testCases) {
        const result = classifier.classify(request);
        expect(result.estimatedDuration).toBeGreaterThan(0);
      }
    });
  });
});
