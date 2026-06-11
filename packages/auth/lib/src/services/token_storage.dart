import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

abstract interface class TokenStorage {
  Future<TokenPair?> read();

  Future<void> write(TokenPair tokens);

  Future<void> clear();
}

class InMemoryTokenStorage implements TokenStorage {
  TokenPair? _tokens;

  @override
  Future<void> clear() async {
    _tokens = null;
  }

  @override
  Future<TokenPair?> read() async => _tokens;

  @override
  Future<void> write(TokenPair tokens) async {
    _tokens = tokens;
  }
}
