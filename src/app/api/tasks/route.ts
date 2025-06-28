import { NextRequest, NextResponse } from 'next/server';
import { 
  getTasksByUserId, 
  createTask, 
  updateTask, 
  deleteTask,
  getUserByDeviceId
} from '@/lib/database';

// Helper function to get user ID from request
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // For device-based auth, we'll get the device ID from headers
    const deviceId = request.headers.get('x-device-id');
    if (!deviceId) {
      return null;
    }
    
    // Get user by device ID from database
    const user = await getUserByDeviceId(deviceId);
    return user?.id || null;
  } catch (error) {
    console.error('Error getting user ID from request:', error);
    return null;
  }
}

// GET /api/tasks - Get all tasks for current user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await getTasksByUserId(userId);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, dueDate, reminderTime } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Task text is required' }, { status: 400 });
    }

    const task = await createTask(userId, {
      text,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      reminderTime
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PUT /api/tasks - Update a task
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, text, completed, dueDate, reminderTime } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updates: {
      text?: string;
      completed?: boolean;
      dueDate?: Date | undefined;
      reminderTime?: string;
    } = {};
    if (text !== undefined) updates.text = text;
    if (completed !== undefined) updates.completed = completed;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (reminderTime !== undefined) updates.reminderTime = reminderTime;

    const task = await updateTask(id, updates);
    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
} 