import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { ArrowLeft } from 'lucide-react';

export default function Categories() {
  const navigate = useNavigate();

  return (
    <AppLayout title="Categories">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>
        </div>

        <CategoryManager />
      </div>
    </AppLayout>
  );
}