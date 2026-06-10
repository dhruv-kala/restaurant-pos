import 'package:firebase_auth/firebase_auth.dart';
import 'package:serveiq_auth/serveiq_auth.dart';
import 'package:serveiq_core/serveiq_core.dart';

import '../../domain/repositories/auth_repository.dart';
import '../datasources/firebase_auth_data_source.dart';

class FirebaseAuthRepository implements AuthRepository {
  const FirebaseAuthRepository({required this._dataSource});

  final FirebaseAuthDataSource _dataSource;

  @override
  Future<AuthenticatedUser> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final user = await _dataSource.signIn(email: email, password: password);

      return AuthenticatedUser(
        id: user.id,
        email: user.email,
        role: UserRole.fromRemoteValue(user.role),
      );
    } on FirebaseAuthException catch (error) {
      throw AppException(_messageFor(error.code));
    } on AppException {
      rethrow;
    } on StateError catch (error) {
      throw AppException(error.message);
    } catch (_) {
      throw const AppException(
        'Sign-in failed. Check your connection and try again.',
      );
    }
  }

  String _messageFor(String code) {
    return switch (code) {
      'invalid-credential' ||
      'user-not-found' ||
      'wrong-password' => 'The email or password is incorrect.',
      'invalid-email' => 'Enter a valid email address.',
      'user-disabled' => 'This account has been disabled.',
      'too-many-requests' => 'Too many attempts. Try again later.',
      'network-request-failed' => 'No network connection is available.',
      _ => 'Sign-in failed. Try again.',
    };
  }
}
