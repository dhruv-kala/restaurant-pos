import 'package:flutter_test/flutter_test.dart';
import 'package:restaurantpos/core/errors/app_exception.dart';
import 'package:restaurantpos/features/auth/domain/entities/authenticated_user.dart';
import 'package:restaurantpos/features/auth/domain/repositories/auth_repository.dart';
import 'package:restaurantpos/features/auth/domain/usecases/sign_in.dart';
import 'package:restaurantpos/features/auth/presentation/controllers/login_controller.dart';

void main() {
  test('returns the authenticated role and clears loading state', () async {
    final controller = LoginController(
      signIn: SignIn(_SuccessfulAuthRepository()),
    );

    final role = await controller.submit(
      email: 'cashier@example.com',
      password: 'secret',
    );

    expect(role, UserRole.cashier);
    expect(controller.isLoading, isFalse);
    expect(controller.errorMessage, isNull);
  });

  test('exposes a domain-safe error and clears loading state', () async {
    final controller = LoginController(
      signIn: SignIn(_FailingAuthRepository()),
    );

    final role = await controller.submit(
      email: 'user@example.com',
      password: 'wrong',
    );

    expect(role, isNull);
    expect(controller.isLoading, isFalse);
    expect(controller.errorMessage, 'Invalid credentials.');
  });
}

class _SuccessfulAuthRepository implements AuthRepository {
  @override
  Future<AuthenticatedUser> signIn({
    required String email,
    required String password,
  }) async {
    return AuthenticatedUser(
      id: 'cashier-1',
      email: email,
      role: UserRole.cashier,
    );
  }
}

class _FailingAuthRepository implements AuthRepository {
  @override
  Future<AuthenticatedUser> signIn({
    required String email,
    required String password,
  }) {
    throw const AppException('Invalid credentials.');
  }
}
