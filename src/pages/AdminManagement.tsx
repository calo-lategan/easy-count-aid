import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Shield, UserPlus, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export default function AdminManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);

  const loadAdmins = async () => {
    try {
      // Get all admin roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      // Get profiles for these admins
      const adminList: AdminUser[] = [];
      
      for (const role of roles || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, user_id')
          .eq('user_id', role.user_id)
          .maybeSingle();

        adminList.push({
          id: role.id,
          user_id: role.user_id,
          email: profile?.display_name || 'Unknown',
          display_name: profile?.display_name || 'Unknown',
          created_at: role.created_at,
        });
      }

      setAdmins(adminList);
    } catch (error) {
      console.error('Error loading admins:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin users.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter the email of the user to promote.',
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);

    try {
      // Find the user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .eq('display_name', newAdminEmail.trim())
        .maybeSingle();

      if (profileError || !profile) {
        toast({
          title: 'User not found',
          description: 'No user found with that email/name. Make sure they have signed up first.',
          variant: 'destructive',
        });
        setAdding(false);
        return;
      }

      // Check if already an admin
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('role', 'admin')
        .maybeSingle();

      if (existingRole) {
        toast({
          title: 'Already an admin',
          description: 'This user is already an admin.',
          variant: 'destructive',
        });
        setAdding(false);
        return;
      }

      // Add admin role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.user_id,
          role: 'admin',
        });

      if (insertError) throw insertError;

      toast({
        title: 'Admin added',
        description: `${newAdminEmail} has been granted admin privileges.`,
      });

      setNewAdminEmail('');
      loadAdmins();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to add admin. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!adminToDelete) return;

    // Prevent removing the last admin
    if (admins.length <= 1) {
      toast({
        title: 'Cannot remove',
        description: 'You cannot remove the last admin.',
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', adminToDelete.id);

      if (error) throw error;

      toast({
        title: 'Admin removed',
        description: `${adminToDelete.display_name} is no longer an admin.`,
      });

      loadAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove admin. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
    }
  };

  return (
    <AppLayout title="Admin Management">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/settings')} className="gap-2">
          <ArrowLeft className="h-5 w-5" />
          Back to Settings
        </Button>

        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Admin Management</h1>
        </div>

        {/* Add New Admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Admin
            </CardTitle>
            <CardDescription>
              Grant admin privileges to an existing user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">User Email or Display Name</Label>
              <div className="flex gap-3">
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter user's email or display name"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
                <Button onClick={handleAddAdmin} disabled={adding}>
                  {adding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add Admin'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The user must have already signed up before they can be promoted to admin.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Admins */}
        <Card>
          <CardHeader>
            <CardTitle>Current Admins</CardTitle>
            <CardDescription>
              Users with administrative privileges
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : admins.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No admin users found
              </p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{admin.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Admin since {new Date(admin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setAdminToDelete(admin);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={admins.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Admin?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove admin privileges from {adminToDelete?.display_name}.
                They will still be able to access the app as a regular user.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveAdmin}>
                Remove Admin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
