import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import type { SearchResult } from '../../types';

interface Props {
  onClose: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchModal({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get<SearchResult[]>(`/messages/search?q=${encodeURIComponent(q)}`);
        setResults(data);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      }
      setIsLoading(false);
    }, 300);
  }, []);

  useEffect(() => {
    search(query);
  }, [query, search]);

  function navigateToResult(result: SearchResult) {
    onClose();
    if (result.channelId) {
      navigate(`/messages/channels/${result.channelId}`);
    } else if (result.conversationId) {
      navigate(`/messages/dm/${result.conversationId}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigateToResult(results[selectedIndex]);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[15vh] z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 text-sm outline-none placeholder-gray-400"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 rounded">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading && query && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Searching...</div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No messages found</div>
          )}

          {!isLoading && results.map((result, i) => (
            <button
              key={result.id}
              onClick={() => navigateToResult(result)}
              className={`w-full text-left px-4 py-3 flex gap-3 transition-colors ${
                i === selectedIndex ? 'bg-emerald-50' : 'hover:bg-gray-50'
              } ${i > 0 ? 'border-t border-gray-100' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                  <span className="font-medium text-gray-700">{result.author.displayName}</span>
                  {result.channel && (
                    <>
                      <span>in</span>
                      <span className="font-medium text-gray-700">#{result.channel.name}</span>
                    </>
                  )}
                  {result.conversationId && !result.channel && (
                    <span className="text-gray-400">DM</span>
                  )}
                  <span className="ml-auto">{formatDate(result.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-800 truncate">
                  {highlightMatch(result.content, query)}
                </p>
              </div>
            </button>
          ))}

          {!query && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Type to search across all messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
