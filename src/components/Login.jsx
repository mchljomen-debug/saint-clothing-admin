import axios from 'axios';
import React, { useState } from 'react';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';

const Login = ({ setToken }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${backendUrl}/api/admin/admin-login`, {
        email,
        password,
      });

      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.user?.role || '');
        localStorage.setItem('branch', response.data.user?.branch || '');
        localStorage.setItem('adminName', response.data.user?.name || '');

        toast.success(
          response.data.user?.role === 'admin'
            ? 'Logged in as Main Admin'
            : `Logged in as ${response.data.user?.branch} Staff`
        );
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.log('LOGIN ERROR:', error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='bg-white shadow-md rounded-lg px-8 py-6 max-w-md w-full'>
        <h1 className='text-2xl font-bold mb-4'>Admin Panel</h1>

        <form onSubmit={onSubmitHandler}>
          <div className='mb-3'>
            <p>Email</p>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className='w-full px-3 py-2 border rounded-md'
            />
          </div>

          <div className='mb-3'>
            <p>Password</p>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className='w-full px-3 py-2 border rounded-md'
            />
          </div>

          <button
            type='submit'
            className='w-full py-2 px-4 bg-black text-white rounded-md'
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;