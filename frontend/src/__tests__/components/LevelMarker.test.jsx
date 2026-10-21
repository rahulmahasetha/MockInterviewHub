/**
 * Tests for components/LevelMarker.jsx
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LevelMarker from '../../components/LevelMarker';

// 

describe('LevelMarker', () => {
  // 

  describe('Rendering', () => {
    test('renders the level number when not locked or completed', () => {
      render(<LevelMarker level={3} />);
      expect(screen.getByRole('button')).toHaveTextContent('3');
    });

    test('renders "L" when locked', () => {
      render(<LevelMarker level={3} locked />);
      expect(screen.getByRole('button')).toHaveTextContent('L');
    });

    test('renders "OK" when completed', () => {
      render(<LevelMarker level={3} completed />);
      expect(screen.getByRole('button')).toHaveTextContent('OK');
    });
  });

  // 

  describe('CSS classes', () => {
    test('applies "locked" class when locked prop is true', () => {
      render(<LevelMarker level={2} locked />);
      expect(screen.getByRole('button')).toHaveClass('locked');
    });

    test('does not apply "locked" class when not locked', () => {
      render(<LevelMarker level={2} />);
      expect(screen.getByRole('button')).not.toHaveClass('locked');
    });

    test('applies "completed" class when completed prop is true', () => {
      render(<LevelMarker level={2} completed />);
      expect(screen.getByRole('button')).toHaveClass('completed');
    });

    test('applies "current" class when current prop is true', () => {
      render(<LevelMarker level={2} current />);
      expect(screen.getByRole('button')).toHaveClass('current');
    });

    test('always has "level-marker" base class', () => {
      render(<LevelMarker level={1} />);
      expect(screen.getByRole('button')).toHaveClass('level-marker');
    });

    test('can have multiple state classes simultaneously', () => {
      // e.g., completed + current
      render(<LevelMarker level={1} completed current />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('completed');
      expect(btn).toHaveClass('current');
    });
  });

  // 

  describe('Disabled state', () => {
    test('button is disabled when locked', () => {
      render(<LevelMarker level={3} locked />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    test('button is NOT disabled when not locked', () => {
      render(<LevelMarker level={3} />);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  // 

  describe('Tooltip (title attribute)', () => {
    test('shows "Complete previous level to unlock" when locked', () => {
      render(<LevelMarker level={4} locked />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'title',
        'Complete previous level to unlock'
      );
    });

    test('shows completed tooltip when completed', () => {
      render(<LevelMarker level={4} completed />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'title',
        'Level 4 completed'
      );
    });

    test('shows current tooltip when current', () => {
      render(<LevelMarker level={2} current />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'title',
        'Level 2 current'
      );
    });

    test('shows generic level tooltip by default', () => {
      render(<LevelMarker level={5} />);
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Level 5');
    });
  });

  // 

  describe('Click behaviour', () => {
    test('calls onClick when not locked', () => {
      const handleClick = jest.fn();
      render(<LevelMarker level={1} onClick={handleClick} />);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('does NOT call onClick when locked (button is disabled)', () => {
      const handleClick = jest.fn();
      render(<LevelMarker level={1} locked onClick={handleClick} />);
      fireEvent.click(screen.getByRole('button'));
      // Disabled buttons don't fire click events in most browsers,
      // and our implementation sets onClick={undefined} when locked.
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // 

  describe('Category data attribute', () => {
    test('sets data-category attribute from category prop', () => {
      render(<LevelMarker level={1} category="math" />);
      expect(screen.getByRole('button')).toHaveAttribute('data-category', 'math');
    });

    test('works without a category prop', () => {
      render(<LevelMarker level={1} />);
      // Should render without crashing; attribute may be undefined
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
