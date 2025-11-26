'use client';

import React from 'react';
import { MatchRecord } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';

interface MatchHistoryProps {
  matches: MatchRecord[];
  onClose: () => void;
}

export default function MatchHistory({ matches, onClose }: MatchHistoryProps) {
  if (matches.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Match History</h2>
            <button 
              onClick={onClose}
              className="text-2xl font-bold text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 text-center py-8">No matches recorded yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Match History ({matches.length} matches)</h2>
          <button 
            onClick={onClose}
            className="text-2xl font-bold text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">#</th>
                <th className="border p-2 text-left">Red Alliance</th>
                <th className="border p-2 text-center">Score</th>
                <th className="border p-2 text-center">vs</th>
                <th className="border p-2 text-center">Score</th>
                <th className="border p-2 text-left">Blue Alliance</th>
                <th className="border p-2 text-center">Winner</th>
                <th className="border p-2 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="hover:bg-gray-50">
                  <td className="border p-2 font-bold">{match.match_number}</td>
                  <td className="border p-2">
                    <span className="text-red-600 font-medium">
                      {match.red_team1 || '----'} + {match.red_team2 || '----'}
                    </span>
                  </td>
                  <td 
                    className="border p-2 text-center font-bold text-xl"
                    style={{ 
                      backgroundColor: match.winner === 'RED' ? COLORS.RED_PRIMARY : 'transparent',
                      color: match.winner === 'RED' ? 'white' : COLORS.RED_PRIMARY
                    }}
                  >
                    {match.red_total_score}
                  </td>
                  <td className="border p-2 text-center text-gray-400">vs</td>
                  <td 
                    className="border p-2 text-center font-bold text-xl"
                    style={{ 
                      backgroundColor: match.winner === 'BLUE' ? COLORS.BLUE_PRIMARY : 'transparent',
                      color: match.winner === 'BLUE' ? 'white' : COLORS.BLUE_PRIMARY
                    }}
                  >
                    {match.blue_total_score}
                  </td>
                  <td className="border p-2">
                    <span className="text-blue-600 font-medium">
                      {match.blue_team1 || '----'} + {match.blue_team2 || '----'}
                    </span>
                  </td>
                  <td className="border p-2 text-center">
                    {match.winner === 'TIE' ? (
                      <span className="bg-gray-200 px-2 py-1 rounded font-bold">TIE</span>
                    ) : (
                      <span 
                        className="px-2 py-1 rounded font-bold text-white"
                        style={{ backgroundColor: match.winner === 'RED' ? COLORS.RED_PRIMARY : COLORS.BLUE_PRIMARY }}
                      >
                        {match.winner}
                      </span>
                    )}
                  </td>
                  <td className="border p-2 text-sm text-gray-600">
                    {new Date(match.recorded_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t flex justify-around">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {matches.filter(m => m.winner === 'RED').length}
            </div>
            <div className="text-sm text-gray-600">Red Wins</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">
              {matches.filter(m => m.winner === 'TIE').length}
            </div>
            <div className="text-sm text-gray-600">Ties</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {matches.filter(m => m.winner === 'BLUE').length}
            </div>
            <div className="text-sm text-gray-600">Blue Wins</div>
          </div>
        </div>
      </div>
    </div>
  );
}
