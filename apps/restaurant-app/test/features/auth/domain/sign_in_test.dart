import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_app/features/auth/domain/repositories/auth_repository.dart';
import 'package:restaurant_app/features/auth/domain/usecases/sign_in.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart'
    show AuthenticatedUser, UserRole;
import 'package:restaurant_pos_core/restaurant_pos_core.dart';

void main() {
  group('SignIn', () {
    test('normalizes email and delegates valid credentials', () async {
      final repository = _FakeAuthRepository();
      final signIn = SignIn(repository);

      final user = await signIn(
        email: '  user@example.com ',
        password: 'secret',
      );

      expect(repository.email, 'user@example.com');
      expect(repository.password, 'secret');
      expect(user.role, UserRole.admin);
    });

    test('rejects empty credentials before calling the repository', () {
      final repository = _FakeAuthRepository();
      final signIn = SignIn(repository);

      expect(
        () => signIn(email: ' ', password: ''),
        throwsA(isA<AppException>()),
      );
      expect(repository.email, isNull);
    });
  });

  group('UserRole', () {
    test('maps supported remote values', () {
      expect(UserRole.fromRemoteValue('ADMIN'), UserRole.admin);
      expect(UserRole.fromRemoteValue('CASHIER'), UserRole.cashier);
      expect(UserRole.fromRemoteValue('WAITER'), UserRole.waiter);
    });

    test('rejects unknown remote values', () {
      expect(
        () => UserRole.fromRemoteValue('OWNER'),
        throwsA(isA<AppException>()),
      );
    });
  });
}

class _FakeAuthRepository implements AuthRepository {
  String? email;
  String? password;

  @override
  Future<AuthenticatedUser> signIn({
    required String email,
    required String password,
  }) async {
    this.email = email;
    this.password = password;

    return const AuthenticatedUser(
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.admin,
    );
  }
}
