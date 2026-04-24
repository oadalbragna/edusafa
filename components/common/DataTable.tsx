import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({ columns, data, searchPlaceholder = "بحث...", onRowClick }: DataTableProps<T>) {
  const [query, setQuery] = useState('');

  const filteredData = useMemo(() => {
    return data.filter(item => 
      JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
    );
  }, [data, query]);

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pr-12 pl-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-4 text-xs font-black text-slate-500 uppercase">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, i) => (
              <tr 
                key={i} 
                onClick={() => onRowClick?.(row)}
                className={`border-b border-slate-50 dark:border-slate-700 last:border-none ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`}
              >
                {columns.map((col, j) => (
                  <td key={j} className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {typeof col.accessor === 'function' ? col.accessor(row) : (row[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
