import { useState } from 'react';
import { useDeviceUsers } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { User, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function UserSelector() {
  const { users, currentUser, addUser, selectUser } = useDeviceUsers();
  const [newUserName, setNewUserName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    
    await addUser(newUserName.trim());
    setNewUserName('');
    setDialogOpen(false);
    toast({
      title: 'User added',
      description: `${newUserName} has been added as a user.`,
    });
  };

  const handleSelectUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    selectUser(user || null);
  };

  return (
    <div className="flex items-center gap-3">
      <User className="h-5 w-5 text-muted-foreground" />
      
      <Select value={currentUser?.id || ''} onValueChange={handleSelectUser}>
        <SelectTrigger className="w-48 h-12 text-base">
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent>
          {users.map(user => (
            <SelectItem key={user.id} value={user.id} className="text-base py-3">
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="h-12 w-12">
            <UserPlus className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-4">
            <Input
              placeholder="Enter name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="h-14 text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
            />
            <Button 
              onClick={handleAddUser} 
              className="h-14 text-lg"
              disabled={!newUserName.trim()}
            >
              Add User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
