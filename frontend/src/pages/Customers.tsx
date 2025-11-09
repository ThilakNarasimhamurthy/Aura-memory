import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { customersApi, documentsApi, type CustomerDocument } from "@/lib/api";
import { getCachedData, setCachedData } from "@/lib/dataCache";

interface Customer {
  customer_id: string;
  customer_segment?: string;
  loyalty_member?: string;
  churn_risk_score?: number;
  lifetime_value?: number;
  favorite_product_category?: string;
  preferred_contact_method?: string;
  total_purchases?: number;
  total_spent?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadCustomers = async (forceRefresh: boolean = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedCustomers = getCachedData<Customer[]>('customers_list');
      if (cachedCustomers) {
        setCustomers(cachedCustomers);
        setFilteredCustomers(cachedCustomers);
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);
    try {
      // Get active customers from backend - limit to 1000 to prevent browser hanging
      // TODO: Implement pagination for larger datasets
      const response = await customersApi.findActive(1000);
      
      
      // Ensure documents array exists and is valid
      if (!response || !response.documents || response.documents.length === 0) {
        setCustomers([]);
        setFilteredCustomers([]);
        toast({
          title: "No Customers Found",
          description: response?.answer || "No customer data available. Please upload customer data first.",
          variant: "default",
        });
        setLoading(false);
        return;
      }
      
      
      // Extract customer data from documents
      const customerMap = new Map<string, Customer>();
      
      response.documents.forEach((doc) => {
        const metadata = doc.metadata as CustomerDocument;
        if (metadata.customer_id) {
          const customerId = String(metadata.customer_id);
          // Only add if we don't have this customer yet, or if this document has more complete data
          if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
              customer_id: customerId,
              customer_segment: metadata.customer_segment,
              loyalty_member: metadata.loyalty_member 
                ? (typeof metadata.loyalty_member === 'string' 
                   ? metadata.loyalty_member 
                   : metadata.loyalty_member ? "Yes" : "No")
                : "No",
              churn_risk_score: typeof metadata.churn_risk_score === 'number' 
                ? metadata.churn_risk_score 
                : parseFloat(String(metadata.churn_risk_score || 0)),
              lifetime_value: typeof metadata.lifetime_value === 'number'
                ? metadata.lifetime_value
                : parseFloat(String(metadata.lifetime_value || 0)),
              favorite_product_category: metadata.favorite_product_category,
              preferred_contact_method: metadata.preferred_contact_method,
              total_purchases: typeof metadata.total_purchases === 'number'
                ? metadata.total_purchases
                : parseInt(String(metadata.total_purchases || 0), 10),
              total_spent: typeof metadata.total_spent === 'number'
                ? metadata.total_spent
                : parseFloat(String(metadata.total_spent || 0)),
              email: metadata.email,
              first_name: metadata.first_name,
              last_name: metadata.last_name,
            });
          } else {
            // Update existing customer with any missing fields
            const existing = customerMap.get(customerId)!;
            if (!existing.first_name && metadata.first_name) existing.first_name = metadata.first_name;
            if (!existing.last_name && metadata.last_name) existing.last_name = metadata.last_name;
            if (!existing.email && metadata.email) existing.email = metadata.email;
            if (!existing.customer_segment && metadata.customer_segment) existing.customer_segment = metadata.customer_segment;
            if (!existing.total_purchases && metadata.total_purchases) {
              existing.total_purchases = typeof metadata.total_purchases === 'number'
                ? metadata.total_purchases
                : parseInt(String(metadata.total_purchases || 0), 10);
            }
            if (!existing.total_spent && metadata.total_spent) {
              existing.total_spent = typeof metadata.total_spent === 'number'
                ? metadata.total_spent
                : parseFloat(String(metadata.total_spent || 0));
            }
            if (!existing.lifetime_value && metadata.lifetime_value) {
              existing.lifetime_value = typeof metadata.lifetime_value === 'number'
                ? metadata.lifetime_value
                : parseFloat(String(metadata.lifetime_value || 0));
            }
          }
        }
      });

      const customerList = Array.from(customerMap.values());
      setCustomers(customerList);
      setFilteredCustomers(customerList);
      
      // Cache the data
      setCachedData('customers_list', customerList);
      
      if (forceRefresh) {
        toast({
          title: "Customers Refreshed",
          description: `Found ${customerList.length} active customers from the database.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error Loading Customers",
        description: error.message || "Failed to load customers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers(false); // Don't force refresh on mount - use cache if available
  }, []); // Empty dependency array - only run on mount

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(c => 
        (c.customer_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.customer_segment?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.favorite_product_category?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.first_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.last_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const getChurnColor = (score: number) => {
    if (score < 0.3) return "text-success";
    if (score < 0.7) return "text-warning";
    return "text-danger";
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Customer Database</h1>
                <p className="text-muted-foreground">Manage and analyze customer data from RAG system</p>
              </div>
              <Button
                onClick={() => loadCustomers(true)} // Force refresh
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Customers ({filteredCustomers.length})</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Loyalty</TableHead>
                      <TableHead>Purchases</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Lifetime Value</TableHead>
                      <TableHead>Churn Risk</TableHead>
                      <TableHead>Favorite Product</TableHead>
                      <TableHead>Contact Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Loading customers...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No customers found. Click Refresh to load from the database.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer, i) => (
                        <TableRow key={customer.customer_id || i}>
                          <TableCell className="font-medium">
                            {customer.first_name && customer.last_name
                              ? `${customer.first_name} ${customer.last_name}`
                              : customer.customer_id || "N/A"}
                          </TableCell>
                          <TableCell>{customer.email || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{customer.customer_segment || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-accent/20 text-accent">
                              {customer.loyalty_member || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>{customer.total_purchases || 0}</TableCell>
                          <TableCell className="text-success font-semibold">
                            ${Math.round(customer.total_spent || 0)}
                          </TableCell>
                          <TableCell className="text-success font-semibold">
                            ${Math.round(customer.lifetime_value || 0)}
                          </TableCell>
                          <TableCell className={getChurnColor(customer.churn_risk_score || 0)}>
                            {customer.churn_risk_score ? Math.round(customer.churn_risk_score * 100) + "%" : "N/A"}
                          </TableCell>
                          <TableCell>{customer.favorite_product_category || "N/A"}</TableCell>
                          <TableCell>{customer.preferred_contact_method || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
