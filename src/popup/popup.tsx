import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';

const Popup = () => {
  return (
    <div className="w-80 p-4 bg-white">
      <h1 className="text-xl font-bold text-blue-600 mb-2">PagePilot</h1>
      <p className="text-sm text-gray-600">Your local-first AI assistant is ready.</p>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
