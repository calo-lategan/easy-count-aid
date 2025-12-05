import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error loading categories:', error);
      return;
    }
    
    setCategories(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const addCategory = async (name: string, parentId: string | null = null) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, parent_id: parentId })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding category:', error);
      throw error;
    }
    
    await loadCategories();
    return data;
  };

  const updateCategory = async (id: string, name: string) => {
    const { error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }
    
    await loadCategories();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
    
    await loadCategories();
  };

  // Build hierarchical tree from flat categories
  const buildCategoryTree = useCallback((): CategoryWithChildren[] => {
    const categoryMap = new Map<string, CategoryWithChildren>();
    const roots: CategoryWithChildren[] = [];

    // First pass: create all nodes
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    categories.forEach(cat => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        categoryMap.get(cat.parent_id)!.children.push(node);
      } else if (!cat.parent_id) {
        roots.push(node);
      }
    });

    return roots;
  }, [categories]);

  // Get all categories at a specific level
  const getSubcategories = useCallback((parentId: string | null): Category[] => {
    return categories.filter(cat => cat.parent_id === parentId);
  }, [categories]);

  // Get full category path as string
  const getCategoryPath = useCallback((categoryId: string): string => {
    const parts: string[] = [];
    let current = categories.find(c => c.id === categoryId);
    
    while (current) {
      parts.unshift(current.name);
      current = categories.find(c => c.id === current?.parent_id);
    }
    
    return parts.join(' > ');
  }, [categories]);

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    buildCategoryTree,
    getSubcategories,
    getCategoryPath,
    refresh: loadCategories,
  };
}