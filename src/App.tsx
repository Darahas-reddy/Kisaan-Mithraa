import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DiseaseDetection from "./pages/DiseaseDetection";
import LoanSubsidyRecommender from "./pages/LoanSubsidyRecommender";
import Chatbot from "./pages/Chatbot";
import Products from "./pages/Products";
import Weather from "./pages/Weather";
import MarketPrices from "./pages/MarketPrices";
import GovernmentSchemes from "./pages/GovernmentSchemes";
import CropCalendar from "./pages/CropCalendar";
import Profile from "./pages/Profile";
import YieldPrediction from "./pages/YieldPrediction";
import FarmAnalytics from "./pages/FarmAnalytics";
import NotFound from "./pages/NotFound";
import ToolRentals from "./pages/ToolRentals";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/tool-rentals" element={<ToolRentals />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/disease-detection" element={<DiseaseDetection />} />
          <Route path="/loan-subsidy" element={<LoanSubsidyRecommender />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/products" element={<Products />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/market-prices" element={<MarketPrices />} />
          <Route path="/government-schemes" element={<GovernmentSchemes />} />
          <Route path="/crop-calendar" element={<CropCalendar />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/yield-prediction" element={<YieldPrediction />} />
          <Route path="/farm-analytics" element={<FarmAnalytics />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
