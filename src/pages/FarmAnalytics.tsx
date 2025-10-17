import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AuthGuard from '@/components/AuthGuard';

const FarmAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [yields, setYields] = useState<any[]>([]);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showYieldDialog, setShowYieldDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
  });
  const [yieldForm, setYieldForm] = useState({
    crop_name: '',
    quantity: '',
    harvest_date: new Date().toISOString().split('T')[0],
    revenue: ''
  });
  const [timePeriod, setTimePeriod] = useState<'7' | '30' | '90' | 'all'>('30');

  useEffect(() => {
    loadData();
  }, [timePeriod]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: expenseData } = await supabase
      .from('farm_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false });

    const { data: yieldData } = await supabase
      .from('yield_records')
      .select('*')
      .eq('user_id', user.id)
      .order('harvest_date', { ascending: false });

    setExpenses(expenseData || []);
    setYields(yieldData || []);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('farm_expenses').insert({
      ...expenseForm,
      user_id: user.id,
      amount: parseFloat(expenseForm.amount)
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Expense added successfully' });
      setShowExpenseDialog(false);
      setExpenseForm({ category: '', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0] });
      loadData();
    }
  };

  const handleAddYield = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('yield_records').insert({
      ...yieldForm,
      user_id: user.id,
      quantity: parseFloat(yieldForm.quantity),
      revenue: yieldForm.revenue ? parseFloat(yieldForm.revenue) : null
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Yield record added successfully' });
      setShowYieldDialog(false);
      setYieldForm({ crop_name: '', quantity: '', harvest_date: new Date().toISOString().split('T')[0], revenue: '' });
      loadData();
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    if (timePeriod === 'all') return true;
    const days = Number(timePeriod);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Date(exp.expense_date) >= cutoff;
  });

  const rentalExpenses = filteredExpenses.filter(e => e.category === 'equipment');

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const totalRevenue = yields.reduce((sum, y) => sum + (parseFloat(y.revenue) || 0), 0);
  const profit = totalRevenue - totalExpenses;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Farm Analytics</h1>
              <p className="text-sm text-muted-foreground">Track expenses, yields, and profits</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">₹{totalExpenses.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">₹{totalRevenue.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  ₹{profit.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Time Period Filter */}
          <div className="mb-8">
            <Label className="block text-sm font-medium mb-2">Filter by Time Period</Label>
            <Select
              value={timePeriod}
              onValueChange={(value) => setTimePeriod(value as '7' | '30' | '90' | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expenses Section */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Expenses
                  </CardTitle>
                  <CardDescription>Track your farming costs</CardDescription>
                </div>
                <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Expense</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddExpense} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={expenseForm.category}
                          onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="seeds">Seeds</SelectItem>
                            <SelectItem value="fertilizers">Fertilizers</SelectItem>
                            <SelectItem value="pesticides">Pesticides</SelectItem>
                            <SelectItem value="labor">Labor</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="irrigation">Irrigation</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (₹)</Label>
                        <Input
                          required
                          type="number"
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={expenseForm.description}
                          onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          required
                          type="date"
                          value={expenseForm.expense_date}
                          onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                        />
                      </div>
                      <Button type="submit" className="w-full">Add Expense</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium capitalize">{expense.category}</p>
                      <p className="text-sm text-muted-foreground">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(expense.expense_date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-lg font-bold text-destructive">-₹{expense.amount}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Yields Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Yield Records
                  </CardTitle>
                  <CardDescription>Track your harvest and revenue</CardDescription>
                </div>
                <Dialog open={showYieldDialog} onOpenChange={setShowYieldDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Yield
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Yield Record</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddYield} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Crop Name</Label>
                        <Input
                          required
                          value={yieldForm.crop_name}
                          onChange={(e) => setYieldForm({ ...yieldForm, crop_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity (quintals)</Label>
                        <Input
                          required
                          type="number"
                          value={yieldForm.quantity}
                          onChange={(e) => setYieldForm({ ...yieldForm, quantity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Revenue (₹)</Label>
                        <Input
                          type="number"
                          value={yieldForm.revenue}
                          onChange={(e) => setYieldForm({ ...yieldForm, revenue: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Harvest Date</Label>
                        <Input
                          required
                          type="date"
                          value={yieldForm.harvest_date}
                          onChange={(e) => setYieldForm({ ...yieldForm, harvest_date: e.target.value })}
                        />
                      </div>
                      <Button type="submit" className="w-full">Add Yield</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {yields.map((yieldRecord) => (
                  <div key={yieldRecord.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium">{yieldRecord.crop_name}</p>
                      <p className="text-sm text-muted-foreground">{yieldRecord.quantity} quintals</p>
                      <p className="text-xs text-muted-foreground">{new Date(yieldRecord.harvest_date).toLocaleDateString()}</p>
                    </div>
                    {yieldRecord.revenue && (
                      <p className="text-lg font-bold text-primary">+₹{yieldRecord.revenue}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
};

export default FarmAnalytics;
