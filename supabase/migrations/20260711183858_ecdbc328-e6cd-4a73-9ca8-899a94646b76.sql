INSERT INTO public.employee_panels (user_id, password)
SELECT id, '12345678' FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET password = EXCLUDED.password;