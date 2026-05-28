import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router';
import { ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './button.js';

export const RouteErrorFallback: React.FC = () => {
  const error = useRouteError();
  console.error('Route error caught by Boundary:', error);

  let errorMessage = 'An unexpected runtime error has occurred in the application.';
  let errorStatus = '';

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText || errorMessage;
    errorStatus = `${error.status}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050806] text-slate-100 font-sans p-6">
      <div className="w-full max-w-md bg-[#0d0d0c]/80 border border-red-950/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden select-none animate-in fade-in zoom-in duration-200">
        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 size-48 rounded-full bg-red-950/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 size-48 rounded-full bg-red-950/20 blur-3xl" />

        <div className="flex flex-col items-center text-center">
          <div className="size-16 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center text-red-400 mb-6 shrink-0 shadow-lg">
            <ShieldAlert className="size-8 animate-pulse" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-100 uppercase tracking-wider">
            Application Crash Guard
          </h1>
          {errorStatus && (
            <span className="mt-2 text-xs font-semibold px-2 py-0.5 bg-red-950/60 border border-red-900/40 rounded text-red-400">
              Error Status Code: {errorStatus}
            </span>
          )}

          <p className="mt-4 text-sm text-slate-400 leading-normal max-h-40 overflow-y-auto w-full p-3 bg-red-950/10 border border-red-950/30 rounded-xl font-mono text-left text-xs break-all selection:bg-red-900/40">
            {errorMessage}
          </p>

          <p className="mt-4 text-xs text-slate-500 max-w-xs leading-normal">
            The safety shield caught an unhandled exception. Your session data remains secure in memory.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full">
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 h-10 text-xs font-bold bg-[#1a231f] text-slate-300 hover:text-slate-100 border border-[#2a3c35] px-4 rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="size-3.5" />
              Reload Page
            </Button>
            
            <Button
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = '#/';
                }
              }}
              className="flex-1 h-10 text-xs font-bold bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-900/60 hover:border-emerald-800/80 text-emerald-400 rounded-xl flex items-center justify-center gap-2"
            >
              <ArrowLeft className="size-3.5" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
