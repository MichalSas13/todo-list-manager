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
import { CSS } from '@dnd-kit/sortable'; // Import nadal potrzebny

const TaskItem = ({ id, title, completed, onEdit, onDelete, onToggle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: id.toString() });

  // Zabezpieczenie przed undefined Transform
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
          onChange={() => onToggle(id)}
          className="mr-2"
        />
        <span className={completed ? 'line-through text-gray-500' : ''}>
          {title}
        </span>
        <button
          onClick={() => onEdit(id, title)}
          className="bg-yellow-500 text-white p-1 rounded ml-2 hover:bg-yellow-600"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(id)}
          className="bg-red-500 text-white p-1 rounded ml-2 hover:bg-red-600"
        >
          Delete
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
        console.error('Error fetching tasks:', error);
      } else {
        setTasks(data);
      }
    };
    fetchUserAndTasks();
  }, [router]);

  const addTask = async () => {
    if (!newTask || !user) return;
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title: newTask, user_id: user.id, completed: false }])
      .select();
    if (error) {
      console.error('Error adding task:', error);
    } else {
      setTasks([...tasks, ...data]);
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
      // Aktualizacja kolejności w bazie (opcjonalne, wymaga kolumny 'order')
      // const updates = newTasks.map((task, index) => ({ id: task.id, order: index }));
      // const { error } = await supabase.from('tasks').update(updates).eq('user_id', user.id);
      // if (error) console.error('Error updating order:', error);
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
    const { error } = await supabase
      .from('tasks')
      .update({ title: editTaskTitle })
      .eq('id', taskId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error editing task:', error);
    } else {
      setTasks(tasks.map(task => task.id === taskId ? { ...task, title: editTaskTitle } : task));
      setEditTaskId(null);
      setEditTaskTitle('');
    }
  };

  const deleteTask = async (taskId) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error deleting task:', error);
    } else {
      setTasks(tasks.filter(task => task.id !== taskId));
    }
  };

  const toggleTaskCompleted = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', taskId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error toggling task:', error);
    } else {
      setTasks(tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task));
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
                  completed={task.completed}
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
            <button
              onClick={() => saveEdit(editTaskId)}
              className="bg-green-500 text-white p-1 rounded hover:bg-green-600"
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