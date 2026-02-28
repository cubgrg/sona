import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../../stores/dashboardStore';
import api from '../../services/api';
import type { Shift, UnreadChannel, FeedPost, PayPeriod } from '../../types';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatShiftDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
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

function formatRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function NextShiftCard({ shift }: { shift: Shift | null }) {
  if (!shift) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Next Shift</h3>
        <p className="text-gray-400 text-sm">No upcoming shifts scheduled</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-5 shadow-sm text-white">
      <h3 className="text-sm font-semibold text-teal-200 uppercase tracking-wider mb-3">Next Shift</h3>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-2xl font-bold">{formatShiftDate(shift.date)}</span>
        <span className="text-teal-200 text-sm">{formatRole(shift.role)}</span>
      </div>
      <p className="text-lg font-medium">{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</p>
      <p className="text-teal-200 text-sm mt-1">{shift.location.name}</p>
    </div>
  );
}

function PayDayCard({ payPeriod }: { payPeriod: PayPeriod | null }) {
  if (!payPeriod) return null;

  const payDate = new Date(payPeriod.payDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = payDate.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const payDateLabel = payDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  const daysLabel = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`;

  return (
    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 shadow-sm text-white">
      <h3 className="text-sm font-semibold text-emerald-200 uppercase tracking-wider mb-3">Next Pay Day</h3>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-2xl font-bold">${payPeriod.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className="text-emerald-200 text-sm font-medium">{daysLabel}</span>
      </div>
      <p className="text-lg font-medium">{payDateLabel}</p>
      <div className="flex items-center gap-3 mt-2 text-emerald-200 text-sm">
        <span>{payPeriod.hoursWorked}h worked</span>
        <span>·</span>
        <span>${payPeriod.hourlyRate}/hr</span>
      </div>
    </div>
  );
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeekGlance({ shifts }: { shifts: Shift[] }) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const shiftMap = new Map<string, Shift>();
  for (const s of shifts) {
    const key = new Date(s.date).toISOString().split('T')[0];
    shiftMap.set(key, s);
  }

  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">This Week's Shift Schedule</h3>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const key = d.toISOString().split('T')[0];
          const shift = shiftMap.get(key);
          const isToday = key === todayStr;

          return (
            <div
              key={i}
              className={`flex flex-col items-center rounded-lg py-2 px-1 ${
                isToday ? 'bg-emerald-50 ring-2 ring-emerald-400' : ''
              }`}
            >
              <span className={`text-[10px] font-medium mb-1 ${isToday ? 'text-emerald-600' : 'text-gray-400'}`}>
                {DAY_LABELS[i]}
              </span>
              <span className={`text-sm font-semibold ${isToday ? 'text-emerald-700' : 'text-gray-700'}`}>
                {d.getDate()}
              </span>
              {shift ? (
                <div className="mt-1 w-full text-center">
                  <div className="bg-emerald-500 text-white text-[9px] font-medium rounded px-1 py-0.5 leading-tight">
                    {shift.startTime}
                  </div>
                </div>
              ) : (
                <div className="mt-1 w-full text-center">
                  <div className="text-[9px] text-gray-300 font-medium">Off</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UnreadSummary({ channels, totalUnread }: { channels: UnreadChannel[]; totalUnread: number }) {
  const navigate = useNavigate();

  if (totalUnread === 0) return null;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Unread Messages</h3>
      <div className="space-y-2">
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => navigate(`/messages/channels/${ch.id}`)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-700">
              <span className="text-gray-400 mr-1">#</span>
              {ch.name}
            </span>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {ch.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecentPraise({ praise }: { praise: { fromUser: { displayName: string }; message: string; category: string | null }[] }) {
  if (praise.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Praise</h3>
      <div className="space-y-3">
        {praise.map((p, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center shrink-0 text-sm">
              {p.category === 'teamwork' ? '🤝' : p.category === 'customer_service' ? '⭐' : '🚀'}
            </div>
            <div>
              <p className="text-sm text-gray-700">{p.message}</p>
              <p className="text-xs text-gray-400 mt-0.5">From {p.fromUser.displayName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function feedTypeBadge(type: string) {
  switch (type) {
    case 'announcement': return { label: 'Announcement', cls: 'bg-blue-100 text-blue-600' };
    case 'event': return { label: 'Event', cls: 'bg-green-100 text-green-600' };
    case 'employee_of_month': return { label: 'EOTM', cls: 'bg-yellow-100 text-yellow-600' };
    case 'policy_update': return { label: 'Policy', cls: 'bg-orange-100 text-orange-600' };
    case 'praise': return { label: 'Shoutout', cls: 'bg-pink-100 text-pink-600' };
    default: return { label: type, cls: 'bg-gray-100 text-gray-600' };
  }
}

function MiniFeed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    api.get<FeedPost[]>('/feed?scope=all&limit=3').then(({ data }) => setPosts(data)).catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Latest Updates</h3>
        <button
          onClick={() => navigate('/feed')}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          View all
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {posts.map((post) => {
          const badge = feedTypeBadge(post.type);
          return (
            <button
              key={post.id}
              onClick={() => navigate('/feed')}
              className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-[10px] font-semibold shrink-0">
                  {post.author.displayName.split(' ').map((n) => n[0]).join('')}
                </div>
                <span className="text-xs font-medium text-gray-700">{post.author.displayName}</span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(post.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {post.title ? `${post.title} — ` : ''}{post.content}
              </p>
              {post.type === 'praise' && post.praise && (
                <p className="text-xs text-pink-500 mt-1">
                  Shouted out {post.praise.toUser.displayName}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HomeDashboard() {
  const { data, isLoading, fetchDashboard } = useDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Greeting */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {data.user.displayName.split(' ')[0]}!
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeColor(data.user.role)}`}>
              {formatRole(data.user.role)}
            </span>
            {data.user.location && (
              <span className="text-xs text-gray-400">{data.user.location.name}</span>
            )}
          </div>
        </div>

        <NextShiftCard shift={data.nextShift} />
        <PayDayCard payPeriod={data.nextPay} />
        <WeekGlance shifts={data.weekShifts} />
        <MiniFeed />
        <UnreadSummary channels={data.unreadSummary.channels} totalUnread={data.unreadSummary.totalUnread} />
        <RecentPraise praise={data.recentPraise} />
      </div>
    </div>
  );
}
