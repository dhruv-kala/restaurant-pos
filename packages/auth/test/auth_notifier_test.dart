import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart'
    hide AuthenticatedUser, UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

void main() {
  const user = AuthenticatedUser(
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    tenantId: 'tenant-1',
    outletId: 'outlet-1',
    roles: <UserRole>[UserRole.tenantAdmin],
  );
  const tokens = TokenPair(
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  );

  test('login stores tokens and authenticates the user', () async {
    final storage = _MemoryTokenStorage();
    final notifier = AuthNotifier(
      repository: _FakeAuthRepository(
        response: const AuthResponse(user: user, tokens: tokens),
      ),
      tokenStorage: storage,
    );

    final success = await notifier.login(
      email: ' ADMIN@EXAMPLE.COM ',
      password: 'secret',
    );

    expect(success, isTrue);
    expect(notifier.state.status, AuthStatus.authenticated);
    expect(notifier.state.user, same(user));
    expect(await storage.getAccessToken(), tokens.accessToken);
    expect(await storage.getRefreshToken(), tokens.refreshToken);
  });

  test('restoreSession validates a stored session with current user', () async {
    final storage = _MemoryTokenStorage()..tokens = tokens;
    final notifier = AuthNotifier(
      repository: _FakeAuthRepository(
        response: const AuthResponse(user: user, tokens: tokens),
      ),
      tokenStorage: storage,
    );

    await notifier.restoreSession();

    expect(notifier.state.status, AuthStatus.authenticated);
    expect(notifier.state.user, same(user));
  });

  test('logout clears tokens and resets authentication state', () async {
    final storage = _MemoryTokenStorage()..tokens = tokens;
    final repository = _FakeAuthRepository(
      response: const AuthResponse(user: user, tokens: tokens),
    );
    final notifier = AuthNotifier(
      repository: repository,
      tokenStorage: storage,
    );

    await notifier.restoreSession();
    await notifier.logout();

    expect(repository.logoutCalled, isTrue);
    expect(await storage.getAccessToken(), isNull);
    expect(notifier.state.status, AuthStatus.unauthenticated);
  });
}

class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository({required this.response});

  final AuthResponse response;
  bool logoutCalled = false;

  @override
  Future<AuthenticatedUser> getCurrentUser() async => response.user;

  @override
  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    expect(email, 'admin@example.com');
    return response;
  }

  @override
  Future<void> logout() async {
    logoutCalled = true;
  }

  @override
  Future<TokenPair> refreshToken() async => response.tokens;
}

class _MemoryTokenStorage implements TokenStorage {
  TokenPair? tokens;

  @override
  Future<void> clearTokens() async {
    tokens = null;
  }

  @override
  Future<String?> getAccessToken() async => tokens?.accessToken;

  @override
  Future<String?> getRefreshToken() async => tokens?.refreshToken;

  @override
  Future<void> saveTokenPair(TokenPair tokens) => saveTokens(tokens);

  @override
  Future<void> saveTokens(TokenPair tokens) async {
    this.tokens = tokens;
  }
}
