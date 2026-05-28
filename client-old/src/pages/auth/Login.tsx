import React from 'react';
import { useNavigate, Link } from 'react-router';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore.js';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@sales-app/shared';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const res = await axios.post('/auth/login', data);
      const { accessToken, refreshToken, user } = res.data;

      // Update Zustand auth store
      login(accessToken, refreshToken, user);
      
      toast.success(`Welcome back, ${user.username}!`);

      // Redirect based on user role
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/salesman', { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.response?.data?.error || 'Failed to sign in. Please check your credentials.';
      toast.error(msg);
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-card-title">Sign In</h2>
      <p className="auth-card-subtitle">Access the Sales App portal</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field data-invalid={!!errors.username}>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              {...register('username')}
              disabled={isSubmitting}
              aria-invalid={!!errors.username}
              autoComplete="username"
            />
            <FieldError>{errors.username?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              {...register('password')}
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              autoComplete="current-password"
            />
            <FieldError>{errors.password?.message}</FieldError>
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          className="w-full mt-6 py-6"
          disabled={isSubmitting}
          style={{ color: 'var(--neutral-950)' }}
        >
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-md)', fontSize: '0.815rem', color: 'var(--text-secondary)' }}>
        Don't have a business account?{' '}
        <Link to="/register" className="text-link">
          Register Business
        </Link>
      </div>
    </div>
  );
};
