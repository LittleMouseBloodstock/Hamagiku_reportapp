'use client';
import ReportTemplate from '@/components/ReportTemplate';
import { Printer, RefreshCw, Languages } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center py-8 print:py-0 print:block">
      {/* Control Panel (Hidden in Print) */}
      <div className="control-panel w-[210mm] bg-[#222] text-white p-4 rounded-md mb-6 flex flex-col gap-3 shadow-lg no-print sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <span className="text-xs text-gray-400">Settings</span>
            <select className="bg-[#444] text-white px-2 py-1 rounded text-sm border border-gray-600">
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
            <select className="bg-[#444] text-white px-2 py-1 rounded text-sm border border-gray-600">
              <option value="forest">Forest Theme</option>
              <option value="navy">Navy Theme</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="bg-[var(--color-accent)] hover:brightness-110 text-white font-bold py-2 px-6 rounded flex items-center gap-2 transition-all"
          >
            <Printer size={18} /> PDF出力
          </button>
        </div>

        {/* AI Tools Area */}
        <div className="bg-[#333] p-3 rounded border border-[var(--color-accent)] flex items-center gap-3">
          <span className="text-xs font-bold">✨ Gemini AI:</span>
          <input type="password" placeholder="API Key (Optional)" className="bg-[#444] border border-gray-600 px-2 py-1 text-sm rounded w-32" />
          <input type="text" placeholder="例: 体重増、動き良し" className="bg-[#444] border border-gray-600 px-2 py-1 text-sm rounded flex-1" />
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded font-bold text-sm flex items-center gap-1 hover:opacity-90">
            <RefreshCw size={14} /> Create
          </button>
          <button className="bg-[#444] border border-gray-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1 hover:bg-[#555]">
            <Languages size={14} /> Translate
          </button>
        </div>
      </div>

      {/* Main Report */}
      <ReportTemplate />
    </div>
  );
}
