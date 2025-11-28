'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MatchRecord } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';

// Interface for admin event details
interface AdminEventDetails {
  event_name: string;
  password_hash: string;
  password_plain: string;
  match_state: string;
  created_at: string;
  updated_at: string;
  red_team1: string;
  red_team2: string;
  blue_team1: string;
  blue_team2: string;
  timer_running: boolean;
  timer_paused: boolean;
  timer_seconds_remaining: number;
  red_scores_submitted: boolean;
  blue_scores_submitted: boolean;
}

// API helper to get all events (admin only)
async function getAllEventsAPI(adminPassword: string): Promise<{ events: string[]; eventDetails: AdminEventDetails[]; error?: string }> {
  try {
    const response = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword }),
    });
    const result = await response.json();
    if (result.success) {
      return { events: result.events || [], eventDetails: result.eventDetails || [] };
    }
    return { events: [], eventDetails: [], error: result.message };
  } catch (error) {
    console.error('Error fetching events:', error);
    return { events: [], eventDetails: [], error: 'Network error' };
  }
}

// API helper to get matches for an event
async function getEventMatchesAPI(eventName: string): Promise<MatchRecord[]> {
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventName)}/matches`);
    const result = await response.json();
    if (result.success && result.matches) {
      return result.matches as MatchRecord[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
}

interface EventWithMatches {
  eventName: string;
  matches: MatchRecord[];
  expanded: boolean;
  details?: AdminEventDetails;
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [events, setEvents] = useState<EventWithMatches[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Get match state color and label
  const getMatchStateInfo = (state: string): { color: string; label: string } => {
    switch (state) {
      case 'NOT_STARTED':
        return { color: 'bg-gray-500', label: 'Ready' };
      case 'AUTONOMOUS':
        return { color: 'bg-green-600', label: 'Auto' };
      case 'TRANSITION':
        return { color: 'bg-yellow-500', label: 'Transition' };
      case 'TELEOP':
        return { color: 'bg-blue-600', label: 'TeleOp' };
      case 'END_GAME':
        return { color: 'bg-orange-500', label: 'End Game' };
      case 'FINISHED':
        return { color: 'bg-red-600', label: 'Finished' };
      case 'UNDER_REVIEW':
        return { color: 'bg-yellow-600', label: 'Review' };
      case 'SCORES_RELEASED':
        return { color: 'bg-purple-600', label: 'Results' };
      default:
        return { color: 'bg-gray-400', label: state };
    }
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const result = await getAllEventsAPI(adminPassword);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    
    // Load matches for all events and include details
    const eventsWithMatches: EventWithMatches[] = await Promise.all(
      result.events.map(async (eventName) => {
        const matches = await getEventMatchesAPI(eventName);
        const details = result.eventDetails.find(d => d.event_name === eventName);
        return {
          eventName,
          matches,
          expanded: false,
          details,
        };
      })
    );
    
    setEvents(eventsWithMatches);
    setIsAuthenticated(true);
    setLastRefresh(new Date().toLocaleString());
    setIsLoading(false);
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsLoading(true);
    
    const result = await getAllEventsAPI(adminPassword);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    
    const eventsWithMatches: EventWithMatches[] = await Promise.all(
      result.events.map(async (eventName) => {
        const matches = await getEventMatchesAPI(eventName);
        const existingEvent = events.find(e => e.eventName === eventName);
        const details = result.eventDetails.find(d => d.event_name === eventName);
        return {
          eventName,
          matches,
          expanded: existingEvent?.expanded ?? false,
          details,
        };
      })
    );
    
    setEvents(eventsWithMatches);
    setLastRefresh(new Date().toLocaleString());
    setIsLoading(false);
  };

  // Toggle event expansion
  const toggleEvent = (eventName: string) => {
    setEvents(prev => prev.map(e => 
      e.eventName === eventName ? { ...e, expanded: !e.expanded } : e
    ));
  };

  // Calculate stats
  const totalMatches = events.reduce((sum, e) => sum + e.matches.length, 0);
  const redWins = events.reduce((sum, e) => sum + e.matches.filter(m => m.winner === 'RED').length, 0);
  const blueWins = events.reduce((sum, e) => sum + e.matches.filter(m => m.winner === 'BLUE').length, 0);
  const ties = events.reduce((sum, e) => sum + e.matches.filter(m => m.winner === 'TIE').length, 0);
  const activeEvents = events.filter(e => e.details?.match_state !== 'NOT_STARTED' && e.details?.match_state !== 'SCORES_RELEASED').length;

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">🔐 Admin Dashboard</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-4 bg-purple-600 text-white rounded-lg font-bold text-xl hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <p className="text-sm text-gray-500 mt-4 text-center">
            Admin access required to view all events, passwords, and match status.
          </p>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-purple-800 text-white px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🔐 Admin Dashboard</h1>
            <p className="text-purple-200 text-sm">View all events, passwords, and match status</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-purple-200">Last refresh: {lastRefresh}</span>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500 disabled:opacity-50"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setShowPasswords(!showPasswords)}
              className={`px-4 py-2 rounded ${showPasswords ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              {showPasswords ? '🔓 Hide Passwords' : '🔒 Show Passwords'}
            </button>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setAdminPassword('');
                setEvents([]);
              }}
              className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-gray-500 text-sm">Total Events</div>
            <div className="text-3xl font-bold text-purple-600">{events.length}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-gray-500 text-sm">Active Now</div>
            <div className="text-3xl font-bold text-green-600">{activeEvents}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-gray-500 text-sm">Total Matches</div>
            <div className="text-3xl font-bold text-gray-800">{totalMatches}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-gray-500 text-sm">Red Wins</div>
            <div className="text-3xl font-bold" style={{ color: COLORS.RED_PRIMARY }}>{redWins}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-gray-500 text-sm">Blue Wins</div>
            <div className="text-3xl font-bold" style={{ color: COLORS.BLUE_PRIMARY }}>{blueWins}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-gray-500 text-sm">Ties</div>
            <div className="text-3xl font-bold text-yellow-600">{ties}</div>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="bg-white rounded-lg p-8 shadow text-center text-gray-500">
              No events found. Events will appear here when created.
            </div>
          ) : (
            events.map((event) => {
              const stateInfo = getMatchStateInfo(event.details?.match_state || 'NOT_STARTED');
              return (
                <div key={event.eventName} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Event Header */}
                  <div className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => toggleEvent(event.eventName)}
                        className="text-xl"
                      >
                        {event.expanded ? '📂' : '📁'}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">{event.eventName}</span>
                          <span className={`px-2 py-1 rounded text-white text-xs font-bold ${stateInfo.color}`}>
                            {stateInfo.label}
                          </span>
                          {event.details?.timer_running && !event.details?.timer_paused && (
                            <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-bold animate-pulse">
                              ⏱️ LIVE
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 text-sm mt-1">
                          {event.matches.length} matches • 
                          {event.matches.filter(m => m.winner === 'RED').length} red wins • 
                          {event.matches.filter(m => m.winner === 'BLUE').length} blue wins
                          {event.details?.created_at && (
                            <> • Created: {new Date(event.details.created_at).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Password, Referee Status, and Teams Info */}
                    <div className="flex items-center gap-6">
                      {/* Password */}
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Event Password</div>
                        <div className="font-mono text-sm">
                          {showPasswords 
                            ? (event.details?.password_plain || 'N/A')
                            : '••••••••••'}
                        </div>
                      </div>
                      
                      {/* Referee Submission Status */}
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Referee Scores</div>
                        <div className="flex gap-2 text-sm">
                          <span className={`px-2 py-0.5 rounded ${event.details?.red_scores_submitted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                            {event.details?.red_scores_submitted ? '✅ RED' : '⏳ RED'}
                          </span>
                          <span className={`px-2 py-0.5 rounded ${event.details?.blue_scores_submitted ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-700'}`}>
                            {event.details?.blue_scores_submitted ? '✅ BLUE' : '⏳ BLUE'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Current Teams */}
                      {(event.details?.red_team1 || event.details?.blue_team1) && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Current Match</div>
                          <div className="text-sm">
                            <span className="text-red-600">{event.details?.red_team1 || '----'} + {event.details?.red_team2 || '----'}</span>
                            <span className="mx-2 text-gray-400">vs</span>
                            <span className="text-blue-600">{event.details?.blue_team1 || '----'} + {event.details?.blue_team2 || '----'}</span>
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => toggleEvent(event.eventName)}
                        className="text-2xl text-gray-400"
                      >
                        {event.expanded ? '▼' : '▶'}
                      </button>
                    </div>
                  </div>

                  {/* Matches Table */}
                  {event.expanded && (
                    <div className="border-t">
                      {event.matches.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          No matches recorded yet for this event.
                        </div>
                      ) : (
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left">#</th>
                              <th className="px-4 py-2 text-left">Red Teams</th>
                              <th className="px-4 py-2 text-center">Red Score</th>
                              <th className="px-4 py-2 text-center">Blue Score</th>
                              <th className="px-4 py-2 text-left">Blue Teams</th>
                              <th className="px-4 py-2 text-center">Winner</th>
                              <th className="px-4 py-2 text-left">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {event.matches.map((match) => (
                              <tr key={match.id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-3 font-bold">{match.match_number}</td>
                                <td className="px-4 py-3">
                                  <span className="text-red-600">{match.red_team1 || '----'}</span>
                                  {' + '}
                                  <span className="text-red-600">{match.red_team2 || '----'}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span 
                                    className="font-bold px-3 py-1 rounded"
                                    style={{ 
                                      backgroundColor: match.winner === 'RED' ? COLORS.RED_PRIMARY : '#f3f4f6',
                                      color: match.winner === 'RED' ? 'white' : COLORS.RED_PRIMARY,
                                    }}
                                  >
                                    {match.red_total_score}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span 
                                    className="font-bold px-3 py-1 rounded"
                                    style={{ 
                                      backgroundColor: match.winner === 'BLUE' ? COLORS.BLUE_PRIMARY : '#f3f4f6',
                                      color: match.winner === 'BLUE' ? 'white' : COLORS.BLUE_PRIMARY,
                                    }}
                                  >
                                    {match.blue_total_score}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-blue-600">{match.blue_team1 || '----'}</span>
                                  {' + '}
                                  <span className="text-blue-600">{match.blue_team2 || '----'}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {match.winner === 'RED' && (
                                    <span className="px-2 py-1 rounded text-white font-bold" style={{ backgroundColor: COLORS.RED_PRIMARY }}>
                                      🔴 RED
                                    </span>
                                  )}
                                  {match.winner === 'BLUE' && (
                                    <span className="px-2 py-1 rounded text-white font-bold" style={{ backgroundColor: COLORS.BLUE_PRIMARY }}>
                                      🔵 BLUE
                                    </span>
                                  )}
                                  {match.winner === 'TIE' && (
                                    <span className="px-2 py-1 rounded bg-yellow-500 text-white font-bold">
                                      🤝 TIE
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-sm">
                                  {new Date(match.recorded_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Admin Dashboard...</p>
        </div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
