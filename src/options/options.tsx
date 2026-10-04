import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';

const Options = () => {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">PagePilot Settings</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-2">Local AI Configuration</h2>
        <p className="text-gray-600 mb-4">Configure your local Ollama instance here.</p>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Ollama Endpoint</label>
          <input 
            type="text" 
            className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            defaultValue="http://localhost:11434"
          />
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
