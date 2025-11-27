'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/constants';

export default function HomePage() {
  const [mode, setMode] = useState<'join' | 'create' | 'host'>('join');
  const [eventName, setEventName] = useState('');
  const [password, setPassword] = useState('');
  const [alliance, setAlliance] = useState<'RED' | 'BLUE'>('RED');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setError('Please enter an event name');
      return;
    }
    if (!password.trim()) {
      setError('Please enter the password');
      return;
    }
    // Navigate to scoring page
    const params = new URLSearchParams({
      event: eventName.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
      password: password,
      alliance: alliance,
    });
    window.location.href = `/score?${params.toString()}`;
  };

  const handleHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setError('Please enter an event name');
      return;
    }
    if (!password.trim()) {
      setError('Please enter the password');
      return;
    }
    // Navigate to host page
    const params = new URLSearchParams({
      event: eventName.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
      password: password,
    });
    window.location.href = `/host?${params.toString()}`;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setError('Please enter an event name');
      return;
    }
    if (!password.trim() || password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventName, password }),
      });
      const result = await response.json();
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to create event: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const getFormHandler = () => {
    switch (mode) {
      case 'join': return handleJoin;
      case 'host': return handleHost;
      case 'create': return handleCreate;
    }
  };

  const getFormTitle = () => {
    switch (mode) {
      case 'join': return 'Join Event';
      case 'host': return 'Host Event';
      case 'create': return 'Create New Event';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          🏆 FTC Stream Scorer
        </h1>
        <p className="text-sm text-gray-400 mb-2">Designed by #30329 Mechanical Masterminds</p>
        <p className="text-xl text-gray-300">DECODE 2025-2026</p>
        <p className="text-gray-400 mt-2">Web-based referee scoring for iPads & tablets</p>
      </div>

      {/* Mode Toggle */}
      <div className="bg-gray-700 rounded-lg p-1 mb-6 flex flex-wrap justify-center gap-1">
        <button
          onClick={() => { setMode('join'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 rounded-md font-bold transition-all ${
            mode === 'join' 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Join Event
        </button>
        <button
          onClick={() => { setMode('host'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 rounded-md font-bold transition-all ${
            mode === 'host' 
              ? 'bg-green-600 text-white' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Host Event
        </button>
        <button
          onClick={() => { setMode('create'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 rounded-md font-bold transition-all ${
            mode === 'create' 
              ? 'bg-purple-600 text-white' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Create Event
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {getFormTitle()}
        </h2>

        <form onSubmit={getFormHandler()} className="space-y-4">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => {
                setEventName(e.target.value);
                setError('');
                setSuccess('');
              }}
              placeholder="e.g., SCRIMMAGE_2024"
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {mode === 'create' && <span className="text-gray-500">(min 4 characters)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
                setSuccess('');
              }}
              placeholder={mode === 'create' ? 'Create a password' : 'Enter event password'}
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Alliance Selection - Only for Join mode */}
          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Alliance to Score
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAlliance('RED')}
                  className={`p-4 rounded-lg font-bold text-xl transition-all ${
                    alliance === 'RED'
                      ? 'ring-4 ring-red-300 scale-105'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: COLORS.RED_PRIMARY,
                    color: 'white'
                  }}
                >
                  🔴 RED
                </button>
                <button
                  type="button"
                  onClick={() => setAlliance('BLUE')}
                  className={`p-4 rounded-lg font-bold text-xl transition-all ${
                    alliance === 'BLUE'
                      ? 'ring-4 ring-blue-300 scale-105'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: COLORS.BLUE_PRIMARY,
                    color: 'white'
                  }}
                >
                  🔵 BLUE
                </button>
              </div>
            </div>
          )}

          {/* Host Mode Description */}
          {mode === 'host' && (
            <div className="bg-green-50 p-3 rounded-lg text-sm text-green-800">
              <strong>Host Mode:</strong> Control match state, set teams, manage motif pattern, and reset scores. Share the display link with your stream software.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-100 text-green-700 p-3 rounded-lg text-center whitespace-pre-line">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full p-4 rounded-lg font-bold text-xl transition-colors ${
              mode === 'join'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : mode === 'host'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading 
              ? 'Creating...' 
              : mode === 'join' 
                ? 'Join & Start Scoring' 
                : mode === 'host'
                ? 'Open Host Controls'
                : 'Create Event'
            }
          </button>
        </form>

        {/* Quick switch after creating */}
        {mode === 'create' && success && (
          <div className="mt-4 text-center space-y-2">
            <button
              onClick={() => { setMode('host'); setSuccess(''); }}
              className="text-green-600 hover:text-green-800 font-medium block w-full"
            >
              → Host your event (control match state & teams)
            </button>
            <button
              onClick={() => { setMode('join'); setSuccess(''); }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              → Now join your event to start scoring
            </button>
          </div>
        )}
      </div>

      {/* Display Only Link */}
      <div className="mt-6 text-center">
        <Link 
          href="/display"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          View Display Only Mode →
        </Link>
      </div>

      {/* Instructions */}
      <div className="mt-8 text-center text-gray-400 max-w-md">
        <p className="text-sm">
          {mode === 'join' 
            ? <><strong>How it works:</strong> The host creates an event, then referees join using their iPads or tablets to score for their assigned alliance.</>
            : mode === 'host'
            ? <><strong>Host mode:</strong> Control the match flow - set teams, change match state, choose the motif pattern, and reset scores between matches.</>
            : <><strong>Creating an event:</strong> Choose a unique name and password. Share these with your referees so they can join and score.</>
          }
        </p>
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-8 text-gray-500 text-sm text-center">
        <p>Built for the FIRST Tech Challenge community</p>
        <p className="mt-1">
          <a href="https://github.com" className="hover:text-gray-300">GitHub</a>
          {' • '}
          <a href="https://firstinspires.org" className="hover:text-gray-300">FIRST Inspires</a>
        </p>
      </footer>
    </main>
  );
}
