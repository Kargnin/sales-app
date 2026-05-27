import React from 'react';
import { useNavigate, Link } from 'react-router';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore.js';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerBusinessSchema } from '@sales-app/shared';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerBusinessSchema),
    defaultValues: {
      businessName: '',
      username: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const res = await axios.post('/auth/register', {
        businessName: data.businessName,
        username: data.username,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        password: data.password,
      });

      const { accessToken, refreshToken, user } = res.data;

      // Update Zustand auth store
      login(accessToken, refreshToken, user);
      
      toast.success(`Welcome to SalesApp! Business account '${data.businessName}' successfully created.`);

      // Successfully registered admins always go to /admin
      navigate('/admin', { replace: true });
    } catch (err: any) {
      console.error('Registration error:', err);
      const msg = err.response?.data?.error || 'Registration failed. Please check your inputs.';
      toast.error(msg);
    }
  };

  return (
    <div className="auth-card" style={{ maxWidth: '440px' }}>
      <h2 className="auth-card-title">Register Business</h2>
      <p className="auth-card-subtitle">Create a tenant and administrator account</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field data-invalid={!!errors.businessName}>
            <FieldLabel htmlFor="businessName">Business / Company Name *</FieldLabel>
            <Input
              id="businessName"
              type="text"
              placeholder="e.g. Sparkle Soap Co"
              {...register('businessName')}
              disabled={isSubmitting}
              aria-invalid={!!errors.businessName}
            />
            <FieldError>{errors.businessName?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.username}>
            <FieldLabel htmlFor="username">Admin Username *</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="e.g. admin"
              {...register('username')}
              disabled={isSubmitting}
              aria-invalid={!!errors.username}
              autoComplete="username"
            />
            <FieldError>{errors.username?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email Address (Optional)</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="e.g. contact@business.com"
              {...register('email')}
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              autoComplete="email"
            />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone">Phone Number (Optional)</FieldLabel>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g. 9876543210"
              {...register('phone')}
              disabled={isSubmitting}
              aria-invalid={!!errors.phone}
              autoComplete="tel"
            />
            <FieldError>{errors.phone?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Admin Password * (min 8 chars)</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              {...register('password')}
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              autoComplete="new-password"
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
          {isSubmitting ? 'Creating Business...' : 'Register & Log In'}
        </Button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-md)', fontSize: '0.815rem', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link to="/login" className="text-link">
          Sign In
        </Link>
      </div>
    </div>
  );
};

