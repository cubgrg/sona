import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDirectoryStore } from '../../stores/directoryStore';
import { useConversationStore } from '../../stores/conversationStore';
import { useAuthStore } from '../../stores/authStore';
import { getSocket } from '../../services/socket';
import type { User } from '../../types';

function formatRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleBadgeColor(role: string) {
  switch (role) {
    case 'manager': return 'bg-purple-100 text-purple-700';
    case 'chef': return 'bg-orange-100 text-orange-700';
    case 'server': return 'bg-blue-100 text-blue-700';
    case 'bartender': return 'bg-teal-100 text-teal-700';
    case 'host': return 'bg-pink-100 text-pink-700';
    case 'kitchen_staff': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function EmployeeCard({ employee, onMessage }: { employee: User; onMessage: (id: string) => void }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
      <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-semibold text-sm shrink-0">
        {employee.displayName.split(' ').map((n) => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 truncate">{employee.displayName}</span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${employee.status === 'online' ? 'bg-green-400' : 'bg-gray-300'}`} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {employee.role && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleBadgeColor(employee.role)}`}>
              {formatRole(employee.role)}
            </span>
          )}
          {employee.location && (
            <span className="text-[10px] text-gray-400 truncate">{employee.location.name}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onMessage(employee.id)}
        className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
      >
        Message
      </button>
    </div>
  );
}

export function DirectoryView() {
  const {
    locations,
    searchQuery,
    locationFilter,
    isLoading,
    setSearchQuery,
    setLocationFilter,
    fetchEmployees,
    fetchLocations,
    filteredEmployees,
  } = useDirectoryStore();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { startConversation } = useConversationStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
    fetchLocations();
  }, [fetchEmployees, fetchLocations]);

  const employees = filteredEmployees().filter((e) => e.id !== currentUserId);

  async function handleMessage(recipientId: string) {
    const conversation = await startConversation(recipientId);
    const socket = getSocket();
    if (socket) {
      socket.emit('conversation:join', conversation.id);
    }
    navigate(`/messages/dm/${conversation.id}`);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Directory</h1>

        {/* Search + filter */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            />
          </div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name.replace('The Golden Fork - ', '')}</option>
            ))}
          </select>
        </div>

        {/* Employee list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => (
              <EmployeeCard key={emp.id} employee={emp} onMessage={handleMessage} />
            ))}
            {employees.length === 0 && (
              <p className="text-center text-gray-400 py-12">No employees found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
