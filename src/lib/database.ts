import { neon } from '@neondatabase/serverless';

// Database schema types
export interface User {
  id: string;
  device_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  due_date?: Date;
  reminder_time?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: Date;
}

// Get database connection
function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(databaseUrl);
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    const sql = getDatabase();
    
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        due_date TIMESTAMP WITH TIME ZONE,
        reminder_time VARCHAR(5),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create push_subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, endpoint)
      )
    `;

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id)`;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// User management functions
export async function createUser(deviceId: string): Promise<User> {
  const sql = getDatabase();
  const result = await sql`
    INSERT INTO users (device_id)
    VALUES (${deviceId})
    RETURNING *
  `;
  return result[0] as User;
}

export async function getUserByDeviceId(deviceId: string): Promise<User | null> {
  const sql = getDatabase();
  const result = await sql`
    SELECT * FROM users WHERE device_id = ${deviceId}
  `;
  return result[0] as User || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const sql = getDatabase();
  const result = await sql`
    SELECT * FROM users WHERE id = ${id}
  `;
  return result[0] as User || null;
}

// Task management functions
export async function getTasksByUserId(userId: string): Promise<Task[]> {
  const sql = getDatabase();
  const result = await sql`
    SELECT * FROM tasks 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return result as Task[];
}

export async function createTask(userId: string, taskData: {
  text: string;
  dueDate?: Date;
  reminderTime?: string;
}): Promise<Task> {
  const sql = getDatabase();
  const result = await sql`
    INSERT INTO tasks (user_id, text, due_date, reminder_time)
    VALUES (${userId}, ${taskData.text}, ${taskData.dueDate?.toISOString()}, ${taskData.reminderTime})
    RETURNING *
  `;
  return result[0] as Task;
}

export async function updateTask(taskId: string, updates: {
  text?: string;
  completed?: boolean;
  dueDate?: Date;
  reminderTime?: string;
}): Promise<Task> {
  const sql = getDatabase();
  const result = await sql`
    UPDATE tasks 
    SET 
      text = COALESCE(${updates.text}, text),
      completed = COALESCE(${updates.completed}, completed),
      due_date = ${updates.dueDate?.toISOString()},
      reminder_time = ${updates.reminderTime},
      updated_at = NOW()
    WHERE id = ${taskId}
    RETURNING *
  `;
  return result[0] as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const sql = getDatabase();
  await sql`DELETE FROM tasks WHERE id = ${taskId}`;
}

// Push subscription functions
export async function savePushSubscription(
  userId: string, 
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<PushSubscription> {
  const sql = getDatabase();
  const result = await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
    ON CONFLICT (user_id, endpoint) 
    DO UPDATE SET 
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      created_at = NOW()
    RETURNING *
  `;
  return result[0] as PushSubscription;
}

export async function getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]> {
  const sql = getDatabase();
  const result = await sql`
    SELECT * FROM push_subscriptions WHERE user_id = ${userId}
  `;
  return result as PushSubscription[];
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  const sql = getDatabase();
  await sql`
    DELETE FROM push_subscriptions 
    WHERE user_id = ${userId} AND endpoint = ${endpoint}
  `;
}

// Query functions for notifications
export async function getDueTasksForUser(userId: string, currentTime: string): Promise<Task[]> {
  const sql = getDatabase();
  const result = await sql`
    SELECT * FROM tasks 
    WHERE user_id = ${userId}
      AND completed = FALSE
      AND due_date IS NOT NULL
      AND reminder_time = ${currentTime}
      AND due_date >= NOW()
    ORDER BY due_date ASC
  `;
  return result as Task[];
}

export async function getAllActivePushSubscriptions(): Promise<PushSubscription[]> {
  const sql = getDatabase();
  const result = await sql`
    SELECT ps.* FROM push_subscriptions ps
    INNER JOIN users u ON ps.user_id = u.id
    WHERE u.id IS NOT NULL
  `;
  return result as PushSubscription[];
} 