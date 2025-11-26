'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/constants';

export default function HomePage() {
  const [eventName, setEventName] = useState('');
  const [password, setPassword] = useState('');
  const [alliance, setAlliance] = useState<'RED' | 'BLUE'>('RED');
  const [error, setError] = useState('');

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          🏆 FTC Stream Scorer
        </h1>
        <p className="text-xl text-gray-300">DECODE 2025-2026</p>
        <p className="text-gray-400 mt-2">Web-based referee scoring for iPads & tablets</p>
      </div>

      {/* Join Event Form */}
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Join Event
        </h2>

        <form onSubmit={handleJoin} className="space-y-4">
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
              }}
              placeholder="e.g., SCRIMMAGE_2024"
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter event password"
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Alliance Selection */}
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

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full p-4 bg-green-600 text-white rounded-lg font-bold text-xl hover:bg-green-700 transition-colors"
          >
            Join & Start Scoring
          </button>
        </form>
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
          <strong>How it works:</strong> The host creates an event in the desktop app, 
          then referees join using their iPads or tablets to score for their assigned alliance.
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
