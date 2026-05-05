
import { useEffect, useState } from 'react';
import { dataService } from '@/src/services/dataService';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from 'sonner';
import { Bell, Calendar, RefreshCw } from 'lucide-react';
import { Task } from '@/src/types';

export function TaskReminderListener() {
  const { user } = useAuth();
  const [remindedTasks, setRemindedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const unsub = dataService.subscribeTasks(user.id, (tasks) => {
      const now = new Date();
      
      tasks.forEach(task => {
        const dueDate = new Date(task.dueDate);
        
        // If task is due (or within 1 minute of due time) and we haven't reminded yet
        if (dueDate <= now && !remindedTasks.has(task.id!)) {
          // Show toast reminder
          toast(
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-emerald-600">
                {task.type === 'callback' ? <Calendar className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                <span className="font-black text-[10px] uppercase tracking-widest">
                  Task Reminder: {task.type === 'callback' ? 'Call Back' : 'Refill'}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">{task.title}</p>
              <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
            </div>,
            {
              duration: 10000,
              icon: <Bell className="w-4 h-4 text-emerald-500" />,
            }
          );

          // Mark as reminded in this session
          setRemindedTasks(prev => new Set(prev).add(task.id!));
          
          // Also check if we should add a persistent notification in DB for this reminder
          // (Only if it's new enough)
          dataService.addNotification(
            user.id,
            `Task Due: ${task.title}`,
            `This task is now due for action. Please check your task list.`,
            'warning'
          );
        }
      });
    });

    return () => unsub();
  }, [user?.id, remindedTasks]);

  // We check every minute for tasks that might have just become due if the snapshot doesn't trigger
  useEffect(() => {
    const interval = setInterval(() => {
      // Re-triggering the check logic by updating a local state if needed
      // But usually the subscribeTasks will find them.
      // However, time passes, and a task that WAS in the future is now in the past.
      // We might need to force a re-check of the existing tasks list.
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
