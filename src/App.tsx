import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CameraScan from "./pages/CameraScan";
import ConfirmEntry from "./pages/ConfirmEntry";
import ManualEntry from "./pages/ManualEntry";
import InventoryList from "./pages/InventoryList";
import StockDashboard from "./pages/StockDashboard";
import Categories from "./pages/Categories";
import NotFound from "./pages/NotFound";

// Initialize sync service
import '@/lib/syncService';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/scan" element={<CameraScan />} />
          <Route path="/confirm" element={<ConfirmEntry />} />
          <Route path="/manual-entry" element={<ManualEntry />} />
          <Route path="/inventory" element={<InventoryList />} />
          <Route path="/stock-dashboard" element={<StockDashboard />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
