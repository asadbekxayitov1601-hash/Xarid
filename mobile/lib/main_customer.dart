// Customer flavor entry point — "Xarid" (applicationId uz.xarid.app).
// Run/build with the matching flavor + dart-define so the native app id, name
// and icon line up with this Dart entry:
//   flutter run   --flavor customer -t lib/main_customer.dart --dart-define=FLAVOR=customer
//   flutter build appbundle --flavor customer -t lib/main_customer.dart --dart-define=FLAVOR=customer
import 'main.dart';

void main() => runXarid();
