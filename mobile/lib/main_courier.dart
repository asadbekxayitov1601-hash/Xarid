// Courier flavor entry point — "Xarid Kuryer" (applicationId uz.xarid.courier).
// Run/build with the matching flavor + dart-define so the native app id, name
// and icon line up with this Dart entry:
//   flutter run   --flavor courier -t lib/main_courier.dart --dart-define=FLAVOR=courier
//   flutter build appbundle --flavor courier -t lib/main_courier.dart --dart-define=FLAVOR=courier
import 'main.dart';

void main() => runXarid();
