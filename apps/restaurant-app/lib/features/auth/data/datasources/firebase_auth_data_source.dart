import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class FirebaseAuthDataSource {
  FirebaseAuthDataSource({
    FirebaseAuth? firebaseAuth,
    FirebaseFirestore? firestore,
  }) : _firebaseAuth = firebaseAuth ?? FirebaseAuth.instance,
       _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseAuth _firebaseAuth;
  final FirebaseFirestore _firestore;

  Future<FirebaseAuthenticatedUser> signIn({
    required String email,
    required String password,
  }) async {
    final credential = await _firebaseAuth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    final firebaseUser = credential.user;

    if (firebaseUser == null) {
      throw StateError('Firebase returned no authenticated user.');
    }

    final profile = await _firestore
        .collection('users')
        .doc(firebaseUser.uid)
        .get();

    if (!profile.exists) {
      await _firebaseAuth.signOut();
      throw StateError('The account profile was not found.');
    }

    return FirebaseAuthenticatedUser(
      id: firebaseUser.uid,
      email: firebaseUser.email,
      role: profile.data()?['role'],
    );
  }
}

class FirebaseAuthenticatedUser {
  const FirebaseAuthenticatedUser({
    required this.id,
    required this.email,
    required this.role,
  });

  final String id;
  final String? email;
  final Object? role;
}
