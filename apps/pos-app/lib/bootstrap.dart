import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/widgets.dart';

import 'app/app.dart';
import 'features/auth/data/datasources/firebase_auth_data_source.dart';
import 'features/auth/data/repositories/firebase_auth_repository.dart';
import 'features/auth/domain/usecases/sign_in.dart';
import 'firebase_options.dart';

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  final authRepository = FirebaseAuthRepository(
    dataSource: FirebaseAuthDataSource(),
  );

  runApp(RestaurantPosApp(signIn: SignIn(authRepository)));
}
