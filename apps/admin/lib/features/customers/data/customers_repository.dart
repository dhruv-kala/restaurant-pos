import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../domain/customer_query.dart';

class CustomersRepository {
  const CustomersRepository(this.api);
  final CustomersApiService api;
  Future<PaginatedResponse<Customer>> list(CustomerQuery query) =>
      api.getCustomers(
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
        customerType: query.customerType,
      );
  Future<PaginatedResponse<Customer>> search(String query) =>
      api.searchCustomers(query);
  Future<Customer> get(String id) => api.getCustomer(id);
  Future<Customer> create(Map<String, dynamic> data) =>
      api.createCustomer(data);
  Future<Customer> update(String id, Map<String, dynamic> data) =>
      api.updateCustomer(id, data);
  Future<CustomerStats> stats(String id) => api.getCustomerStats(id);
  Future<CustomerDashboardStats> dashboard() => api.getDashboard();
  Future<List<CustomerAddress>> addresses(String id) =>
      api.getCustomerAddresses(id);
  Future<List<CustomerNote>> notes(String id) => api.getCustomerNotes(id);
  Future<List<CustomerVisit>> visits(String id) => api.getCustomerVisits(id);
  Future<List<Map<String, dynamic>>> orders(String id) =>
      api.getCustomerOrders(id);
}
