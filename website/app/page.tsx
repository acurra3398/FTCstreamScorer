'use client';

import { Download, Github, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Home() {
  const [downloads, setDownloads] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetch('/api/downloads')
      .then(res => res.json())
      .then(data => setDownloads(data.count))
      .catch(() => setDownloads(0));
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      await fetch('/api/downloads', { method: 'POST' });
      setDownloads(prev => (prev || 0) + 1);
    } catch (error) {
      console.error('Failed to track download:', error);
    }

    window.location.href = 'https://github.com/23333Hercules-Robotics/FTCstreamScorer/releases/latest/download/stream-scorer-1.0.0.jar';
    
    setTimeout(() => setIsDownloading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-12 text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            FTC Stream Scorer
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl text-gray-300 mb-2">
            DECODE 2025-2026 Season
          </p>
          
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Professional scoring system with dual-window output, webcam integration, and authentic FTC timing.
          </p>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-blue-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 mx-auto mb-6"
          >
            <Download className="w-6 h-6" />
            <span>{isDownloading ? 'Downloading...' : 'Download Now'}</span>
          </button>

          {/* Stats */}
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-400 mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Free & Open Source</span>
            </div>
            {downloads !== null && (
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>{downloads.toLocaleString()} downloads</span>
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-400 text-xs mb-1">Platform</p>
              <p className="text-white font-medium">Windows, macOS, Linux</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-400 text-xs mb-1">Requirements</p>
              <p className="text-white font-medium">Java 11+</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-400 text-xs mb-1">Version</p>
              <p className="text-white font-medium">1.0.0</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center space-x-6">
            <a
              href="https://github.com/23333Hercules-Robotics/FTCstreamScorer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
              <span>View on GitHub</span>
            </a>
            <a
              href="https://github.com/23333Hercules-Robotics/FTCstreamScorer/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Documentation</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Built for the FTC community by Hercules Robotics</p>
        </div>
      </div>
    </div>
  );
}
