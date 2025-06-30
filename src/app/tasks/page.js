'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/sortable';

const TaskItem = ({ id, title, completed, onEdit, onDelete, onToggle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: id.toString() });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : 'none',
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border-b py-2 flex items-center justify-between"
    >
      <div className="flex items-center w-full">
        <input
          type="checkbox"
          checked={completed || false}
          onChange={(e) => onToggle(id, e.target.checked)} // Przekazujemy nową wartość
          className="mr-2"
        />
        <span className={completed ? 'line-through text-gray-500' : ''}>
          {title}
        </span>
        <button
          onClick={() => onDelete(id)}
          className="bg-red-500 text-white p-1 rounded ml-2 hover:bg-red-600"
        >
          Delete
        </button>
        <button
          onClick={() => onEdit(id, title)}
          className="bg-yellow-500 text-white p-1 rounded ml-2 hover:bg-yellow-600"
        >
          Edit
        </button>
      </div>
    </li>
  );
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [user, setUser] = useState(null);
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: true });
      if (error) {
        console.error('Error fetching tasks:', error.message);
      } else {
        setTasks(data || []);
      }
    };
    fetchUserAndTasks();
  }, [router]);

  const addTask = async () => {
    if (!newTask.trim() || !user) return;
    console.log('Adding task:', newTask, 'for user:', user.id);
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title: newTask.trim(), user_id: user.id, completed: false }])
      .select();
    if (error) {
      console.error('Error adding task:', error.message, error.details);
    } else {
      console.log('Task added:', data);
      setTasks([...tasks, ...(data || [])]);
      setNewTask('');
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(task => task.id.toString() === active.id);
      const newIndex = tasks.findIndex(task => task.id.toString() === over.id);
      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const editTask = (taskId, title) => {
    setEditTaskId(taskId);
    setEditTaskTitle(title);
  };

  const saveEdit = async (taskId) => {
    if (!editTaskTitle.trim()) return;
    console.log('Saving edit for task:', taskId, 'new title:', editTaskTitle);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title: editTaskTitle.trim() })
        .eq('id', taskId)
        .eq('user_id', user.id);
      if (error) throw error;
      console.log('Task edited:', taskId);
      setTasks(tasks.map(task => task.id === taskId ? { ...task, title: editTaskTitle.trim() } : task));
      setEditTaskId(null);
      setEditTaskTitle('');
    } catch (error) {
      console.error('Error editing task:', error.message, error.details);
    }
  };

  const deleteTask = async (taskId) => {
    console.log('Deleting task:', taskId);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);
      if (error) throw error;
      console.log('Task deleted:', taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error.message, error.details);
    }
  };

  const toggleTaskCompleted = async (taskId, checked) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    console.log('Toggling task:', taskId, 'to:', checked);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: checked })
        .eq('id', taskId)
        .eq('user_id', user.id);
      if (error) throw error;
      setTasks(tasks.map(task => task.id === taskId ? { ...task, completed: checked } : task));
    } catch (error) {
      console.error('Error toggling task:', error.message, error.details);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Your Tasks</h1>
      {user && <p className="mb-4">Logged in as: {user.email}</p>}
      <div className="bg-white p-6 rounded shadow-md w-96">
        <input
          type="text"
          placeholder="New task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="border p-2 mb-4 w-full"
        />
        <button
          onClick={addTask}
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 w-full"
        >
          Add Task
        </button>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map(task => task.id.toString())}>
            <ul className="mt-4">
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  id={task.id}
                  title={editTaskId === task.id ? editTaskTitle : task.title}
                  completed={editTaskId === task.id ? false : task.completed}
                  onEdit={editTask}
                  onDelete={deleteTask}
                  onToggle={toggleTaskCompleted}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {editTaskId && (
          <div className="mt-2">
            <input
              type="text"
              value={editTaskTitle}
              onChange={(e) => setEditTaskTitle(e.target.value)}
              className="border p-1 w-full"
            />
            <button
              onClick={() => saveEdit(editTaskId)}
              className="bg-green-500 text-white p-1 rounded hover:bg-green-600 ml-2"
            >
              Save
            </button>
          </div>
        )}
        <button
          onClick={signOut}
          className="bg-red-500 text-white p-2 rounded hover:bg-red-600 mt-4 w-full"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}