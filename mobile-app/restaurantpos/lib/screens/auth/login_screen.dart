import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../admin/admin_screen.dart';
import '../cashier/cashier_screen.dart';
import '../waiter/waiter_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() =>
      _LoginScreenState();
}

class _LoginScreenState
    extends State<LoginScreen> {

  final emailController =
      TextEditingController();

  final passwordController =
      TextEditingController();

  bool loading = false;

  Future<void> login() async {

    try {

      setState(() {
        loading = true;
      });

      print("========== LOGIN START ==========");

      final credential =
          await FirebaseAuth.instance
              .signInWithEmailAndPassword(
        email:
            emailController.text.trim(),
        password:
            passwordController.text.trim(),
      );

      print("LOGIN SUCCESS");
      print("UID = ${credential.user?.uid}");
      print("EMAIL = ${credential.user?.email}");

      final uid =
          credential.user!.uid;

      print("Reading Firestore document:");
      print(uid);

      final userDoc =
          await FirebaseFirestore.instance
              .collection('users')
              .doc(uid)
              .get();

      print("Document Exists: ${userDoc.exists}");

      if (userDoc.exists) {
        print(userDoc.data());
      }

      if (!userDoc.exists) {

        throw Exception(
          "User profile not found in Firestore",
        );
      }

      final role =
          userDoc['role'];

      print("ROLE = $role");

      if (role == 'ADMIN') {

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) =>
                const AdminScreen(),
          ),
        );
      }

      else if (role == 'CASHIER') {

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) =>
                const CashierScreen(),
          ),
        );
      }

      else if (role == 'WAITER') {

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) =>
                const WaiterScreen(),
          ),
        );
      }

      else {

        throw Exception(
          "Invalid role found: $role",
        );
      }

    } catch (e) {

      print("LOGIN ERROR");
      print(e);

      ScaffoldMessenger.of(context)
          .showSnackBar(
        SnackBar(
          content: Text(
            e.toString(),
          ),
        ),
      );
    }

    finally {

      setState(() {
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {

    return Scaffold(
      backgroundColor:
          const Color(0xFFF5F7FB),

      body: Center(
        child: Container(
          width: 420,
          padding:
              const EdgeInsets.all(30),

          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius:
                BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color:
                    Colors.black.withOpacity(0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),

          child: Column(
            mainAxisSize:
                MainAxisSize.min,

            children: [

              const Text(
                "SERVEIQ",
                style: TextStyle(
                  fontSize: 32,
                  fontWeight:
                      FontWeight.bold,
                ),
              ),

              const SizedBox(
                  height: 30),

              TextField(
                controller:
                    emailController,
                decoration:
                    const InputDecoration(
                  labelText: "Email",
                  border:
                      OutlineInputBorder(),
                ),
              ),

              const SizedBox(
                  height: 15),

              TextField(
                controller:
                    passwordController,
                obscureText: true,
                decoration:
                    const InputDecoration(
                  labelText: "Password",
                  border:
                      OutlineInputBorder(),
                ),
              ),

              const SizedBox(
                  height: 25),

              SizedBox(
                width:
                    double.infinity,
                height: 50,

                child:
                    ElevatedButton(
                  onPressed:
                      loading
                          ? null
                          : login,

                  child: loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child:
                              CircularProgressIndicator(
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          "LOGIN",
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}