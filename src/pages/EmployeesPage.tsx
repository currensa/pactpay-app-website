// Employees Page - Manage employee roster with real API
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { formatAddress } from '@/lib/utils';
import type { Employee } from '@/types';
import { PaymentFrequency } from '@/types';
import {
  Download,
  Edit,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const PAYMENT_FREQUENCIES = {
  MONTHLY: 'Monthly',
  ONE_OFF: 'One-off',
};

export default function EmployeesPage() {
  const { currentOrganization } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState<{
    name: string;
    walletAddress: string;
    defaultSalary: string;
    defaultToken: string;
    paymentFrequency: PaymentFrequency;
  }>({
    name: '',
    walletAddress: '',
    defaultSalary: '',
    defaultToken: '0x0000000000000000000000000000000000000000', // ETH
    paymentFrequency: PaymentFrequency.MONTHLY,
  });

  // Load employees
  useEffect(() => {
    if (currentOrganization) {
      loadEmployees();
    }
  }, [currentOrganization, pagination.page, activeFilter, searchQuery]);

  const loadEmployees = async (showToast = false) => {
    try {
      if (showToast) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await apiClient.getEmployees({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      });

      setEmployees(response.data);
      setPagination(response.pagination);

      if (showToast) {
        toast.success('Employees refreshed');
      }
    } catch (error: any) {
      console.error('Failed to load employees:', error);
      toast.error(error.message || 'Failed to load employees');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadEmployees(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (filter: 'all' | 'active' | 'inactive') => {
    setActiveFilter(filter);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Create employee
  const handleOpenCreateDialog = () => {
    setFormData({
      name: '',
      walletAddress: '',
      defaultSalary: '',
      defaultToken: '0x0000000000000000000000000000000000000000',
      paymentFrequency: PaymentFrequency.MONTHLY,
    });
    setIsCreateDialogOpen(true);
  };

  const handleCreateEmployee = async () => {
    if (!formData.name || !formData.walletAddress || !formData.defaultSalary) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createEmployee({
        name: formData.name,
        walletAddress: formData.walletAddress,
        defaultSalary: formData.defaultSalary,
        defaultToken: formData.defaultToken,
        paymentFrequency: formData.paymentFrequency,
      });

      toast.success('Employee created successfully');
      setIsCreateDialogOpen(false);
      loadEmployees();
    } catch (error: any) {
      console.error('Failed to create employee:', error);
      toast.error(error.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit employee
  const handleOpenEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      walletAddress: employee.walletAddress,
      defaultSalary: employee.defaultSalary,
      defaultToken: employee.defaultToken,
      paymentFrequency: employee.paymentFrequency,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    setIsSubmitting(true);
    try {
      await apiClient.updateEmployee(selectedEmployee.id, {
        name: formData.name,
        walletAddress: formData.walletAddress,
        defaultSalary: formData.defaultSalary,
        defaultToken: formData.defaultToken,
        paymentFrequency: formData.paymentFrequency,
      });

      toast.success('Employee updated successfully');
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error('Failed to update employee:', error);
      toast.error(error.message || 'Failed to update employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete employee
  const handleOpenDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    setIsSubmitting(true);
    try {
      await apiClient.deleteEmployee(selectedEmployee.id);
      toast.success('Employee deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error('Failed to delete employee:', error);
      toast.error(error.message || 'Failed to delete employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (employee: Employee) => {
    try {
      await apiClient.updateEmployee(employee.id, {
        isActive: !employee.isActive,
      });
      toast.success(`Employee ${employee.isActive ? 'deactivated' : 'activated'}`);
      loadEmployees();
    } catch (error: any) {
      console.error('Failed to toggle employee status:', error);
      toast.error(error.message || 'Failed to update employee status');
    }
  };

  // CSV Import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Importing employees...', { id: 'import' });
      const result = await apiClient.importEmployees(file);

      toast.success(
        `Import complete: ${result.success} succeeded, ${result.failed} failed`,
        { id: 'import' }
      );

      if (result.errors && result.errors.length > 0) {
        console.log('Import errors:', result.errors);
      }

      loadEmployees();
    } catch (error: any) {
      console.error('Failed to import employees:', error);
      toast.error(error.message || 'Failed to import employees', { id: 'import' });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // CSV Export
  const handleExport = async () => {
    try {
      toast.loading('Exporting employees...', { id: 'export' });
      const blob = await apiClient.exportEmployees();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Employees exported successfully', { id: 'export' });
    } catch (error: any) {
      console.error('Failed to export employees:', error);
      toast.error(error.message || 'Failed to export employees', { id: 'export' });
    }
  };

  // Pagination
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="size-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading employees...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Employees</h1>
            <p className="text-muted-foreground">Manage your team members</p>
          </div>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 size-4" />
              Import CSV
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={employees.length === 0}>
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="mr-2 size-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or wallet address..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <Select value={activeFilter} onValueChange={(v: any) => handleFilterChange(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members ({pagination.total})</CardTitle>
            <CardDescription>
              View and manage all employees in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Wallet Address</TableHead>
                        <TableHead>Default Salary</TableHead>
                        <TableHead>Payment Frequency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell className="font-mono">
                            {employee.ensName || formatAddress(employee.walletAddress)}
                          </TableCell>
                          <TableCell>
                            {employee.defaultSalary} {employee.defaultTokenSymbol || 'ETH'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {PAYMENT_FREQUENCIES[employee.paymentFrequency]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                              {employee.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(employee)}>
                                  <Edit className="mr-2 size-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(employee)}>
                                  {employee.isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenDeleteDialog(employee)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No employees found</p>
                <Button onClick={handleOpenCreateDialog}>
                  <Plus className="mr-2 size-4" />
                  Add Your First Employee
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Employee Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Add a new team member to your payroll
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="walletAddress">Wallet Address *</Label>
              <Input
                id="walletAddress"
                value={formData.walletAddress}
                onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                placeholder="0x..."
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="defaultSalary">Default Salary *</Label>
              <Input
                id="defaultSalary"
                type="number"
                value={formData.defaultSalary}
                onChange={(e) => setFormData({ ...formData, defaultSalary: e.target.value })}
                placeholder="1000"
              />
            </div>
            <div>
              <Label htmlFor="paymentFrequency">Payment Frequency</Label>
              <Select
                value={formData.paymentFrequency}
                onValueChange={(v: PaymentFrequency) =>
                  setFormData({ ...formData, paymentFrequency: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="ONE_OFF">One-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEmployee} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-walletAddress">Wallet Address</Label>
              <Input
                id="edit-walletAddress"
                value={formData.walletAddress}
                onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="edit-defaultSalary">Default Salary</Label>
              <Input
                id="edit-defaultSalary"
                type="number"
                value={formData.defaultSalary}
                onChange={(e) => setFormData({ ...formData, defaultSalary: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-paymentFrequency">Payment Frequency</Label>
              <Select
                value={formData.paymentFrequency}
                onValueChange={(v: PaymentFrequency) =>
                  setFormData({ ...formData, paymentFrequency: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="ONE_OFF">One-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEmployee} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedEmployee?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEmployee} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
