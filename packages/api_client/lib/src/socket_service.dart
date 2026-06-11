import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

typedef SocketAccessTokenProvider = Future<String?> Function();

class SocketService {
  SocketService({required this.serverUrl, required this.accessTokenProvider});

  final String serverUrl;
  final SocketAccessTokenProvider accessTokenProvider;
  final StreamController<Map<String, dynamic>> _kitchenQueueController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _orderUpdatesController =
      StreamController<Map<String, dynamic>>.broadcast();
  io.Socket? _socket;

  Stream<Map<String, dynamic>> get kitchenQueueUpdates =>
      _kitchenQueueController.stream;
  Stream<Map<String, dynamic>> get orderUpdates =>
      _orderUpdatesController.stream;

  Future<void> connect() async {
    if (_socket?.connected ?? false) return;
    final token = await accessTokenProvider();
    if (token == null || token.isEmpty) {
      throw StateError('An access token is required for kitchen realtime.');
    }
    final socket = io.io(
      '$serverUrl/kitchen',
      io.OptionBuilder()
          .setTransports(<String>['websocket'])
          .disableAutoConnect()
          .setAuth(<String, dynamic>{'token': token})
          .build(),
    );
    for (final event in <String>[
      'KitchenQueueUpdated',
      'ItemReady',
      'ItemServed',
    ]) {
      socket.on(event, (dynamic data) {
        final mapped = _event(data);
        if (mapped != null) _kitchenQueueController.add(mapped);
      });
    }
    for (final event in <String>[
      'OrderCreated',
      'OrderUpdated',
      'OrderReady',
      'OrderServed',
    ]) {
      socket.on(event, (dynamic data) {
        final mapped = _event(data);
        if (mapped != null) _orderUpdatesController.add(mapped);
      });
    }
    _socket = socket;
    socket.connect();
  }

  void subscribeKitchenQueue({
    String? tenantId,
    String? outletId,
    String? stationId,
  }) {
    _socket?.emit('subscribeKitchenQueue', <String, dynamic>{
      if (tenantId != null) 'tenantId': tenantId,
      if (outletId != null) 'outletId': outletId,
      if (stationId != null) 'stationId': stationId,
    });
  }

  void subscribeOrderUpdates() {
    _socket?.emit('subscribeOrderUpdates');
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  Future<void> dispose() async {
    disconnect();
    await _kitchenQueueController.close();
    await _orderUpdatesController.close();
  }

  Map<String, dynamic>? _event(dynamic data) {
    return data is Map ? Map<String, dynamic>.from(data) : null;
  }
}
