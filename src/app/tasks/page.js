'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [user, setUser] = useState(null);
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
        .eq('user_id', user.id);
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
      .insert([{ title: newTask, user_id: user.id }])
      .select();
    if (error) {
      console.error('Error adding task:', error);
    } else {
      setTasks([...tasks, ...data]);
      setNewTask('');
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
        <ul className="mt-4">
          {tasks.map((task) => (
            <li key={task.id} className="border-b py-2">
              {task.title}
            </li>
          ))}
        </ul>
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