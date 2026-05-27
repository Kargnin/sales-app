import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore.js';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEmployeeSchema } from '@sales-app/shared';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const SalesmanSelfRegister: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Verification & Tenant State
  const [isVerifying, setIsVerifying] = useState(true);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // React Hook Form for Employee Self-Registration
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      username: '',
      email: '',
      phone: '',
      password: '',
      role: 'salesman' as const,
    },
  });

  // Verify the invitation token on mount
  useEffect(() => {
    if (!token) {
      setVerifyError('Invitation token is missing. Please request a valid invite link from your Administrator.');
      setIsVerifying(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await axios.post('/auth/verify-invite', { token });
        setTenantName(res.data.tenantName);
      } catch (err: any) {
        console.error('Invite verification error:', err);
        setVerifyError(err.response?.data?.error || 'This invitation link is invalid or has expired.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Handle Form Submission
  const onSubmit = async (data: any) => {
    try {
      const res = await axios.post('/auth/register-salesman', {
        token,
        username: data.username.trim(),
        password: data.password,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
      });

      const { accessToken, refreshToken, user } = res.data;

      // Log in salesman
      login(accessToken, refreshToken, user);
      
      toast.success(`Successfully registered and logged in as ${user.username}!`);

      // Redirect to Salesman Dashboard
      navigate('/salesman', { replace: true });
    } catch (err: any) {
      console.error('Self-registration error:', err);
      const msg = err.response?.data?.error || 'Registration failed. Please check your details.';
      toast.error(msg);
    }
  };

  if (isVerifying) {
    return (
      <div className="auth-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Verifying invitation token...</p>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="auth-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
        <h2 className="auth-card-title" style={{ color: 'var(--error)' }}>⚠️ Invalid Invitation</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-xs)', lineHeight: '1.5' }}>
          {verifyError}
        </p>
        <Button
          onClick={() => navigate('/login')}
          className="w-full mt-6"
          variant="outline"
        >
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="auth-card" style={{ maxWidth: '440px' }}>
      <h2 className="auth-card-title">Join {tenantName}</h2>
      <p className="auth-card-subtitle">Register your Salesman Outrider account</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field data-invalid={!!errors.username}>
            <FieldLabel htmlFor="username">Choose Username *</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="e.g. outrider_jerry"
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
              placeholder="e.g. jerry@mail.com"
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
            <FieldLabel htmlFor="password">Create Password * (min 8 chars)</FieldLabel>
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
          {isSubmitting ? 'Registering...' : 'Complete Registration & Sign In'}
        </Button>
      </form>
    </div>
  );
};

