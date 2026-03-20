'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; fallbackLabel?: string }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
          </div>
          <h1 className="text-base font-semibold text-gray-900 mb-2">
            {this.props.fallbackLabel ?? 'Something went wrong'}
          </h1>
          <p className="text-sm text-gray-500 mb-1">
            An unexpected error occurred. Your saved data is safe in your browser.
          </p>
          <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg p-3 mb-6 text-left break-all">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={14} />
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
