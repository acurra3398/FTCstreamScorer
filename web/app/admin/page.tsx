'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MatchRecord } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';

// API helper to get all events (admin only)
async function getAllEventsAPI(adminPassword: string): Promise<{ events: string[]; error?: string }> {
  try {
    const response = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword }),
    });
    const result = await response.json();
    if (result.success) {
      return { events: result.events || [] };
    }
    return { events: [], error: result.message };
  } catch (error) {
    console.error('Error fetching events:', error);
    return { events: [], error: 'Network error' };
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
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [events, setEvents] = useState<EventWithMatches[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>('');

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
    
    // Load matches for all events
    const eventsWithMatches: EventWithMatches[] = await Promise.all(
      result.events.map(async (eventName) => {
        const matches = await getEventMatchesAPI(eventName);
        return {
          eventName,
          matches,
          expanded: false,
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
        return {
          eventName,
          matches,
          expanded: existingEvent?.expanded ?? false,
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
            Admin access required to view all events and matches.
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
            <p className="text-purple-200 text-sm">View all events and match history</p>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-gray-500 text-sm">Total Events</div>
            <div className="text-3xl font-bold text-purple-600">{events.length}</div>
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
            events.map((event) => (
              <div key={event.eventName} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Event Header */}
                <button
                  onClick={() => toggleEvent(event.eventName)}
                  className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{event.expanded ? '📂' : '📁'}</span>
                    <div className="text-left">
                      <div className="font-bold text-lg">{event.eventName}</div>
                      <div className="text-gray-500 text-sm">
                        {event.matches.length} matches • 
                        {event.matches.filter(m => m.winner === 'RED').length} red wins • 
                        {event.matches.filter(m => m.winner === 'BLUE').length} blue wins
                      </div>
                    </div>
                  </div>
                  <span className="text-2xl text-gray-400">
                    {event.expanded ? '▼' : '▶'}
                  </span>
                </button>

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
            ))
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
