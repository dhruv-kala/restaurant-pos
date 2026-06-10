import 'package:flutter/foundation.dart';
import 'package:serveiq_auth/serveiq_auth.dart';
import 'package:serveiq_core/serveiq_core.dart';

import '../../domain/usecases/sign_in.dart';

class LoginController extends ChangeNotifier {
  LoginController({required this._signIn});

  final SignIn _signIn;

  bool _isLoading = false;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<UserRole?> submit({
    required String email,
    required String password,
  }) async {
    if (_isLoading) {
      return null;
    }

    _setLoading(true);
    _errorMessage = null;

    try {
      final user = await _signIn(email: email, password: password);
      return user.role;
    } on AppException catch (error) {
      _errorMessage = error.message;
      return null;
    } finally {
      _setLoading(false);
    }
  }

  void clearError() {
    if (_errorMessage == null) {
      return;
    }

    _errorMessage = null;
    notifyListeners();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
