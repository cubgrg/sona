import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useConversationStore } from '../../stores/conversationStore';
import { getSocket } from '../../services/socket';
import type { User } from '../../types';

interface Props {
  onClose: () => void;
}

export function NewDMModal({ onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const { startConversation } = useConversationStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<User[]>('/users').then(({ data }) => {
      setUsers(data.filter((u) => u.id !== currentUser?.id));
    });
  }, [currentUser?.id]);

  const filtered = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelect(recipientId: string) {
    setIsLoading(true);
    try {
      const conversation = await startConversation(recipientId);
      const socket = getSocket();
      if (socket) {
        socket.emit('conversation:join', conversation.id);
      }
      onClose();
      navigate(`/messages/dm/${conversation.id}`);
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">New message</h2>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-3"
          placeholder="Search by name..."
          autoFocus
        />

        <ul className="max-h-64 overflow-y-auto space-y-1">
          {filtered.length === 0 && (
            <li className="text-sm text-gray-400 py-2 text-center">No users found</li>
          )}
          {filtered.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => handleSelect(u.id)}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {u.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">{u.displayName}</span>
                  <span className={`ml-2 inline-block w-2 h-2 rounded-full ${u.status === 'online' ? 'bg-green-400' : 'bg-gray-300'}`} />
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-end pt-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
