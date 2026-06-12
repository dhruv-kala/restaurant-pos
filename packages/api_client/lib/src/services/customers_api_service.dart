import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../api_endpoints.dart';

class CustomersApiService {
  const CustomersApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<Customer>> getCustomers({
    int page = 1,
    int limit = 20,
    String? search,
    String? phone,
    String? email,
    String? status,
    String? customerType,
    String? source,
  }) => _customers(ApiEndpoints.customers, {
    'page': page,
    'limit': limit,
    if (search?.isNotEmpty ?? false) 'search': search,
    if (phone?.isNotEmpty ?? false) 'phone': phone,
    if (email?.isNotEmpty ?? false) 'email': email,
    if (status != null) 'status': status,
    if (customerType != null) 'customerType': customerType,
    if (source != null) 'source': source,
  });

  Future<PaginatedResponse<Customer>> searchCustomers(String query) =>
      _customers(ApiEndpoints.customerSearch, {'search': query, 'limit': 25});

  Future<Customer> createCustomer(Map<String, dynamic> payload) async =>
      Customer.fromJson(
        _map(await _dio.post<Object?>(ApiEndpoints.customers, data: payload)),
      );
  Future<Customer> updateCustomer(
    String id,
    Map<String, dynamic> payload,
  ) async => Customer.fromJson(
    _map(await _dio.patch<Object?>(ApiEndpoints.customer(id), data: payload)),
  );
  Future<Customer> getCustomer(String id) async => Customer.fromJson(
    _map(await _dio.get<Object?>(ApiEndpoints.customer(id))),
  );
  Future<void> deleteCustomer(String id) async =>
      _dio.delete<Object?>(ApiEndpoints.customer(id));

  Future<List<CustomerAddress>> getCustomerAddresses(String id) async => _list(
    await _dio.get<Object?>(ApiEndpoints.customerAddresses(id)),
    CustomerAddress.fromJson,
  );
  Future<CustomerAddress> createCustomerAddress(
    String id,
    Map<String, dynamic> payload,
  ) async => CustomerAddress.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.customerAddresses(id),
        data: payload,
      ),
    ),
  );
  Future<CustomerAddress> updateCustomerAddress(
    String id,
    Map<String, dynamic> payload,
  ) async => CustomerAddress.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.customerAddress(id),
        data: payload,
      ),
    ),
  );
  Future<void> deleteCustomerAddress(String id) async =>
      _dio.delete<Object?>(ApiEndpoints.customerAddress(id));

  Future<List<CustomerNote>> getCustomerNotes(String id) async => _list(
    await _dio.get<Object?>(ApiEndpoints.customerNotes(id)),
    CustomerNote.fromJson,
  );
  Future<CustomerNote> createCustomerNote(String id, String note) async =>
      CustomerNote.fromJson(
        _map(
          await _dio.post<Object?>(
            ApiEndpoints.customerNotes(id),
            data: {'note': note},
          ),
        ),
      );

  Future<List<Map<String, dynamic>>> getCustomerOrders(String id) =>
      _maps(ApiEndpoints.customerOrders(id));
  Future<List<Map<String, dynamic>>> getCustomerBills(String id) =>
      _maps(ApiEndpoints.customerBills(id));
  Future<List<Map<String, dynamic>>> getCustomerPayments(String id) =>
      _maps(ApiEndpoints.customerPayments(id));
  Future<List<CustomerVisit>> getCustomerVisits(String id) async => _list(
    await _dio.get<Object?>(ApiEndpoints.customerVisits(id)),
    CustomerVisit.fromJson,
  );
  Future<CustomerStats> getCustomerStats(String id) async =>
      CustomerStats.fromJson(
        _map(await _dio.get<Object?>(ApiEndpoints.customerStats(id))),
      );
  Future<CustomerDashboardStats> getDashboard() async =>
      CustomerDashboardStats.fromJson(
        _map(await _dio.get<Object?>(ApiEndpoints.customerDashboard)),
      );

  Future<PaginatedResponse<Customer>> _customers(
    String path,
    Map<String, dynamic> query,
  ) async => PaginatedResponse<Customer>.fromJson(
    _map(await _dio.get<Object?>(path, queryParameters: query)),
    Customer.fromJson,
  );
  Future<List<Map<String, dynamic>>> _maps(String path) async {
    final response = await _dio.get<Object?>(path);
    return (response.data as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false);
  }
}

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map)
    return Map<String, dynamic>.from(response.data! as Map);
  throw const FormatException('Expected an object response.');
}

List<T> _list<T>(
  Response<Object?> response,
  T Function(Map<String, dynamic>) parser,
) => (response.data as List? ?? const [])
    .map((item) => parser(Map<String, dynamic>.from(item as Map)))
    .toList(growable: false);
