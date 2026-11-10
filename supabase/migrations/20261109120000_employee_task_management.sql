-- Employee Task Management System
-- Allows HR to create and assign tasks to employees with optional due date and time.
-- Allows Employees to mark status (Pending, Working on it, Hold, Done, etc.).
-- Allows HR to customize (add, edit, delete) task status options.

-- 1. Create task_statuses table
CREATE TABLE IF NOT EXISTS public.task_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create employee_tasks table
CREATE TABLE IF NOT EXISTS public.employee_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status_id UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    due_date DATE,
    due_time TEXT,
    assigned_by UUID,
    assigned_by_name TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_task_statuses_org_id ON public.task_statuses(org_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_org_id ON public.employee_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_emp_id ON public.employee_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_status_id ON public.employee_tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_due_date ON public.employee_tasks(due_date);

-- 4. Enable RLS
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for task_statuses
DROP POLICY IF EXISTS task_statuses_org_select ON public.task_statuses;
CREATE POLICY task_statuses_org_select ON public.task_statuses
    FOR SELECT TO authenticated
    USING (org_id = get_user_org_id());

DROP POLICY IF EXISTS task_statuses_org_all ON public.task_statuses;
CREATE POLICY task_statuses_org_all ON public.task_statuses
    FOR ALL TO authenticated
    USING (org_id = get_user_org_id())
    WITH CHECK (org_id = get_user_org_id());

-- 6. RLS Policies for employee_tasks
DROP POLICY IF EXISTS employee_tasks_org_select ON public.employee_tasks;
CREATE POLICY employee_tasks_org_select ON public.employee_tasks
    FOR SELECT TO authenticated
    USING (org_id = get_user_org_id());

DROP POLICY IF EXISTS employee_tasks_org_all ON public.employee_tasks;
CREATE POLICY employee_tasks_org_all ON public.employee_tasks
    FOR ALL TO authenticated
    USING (org_id = get_user_org_id())
    WITH CHECK (org_id = get_user_org_id());

-- 7. Helper function to seed default task statuses for an organization
CREATE OR REPLACE FUNCTION public.seed_default_task_statuses(target_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.task_statuses WHERE org_id = target_org_id) THEN
        INSERT INTO public.task_statuses (org_id, name, color, is_default, is_completed, order_index)
        VALUES 
            (target_org_id, 'Pending', '#f59e0b', true, false, 1),
            (target_org_id, 'Working on it', '#3b82f6', false, false, 2),
            (target_org_id, 'On Hold', '#8b5cf6', false, false, 3),
            (target_org_id, 'Done', '#10b981', false, true, 4),
            (target_org_id, 'Cancelled', '#6b7280', false, false, 5);
    END IF;
END;
$$;

-- 8. Seed default statuses for all existing organizations
DO $$
DECLARE
    org RECORD;
BEGIN
    FOR org IN SELECT id FROM public.organizations LOOP
        PERFORM public.seed_default_task_statuses(org.id);
    END LOOP;
END;
$$;

-- 9. Realtime Publication (ignore if already added)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_statuses;
    EXCEPTION WHEN duplicate_object THEN
        -- already added
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_tasks;
    EXCEPTION WHEN duplicate_object THEN
        -- already added
    END;
END;
$$;
