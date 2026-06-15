import 'package:path/path.dart' as path;
import 'package:sqflite_common/sqlite_api.dart' as sqlite;
import 'package:sqflite_common_ffi/sqflite_ffi.dart' as sqlite_ffi;

import 'local_database_schema.dart';

class OfflineLocalDatabase {
  OfflineLocalDatabase({
    sqlite.DatabaseFactory? databaseFactory,
    String? databasePath,
  }) : this._(databaseFactory ?? _defaultDatabaseFactory(), databasePath);

  OfflineLocalDatabase._(this._databaseFactory, this._databasePath);

  final sqlite.DatabaseFactory _databaseFactory;
  final String? _databasePath;
  sqlite.Database? _database;

  Future<sqlite.Database> open() async {
    final current = _database;
    if (current != null && current.isOpen) {
      return current;
    }

    final databasePath =
        _databasePath ??
        path.join(
          await _databaseFactory.getDatabasesPath(),
          'restaurant_pos_offline.db',
        );

    final opened = await _databaseFactory.openDatabase(
      databasePath,
      options: sqlite.OpenDatabaseOptions(
        version: offlineDatabaseVersion,
        onConfigure: (database) async {
          await database.execute('PRAGMA foreign_keys = ON');
        },
        onCreate: (database, version) async {
          await createOfflineDatabaseSchema(database);
        },
        onUpgrade: (database, oldVersion, newVersion) async {
          await createOfflineDatabaseSchema(database);
        },
        onOpen: (database) async {
          await createOfflineDatabaseSchema(database);
        },
      ),
    );

    _database = opened;
    return opened;
  }

  Future<void> close() async {
    final current = _database;
    _database = null;
    if (current != null && current.isOpen) {
      await current.close();
    }
  }
}

sqlite.DatabaseFactory _defaultDatabaseFactory() {
  sqlite_ffi.sqfliteFfiInit();
  return sqlite_ffi.databaseFactoryFfi;
}
