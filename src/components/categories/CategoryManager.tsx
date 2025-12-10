import { useState } from 'react';
import { useCategories, CategoryWithChildren } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, FolderTree, Lock } from 'lucide-react';

export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory, buildCategoryTree } = useCategories();
  const { isAdmin, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

  const categoryTree = buildCategoryTree();

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const openAddDialog = (parentId: string | null = null) => {
    setEditingCategory(null);
    setParentId(parentId);
    setNewName('');
    setDialogOpen(true);
  };

  const openEditDialog = (category: { id: string; name: string }) => {
    setEditingCategory(category);
    setNewName(category.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Category name is required', variant: 'destructive' });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, newName.trim());
        toast({ title: 'Success', description: 'Category updated' });
      } else {
        await addCategory(newName.trim(), parentId);
        toast({ title: 'Success', description: 'Category created' });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save category', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      await deleteCategory(categoryToDelete.id);
      toast({ title: 'Success', description: 'Category deleted' });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' });
    }
  };

  const renderCategory = (category: CategoryWithChildren, depth = 0) => {
    const hasChildren = category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const isUncategorized = category.id === '00000000-0000-0000-0000-000000000000';

    return (
      <div key={category.id}>
        <div 
          className="flex items-center gap-2 py-2 px-3 hover:bg-accent rounded-lg transition-colors"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <button
            onClick={() => hasChildren && toggleExpand(category.id)}
            className="p-1 hover:bg-muted rounded"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="w-4" />
            )}
          </button>
          
          <FolderTree className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 font-medium">{category.name}</span>
          
          {isAdmin && !isUncategorized && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openAddDialog(category.id)}
                title="Add subcategory"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEditDialog(category)}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => {
                  setCategoryToDelete(category);
                  setDeleteDialogOpen(true);
                }}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {isExpanded && category.children.map(child => renderCategory(child, depth + 1))}
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Login Required</p>
          <p className="text-muted-foreground">Please sign in to view categories</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          Categories
        </CardTitle>
        {isAdmin && (
          <Button onClick={() => openAddDialog(null)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!isAdmin && (
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <Lock className="h-4 w-4 inline mr-2" />
            Only admins can manage categories
          </div>
        )}
        
        {categoryTree.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No categories yet</p>
        ) : (
          <div className="space-y-1">
            {categoryTree.map(cat => renderCategory(cat))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : parentId ? 'Add Subcategory' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{categoryToDelete?.name}" and all its subcategories.
              Items in this category will be moved to "Uncategorized".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}