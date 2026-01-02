
import React from 'react';
import { PROPOSED_SQL_SCHEMA } from '../constants';
import { Database, FolderTree } from 'lucide-react';

export const SchemaViewer: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in text-gray-900 dark:text-gray-100">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-2">
          <Database className="w-5 h-5" />
          System Architecture: Multi-Tenancy
        </h2>
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          Nexaloom uses a <strong>Row-Level Security</strong> approach for multi-tenancy. 
          Every major table (`users`, `leads`, `interactions`) has a `tenant_id` foreign key. 
          This ensures strict data isolation between different organizations using the same database instance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
            <Database className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            PostgreSQL Schema
          </h3>
          <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-4 overflow-x-auto shadow-lg border border-gray-800 dark:border-gray-900">
            <pre className="text-xs font-mono text-gray-300 leading-relaxed">
              {PROPOSED_SQL_SCHEMA}
            </pre>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
            <FolderTree className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            Proposed Backend Structure (Node/Express)
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 font-mono text-sm text-gray-700 dark:text-gray-300">
            <ul className="space-y-2">
              <li className="flex gap-2"><span className="text-blue-500 dark:text-blue-400">📂 src/</span></li>
              <li className="pl-4 flex gap-2"><span className="text-yellow-600 dark:text-yellow-500">📂 config/</span> <span className="text-gray-400">// db.ts, env vars</span></li>
              <li className="pl-4 flex gap-2"><span className="text-yellow-600 dark:text-yellow-500">📂 controllers/</span> <span className="text-gray-400">// leadController.ts, authController.ts</span></li>
              <li className="pl-4 flex gap-2"><span className="text-yellow-600 dark:text-yellow-500">📂 middleware/</span> <span className="text-gray-400">// authMiddleware.ts (JWT & Tenant Check)</span></li>
              <li className="pl-4 flex gap-2"><span className="text-yellow-600 dark:text-yellow-500">📂 models/</span> <span className="text-gray-400">// knex or typeorm entities</span></li>
              <li className="pl-4 flex gap-2"><span className="text-yellow-600 dark:text-yellow-500">📂 routes/</span> <span className="text-gray-400">// api/v1/leads.ts</span></li>
              <li className="pl-4 flex gap-2"><span className="text-yellow-600 dark:text-yellow-500">📂 services/</span> <span className="text-gray-400">// Business logic & AI integration</span></li>
              <li className="pl-4 flex gap-2"><span className="text-purple-600 dark:text-purple-400">📄 app.ts</span> <span className="text-gray-400">// Express setup</span></li>
              <li className="pl-4 flex gap-2"><span className="text-purple-600 dark:text-purple-400">📄 server.ts</span> <span className="text-gray-400">// Entry point</span></li>
            </ul>
          </div>

          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 p-4 rounded-lg">
             <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2 text-sm">Developer Note</h4>
             <p className="text-xs text-yellow-700 dark:text-yellow-400">
               Since we are running in a browser-only environment for this demo, the backend logic is simulated in <code>src/services/mockDatabase.ts</code>. The schema above represents the target architecture for production.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
