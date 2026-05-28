import {
  useEmployees as useEmployeesQuery,
  useEmployee,
  useCreateEmployee,
  useToggleEmployeeStatus,
  useGenerateInviteLink,
} from './queries/useEmployeesQuery.js';

export function useEmployees() {
  const { data: employees = [], isLoading } = useEmployeesQuery();
  const createEmployee = useCreateEmployee();
  const toggleStatus = useToggleEmployeeStatus();
  const generateInvite = useGenerateInviteLink();

  return {
    employees,
    isLoading,
    fetchEmployees: () => {},
    addEmployee: createEmployee.mutateAsync,
    toggleEmployeeStatus: (empId: string, currentStatus: 'active' | 'inactive') =>
      toggleStatus.mutateAsync({ empId, currentStatus }),
    generateInviteLink: generateInvite.mutateAsync,
  };
}

export { useEmployee, useCreateEmployee, useToggleEmployeeStatus, useGenerateInviteLink };
