'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setMessage('Error signing up: ' + error.message);
    } else {
      setMessage('Check your email for the confirmation link!');
    }
  };

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage('Error signing in: ' + error.message);
    } else {
      router.push('/tasks');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">To-Do List Manager</h1>
      <div className="bg-white p-6 rounded shadow-md w-96">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 mb-4 w-full"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 mb-4 w-full"
        />
        <div className="flex justify-between">
          <button
            onClick={handleSignIn}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Sign In
          </button>
          <button
            onClick={handleSignUp}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
          >
            Sign Up
          </button>
        </div>
        {message && <p className="mt-4 text-red-500">{message}</p>}
      </div>
    </div>
  );
}