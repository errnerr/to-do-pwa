"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Calendar, Plus, Trash2, Bell, Clock, Settings, Search, ArrowLeft } from "lucide-react";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Drawer as DateDrawer, DrawerTrigger as DateDrawerTrigger, DrawerContent as DateDrawerContent, DrawerHeader as DateDrawerHeader, DrawerTitle as DateDrawerTitle } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  isSubscribedToPushNotifications
} from "@/lib/push-notifications";
import { authenticateDevice, getCurrentDeviceId } from "@/lib/auth";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  due_date?: string;
  reminder_time?: string;
  created_at: string;
}

// Custom function to check if a date is overdue
const isOverdue = (date: Date) => {
  return isBefore(startOfDay(date), startOfDay(new Date()));
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [reminderTime, setReminderTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [drawerStep, setDrawerStep] = useState<'date' | 'time'>('date');
  const [dateDrawerOpen, setDateDrawerOpen] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [pushNotificationsSupported, setPushNotificationsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize device authentication and load tasks
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Authenticate device
        await authenticateDevice();
        
        // Load tasks from database
        await loadTasks();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        toast.error('Failed to initialize app');
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  // Load tasks from database
  const loadTasks = async () => {
    try {
      const deviceId = getCurrentDeviceId();
      const response = await fetch('/api/tasks', {
        headers: {
          'x-device-id': deviceId || '',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  // Check push notification support and status
  useEffect(() => {
    const checkPushNotifications = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setPushNotificationsSupported(supported);
      
      if (supported) {
        const isSubscribed = await isSubscribedToPushNotifications();
        setPushNotificationsEnabled(isSubscribed);
      }
    };
    
    checkPushNotifications();
  }, []);

  const addTask = async () => {
    if (newTask.trim()) {
      // Prevent adding tasks in the past
      if (selectedDate && isBefore(startOfDay(selectedDate), startOfDay(new Date()))) {
        toast.error("Cannot set a task in the past.");
        return;
      }

      try {
        const deviceId = getCurrentDeviceId();
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-device-id': deviceId || '',
          },
          body: JSON.stringify({
            text: newTask.trim(),
            dueDate: selectedDate?.toISOString(),
            reminderTime: reminderTime || undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setTasks([data.task, ...tasks]);
          setNewTask("");
          setSelectedDate(undefined);
          setReminderTime("");
          toast.success("Task added successfully!");
        } else {
          toast.error("Failed to add task");
        }
      } catch (error) {
        console.error('Error adding task:', error);
        toast.error("Failed to add task");
      }
    }
  };

  const toggleTask = async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const deviceId = getCurrentDeviceId();
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId || '',
        },
        body: JSON.stringify({
          id,
          completed: !task.completed,
        }),
      });

      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === id ? { ...task, completed: !task.completed } : task
        ));
        toast.success("Task updated!");
      } else {
        toast.error("Failed to update task");
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const deviceId = getCurrentDeviceId();
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-device-id': deviceId || '',
        },
      });

      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== id));
        toast.success("Task deleted!");
      } else {
        toast.error("Failed to delete task");
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error("Failed to delete task");
    }
  };

  const handlePushNotificationToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        const success = await subscribeToPushNotifications();
        if (success) {
          setPushNotificationsEnabled(true);
          toast.success("Push notifications enabled!");
        } else {
          toast.error("Failed to enable push notifications");
        }
      } else {
        const success = await unsubscribeFromPushNotifications();
        if (success) {
          setPushNotificationsEnabled(false);
          toast.success("Push notifications disabled!");
        } else {
          toast.error("Failed to disable push notifications");
        }
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      toast.error("Failed to update push notification settings");
    }
  };

  const testNotification = async () => {
    try {
      const deviceId = getCurrentDeviceId();
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId || '',
        },
        body: JSON.stringify({
          message: 'This is a test notification from TaskMaster! 🎉'
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  // Filter tasks based on search and completion status
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompletion = showCompleted ? true : !task.completed;
    return matchesSearch && matchesCompletion;
  });

  const pendingTasks = filteredTasks.filter(task => !task.completed);
  const completedTasks = filteredTasks.filter(task => task.completed);

  const formatDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isOverdue(date)) return "Overdue";
    return format(date, "MMM d");
  };

  const formatTime = (time: string) => {
    return time;
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Initialising...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        {/* Header with Search and Menu */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-slate-500">Your Tasks</h1>
            <div className="flex items-center gap-2">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <div className="mx-auto w-full max-w-sm p-6">
                    <DrawerHeader>
                      <DrawerTitle>Settings</DrawerTitle>
                    </DrawerHeader>
                    <div className="mt-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <span>Show completed tasks</span>
                        <Switch
                          checked={showCompleted}
                          onCheckedChange={setShowCompleted}
                        />
                      </div>
                      {pushNotificationsSupported ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span>Push notifications</span>
                              <p className="text-xs text-slate-500 mt-1">
                                Get notified when tasks are due
                              </p>
                            </div>
                            <Switch
                              checked={pushNotificationsEnabled}
                              onCheckedChange={handlePushNotificationToggle}
                            />
                          </div>
                          {pushNotificationsEnabled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={testNotification}
                              className="w-full"
                            >
                              Test Notification
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">
                          Push notifications not supported in this browser
                        </div>
                      )}
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        <Card className="shadow-none rounded-none border-0 bg-transparent backdrop-blur-sm">
          <CardHeader className="pb-4 px-0">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addTask()}
                className="flex-1 bg-white h-12 text-base rounded-lg"
              />
              <DateDrawer open={dateDrawerOpen} onOpenChange={(open) => {
                setDateDrawerOpen(open);
                if (!open) {
                  setTimeout(() => {
                    setDrawerStep('date');
                    setSelectedDate(undefined);
                    setReminderTime("");
                  }, 300);
                }
              }}>
                <DateDrawerTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 bg-transparent h-12 w-12 rounded-lg"
                    onClick={() => setDateDrawerOpen(true)}
                  >
                    <Calendar className="h-5 w-5" />
                  </Button>
                </DateDrawerTrigger>
                <DateDrawerContent>
                  <div className="mx-auto w-full max-w-md p-2 sm:p-6 max-h-[95vh] overflow-y-auto">
                    <DateDrawerHeader>
                      <DateDrawerTitle>Set Due Date & Reminder</DateDrawerTitle>
                    </DateDrawerHeader>
                    <div className="space-y-6">
                      <AnimatePresence mode="wait">
                        {drawerStep === 'date' && (
                          <motion.div
                            key="date"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Label className="text-sm font-sm text-slate-500 ml-2">Due Date</Label>
                            <div className="w-full max-w-full sm:max-w-xs mx-auto text-center px-1 mb-4">
                              <CalendarComponent
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                  setSelectedDate(date);
                                  if (date) setDrawerStep('time');
                                }}
                                className="rounded-md border mt-2 w-full min-h-[200px] !h-auto"
                                disabled={(date) => date < startOfDay(new Date())}
                              />
                            </div>
                          </motion.div>
                        )}
                        {drawerStep === 'time' && (
                          <motion.div
                            key="time"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex items-center mb-4">
                              <button
                                type="button"
                                onClick={() => setDrawerStep('date')}
                                className="mr-2 p-2 rounded-full hover:bg-muted"
                                aria-label="Back to date picker"
                              >
                                <ArrowLeft className="h-5 w-5" />
                              </button>
                              <Label className="text-sm font-medium">Reminder Time</Label>
                            </div>
                            <Input
                              type="time"
                              value={reminderTime}
                              onChange={(e) => setReminderTime(e.target.value)}
                              className="mt-2 h-12 text-base rounded-lg w-full"
                            />
                            <Button
                              className="mt-6 w-full"
                              onClick={() => setDateDrawerOpen(false)}
                            >
                              Set
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </DateDrawerContent>
              </DateDrawer>
              <Button onClick={addTask} className="shrink-0 h-12 w-12 rounded-lg text-base flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            {/* Pending Tasks */}
            <AnimatePresence>
              {pendingTasks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                    Pending ({pendingTasks.length})
                  </h3>
                  <AnimatePresence>
                    {pendingTasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-all duration-200"
                      >
                        <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{task.text}</p>
                          {(task.due_date || task.reminder_time) && (
                            <div className="flex items-center gap-2 mt-1">
                              {task.due_date && (
                                <Badge
                                  variant={
                                    isOverdue(new Date(task.due_date))
                                      ? "destructive"
                                      : isToday(new Date(task.due_date))
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(new Date(task.due_date))}
                                </Badge>
                              )}
                              {task.reminder_time && (
                                <Badge variant="outline" className="text-xs">
                                  <Bell className="h-3 w-3 mr-1" />
                                  {formatTime(task.reminder_time)}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask(task.id)}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Completed Tasks */}
            <AnimatePresence>
              {completedTasks.length > 0 && showCompleted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                    Completed ({completedTasks.length})
                  </h3>
                  <AnimatePresence>
                    {completedTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50 opacity-75"
                      >
                        <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-600 line-through truncate">{task.text}</p>
                          {(task.due_date || task.reminder_time) && (
                            <div className="flex items-center gap-2 mt-1">
                              {task.due_date && (
                                <Badge variant="secondary" className="text-xs opacity-60">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(new Date(task.due_date))}
                                </Badge>
                              )}
                              {task.reminder_time && (
                                <Badge variant="outline" className="text-xs opacity-60">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTime(task.reminder_time)}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask(task.id)}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            <AnimatePresence>
              {tasks.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Plus className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks yet</h3>
                  <p className="text-slate-500">Add your first task to get started!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
