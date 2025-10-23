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
import type { PaymentRecipient } from '@/types';
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


export default function EmployeesPage() {
  const { currentOrganization } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [recipients, setRecipients] = useState<PaymentRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Token and chain data
  const [tokens, setTokens] = useState<Array<{
    id: string;
    chainId: number;
    chainName: string;
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    logoUrl?: string;
    isActive: boolean;
    isNative: boolean;
  }>>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<PaymentRecipient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState<{
    name: string;
    walletAddress: string;
    defaultAmount: string;
    tokenId: string;
    chainId: number;
    ensDomain?: string;
  }>({
    name: '',
    walletAddress: '',
    defaultAmount: '',
    tokenId: '', // Will be set when token is selected
    chainId: 1, // Ethereum mainnet
    ensDomain: '',
  });

  // Load recipients
  useEffect(() => {
    if (currentOrganization) {
      loadRecipients();
    }
  }, [currentOrganization, pagination.page, activeFilter, searchQuery]);

  // Load tokens and chains
  useEffect(() => {
    loadTokensAndChains();
  }, []);

  const loadTokensAndChains = async () => {
    setIsLoadingTokens(true);
    try {
      const tokensData = await apiClient.getTokens();
      setTokens(tokensData);
    } catch (error) {
      console.error('Failed to load tokens:', error);
      toast.error('Failed to load token information');
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const loadRecipients = async (showToast = false) => {
    try {
      if (showToast) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await apiClient.getPaymentRecipients({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      });

      setRecipients(response.data);
      setPagination(response.pagination);

      if (showToast) {
        toast.success('Recipients refreshed');
      }
    } catch (error: any) {
      console.error('Failed to load recipients:', error);
      toast.error(error.message || 'Failed to load recipients');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadRecipients(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (filter: 'all' | 'active' | 'inactive') => {
    setActiveFilter(filter);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Create recipient
  const handleOpenCreateDialog = () => {
    setFormData({
      name: '',
      walletAddress: '',
      defaultAmount: '',
      tokenId: '',
      chainId: 1,
      ensDomain: '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleCreateRecipient = async () => {
    if (!formData.name || !formData.walletAddress || !formData.defaultAmount || !formData.tokenId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createPaymentRecipient({
        name: formData.name,
        walletAddress: formData.walletAddress,
        defaultAmount: formData.defaultAmount,
        tokenId: formData.tokenId,
        chainId: formData.chainId,
        ensDomain: formData.ensDomain || undefined,
      });

      toast.success('Recipient created successfully');
      setIsCreateDialogOpen(false);
      loadRecipients();
    } catch (error: any) {
      console.error('Failed to create recipient:', error);
      toast.error(error.message || 'Failed to create recipient');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit recipient
  const handleOpenEditDialog = (recipient: PaymentRecipient) => {
    setSelectedRecipient(recipient);
    setFormData({
      name: recipient.name,
      walletAddress: recipient.walletAddress,
      defaultAmount: recipient.defaultAmount,
      tokenId: recipient.tokenId,
      chainId: recipient.chainId,
      ensDomain: recipient.ensDomain || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateRecipient = async () => {
    if (!selectedRecipient) return;

    setIsSubmitting(true);
    try {
      await apiClient.updatePaymentRecipient(selectedRecipient.id, {
        name: formData.name,
        walletAddress: formData.walletAddress,
        defaultAmount: formData.defaultAmount,
        tokenId: formData.tokenId,
        chainId: formData.chainId,
        ensDomain: formData.ensDomain || undefined,
      });

      toast.success('Recipient updated successfully');
      setIsEditDialogOpen(false);
      setSelectedRecipient(null);
      loadRecipients();
    } catch (error: any) {
      console.error('Failed to update recipient:', error);
      toast.error(error.message || 'Failed to update recipient');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete recipient
  const handleOpenDeleteDialog = (recipient: PaymentRecipient) => {
    setSelectedRecipient(recipient);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteRecipient = async () => {
    if (!selectedRecipient) return;

    setIsSubmitting(true);
    try {
      await apiClient.deletePaymentRecipient(selectedRecipient.id);
      toast.success('Recipient deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedRecipient(null);
      loadRecipients();
    } catch (error: any) {
      console.error('Failed to delete recipient:', error);
      toast.error(error.message || 'Failed to delete recipient');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (recipient: PaymentRecipient) => {
    try {
      await apiClient.updatePaymentRecipient(recipient.id, {
        isActive: !recipient.isActive,
      });
      toast.success(`Recipient ${recipient.isActive ? 'deactivated' : 'activated'}`);
      loadRecipients();
    } catch (error: any) {
      console.error('Failed to toggle recipient status:', error);
      toast.error(error.message || 'Failed to update recipient status');
    }
  };

  // CSV Import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Importing recipients...', { id: 'import' });
      const result = await apiClient.importPaymentRecipients(file);

      toast.success(
        `Import complete: ${result.success} succeeded, ${result.failed} failed`,
        { id: 'import' }
      );

      if (result.errors && result.errors.length > 0) {
        console.log('Import errors:', result.errors);
      }

      loadRecipients();
    } catch (error: any) {
      console.error('Failed to import recipients:', error);
      toast.error(error.message || 'Failed to import recipients', { id: 'import' });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // CSV Export
  const handleExport = async () => {
    try {
      toast.loading('Exporting recipients...', { id: 'export' });
      const blob = await apiClient.exportPaymentRecipients();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipients-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Recipients exported successfully', { id: 'export' });
    } catch (error: any) {
      console.error('Failed to export recipients:', error);
      toast.error(error.message || 'Failed to export recipients', { id: 'export' });
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
            <Button variant="outline" onClick={handleExport} disabled={recipients.length === 0}>
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
            {recipients.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Wallet Address</TableHead>
                        <TableHead>Default Amount</TableHead>
                        <TableHead>Chain</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-medium">{recipient.name}</TableCell>
                          <TableCell className="font-mono">
                            {recipient.ensDomain || formatAddress(recipient.walletAddress)}
                          </TableCell>
                          <TableCell>
                            {recipient.defaultAmount} {recipient.token?.symbol || 'ETH'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {recipient.chainId === 1 ? 'Ethereum' : `Chain ${recipient.chainId}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={recipient.isActive ? 'default' : 'secondary'}>
                              {recipient.isActive ? 'Active' : 'Inactive'}
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
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(recipient)}>
                                  <Edit className="mr-2 size-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(recipient)}>
                                  {recipient.isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenDeleteDialog(recipient)}
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
              <Label htmlFor="name" className='mb-2'>Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="walletAddress" className='mb-2'>Wallet Address *</Label>
              <Input
                id="walletAddress"
                value={formData.walletAddress}
                onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                placeholder="0x..."
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="defaultAmount" className='mb-2'>Default Amount *</Label>
              <Input
                id="defaultAmount"
                type="number"
                value={formData.defaultAmount}
                onChange={(e) => setFormData({ ...formData, defaultAmount: e.target.value })}
                placeholder="1000"
              />
            </div>
            <div>
              <Label htmlFor="tokenId" className='mb-2'>Token *</Label>
              <Select
                value={formData.tokenId}
                onValueChange={(v: string) => {
                  const selectedToken = tokens.find(token => token.id === v);
                  setFormData({
                    ...formData,
                    tokenId: v,
                    chainId: selectedToken?.chainId || formData.chainId
                  });
                }}
                disabled={isLoadingTokens}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingTokens ? "Loading tokens..." : "Select a token"} />
                </SelectTrigger>
                <SelectContent>
                  {tokens
                    .filter(token => token.isActive)
                    .map((token) => (
                      <SelectItem key={token.id} value={token.id}>
                        <div className="flex items-center gap-2">
                          {token.logoUrl && (
                            <img src={token.logoUrl} alt={token.symbol} className="w-4 h-4" />
                          )}
                          <span>{token.symbol}</span>
                          <span className="text-muted-foreground">({token.name})</span>
                          <span className="text-xs text-muted-foreground">- {token.chainName}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {/* <div>
              <Label htmlFor="ensDomain">ENS Domain (Optional)</Label>
              <Input
                id="ensDomain"
                value={formData.ensDomain || ''}
                onChange={(e) => setFormData({ ...formData, ensDomain: e.target.value })}
                placeholder="john.eth"
              />
            </div> */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRecipient} disabled={isSubmitting}>
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
              <Label htmlFor="edit-defaultAmount">Default Amount</Label>
              <Input
                id="edit-defaultAmount"
                type="number"
                value={formData.defaultAmount}
                onChange={(e) => setFormData({ ...formData, defaultAmount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-tokenId">Token</Label>
              <Select
                value={formData.tokenId}
                onValueChange={(v: string) => {
                  const selectedToken = tokens.find(token => token.id === v);
                  setFormData({
                    ...formData,
                    tokenId: v,
                    chainId: selectedToken?.chainId || formData.chainId
                  });
                }}
                disabled={isLoadingTokens}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingTokens ? "Loading tokens..." : "Select a token"} />
                </SelectTrigger>
                <SelectContent>
                  {tokens
                    .filter(token => token.isActive)
                    .map((token) => (
                      <SelectItem key={token.id} value={token.id}>
                        <div className="flex items-center gap-2">
                          {token.logoUrl && (
                            <img src={token.logoUrl} alt={token.symbol} className="w-4 h-4" />
                          )}
                          <span>{token.symbol}</span>
                          <span className="text-muted-foreground">({token.name})</span>
                          <span className="text-xs text-muted-foreground">- {token.chainName}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-ensDomain">ENS Domain (Optional)</Label>
              <Input
                id="edit-ensDomain"
                value={formData.ensDomain || ''}
                onChange={(e) => setFormData({ ...formData, ensDomain: e.target.value })}
                placeholder="john.eth"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRecipient} disabled={isSubmitting}>
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
              Are you sure you want to delete {selectedRecipient?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRecipient} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
